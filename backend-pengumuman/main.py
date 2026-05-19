import os
import datetime
import jwt
import re
import uuid
import uvicorn

from typing import Optional, List
from datetime import date
from dotenv import load_dotenv

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    File,
    UploadFile,
    Form,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String

from supabase import create_client, Client
from redis import asyncio as aioredis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache
from google import genai

import models
from database import engine, get_db
from data_schedule import JADWAL_SEKOLAH
from groq import AsyncGroq
from google.genai import types

# ==========================================
# INISIALISASI & KONFIGURASI AWAL
# ==========================================
load_dotenv()
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Backend Cita Hati")

# Variabel Environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY", "kunci_rahasia_sekolah_kita")
ALGORITHM = "HS256"
REDIS_URL = os.getenv("REDIS_URL", "redis://:PasswordKuatRedis123!@redis:6379")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


client = genai.Client(api_key=GEMINI_API_KEY)

# Cek Supabase
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("File .env belum disetting dengan benar untuk Supabase!")
else:
    print("Supabase siap!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET_NAME = "pengumuman-image"

# groq inisialisasi


# Inisialisasi Client Groq secara Asynchronous (agar tidak membuat server lemot)
groq_client = AsyncGroq(api_key=GROQ_API_KEY)

# CORS Setup
origins = ["http://localhost:5173", "http://10.0.20.75:5173", "*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# PYDANTIC SCHEMAS (Format Data)
# ==========================================
class AdminResponse(BaseModel):
    id_admin: int
    name_admin: str
    level_admin: str


class AnnouncementCombinedResponse(BaseModel):
    id_announcement: int
    announcement: str
    url_announcemet: Optional[str] = None
    url_image: Optional[str] = None
    date: date
    admin_pembuat: Optional[AdminResponse]

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class AnnouncementCreate(BaseModel):
    announcement: str
    date: date
    url_announcemet: Optional[str] = None
    url_image: Optional[str] = None
    admin_update: int


class BirthdayCreate(BaseModel):
    name: str
    date: date
    gender: models.GenderType
    admin_update: int


class AdminCreate(BaseModel):
    name_admin: str
    password_admin: str
    level_admin: str


class FeedbackCreate(BaseModel):
    pertanyaan_user: str
    jawaban_ai: str
    catatan_user: str = "Jawaban tidak sesuai/format rusak"


# ==========================================
# HELPER FUNCTIONS (Logika Pendukung)
# ==========================================
def interpretasi_pesan_ke_tanggal(teks: str):
    # Wajib gunakan UTC+7 agar sama persis dengan sistem chat
    sekarang_utc = datetime.datetime.utcnow()
    hari_ini = (sekarang_utc + datetime.timedelta(hours=7)).date()
    teks = teks.lower()

    if any(x in teks for x in ["hari ini", "today"]):
        return hari_ini.strftime("%Y-%m-%d")
    elif any(x in teks for x in ["besok", "tomorrow"]):
        return (hari_ini + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    elif any(x in teks for x in ["kemarin lusa"]):
        return (hari_ini - datetime.timedelta(days=2)).strftime("%Y-%m-%d")
    elif any(x in teks for x in ["kemarin", "yesterday"]):
        return (hari_ini - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    return None


def upload_image_to_supabase(file: UploadFile) -> Optional[str]:
    try:
        file.file.seek(0)
        file_bytes = file.file.read()

        ekstensi = file.filename.split(".")[-1] if "." in file.filename else "png"
        nama_file_unik = f"{uuid.uuid4()}.{ekstensi}"

        supabase.storage.from_(BUCKET_NAME).upload(
            path=nama_file_unik,
            file=file_bytes,
            file_options={"content-type": file.content_type},
        )

        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(nama_file_unik)
        return public_url
    except Exception as e:
        print(f"Gagal upload ke Supabase: {e}")
        return None


# ==========================================
# KEAMANAN (JWT & AUTH)
# ==========================================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


def create_access_token(data: dict):
    expire = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("id_admin"):
            raise HTTPException(status_code=401, detail="Token tidak valid")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kedaluwarsa")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Kredensial tidak sah")


# ==========================================
# ENDPOINTS UTAMA (CHATBOT & CRUD)
# ==========================================


@app.on_event("startup")
async def startup():
    redis = aioredis.from_url(REDIS_URL, encoding="utf8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")


# --- FEEDBACK BOT ---
@app.post("/api/feedback")
async def submit_feedback(data: FeedbackCreate, db: Session = Depends(get_db)):
    try:
        new_feedback = models.FeedbackLog(
            pertanyaan_user=data.pertanyaan_user,
            jawaban_ai=data.jawaban_ai,
            catatan_user=data.catatan_user,
        )
        db.add(new_feedback)
        db.commit()
        return {
            "pesan": "Terima kasih! Feedback berhasil disimpan untuk dievaluasi oleh Admin."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# --- WEBSOCKET CHATBOT ---
@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    await websocket.send_text(
        "Halo! Saya Asisten AI Cita Hati. Saya siap membantu menjawab pertanyaanmu seputar pengumuman sekolah, ulang tahun, dan jadwal."
    )

    instruksi_ai = (
        "Kamu adalah Asisten Informasi Internal Trilingual (Indonesia, Inggris, Mandarin) yang profesional, cepat, dan ramah untuk sekolah Cita Hati. "
        "Tugas utamamu adalah membantu pengguna menemukan data terkait Pengumuman, Ulang Tahun, dan Jadwal berdasarkan parameter waktu yang mereka berikan.\n\n"
        "[TUGAS UTAMA & INTEGRASI DATA]\n"
        "Setiap kali pengguna bertanya, kamu harus mengidentifikasi 2 hal utama:\n"
        "1. Kategori Data: Apakah pengguna mencari (a) Pengumuman, (b) Ulang Tahun, atau (c) Jadwal?\n"
        "2. Parameter Waktu: Kapan waktu spesifik yang dicari? Ekstrak informasi Hari (Senin-Minggu, atau 'hari ini', 'besok'), Tanggal spesifik, Bulan, atau Tahun.\n\n"
        "[KEMAMPUAN PENARIKAN DATA]\n"
        "Kamu menangani permintaan Pengumuman, Ulang Tahun, dan Jadwal berdasarkan data (teks referensi) yang diberikan kepadamu.\n\n"
        "[CONTOH VARIASI PERTANYAAN PENGGUNA YANG HARUS KAMU PAHAMI]\n"
        "- 'Info dong buat tgl 12 ntar ada acara apa aja?' -> Niat: Jadwal, Waktu: Tanggal 12.\n"
        "- 'Bulan depan siapa aja yang ultah ya?' -> Niat: Ulang Tahun, Waktu: Bulan depan.\n"
        "- 'What is the schedule for tomorrow?' -> Niat: Jadwal, Waktu: Besok (Match language: English).\n"
        "- '明天有什么安排？' (Míngtiān yǒu shénme ānpái?) -> Niat: Jadwal, Waktu: Besok (Match language: Mandarin).\n"
        "- '15 Mei 2026 ultah siapa?' -> Niat: Ulang Tahun, Waktu: 15 Mei 2026.\n\n"
        "[ATURAN RESPON]\n"
        "- Jika Data Ditemukan: Berikan jawaban yang terstruktur, jelas, dan mudah dibaca (gunakan bullet points jika datanya lebih dari satu).\n"
        "- Jika Data Tidak Ditemukan: Sampaikan dengan sopan bahwa tidak ada data untuk waktu tersebut. (Contoh: 'Maaf, saya tidak menemukan jadwal apapun untuk tanggal 15 Mei 2026.')\n"
        "- Jika Waktu Tidak Jelas: Jangan berasumsi. Tanyakan kembali kepada pengguna waktu spesifik yang mereka maksud. (Contoh: 'Anda mencari pengumuman untuk bulan apa?')\n"
        "- Format Tanggal Baku: Selalu konfirmasi kembali tanggal yang dicari pengguna dalam responmu agar tidak terjadi miskomunikasi. (Contoh: 'Berikut adalah daftar ulang tahun untuk hari ini, 15 Mei 2026: ...')\n\n"
        "[ATURAN TAMBAHAN (CRITICAL)]\n"
        "- ALWAYS match the user's language (Trilingual). Jika pengguna bertanya dalam bahasa Mandarin (Hanzi atau Pinyin), WAJIB balas menggunakan bahasa Mandarin (Simplified Chinese). Jika pengguna bahasa Inggris, balas bahasa Inggris. Jika Indonesia, balas bahasa Indonesia.\n"
        "- DILARANG menjelaskan proses pencarian data.\n"
        "- NEVER say you cannot speak English or Mandarin. You are fully capable.\n"
        "Tugas utamamu adalah membantu pengguna menemukan data terkait Pengumuman, Ulang Tahun, dan Jadwal berdasarkan parameter waktu yang mereka berikan.\n\n"
        "[TUGAS UTAMA & INTEGRASI DATA]\n"
        "Setiap kali pengguna bertanya, kamu harus mengidentifikasi 2 hal utama:\n"
        "1. Kategori Data: Apakah pengguna mencari (a) Pengumuman, (b) Ulang Tahun, atau (c) Jadwal?\n"
        "2. Parameter Waktu: Kapan waktu spesifik yang dicari? Ekstrak informasi Hari (Senin-Minggu, atau 'hari ini', 'besok'), Tanggal spesifik, Bulan, atau Tahun.\n\n"
        "[KEMAMPUAN PENARIKAN DATA]\n"
        "Kamu menangani permintaan Pengumuman, Ulang Tahun, dan Jadwal berdasarkan data (teks referensi) yang diberikan kepadamu.\n\n"
        "[CONTOH VARIASI PERTANYAAN PENGGUNA YANG HARUS KAMU PAHAMI]\n"
        "- 'Info dong buat tgl 12 ntar ada acara apa aja?' -> Niat: Jadwal, Waktu: Tanggal 12.\n"
        "- 'Bulan depan siapa aja yang ultah ya?' -> Niat: Ulang Tahun, Waktu: Bulan depan.\n"
        "- 'What is the schedule for tomorrow?' -> Niat: Jadwal, Waktu: Besok (Match language: English).\n"
        "- '明天有什么安排？' (Míngtiān yǒu shénme ānpái?) -> Niat: Jadwal, Waktu: Besok (Match language: Mandarin).\n"
        "- '15 Mei 2026 ultah siapa?' -> Niat: Ulang Tahun, Waktu: 15 Mei 2026.\n\n"
        "[ATURAN RESPON]\n"
        "- Jika Data Ditemukan: Berikan jawaban yang terstruktur, jelas, dan mudah dibaca (gunakan bullet points jika datanya lebih dari satu).\n"
        "- Jika Data Tidak Ditemukan: Sampaikan dengan sopan bahwa tidak ada data untuk waktu tersebut. (Contoh: 'Maaf, saya tidak menemukan jadwal apapun untuk tanggal 15 Mei 2026.')\n"
        "- Jika Waktu Tidak Jelas: Jangan berasumsi. Tanyakan kembali kepada pengguna waktu spesifik yang mereka maksud. (Contoh: 'Anda mencari pengumuman untuk bulan apa?')\n"
        "- Format Tanggal Baku: Selalu konfirmasi kembali tanggal yang dicari pengguna dalam responmu agar tidak terjadi miskomunikasi. (Contoh: 'Berikut adalah daftar ulang tahun untuk hari ini, 15 Mei 2026: ...')\n\n"
        "[ATURAN TAMBAHAN (CRITICAL)]\n"
        "- ALWAYS match the user's language (Trilingual). Jika pengguna bertanya dalam bahasa Mandarin (Hanzi atau Pinyin), WAJIB balas menggunakan bahasa Mandarin (Simplified Chinese). Jika pengguna bahasa Inggris, balas bahasa Inggris. Jika Indonesia, balas bahasa Indonesia.\n"
        "- DILARANG menjelaskan proses pencarian data.\n"
        "- NEVER say you cannot speak English or Mandarin. You are fully capable."
    )
    chat_history = [{"role": "system", "content": instruksi_ai}]

    try:
        while True:
            pesan_user = await websocket.receive_text()
            pesan_lower = pesan_user.lower()

            # Sinkronisasi Waktu
            sekarang_utc = datetime.datetime.utcnow()
            sekarang = sekarang_utc + datetime.timedelta(hours=7)

            tgl_hari_ini = sekarang.strftime("%d %B %Y")
            jam_sekarang = sekarang.strftime("%H.%M")
            hari_pencarian_inggris = sekarang.strftime("%A")

            bulan_indo = {
                1: "Januari",
                2: "Februari",
                3: "Maret",
                4: "April",
                5: "Mei",
                6: "Juni",
                7: "Juli",
                8: "Agustus",
                9: "September",
                10: "Oktober",
                11: "November",
                12: "Desember",
            }

            # Filter DB berdasarkan teks pencarian
            keyword_tanggal = interpretasi_pesan_ke_tanggal(pesan_user)
            filter_db = []
            filter_ultah = []

            if keyword_tanggal:
                filter_db.append(
                    cast(models.Announcements.date, String).ilike(
                        f"%{keyword_tanggal}%"
                    )
                )
                bulan_hari = keyword_tanggal[4:]
                filter_ultah.append(
                    cast(models.Birthdays.date, String).ilike(f"%{bulan_hari}%")
                )
            else:
                mapping_bulan = {
                    "januari": "-01-",
                    "january": "-01-",
                    "februari": "-02-",
                    "february": "-02-",
                    "maret": "-03-",
                    "march": "-03-",
                    "april": "-04-",
                    "mei": "-05-",
                    "may": "-05-",
                    "juni": "-06-",
                    "june": "-06-",
                    "juli": "-07-",
                    "july": "-07-",
                    "agustus": "-08-",
                    "august": "-08-",
                    "september": "-09-",
                    "oktober": "-10-",
                    "october": "-10-",
                    "november": "-11-",
                    "desember": "-12-",
                    "december": "-12-",
                }

                kata_kunci = pesan_lower.split()
                for kata in kata_kunci:
                    kata_bersih = "".join(h for h in kata if h.isalnum())
                    if len(kata_bersih) >= 2:
                        pencarian = mapping_bulan.get(kata_bersih, kata_bersih)
                        filter_db.append(
                            or_(
                                models.Announcements.announcement.ilike(
                                    f"%{kata_bersih}%"
                                ),
                                cast(models.Announcements.date, String).ilike(
                                    f"%{pencarian}%"
                                ),
                            )
                        )
                        filter_ultah.append(
                            or_(
                                models.Birthdays.name.ilike(f"%{kata_bersih}%"),
                                cast(models.Birthdays.date, String).ilike(
                                    f"%{pencarian}%"
                                ),
                            )
                        )

            # Eksekusi DB
            if filter_db:
                hasil_pencarian = (
                    db.query(models.Announcements)
                    .filter(or_(*filter_db))
                    .order_by(models.Announcements.date.desc())
                    .limit(5)
                    .all()
                )
            else:
                hasil_pencarian = (
                    db.query(models.Announcements)
                    .order_by(models.Announcements.date.desc())
                    .limit(3)
                    .all()
                )

            if filter_ultah:
                hasil_ultah = (
                    db.query(models.Birthdays).filter(or_(*filter_ultah)).limit(5).all()
                )
            else:
                hari_ini_str = sekarang.strftime("-%m-%d")
                hasil_ultah = (
                    db.query(models.Birthdays)
                    .filter(
                        cast(models.Birthdays.date, String).ilike(f"%{hari_ini_str}%")
                    )
                    .all()
                )

            # Susun Teks Referensi AI
            teks_referensi = "=== DATA PENGUMUMAN ===\n"
            if not hasil_pencarian:
                teks_referensi += "Tidak ada pengumuman.\n"
            for p in hasil_pencarian:
                tgl_rapi = f"{p.date.day} {bulan_indo[p.date.month]} {p.date.year}"
                img = (
                    p.url_image
                    if hasattr(p, "url_image") and p.url_image
                    else "TIDAK ADA"
                )
                link = (
                    p.url_announcemet
                    if hasattr(p, "url_announcemet") and p.url_announcemet
                    else "TIDAK ADA"
                )

                teks_referensi += (
                    f"Tanggal: {tgl_rapi}\n"
                    f"Isi Pengumuman: {p.announcement}\n"
                    f"URL_LINK: {link}\n"
                    f"URL_GAMBAR: {img}\n"
                    "-----\n"
                )

            teks_referensi += "\n=== DATA ULANG TAHUN ===\n"
            if not hasil_ultah:
                teks_referensi += "- Tidak ada data ulang tahun.\n"
            for b in hasil_ultah:
                tgl_ultah = f"{b.date.day} {bulan_indo[b.date.month]}"
                gender_val = (
                    b.gender.name.lower()
                    if hasattr(b.gender, "name")
                    else str(b.gender).lower()
                )
                pronoun_hint = (
                    "he/his"
                    if (
                        "l" in gender_val
                        or "male" in gender_val
                        or "laki" in gender_val
                    )
                    else "she/her"
                )
                teks_referensi += (
                    f"- Nama: {b.name} | Tgl: {tgl_ultah} | He/She: {pronoun_hint}\n"
                )

            # Logika Jadwal
            mapping_hari = {
                "senin": "Monday",
                "monday": "Monday",
                "星期一": "Monday",
                "selasa": "Tuesday",
                "tuesday": "Tuesday",
                "星期二": "Tuesday",
                "rabu": "Wednesday",
                "wednesday": "Wednesday",
                "星期三": "Wednesday",
                "kamis": "Thursday",
                "thursday": "Thursday",
                "星期四": "Thursday",
                "jumat": "Friday",
                "friday": "Friday",
                "星期五": "Friday",
                "kemarin": (sekarang - datetime.timedelta(days=1)).strftime("%A"),
                "yesterday": (sekarang - datetime.timedelta(days=1)).strftime("%A"),
                "昨天": (sekarang - datetime.timedelta(days=1)).strftime("%A"),
                "besok": (sekarang + datetime.timedelta(days=1)).strftime("%A"),
                "tomorrow": (sekarang + datetime.timedelta(days=1)).strftime("%A"),
                "明天": (sekarang + datetime.timedelta(days=1)).strftime("%A"),
                "lusa": (sekarang + datetime.timedelta(days=2)).strftime("%A"),
            }

            for kata_hari, nama_hari_en in mapping_hari.items():
                if kata_hari in pesan_lower.split() or kata_hari in pesan_lower:
                    hari_pencarian_inggris = nama_hari_en
                    break

            jam_dicari = None
            match_jam = re.search(r"\b(\d{1,2})[\.\:](\d{2})\b", pesan_lower)
            if match_jam:
                jam_dicari = f"{int(match_jam.group(1)):02d}.{match_jam.group(2)}"

            kata_kunci_jadwal = [
                "jadwal",
                "kelas",
                "pelajaran",
                "guru",
                "sekarang",
                "ngajar",
                "siapa",
                "apa",
                "istirahat",
                "break",
                "hari ini",
                "jam",
                "schedule",
                "class",
                "teacher",
                "now",
                "today",
                "日程",
                "课程",
                "老师",
                "现在",
                "今天",
                "时间",
            ] + list(mapping_hari.keys())

            is_asking_schedule = any(
                k in pesan_lower for k in kata_kunci_jadwal
            ) or any(char.isdigit() for char in pesan_lower)

            if is_asking_schedule:
                teks_referensi += (
                    f"\n=== DATA JADWAL (HARI: {hari_pencarian_inggris}) ===\n"
                )
                if jam_dicari:
                    teks_referensi += f"*[INFO: User secara khusus menanyakan jadwal pada jam: {jam_dicari}]*\n"

                ada_data_jadwal = False
                kelas_ditemukan = []

                def is_time_in_range(time_to_check, time_range_str):
                    if not time_to_check:
                        return True
                    try:
                        start_str, end_str = time_range_str.split("-")
                        start_minutes = int(start_str.split(".")[0]) * 60 + int(
                            start_str.split(".")[1]
                        )
                        end_minutes = int(end_str.split(".")[0]) * 60 + int(
                            end_str.split(".")[1]
                        )
                        check_minutes = int(time_to_check.split(".")[0]) * 60 + int(
                            time_to_check.split(".")[1]
                        )
                        return start_minutes <= check_minutes < end_minutes
                    except:
                        return False

                for kls in JADWAL_SEKOLAH.get("classes", []):
                    nama_kls = kls.get("class", "").lower()
                    wali_list = kls.get("homeroom_teachers", [])
                    dipanggil_wali = any(
                        pesan_lower.find(
                            w.lower().replace("ms. ", "").replace("mr. ", "").split()[0]
                        )
                        != -1
                        for w in wali_list
                    )

                    if nama_kls in pesan_lower or dipanggil_wali:
                        kelas_ditemukan.append(nama_kls)
                        jadwal_terpilih = ""
                        for sesi in kls.get("schedule", {}).get(
                            hari_pencarian_inggris, []
                        ):
                            if is_time_in_range(jam_dicari, sesi["time"]):
                                jadwal_terpilih += f"- {sesi['time']} | Mapel/Aktivitas: {sesi['subject']}\n"

                        if jadwal_terpilih:
                            ada_data_jadwal = True
                            wali = ", ".join(wali_list)
                            teks_referensi += f"\n[JADWAL KELAS {kls['class'].upper()}]\n- Wali Kelas: {wali}\n{jadwal_terpilih}"

                for dept in JADWAL_SEKOLAH.get("departments", []):
                    nama_dept = dept.get("department", "")
                    for guru in dept.get("teachers", []):
                        nama_guru = guru.get("teacher", "")
                        nama_panggilan = (
                            nama_guru.lower()
                            .replace("ms. ", "")
                            .replace("mr. ", "")
                            .split()[0]
                        )
                        jadwal_guru_hari_ini = guru.get("schedule", {}).get(
                            hari_pencarian_inggris, []
                        )
                        ngajar_kelas_dicari = (
                            any(
                                c in str(jadwal_guru_hari_ini).lower()
                                for c in kelas_ditemukan
                            )
                            if kelas_ditemukan
                            else False
                        )

                        if nama_panggilan in pesan_lower or ngajar_kelas_dicari:
                            jadwal_terpilih = ""
                            for sesi in jadwal_guru_hari_ini:
                                if is_time_in_range(jam_dicari, sesi["time"]):
                                    info_sesi = sesi.get(
                                        "class", sesi.get("activity", "Kosong")
                                    )
                                    jadwal_terpilih += f"- {sesi['time']} | Mengajar Kelas/Kegiatan: {info_sesi}\n"

                            if jadwal_terpilih:
                                ada_data_jadwal = True
                                teks_referensi += f"\n[JADWAL GURU SPESIALIS: {nama_guru} ({nama_dept})]\n{jadwal_terpilih}"

                if not ada_data_jadwal and "sekarang" in pesan_lower:
                    teks_referensi += "- (INFO UNTUK AI: User bertanya waktu 'sekarang' tapi tidak menyebut kelas atau guru. Minta user memperjelas).\n"
                elif not ada_data_jadwal:
                    waktu_keterangan = f" pada jam {jam_dicari}" if jam_dicari else ""
                    teks_referensi += f"- Maaf, tidak ada jadwal yang tercatat untuk hari {hari_pencarian_inggris}{waktu_keterangan} dengan kriteria tersebut.\n"

            # Memory Kesalahan dari Database
            catatan_feedback = (
                db.query(models.FeedbackLog)
                .order_by(models.FeedbackLog.created_at.desc())
                .limit(5)
                .all()
            )
            teks_pelajaran_ai = ""
            if catatan_feedback:
                teks_pelajaran_ai = (
                    "\n[⚠️ PENTING: CATATAN EVALUASI DARI KESALAHANMU SEBELUMNYA]\n"
                    "Berikut adalah daftar kesalahan format yang pernah kamu buat berdasarkan laporan pengguna. JANGAN ulangi kesalahan yang sama!\n"
                )
                for fb in catatan_feedback:
                    teks_pelajaran_ai += (
                        f"- Saat ditanya: '{fb.pertanyaan_user}'\n"
                        f"  Jawabanmu yang salah: '{fb.jawaban_ai}'\n"
                        f"  Koreksi/Catatan: {fb.catatan_user}\n\n"
                    )
                teks_pelajaran_ai += (
                    "Pastikan jawabanmu sekarang lebih baik dan FORMATNYA BENAR!\n\n"
                )

            # Prompt AI Final
            prompt_untuk_ai = (
                f"=== SYSTEM CONTEXT ===\n"
                f"Today's Date: {tgl_hari_ini} ({hari_pencarian_inggris})\n"
                f"Current Time: {jam_sekarang} WIB\n"
                f"Target Date for this request: {keyword_tanggal if keyword_tanggal else 'Pencarian Kata Kunci'}\n"
                "=======================\n\n"
                f"{teks_referensi}\n"
                # --------------------------------------------------
            )
            history_text = (
                "".join(
                    [
                        f"{msg['role'].upper()}: {msg['content']}\n"
                        for msg in chat_history[-4:]
                    ]
                )
                if chat_history
                else "Belum ada riwayat."
            )
            # =========================================================
            # OPTIMASI MEMORI HISTORY: AMBIL 4 PESAN TERAKHIR SAJA
            # =========================================================

            # Kita gabungkan semua data dan aturan ke dalam 1 pesan agar AI merespons 1x jalan
            # --- PROMPT AI KONSOLIDASI (SINGLE-REQUEST) ---
            # --- PROMPT AI KONSOLIDASI (SUPER SHORT & STRICT) ---
            prompt_konsolidasi = f"""
            Anda adalah Asisten AI Sekolah Cita Hati. Jawab HANYA berdasarkan <DATA_REFERENSI>. Sesuaikan bahasa balasan dengan bahasa pengguna.

            <DATA_REFERENSI>
            {prompt_untuk_ai}
            
            <RIWAYAT_OBROLAN>
            {history_text}
            </RIWAYAT_OBROLAN>
            
              <CATATAN_EVALUASI>
            ⚠️ JANGAN tiru format atau isi dari kesalahan masa lalu ini:
            {teks_pelajaran_ai}
            </CATATAN_EVALUASI>
            
            </DATA_REFERENSI>
            
          === ATURAN MUTLAK & NAVIGASI DATA ===
            1. PEMBAGIAN ZONA REFERENSI (SANGAT PENTING):
               - Jika ditanya JADWAL/KELAS/GURU: HANYA baca di bawah zona "=== DATA JADWAL ===".
               - Jika ditanya ULANG TAHUN: HANYA baca di bawah zona "=== DATA ULANG TAHUN ===".
               - Jika ditanya PENGUMUMAN/INFO: HANYA baca di bawah zona "=== DATA PENGUMUMAN ===".
               ⚠️ DILARANG menyilang data! Jika kamu mencari jadwal jam 17.51 dan tidak menemukannya di zona "DATA JADWAL", MAKA ANGGAP KOSONG. Jangan mengambil angka 17.51 dari zona pengumuman!

            2. FORMAT UMUM: 
               - Jawab to-the-point. DILARANG menjelaskan proses pencarian data berdasar <DATA_REFERENSI>. 
               - Gunakan ENTER sebagai pemisah baris. DILARANG pakai karakter '|' atau membuat label buatan (seperti "Isi:", "Link:", "Gambar:").

            3. ATURAN JADWAL: 
               - Waktu Sekarang: Jika ada kata "sekarang", cocokkan jam {jam_sekarang} HANYA dengan rentang waktu di "DATA JADWAL".
                 * Jika KELAS ditemukan di rentang waktu itu: "Kelas [X] sedang belajar [Pelajaran] bersama [Guru]."
                 * Jika GURU ditemukan di rentang waktu itu: "[Guru] sedang mengajar kelas [X] dengan pelajaran [Mapel]."
                 * JIKA jam {jam_sekarang} TIDAK TERCATAT pada kelas/guru tersebut di "DATA JADWAL", wajib jawab tegas: "Guru/Kelas tersebut sedang kosong/istirahat saat ini."
               - Waktu Spesifik (misal 17.51): Cari jam spesifik tersebut HANYA di "DATA JADWAL". Jika tidak ada di jadwal kelas/guru itu, jawab: "Tidak ada jadwal untuk waktu tersebut."
               - Full/Kegiatan Umum: Berikan *bullet points*. Jika tertulis 'Break'/'Assembly', sebutkan sedang kegiatan tersebut.
               - Ambigu: Jika user hanya bilang "jadwal sekarang", minta perjelas guru atau kelas apa.

            4. ATURAN ULANG TAHUN:
               - HANYA cek di "DATA ULANG TAHUN". Jika nama/tanggal tidak ada di zona ini, jawab tegas tidak ada.
               - Jika tanggal ultah bertepatan dengan hari ini ({tgl_hari_ini}), gunakan: "Selamat Ulang Tahun 🎂🎉 kepada [Nama]". 
               - Jika tanggal dicari BUKAN hari ini, gunakan: "Yang berulang tahun pada tanggal tersebut adalah [Nama]".
               - Jika zona ultah menyatakan tidak ada data hari ini, jawab: "Tidak ada yang berulang tahun hari ini 😔".
               - DILARANG KERAS menyebutkan/menghitung umur!

            5. ATURAN PENGUMUMAN (ANTI-HALUSINASI):
               - HANYA cek di "DATA PENGUMUMAN". Jika tidak ada info di tanggal yang dicari, WAJIB tulis: "Maaf, tidak ada pengumuman untuk tanggal tersebut. Berikut pengumuman terbaru:" (lalu tampilkan yang ada di zona pengumuman).
               - WAJIB gunakan template murni ini (Abaikan baris Link/Gambar jika di data tertulis 'TIDAK ADA'):
               
               📣 **(Buat 1 Judul Relevan)**
               
               (Tulis teks pengumuman murni di sini)
               
               [Buka Tautan Pengumuman](URL_LINK)
               ![Lampiran Pengumuman](URL_GAMBAR)
               
               ---
               💡 **Saran:** (Buat 1 kalimat saran praktis terkait pengumuman)

            =========================================
            PESAN PENGGUNA: "{pesan_user}"
            JAWABAN:
            """
            messages_to_send = chat_history.copy()
            messages_to_send.append({"role": "user", "content": prompt_konsolidasi})

            try:

                try:
                    print("Mengirim request ke Groq (llama-3.3-70b-versatile)...")
                    response = await groq_client.chat.completions.create(
                        messages=messages_to_send,
                        model="llama-3.3-70b-versatile",
                        temperature=0.1,
                    )
                    balasan_ai_final = response.choices[0].message.content
                except Exception as e:

                    print(
                        f"terjadi {str(e)} dengan Groq, mencoba fallback ke Google Gemini 2.5 Flash..."
                    )
                    # Inisialisasi Model dengan System Prompt
                    response = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=prompt_konsolidasi,
                        config=types.GenerateContentConfig(
                            system_instruction=instruksi_ai,
                            temperature=0.1,
                        ),
                    )
                    # Ekstrak teks balasannya
                    balasan_ai_final = response.text.strip()

                    # Simpan balasan ke history obrolan
                    # Simpan ke buku catatan
                    chat_history.append({"role": "user", "content": pesan_user})
                    chat_history.append(
                        {"role": "assistant", "content": balasan_ai_final}
                    )  # <--- KEMBALIKAN KE ASSISTANT

                # Kirim ke frontend React (await ini wajib karena ini fungsi WebSocket FastAPI)
                await websocket.send_text(balasan_ai_final)

            except Exception as e:
                print(f"Kondisi Kritis Terjadi: {str(e)}")
                # Tampilkan data langsung dari database sekolah jika sistem benar-benar mati
                fallback_response = (
                    "🤖 **[Sistem AI Sibuk - Menampilkan Data Langsung]**\n\n"
                    "Mohon maaf, server AI kami sedang penuh. "
                    "Namun, berikut adalah data resmi yang berhasil saya temukan dari database:\n\n"
                    f"{teks_referensi.replace('===', '').strip()}\n\n"
                    "---\n"
                    "💡 **Saran:** Silakan coba kirim pesan kembali dalam beberapa detik."
                )
                await websocket.send_text(fallback_response)

    except WebSocketDisconnect:
        print("Pengguna telah keluar dari sesi chat.")


# --- ENDPOINTS CRUD (LOGIN, PENGUMUMAN, ULANG TAHUN, ADMIN) ---


@app.post("/api/login")
async def login_admin(data: LoginRequest, db: Session = Depends(get_db)):
    login_admin = (
        db.query(models.Admin).filter(models.Admin.name_admin == data.username).first()
    )

    if not login_admin or login_admin.password_admin != data.password:
        raise HTTPException(status_code=401, detail="Username and Password Wrong!")

    token_data = {
        "username": login_admin.name_admin,
        "id_admin": login_admin.id_admin,
        "role": login_admin.level_admin,
    }

    jwt_token = create_access_token(data=token_data)
    await FastAPICache.clear()

    return {
        "pesan": "Login berhasil!",
        "access_token": jwt_token,
        "token_type": "bearer",
        "role": login_admin.level_admin,
        "username": login_admin.name_admin,
        "id_admin": login_admin.id_admin,
    }


@app.get("/api/announcements")
@cache(expire=10000)
def get_all_announcements(
    tanggal: Optional[date] = None, db: Session = Depends(get_db)
):
    pencarian = db.query(models.Announcements)
    if tanggal:
        pencarian = pencarian.filter(models.Announcements.date == tanggal)
    pengumuman = pencarian.order_by(models.Announcements.date.desc()).all()
    return pengumuman


@app.get("/api/announcements", response_model=List[AnnouncementCombinedResponse])
@cache(expire=3600)
def get_announcements(
    db: Session = Depends(get_db), user_aktif: dict = Depends(get_current_user)
):
    return (
        db.query(models.Announcements).order_by(models.Announcements.date.desc()).all()
    )


@app.post("/api/announcements")
async def create_announcement(
    announcement: str = Form(...),
    tanggal_masuk: date = Form(...),
    admin_update: int = Form(...),
    url_announcemet: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    cek_admin = (
        db.query(models.Admin).filter(models.Admin.id_admin == admin_update).first()
    )
    if not cek_admin:
        raise HTTPException(status_code=404, detail="Admin tidak ditemukan!")

    img_url = upload_image_to_supabase(image) if image else None

    new_entry = models.Announcements(
        announcement=announcement,
        date=tanggal_masuk,
        admin_update=admin_update,
        url_announcemet=url_announcemet,
        url_image=img_url,
    )

    db.add(new_entry)
    db.commit()
    await FastAPICache.clear()
    return {"message": "Pengumuman berhasil dibuat!", "data": new_entry}


@app.get(
    "/api/announcements-with-admin", response_model=List[AnnouncementCombinedResponse]
)
@cache(expire=10000)
def get_announcements_with_admin_details(
    db: Session = Depends(get_db), user_aktif: dict = Depends(get_current_user)
):
    try:
        return db.query(models.Announcements).all()
    except Exception as e:
        print(f"Error saat mengambil data gabungan: {e}")
        raise HTTPException(
            status_code=500, detail="Terjadi kesalahan server internal."
        )


@app.get("/api/birthdays")
@cache(expire=10000)
def get_all_birthdays(db: Session = Depends(get_db)):
    return db.query(models.Birthdays).all()


@app.post("/api/birthdays")
async def create_birthday(
    data: BirthdayCreate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    cek_admin = (
        db.query(models.Admin)
        .filter(models.Admin.id_admin == data.admin_update)
        .first()
    )
    if not cek_admin:
        raise HTTPException(status_code=404, detail="Admin tidak ditemukan!")

    ultah_baru = models.Birthdays(
        name=data.name,
        date=data.date,
        gender=data.gender,
        admin_update=data.admin_update,
    )
    db.add(ultah_baru)
    db.commit()
    db.refresh(ultah_baru)
    await FastAPICache.clear()
    return {"pesan": "Data ulang tahun berhasil ditambahkan!", "data": ultah_baru}


@app.put("/api/announcements/{id_announcement}")
async def update_announcement(
    id_announcement: int,
    announcement: str = Form(...),
    tanggal_masuk: date = Form(...),
    admin_update: int = Form(...),
    url_announcemet: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    pengumuman_lama = (
        db.query(models.Announcements)
        .filter(models.Announcements.id_announcement == id_announcement)
        .first()
    )

    if not pengumuman_lama:
        raise HTTPException(
            status_code=404, detail="Pengumuman tidak ditemukan di database."
        )

    pengumuman_lama.announcement = announcement
    pengumuman_lama.date = tanggal_masuk
    pengumuman_lama.admin_update = admin_update
    pengumuman_lama.url_announcemet = url_announcemet

    if image:
        pengumuman_lama.url_image = upload_image_to_supabase(image)

    db.commit()
    db.refresh(pengumuman_lama)
    await FastAPICache.clear()
    return {"message": "Pengumuman berhasil diupdate!", "data": pengumuman_lama}


@app.put("/api/birthdays/{id_birthday}")
async def update_birthday(
    id_birthday: int,
    data_baru: BirthdayCreate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    birthday_lama = (
        db.query(models.Birthdays)
        .filter(models.Birthdays.id_birthday == id_birthday)
        .first()
    )

    if not birthday_lama:
        raise HTTPException(
            status_code=404, detail="Ulang tahun tidak ditemukan di database."
        )

    birthday_lama.name = data_baru.name
    birthday_lama.date = data_baru.date
    birthday_lama.gender = data_baru.gender
    birthday_lama.admin_update = data_baru.admin_update

    db.commit()
    db.refresh(birthday_lama)
    await FastAPICache.clear()
    return {"message": "Data ulang tahun berhasil diupdate!", "data": birthday_lama}


@app.delete("/api/announcements/{id_announcement}")
async def delete_announcement(
    id_announcement: int,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    pengumuman_target = (
        db.query(models.Announcements)
        .filter(models.Announcements.id_announcement == id_announcement)
        .first()
    )

    if not pengumuman_target:
        raise HTTPException(
            status_code=404, detail="Pengumuman tidak ditemukan atau sudah dihapus."
        )

    db.delete(pengumuman_target)
    db.commit()
    await FastAPICache.clear()
    return {"message": "Pengumuman berhasil dihapus secara permanen!"}


@app.delete("/api/birthdays/{id_birthday}")
async def delete_birthday(
    id_birthday: int,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    list_target_birthday = (
        db.query(models.Birthdays)
        .filter(models.Birthdays.id_birthday == id_birthday)
        .first()
    )

    if not list_target_birthday:
        raise HTTPException(
            status_code=404,
            detail="Data ulang tahun tidak ditemukan atau sudah dihapus.",
        )

    db.delete(list_target_birthday)
    db.commit()
    await FastAPICache.clear()
    return {"message": "Data ulang Tahun berhasil dihapus secara permanen!"}


@app.get("/api/admin")
@cache(expire=3600)
def get_all_admins(db: Session = Depends(get_db)):
    return db.query(models.Admin).all()


@app.post("/api/admin")
async def create_admin(
    data: AdminCreate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    new_admin = models.Admin(
        name_admin=data.name_admin,
        password_admin=data.password_admin,
        level_admin=data.level_admin,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    await FastAPICache.clear()
    return {"pesan": "Data admin berhasil disimpan!", "data": new_admin}


@app.put("/api/admin/{id_admin}")
async def update_admin(
    id_admin: int,
    data_baru: AdminCreate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    id_admin_lama = (
        db.query(models.Admin).filter(models.Admin.id_admin == id_admin).first()
    )

    if not id_admin_lama:
        raise HTTPException(status_code=404, detail="Admin tidak ditemukan")

    id_admin_lama.name_admin = data_baru.name_admin
    id_admin_lama.password_admin = data_baru.password_admin
    id_admin_lama.level_admin = data_baru.level_admin
    db.commit()
    db.refresh(id_admin_lama)
    await FastAPICache.clear()
    return {"message": "Admin berhasil diupdate!", "data": id_admin_lama}


@app.delete("/api/admin/{id_admin}")
async def delete_admin(
    id_admin: int,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    list_target_admin = (
        db.query(models.Admin).filter(models.Admin.id_admin == id_admin).first()
    )

    if not list_target_admin:
        raise HTTPException(
            status_code=404, detail="Admin tidak ditemukan atau sudah dihapus."
        )

    db.delete(list_target_admin)
    db.commit()
    await FastAPICache.clear()
    return {"message": "Admin berhasil dihapus secara permanen!"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
