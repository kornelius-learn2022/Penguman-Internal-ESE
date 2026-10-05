import os
import re
import asyncio
import datetime
import time
from itertools import groupby
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from typing import Optional
from dotenv import load_dotenv

import pandas as pd

import models
import schemas
from database import get_db

load_dotenv()

router = APIRouter(prefix="/api")

# Inisialisasi API Keys
GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or "").strip()
GROQ_API_KEY = (os.getenv("GROQ_API_KEY") or "").strip()

# ============================================================
# IN-MEMORY CACHE UNTUK CSV JADWAL KELAS
# Load sekali saat startup, reload otomatis jika file berubah
# ============================================================
_class_df_cache = {"df": None, "mtime": 0.0, "path": ""}

def _get_class_csv_path() -> str:
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(backend_dir, "..", "JADWAL_KELAS_MASTER.csv")
    if not os.path.exists(csv_path):
        csv_path = os.path.join(backend_dir, "JADWAL_KELAS_MASTER.csv")
    return csv_path

def get_class_df() -> pd.DataFrame:
    """Mengembalikan DataFrame JADWAL_KELAS_MASTER dari cache in-memory.
    Hanya membaca ulang dari disk jika file berubah (mtime berbeda)."""
    csv_path = _get_class_csv_path()
    if not os.path.exists(csv_path):
        return pd.DataFrame()
    try:
        current_mtime = os.path.getmtime(csv_path)
        if (
            _class_df_cache["df"] is None
            or _class_df_cache["mtime"] != current_mtime
            or _class_df_cache["path"] != csv_path
        ):
            _class_df_cache["df"] = pd.read_csv(csv_path)
            _class_df_cache["mtime"] = current_mtime
            _class_df_cache["path"] = csv_path
    except Exception:
        if _class_df_cache["df"] is None:
            return pd.DataFrame()
    return _class_df_cache["df"]

# ============================================================
# CACHE UNTUK NAMA GURU (TTL 60 DETIK)
# Menghindari 2 query distinct() ke DB setiap request chat
# ============================================================
_teacher_names_cache = {"sched": [], "duty": [], "timestamp": 0.0}
_TEACHER_CACHE_TTL = 60  # detik

def get_teacher_names(db: Session):
    """Mengembalikan (sched_teachers, duty_teachers) dari cache.
    Refresh otomatis setiap 60 detik."""
    now = time.monotonic()
    if now - _teacher_names_cache["timestamp"] > _TEACHER_CACHE_TTL:
        sched = [t[0].strip() for t in db.query(models.TeacherSchedule.teacher_name).distinct().all() if t[0]]
        duty  = [t[0].strip() for t in db.query(models.TeacherDuty.teacher_name).distinct().all() if t[0]]
        _teacher_names_cache["sched"] = sched
        _teacher_names_cache["duty"]  = duty
        _teacher_names_cache["timestamp"] = now
    return _teacher_names_cache["sched"], _teacher_names_cache["duty"]


# ============================================================
# IN-MEMORY CACHE UNTUK PERTANYAAN CHAT REPETITIF (TTL 5 MENIT)
# Mengembalikan respons instan (< 10 ms) tanpa membebani kuota API
# ============================================================
_CHAT_CACHE_TTL = 300  # 5 menit
_chat_response_cache = {}

def _get_chat_cache_key(msg: str) -> str:
    cleaned = re.sub(r"[^\w\s]", "", msg.lower()).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    now_wib = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=7)
    today_str = now_wib.strftime("%Y-%m-%d")
    return f"{today_str}:{cleaned}"


MONTHS_MAP = {
    "januari": 1, "january": 1, "jan": 1, "1月": 1,
    "februari": 2, "february": 2, "feb": 2, "2月": 2,
    "maret": 3, "march": 3, "mar": 3, "3月": 3,
    "april": 4, "apr": 4, "4月": 4,
    "mei": 5, "may": 5, "5月": 5,
    "juni": 6, "june": 6, "jun": 6, "6月": 6,
    "juli": 7, "july": 7, "jul": 7, "7月": 7,
    "agustus": 8, "august": 8, "aug": 8, "8月": 8,
    "september": 9, "sep": 9, "sept": 9, "9月": 9,
    "oktober": 10, "october": 10, "oct": 10, "10月": 10,
    "november": 11, "nov": 11, "11月": 11,
    "desember": 12, "december": 12, "dec": 12, "12月": 12,
}

DAYS_NAME = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

DAY_TRANS = {
    "Monday": "Monday / Senin / 周一",
    "Tuesday": "Tuesday / Selasa / 周二",
    "Wednesday": "Wednesday / Rabu / 周三",
    "Thursday": "Thursday / Kamis / 周四",
    "Friday": "Friday / Jumat / 周五",
    "Saturday": "Saturday / Sabtu / 周六",
    "Sunday": "Sunday / Minggu / 周日"
}

def parse_query_date(msg: str, base_date: datetime.date):
    """Mendeteksi tanggal dari pertanyaan pengguna (relatif maupun tanggal spesifik)"""
    msg_lower = msg.lower()
    
    # 1. Kata kunci tanggal relatif
    if any(w in msg_lower for w in ["besok", "tomorrow", "明天"]):
        t_date = base_date + datetime.timedelta(days=1)
        return t_date, DAYS_NAME[t_date.weekday()], "besok / tomorrow"
    if any(w in msg_lower for w in ["lusa", "day after tomorrow", "后天"]):
        t_date = base_date + datetime.timedelta(days=2)
        return t_date, DAYS_NAME[t_date.weekday()], "lusa / day after tomorrow"
    if any(w in msg_lower for w in ["kemarin", "yesterday", "昨天"]):
        t_date = base_date + datetime.timedelta(days=-1)
        return t_date, DAYS_NAME[t_date.weekday()], "kemarin / yesterday"
    if any(w in msg_lower for w in ["hari ini", "today", "今天"]):
        return base_date, DAYS_NAME[base_date.weekday()], "hari ini / today"
    
    # 2. Format ISO: 2026-05-15 atau 2026/05/15
    m_iso = re.search(r"\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b", msg)
    if m_iso:
        try:
            t_date = datetime.date(int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3)))
            return t_date, DAYS_NAME[t_date.weekday()], f"tanggal {t_date}"
        except ValueError:
            pass

    # 3. Format teks: tanggal 14 Mei 2026, 15 Mei, 18 September
    months_pattern = "|".join(MONTHS_MAP.keys())
    m_text = re.search(rf"\b(?:tanggal|tgl)?\s*(\d{{1,2}})\s*({months_pattern})(?:\s*(\d{{4}}))?\b", msg_lower)
    if m_text:
        try:
            day_val = int(m_text.group(1))
            month_val = MONTHS_MAP[m_text.group(2)]
            year_val = int(m_text.group(3)) if m_text.group(3) else base_date.year
            t_date = datetime.date(year_val, month_val, day_val)
            return t_date, DAYS_NAME[t_date.weekday()], f"tanggal {day_val} {m_text.group(2).capitalize()} {year_val}"
        except ValueError:
            pass
            
    return None, None, None


def parse_query_time(msg: str, now_dt: datetime.datetime):
    """Mendeteksi apakah pertanyaan menanyakan jam sekarang atau jam spesifik tertentu"""
    msg_lower = msg.lower()
    
    # 1. Menanyakan waktu sekarang / saat ini
    if any(w in msg_lower for w in ["sekarang", "saat ini", "now", "此时", "现在"]):
        return now_dt.time(), f"{now_dt.strftime('%H.%M')} WIB", True

    # 2. Jam spesifik: jam 10.00, 08:35, pukul 08.20, 8:15 am, 1 pm
    m_hm = re.search(r"\b(?:jam|pukul|at)?\s*([0-2]?\d)[.:]([0-5]\d)\s*(am|pm|pagi|siang|sore|malam)?\b", msg_lower)
    if m_hm:
        h = int(m_hm.group(1))
        m = int(m_hm.group(2))
        ampm = m_hm.group(3)
        if ampm == "siang" and 1 <= h <= 5:
            h += 12
        elif ampm in ["sore", "malam", "pm"] and 1 <= h <= 11:
            h += 12
        elif ampm in ["am", "pagi"] and h == 12:
            h = 0
        if 0 <= h <= 23 and 0 <= m <= 59:
            return datetime.time(h, m), f"{h:02d}.{m:02d} WIB", False

    # 3. Jam bulat: jam 10, pukul 8
    m_h = re.search(r"\b(?:jam|pukul)\s*([0-2]?\d)\s*(am|pm|pagi|siang|sore|malam)?\b", msg_lower)
    if m_h:
        h = int(m_h.group(1))
        ampm = m_h.group(2)
        if ampm == "siang" and 1 <= h <= 5:
            h += 12
        elif ampm in ["sore", "malam", "pm"] and 1 <= h <= 11:
            h += 12
        elif ampm in ["am", "pagi"] and h == 12:
            h = 0
        if 0 <= h <= 23:
            return datetime.time(h, 0), f"{h:02d}.00 WIB", False

    return None, None, False


def is_time_in_slot(query_time: datetime.time, slot_str: str) -> bool:
    """Mengecek apakah query_time berada di dalam slot waktu '08.00-08.35'"""
    if not slot_str or "-" not in slot_str:
        return False
    try:
        start_str, end_str = slot_str.split("-")
        start_m = int(start_str.replace(":", ".").split(".")[0]) * 60 + int(start_str.replace(":", ".").split(".")[1])
        end_m = int(end_str.replace(":", ".").split(".")[0]) * 60 + int(end_str.replace(":", ".").split(".")[1])
        q_m = query_time.hour * 60 + query_time.minute
        return start_m <= q_m < end_m
    except Exception:
        return False


def parse_time_slot_range(slot: str):
    if not slot:
        return None, None
    clean_slot = slot.replace(" ", "").replace("–", "-")
    parts = clean_slot.split("-")
    if len(parts) != 2:
        return None, None
    try:
        s_parts = parts[0].replace(":", ".").split(".")
        e_parts = parts[1].replace(":", ".").split(".")
        s_time = datetime.time(int(s_parts[0]), int(s_parts[1]))
        e_time = datetime.time(int(e_parts[0]), int(e_parts[1]))
        return s_time, e_time
    except Exception:
        return None, None


def build_school_context(user_message: str, db: Session) -> str:
    """
    Menyusun konteks akurat yang mencakup:
    1. Jam & Tanggal real-time saat ini (WIB).
    2. Deteksi jam spesifik atau waktu sekarang.
    3. Deteksi tanggal spesifik atau tanggal relatif (hari ini, besok, kemarin, dsb.).
    4. Pengumuman sekolah yang cocok dengan tanggal terkait.
    5. Jadwal guru yang dipetakan secara presisi ke jam yang ditanyakan.
    """
    context_lines = []
    
    # 1. Waktu Real-Time WIB (UTC+7)
    now_wib = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=7)
    today = now_wib.date()
    current_day = DAYS_NAME[now_wib.weekday()]
    now_time = now_wib.time()
    now_time_str = now_wib.strftime("%H.%M")
    
    # Status operasional sekolah saat ini
    now_minutes = now_time.hour * 60 + now_time.minute
    if now_wib.weekday() >= 5:
        school_status = "Hari Libur Akhir Pekan (Sabtu/Minggu, tidak ada kegiatan KBM)"
    elif now_minutes < (7 * 60 + 45):
        school_status = "Pagi hari sebelum jam KBM (KBM dimulai pukul 07.45 WIB)"
    elif now_minutes <= (14 * 60 + 40):
        school_status = "Sedang dalam jam operasional KBM sekolah (07.45 - 14.40 WIB)"
    else:
        school_status = "Di luar jam sekolah / sudah selesai jam kepulangan (KBM berakhir pukul 14.40 WIB)"

    context_lines.append("=== INFORMASI WAKTU & TANGGAL REAL-TIME SAAT INI (WIB / GMT+7) ===")
    context_lines.append(f"- Tanggal Hari Ini: {today.strftime('%d %B %Y')} ({today})")
    context_lines.append(f"- Hari Ini: {DAY_TRANS.get(current_day, current_day)}")
    context_lines.append(f"- Jam Sekarang: {now_time_str} WIB")
    context_lines.append(f"- Status Sekolah Saat Ini: {school_status}")
    context_lines.append("")

    # 2. Parsing Tanggal & Jam dari Pertanyaan Pengguna
    query_date, query_day_name, date_label = parse_query_date(user_message, today)
    query_time, query_time_str, is_now = parse_query_time(user_message, now_wib)
    
    if is_now and not query_date:
        query_date = today
        query_day_name = current_day
        date_label = "hari ini / saat ini"

    if query_date or query_time:
        context_lines.append("=== TARGET WAKTU & TANGGAL PERTANYAAN PENGGUNA ===")
        if query_date:
            context_lines.append(f"- Tanggal yang Ditanyakan: {query_date} ({DAY_TRANS.get(query_day_name, query_day_name)}) [Konteks: {date_label}]")
        if query_time:
            context_lines.append(f"- Jam yang Ditanyakan: {query_time_str} {'(WAKTU SEKARANG)' if is_now else ''}")
        context_lines.append("")

    # 3. Penentuan Hari Target Jadwal
    msg_lower = user_message.lower()
    target_days = []
    day_map = {
        "senin": "Monday", "monday": "Monday", "周一": "Monday", "星期一": "Monday",
        "selasa": "Tuesday", "tuesday": "Tuesday", "周二": "Tuesday", "星期二": "Tuesday",
        "rabu": "Wednesday", "wednesday": "Wednesday", "周三": "Wednesday", "星期三": "Wednesday",
        "kamis": "Thursday", "thursday": "Thursday", "周四": "Thursday", "星期四": "Thursday",
        "jumat": "Friday", "jum'at": "Friday", "friday": "Friday", "周五": "Friday", "星期五": "Friday",
        "sabtu": "Saturday", "saturday": "Saturday", "周六": "Saturday",
        "minggu": "Sunday", "sunday": "Sunday", "周日": "Sunday"
    }
    for k, v in day_map.items():
        if k in msg_lower and v not in target_days:
            target_days.append(v)

    if not target_days:
        if query_day_name:
            target_days.append(query_day_name)
        else:
            target_days.append(current_day)

    # 4. Ambil Pengumuman Relevan & Event Khusus Sekolah
    effective_date = query_date if query_date else today

    # Ambil Event Schedule khusus untuk tanggal tersebut
    active_events = (
        db.query(models.EventSchedule)
        .filter(
            models.EventSchedule.date <= effective_date,
            or_(
                models.EventSchedule.end_date == None,
                models.EventSchedule.end_date >= effective_date,
            ),
        )
        .all()
    )
    if active_events:
        context_lines.append(
            f"=== JADWAL EVENT / ACARA KHUSUS SEKOLAH (PADA TANGGAL {effective_date}) ==="
        )
        for ev in active_events:
            range_str = f" s/d {ev.end_date}" if ev.end_date else ""
            kbm_impact = (
                "MEMPENGARUHI/MENGUBAH JADWAL KBM REGULER"
                if ev.affects_kbm
                else "Tidak mengubah jadwal KBM"
            )
            context_lines.append(
                f"- Acara: {ev.event_name} [Scope: {ev.target_scope}]"
            )
            context_lines.append(
                f"  * Tanggal: {ev.date}{range_str} | Waktu: {ev.time_slot or 'Sesuai agenda'}"
            )
            context_lines.append(f"  * Pengaruh KBM: {kbm_impact}")
            context_lines.append(f"  * Keterangan: {ev.description}")
        context_lines.append(
            "[PANDUAN AI: Jika event mempengaruhi KBM ('affects_kbm'=True), jelaskan kepada pengguna bahwa terdapat acara/event khusus yang menyesuaikan atau menggantikan kegiatan belajar-mengajar normal pada grade/sekolah terkait.]\n"
        )

    if query_date:
        target_announcements = (
            db.query(models.Announcements)
            .filter(
                or_(
                    and_(
                        models.Announcements.end_date == None,
                        models.Announcements.date == query_date,
                    ),
                    and_(
                        models.Announcements.end_date != None,
                        models.Announcements.date <= query_date,
                        models.Announcements.end_date >= query_date,
                    ),
                )
            )
            .all()
        )
        if target_announcements:
            context_lines.append(
                f"=== PENGUMUMAN PADA TANGGAL {query_date} ({query_day_name}) ==="
            )
            for ann in target_announcements:
                range_str = f" s/d {ann.end_date}" if ann.end_date else ""
                context_lines.append(
                    f"- [TANGGAL {ann.date}{range_str}]: {ann.announcement}"
                )
            context_lines.append("")
        else:
            context_lines.append(
                f"=== PENGUMUMAN PADA TANGGAL {query_date} ({query_day_name}) ==="
            )
            context_lines.append(
                f"- Tidak ada pengumuman khusus yang tercatat pada tanggal {query_date}."
            )
            context_lines.append("")

    # Deteksi awal apakah ini murni pertanyaan duty/jadwal-guru (bukan pengumuman)
    # sehingga query pengumuman terbaru bisa di-skip untuk hemat DB round-trip
    _duty_kw_early = [
        "duty",
        "jaga",
        "menjaga",
        "piket",
        "backyard",
        "kantin",
        "canteen",
        "lobby",
        "gerbang",
        "gate",
        "值班",
        "后院",
    ]
    _is_pure_schedule_query = any(
        kw in msg_lower for kw in _duty_kw_early
    ) and not any(
        w in msg_lower
        for w in [
            "pengumuman",
            "announcement",
            "info",
            "agenda",
            "kegiatan",
            "event",
            "acara",
            "公告",
            "通知",
        ]
    )

    # Tampilkan pengumuman terbaru HANYA jika bukan murni pertanyaan duty/jadwal
    if not _is_pure_schedule_query:
        recent_ann = (
            db.query(models.Announcements)
            .order_by(models.Announcements.date.desc())
            .limit(5)
            .all()
        )
        if recent_ann:
            context_lines.append("=== DAFTAR PENGUMUMAN TERKINI LAINNYA ===")
            for ann in recent_ann:
                range_str = f" s/d {ann.end_date}" if ann.end_date else ""
                context_lines.append(
                    f"- Tanggal {ann.date}{range_str}: {ann.announcement}"
                )
            context_lines.append("")


    # 5. Ambil Jadwal Guru dan Informasi Wali Kelas yang Relevan
    class_matches = re.findall(r"\b[1-6][A-Ea-e]\b", user_message)
    grade_matches = re.findall(r"\b(?:grade|kelas)\s*([1-6])\b", msg_lower)
    
    # Deteksi informasi Wali Kelas jika ada kelas yang ditanyakan
    if class_matches or any(w in msg_lower for w in ["wali kelas", "homeroom"]):
        target_clss = [c.upper() for c in class_matches]
        if not target_clss and grade_matches:
            # Cari kelas-kelas di grade tersebut
            g_val = grade_matches[0]
            target_clss = [f"{g_val}{ltr}" for ltr in ["A", "B", "C", "D", "E"]]
            
        for cls_u in target_clss:
            hr_record = db.query(models.TeacherSchedule).filter(
                models.TeacherSchedule.class_name == cls_u,
                models.TeacherSchedule.subject_grade.ilike("%Homeroom%")
            ).first()
            if hr_record:
                context_lines.append(f"=== INFORMASI WALI KELAS ({cls_u}) ===")
                context_lines.append(f"- Kelas: {cls_u}")
                context_lines.append(f"- Wali Kelas (Homeroom Teacher): {hr_record.teacher_name}")
                context_lines.append("")

    sched_teachers, duty_teachers = get_teacher_names(db)
    all_teachers = sorted(list(set(sched_teachers + duty_teachers)))
    titles = {"mr", "mr.", "ms", "ms.", "mrs", "mrs.", "pak", "bu", "guru", "teacher", "team"}
    matched_teachers = []
    for name in all_teachers:
        parts = [p.lower().strip(".,()") for p in name.split() if p.lower().strip(".,()") not in titles and len(p.strip(".,()")) >= 3]
        if any(part in msg_lower or (len(part) >= 4 and any(w.startswith(part[:4]) for w in msg_lower.split())) for part in parts):
            matched_teachers.append(name)

    subject_keywords = [
        "english", "mandarin", "pspe", "olahraga", "it", "reacter", "art",
        "music", "musik", "singing", "math", "maths", "matematika", "social", "library", "uoi", "pancasila"
    ]
    matched_subjects = [kw for kw in subject_keywords if kw in msg_lower]

    duty_keywords = [
        "duty", "jaga", "menjaga", "piket", "bertugas", "on duty", "backyard", 
        "kantin", "canteen", "lobby", "lobi", "gerbang", "gate", "announcer", 
        "patrol", "supervise", "halaman", "lapangan", "koridor", "corridor",
        "值班", "后院", "食堂", "餐厅", "大厅", "校门", "大门"
    ]
    is_duty_query = any(kw in msg_lower for kw in duty_keywords)

    loc_filter = None
    if any(w in msg_lower for w in ["backyard", "halaman belakang", "lapangan belakang", "后院"]):
        loc_filter = "backyard"
    elif any(w in msg_lower for w in ["kantin", "canteen", "cafeteria", "食堂", "餐厅"]):
        loc_filter = "canteen"
    elif any(w in msg_lower for w in ["lobby", "lobi", "corridor", "koridor", "lantai", "floor", "大厅", "走廊"]):
        if any(w in msg_lower for w in ["lantai 2", "lt 2", "lt. 2", "2nd floor", "2nd", "二楼", "2楼"]):
            loc_filter = "2nd floor"
        elif any(w in msg_lower for w in ["lantai 3", "lt 3", "lt. 3", "3rd floor", "3rd", "三楼", "3楼"]):
            loc_filter = "3rd floor"
        elif any(w in msg_lower for w in ["lantai 4", "lt 4", "lt. 4", "4th floor", "4th", "四楼", "4楼"]):
            loc_filter = "4th floor"
        else:
            loc_filter = "lobby"
    elif any(w in msg_lower for w in ["gerbang", "gate", "announcer", "pintu", "校门", "大门"]):
        if any(w in msg_lower for w in ["depan", "front", "前门"]):
            loc_filter = "front gate"
        elif any(w in msg_lower for w in ["belakang", "back", "后门"]):
            loc_filter = "back gate"
        else:
            loc_filter = "gate"

    # Jalur 1: Jika menanyakan Jadwal Kelas Spesifik (misal: "jadwal kelas 3A")
    # Langsung tampilkan FULL JADWAL KELAS (Homeroom + Spesialis) dari JADWAL_KELAS_MASTER.csv
    if class_matches:
        upper_classes = [c.upper() for c in class_matches]
        # Gunakan cache in-memory — tidak baca disk setiap request
        df_cls = get_class_df()
        if not df_cls.empty:
            sub_cls = df_cls[(df_cls['class_name'].isin(upper_classes)) & (df_cls['day_of_week'].isin(target_days))]
            if not sub_cls.empty:
                for cls_name, grp in sub_cls.groupby('class_name'):
                    for day_name, d_grp in grp.groupby('day_of_week'):
                        day_lbl = DAY_TRANS.get(day_name, day_name)
                        context_lines.append(f"=== FULL JADWAL KELAS {cls_name} (Hari: {day_lbl}) ===")
                        context_lines.append(f"[Jadwal Lengkap Kelas {cls_name} mencakup Seluruh Sesi Homeroom dan Guru Spesialis]:")
                        active_at_time = []
                        for _, r in d_grp.iterrows():
                            t_slot = str(r['time_slot']).strip()
                            subj = str(r['subject']).strip()
                            t_name = str(r['teacher_name']).strip()
                            t_role = str(r.get('teacher_role', '')).strip()
                            role_desc = f" ({t_role})" if t_role else ""
                            
                            time_tag = ""
                            if query_time and is_time_in_slot(query_time, t_slot):
                                time_tag = f" <--- [SEDANG BERLANGSUNG PADA JAM {query_time_str}]"
                                active_at_time.append(f"- Kelas {cls_name}: {subj} bersama {t_name}{role_desc} (sesi {t_slot})")
                            
                            context_lines.append(f"  * {t_slot}: {subj} | Guru: {t_name}{role_desc}{time_tag}")
                        
                        if query_time:
                            context_lines.append("")
                            context_lines.append(f"=== ANALISIS TEPAT PADA JAM {query_time_str} ===")
                            if active_at_time:
                                context_lines.append("Aktivitas yang sedang berlangsung pada jam tersebut:")
                                for act in active_at_time:
                                    context_lines.append(f"  {act}")
                            else:
                                context_lines.append(f"- Pada jam {query_time_str}, tidak ada jadwal pelajaran di kelas ini.")
                        context_lines.append("")


    # Jalur 2: Jika menanyakan Guru Spesifik atau Subjek Tertentu
    query = db.query(models.TeacherSchedule).filter(models.TeacherSchedule.day_of_week.in_(target_days))

    if matched_teachers:
        query = query.filter(models.TeacherSchedule.teacher_name.in_(matched_teachers))
    elif grade_matches and not class_matches:
        g_filter = [f"%Grade {g}%" for g in grade_matches]
        query = query.filter(or_(*[models.TeacherSchedule.subject_grade.ilike(gf) for gf in g_filter]))
    elif matched_subjects and not class_matches:
        query = query.filter(or_(*[models.TeacherSchedule.subject_grade.ilike(f"%{s}%") for s in matched_subjects]))
    elif not class_matches:
        query = query.filter(models.TeacherSchedule.id_schedule == -1)

    schedules = query.order_by(models.TeacherSchedule.teacher_name.asc(), models.TeacherSchedule.id_schedule.asc()).limit(80).all()

    # Susun Rangkuman Jadwal Guru
    if schedules:
        day_labels = [DAY_TRANS.get(d, d) for d in target_days]
        context_lines.append(f"=== JADWAL MENGAJAR GURU (Hari: {', '.join(day_labels)}) ===")
        
        active_at_time = []
        current_t = None
        for s in schedules:
            if s.teacher_name != current_t:
                current_t = s.teacher_name
                d_str = DAY_TRANS.get(s.day_of_week, s.day_of_week)
                context_lines.append(f"\n[Guru: {s.teacher_name} ({s.subject_grade}) - Hari: {d_str}]")
            
            c_desc = s.class_name
            if re.match(r"^[1-6][A-Ea-e]$", c_desc):
                c_desc = f"Kelas {c_desc}"
            
            # Khusus jika slot adalah Free (wali kelas tidak mengajar pelajaran spesialis)
            if s.note and s.note.startswith("Free"):
                activity_display = f"{c_desc} [{s.note} - TIDAK MENGAJAR]"
            else:
                note_desc = f" (Mengajar {s.note})" if s.note and s.note.strip().lower() != s.class_name.strip().lower() else ""
                activity_display = f"{c_desc}{note_desc}"
            
            time_tag = ""
            if query_time and is_time_in_slot(query_time, s.time_slot):
                time_tag = f" <--- [SEDANG BERLANGSUNG PADA JAM {query_time_str}]"
                active_at_time.append(f"- {s.teacher_name} ({s.subject_grade}): {activity_display} (sesi {s.time_slot})")

            context_lines.append(f"  * {s.time_slot}: {activity_display}{time_tag}")

        if query_time:
            context_lines.append("")
            context_lines.append(f"=== ANALISIS TEPAT PADA JAM {query_time_str} ===")
            if active_at_time:
                context_lines.append("Aktivitas yang sedang berlangsung pada jam tersebut:")
                for act in active_at_time:
                    context_lines.append(f"  {act}")
            else:
                # Jika di luar jam KBM
                q_minutes = query_time.hour * 60 + query_time.minute
                if q_minutes < (7 * 60 + 45) or q_minutes > (14 * 60 + 40):
                    context_lines.append(f"- Jam {query_time_str} berada DI LUAR JAM SEKOLAH (KBM berlangsung pukul 07.45 - 14.40 WIB).")
                else:
                    context_lines.append(f"- Pada jam {query_time_str}, guru yang ditanyakan TIDAK MEMILIKI JADWAL KBM / FREE.")
        context_lines.append("")

    # Jalur 3: Informasi Jadwal Duty / Piket Guru (Teacher on Duty)
    # Dipanggil jika pertanyaan mengandung kata duty/jaga ATAU menanyakan guru tertentu yang memiliki jadwal duty
    has_teacher_duty_intent = bool(matched_teachers) and any(w in msg_lower for w in ["duty", "jaga", "piket", "bertugas", "on duty", "值班"])
    
    if is_duty_query or has_teacher_duty_intent or (matched_teachers and not class_matches):
        duty_q = db.query(models.TeacherDuty)
        
        if has_teacher_duty_intent:
            duty_q = duty_q.filter(models.TeacherDuty.teacher_name.in_(matched_teachers))
            # Jika user tidak menyebutkan hari spesifik, tampilkan seluruh hari agar lengkap
            has_day_specified = any(k in msg_lower for k in day_map.keys()) or query_date or (is_now and any(w in msg_lower for w in ["hari ini", "today", "今天"]))
            if has_day_specified:
                duty_q = duty_q.filter(models.TeacherDuty.day_of_week.in_(target_days))
        elif is_duty_query:
            duty_q = duty_q.filter(models.TeacherDuty.day_of_week.in_(target_days))
            if loc_filter:
                duty_q = duty_q.filter(models.TeacherDuty.location.ilike(f"%{loc_filter}%"))
            if matched_teachers:
                duty_q = duty_q.filter(models.TeacherDuty.teacher_name.in_(matched_teachers))
        elif matched_teachers:
            # Lampiran jadwal duty jika menanyakan jadwal guru umum
            duty_q = duty_q.filter(
                models.TeacherDuty.teacher_name.in_(matched_teachers),
                models.TeacherDuty.day_of_week.in_(target_days)
            )

        duties = duty_q.all()

        # Cek apakah ada pergantian tugas piket sementara (Inval Duty) pada tanggal ini
        inval_records = (
            db.query(models.DutyInval)
            .filter(models.DutyInval.date == effective_date)
            .all()
        )
        inval_map = {}
        for inv in inval_records:
            t_slot = inv.time_slot.strip().lower()
            inval_map[(inv.original_teacher.strip().lower(), t_slot)] = inv
            inval_map[(inv.location.strip().lower(), t_slot)] = inv

        if inval_records:
            context_lines.append(
                f"=== PERGANTIAN PIKET SEMENTARA (INVAL DUTY) PADA TANGGAL {effective_date} ==="
            )
            for inv in inval_records:
                r_desc = f" (Alasan: {inv.reason})" if inv.reason else ""
                n_desc = f" [Catatan: {inv.note}]" if inv.note else ""
                context_lines.append(
                    f"- Lokasi: {inv.location} ({inv.time_slot}): Guru {inv.original_teacher} DIGANTIKAN OLEH {inv.substitute_teacher}{r_desc}{n_desc}"
                )
            context_lines.append(
                "[PANDUAN AI: Pada tanggal ini, guru piket asli digantikan oleh guru pengganti (inval) di atas. Sebutkan secara jelas nama guru pengganti yang sedang bertugas!]\n"
            )

        # Ambil riwayat absensi duty untuk tanggal target
        duty_attendances = (
            db.query(models.DutyAttendance)
            .filter(models.DutyAttendance.date == effective_date)
            .all()
        )
        duty_att_map = {
            (att.location.strip().lower(), att.time_slot.strip().lower(), att.teacher_name.strip().lower()): att
            for att in duty_attendances
        }

        if duties:
            context_lines.append("=== INFORMASI JADWAL DUTY / PIKET GURU (TEACHER ON DUTY) ===")
            context_lines.append("[PANDUAN STATUS KEHADIRAN GURU: ⚪ Belum Duty | 🟢 Lagi Duty | 🟡 Sedang Jam Piket | 🔵 Sudah Duty | 🟠 Tidak Duty]")
            active_duties_now = []
            
            day_order = {d: i for i, d in enumerate(DAYS_NAME)}
            duties_sorted = sorted(duties, key=lambda x: (day_order.get(x.day_of_week, 99), x.time_slot, x.location))
            
            for day_k, day_group in groupby(duties_sorted, key=lambda x: x.day_of_week):
                d_trans = DAY_TRANS.get(day_k, day_k)
                context_lines.append(f"\n[Jadwal Duty Hari: {d_trans}]")
                for d in day_group:
                    task_info = f" (Tugas: {d.task})" if d.task else ""
                    time_marker = ""
                    d_slot_lower = d.time_slot.strip().lower()
                    matching_inval = (
                        inval_map.get((d.teacher_name.strip().lower(), d_slot_lower))
                        or inval_map.get((d.location.strip().lower(), d_slot_lower))
                    )
                    if not matching_inval:
                        for (ik_key, ik_slot), inv_obj in inval_map.items():
                            if ik_slot == d_slot_lower:
                                if ik_key in d.teacher_name.strip().lower() or d.teacher_name.strip().lower() in ik_key:
                                    matching_inval = inv_obj
                                    break

                    if matching_inval:
                        teacher_display = f"{d.teacher_name} -> [DIGANTIKAN OLEH {matching_inval.substitute_teacher}]"
                        active_teacher = f"{matching_inval.substitute_teacher} (Inval pengganti {d.teacher_name})"
                        check_name = matching_inval.substitute_teacher.strip().lower()
                    else:
                        teacher_display = d.teacher_name
                        active_teacher = d.teacher_name
                        check_name = d.teacher_name.strip().lower()

                    # Evaluasi status lingkaran warna: ⚪ Grey, 🟢 Hijau, 🟡 Kuning, 🔵 Biru, 🟠 Orange
                    att_hit = duty_att_map.get((d.location.strip().lower(), d.time_slot.strip().lower(), check_name))
                    
                    slot_start, slot_end = None, None
                    try:
                        cln = d.time_slot.replace(" ", "").replace("–", "-")
                        pts = cln.split("-")
                        if len(pts) == 2:
                            s_h, s_m = [int(x) for x in pts[0].replace(":", ".").split(".")]
                            e_h, e_m = [int(x) for x in pts[1].replace(":", ".").split(".")]
                            slot_start = datetime.time(s_h, s_m)
                            slot_end = datetime.time(e_h, e_m)
                    except Exception:
                        pass

                    if matching_inval:
                        # Guru yang digantikan tetap tercatat duty (🟢 Lagi Duty saat jam piket, 🔵 Sudah Duty setelah jam piket)
                        if effective_date < today or (effective_date == today and slot_end and now_time > slot_end):
                            duty_status_tag = "🔵"
                        elif effective_date == today and slot_start and slot_end and slot_start <= now_time <= slot_end:
                            duty_status_tag = "🟢"
                        else:
                            duty_status_tag = "⚪"

                        teacher_display = f"{d.teacher_name} - [Digantikan oleh {matching_inval.substitute_teacher}]"
                        active_teacher = f"{d.teacher_name} - [Digantikan oleh {matching_inval.substitute_teacher}]"
                    elif att_hit:
                        if effective_date < today:
                            duty_status_tag = "🔵"
                        elif effective_date > today:
                            duty_status_tag = "🔵"
                        else:
                            if slot_start and slot_end:
                                if now_time > slot_end:
                                    duty_status_tag = "🔵"
                                elif now_time < slot_start:
                                    duty_status_tag = "⚪"
                                else:
                                    duty_status_tag = "🟢"
                            else:
                                duty_status_tag = "🔵"
                    else:
                        if effective_date < today:
                            duty_status_tag = "🟠"
                        elif effective_date > today:
                            duty_status_tag = "⚪"
                        else:
                            if slot_start and slot_end:
                                if now_time > slot_end:
                                    duty_status_tag = "🟠"
                                elif slot_start <= now_time <= slot_end:
                                    duty_status_tag = "🟡"
                                else:
                                    duty_status_tag = "⚪"
                            else:
                                duty_status_tag = "⚪"

                    if query_time and is_time_in_slot(query_time, d.time_slot):
                        time_marker = f" <--- [ACTIVE NOW AT {query_time_str}]"
                        active_duties_now.append(
                            f"- Location {d.location} ({d.category}): {active_teacher} {duty_status_tag} (session {d.time_slot}){task_info}"
                        )
                    context_lines.append(
                        f"  * {d.time_slot} | Location: {d.location} | Category: {d.category} | Teacher: {teacher_display} {duty_status_tag}{task_info}{time_marker}"
                    )

            if query_time:
                context_lines.append("")
                context_lines.append(f"=== ANALISIS DUTY TEPAT PADA JAM {query_time_str} ===")
                if active_duties_now:
                    context_lines.append(f"Guru yang bertugas jaga/duty pada pukul {query_time_str}:")
                    for ad in active_duties_now:
                        context_lines.append(f"  {ad}")
                else:
                    context_lines.append(f"- Pada pukul {query_time_str}, tidak ada jadwal jaga/duty (bukan jam duty atau di luar sesi istirahat/pagi).")
            context_lines.append("")
        elif is_duty_query:
            context_lines.append("=== INFORMASI JADWAL DUTY / PIKET GURU (TEACHER ON DUTY) ===")
            loc_str = f" di lokasi {loc_filter}" if loc_filter else ""
            day_str = f" pada hari {', '.join([DAY_TRANS.get(d, d) for d in target_days])}" if target_days else ""
            context_lines.append(f"- Tidak ditemukan jadwal duty{loc_str}{day_str}.")
            context_lines.append("")

    # Jalur 4: Informasi Morning Devotion (07.15 - 07.45 WIB)
    is_devotion_query = any(w in msg_lower for w in ["devotion", "renungan", "doa pagi", "morning devotion"])
    if is_devotion_query:
        context_lines.append("=== INFORMASI MORNING DEVOTION (07.15 - 07.45 WIB) ===")
        context_lines.append("- Jadwal: Pukul 07.15 - 07.45 WIB setiap hari sekolah.")
        context_lines.append("- Peserta Devotion: Guru mengajar dan personil yang dikonfirmasi (termasuk Ms. Phoebe, Ms. Agnes, Ms. Ivo, Mr. Hendy, Ms. Joke, Ms. Shenny, Ms. Citra, Mr. Dion, Ms. Sus, Ms. Vita).")
        context_lines.append("- Pengecualian Guru Part-Time: Mr. Ivan dan Ms. Alitha adalah guru part-time yang tidak memiliki jadwal pagi, sehingga TIDAK IKUT Morning Devotion.")
        context_lines.append("- Pengecualian Staff: Staff murni non-guru (seperti Mr. Hakim, Mr. Hindra, Mr. Ardhi, Mr. Benu, Ms. Endah) TIDAK HARUS ikut devotion.")
        context_lines.append("- Pengecualian Duty Pagi: Siapapun yang memiliki jadwal tugas duty pukul 07.15 - 07.45 TIDAK IKUT devotion karena sedang aktif bertugas duty.")
        
        # Ambil daftar guru duty 07.15-07.45 hari ini
        dev_slot = "07.15-07.45"
        dev_s, dev_e = parse_time_slot_range(dev_slot)
        target_dev_day = target_days[0] if target_days else current_day
        morning_duties = db.query(models.TeacherDuty).filter(models.TeacherDuty.day_of_week.ilike(target_dev_day)).all()
        morning_duty_teachers = []
        for md in morning_duties:
            s_s, s_e = parse_time_slot_range(md.time_slot)
            if (s_s and s_e and dev_s and dev_e and max(s_s, dev_s) < min(s_e, dev_e)) or (md.time_slot.strip().lower() == dev_slot):
                morning_duty_teachers.append(f"{md.teacher_name} ({md.location})")
        
        if morning_duty_teachers:
            context_lines.append(f"- Guru/Staff yang bertugas duty pagi (07.15-07.45) hari {DAY_TRANS.get(target_dev_day, target_dev_day)}: {', '.join(morning_duty_teachers)}.")
        context_lines.append("- Seluruh guru mengajar lainnya yang bebas tugas duty pagi WAJIB mengikuti Morning Devotion.")
        context_lines.append("")

    return "\n".join(context_lines)


def get_language_directive(user_message: str) -> str:
    """Mendeteksi bahasa input user dan menghasilkan direktif instruksi bahasa yang ketat"""
    # 1. Deteksi karakter Hanzi / Mandarin
    if re.search(r'[\u4e00-\u9fff]', user_message):
        return "\n\n[MANDATORY LANGUAGE DIRECTIVE: The user asked in CHINESE (中文). You MUST reply 100% in CHINESE (中文). Do NOT reply in Indonesian or English.]"
    
    # 2. Deteksi kata-kata bahasa Inggris
    msg_words = set(re.findall(r'\b[a-zA-Z]+\b', user_message.lower()))
    en_markers = {
        "who", "what", "where", "when", "why", "how", "is", "are", "on", "duty", 
        "today", "tomorrow", "yesterday", "schedule", "class", "break", "time", 
        "teacher", "announcement", "announcements", "show", "tell", "please", "now",
        "morning", "afternoon", "recess", "periods", "birthday", "birthdays", "at",
        "which", "can", "you", "give", "me", "list", "all"
    }
    id_markers = {
        "siapa", "apa", "kapan", "dimana", "di", "mana", "mengapa", "bagaimana",
        "jadwal", "piket", "jaga", "hari", "ini", "besok", "kemarin", "lusa",
        "kelas", "jam", "istirahat", "guru", "pengumuman", "tolong", "sekarang",
        "ulang", "tahun", "pada", "adakah", "kbm"
    }
    
    en_hits = len(msg_words.intersection(en_markers))
    id_hits = len(msg_words.intersection(id_markers))
    
    if en_hits > id_hits:
        return "\n\n[MANDATORY LANGUAGE DIRECTIVE: The user asked in ENGLISH. You MUST reply 100% in NATURAL ENGLISH only. Do NOT reply in Indonesian.]"
    elif id_hits > en_hits:
        return "\n\n[MANDATORY LANGUAGE DIRECTIVE: Pertanyaan pengguna dalam BAHASA INDONESIA. Anda menjawab dalam BAHASA INDONESIA.]"
    
    return "\n\n[MANDATORY LANGUAGE DIRECTIVE: The default language of this school system is ENGLISH. You MUST reply 100% in natural ENGLISH unless the user explicitly asks in Indonesian or Chinese.]"


SYSTEM_PROMPT = """You are the Information Assistant for Cita Hati East Surabaya.
Your primary role is to answer questions about teacher schedules, duty rosters, daily school agenda, and school announcements accurately, politely, and concisely.
All default communication and explanations MUST be in natural ENGLISH unless the user asks in Indonesian or Chinese.

RULES TO FOLLOW:
1. LANGUAGE RULES (PRIORITY):
   - The default language for all responses is ENGLISH.
   - If the user explicitly asks in Indonesian -> Reply in friendly Indonesian.
   - If the user asks in Chinese (Mandarin) -> 必须完全用中文回答。
   - Honorific titles: 'Mr. [Name]', 'Ms. [Name]'.

2. ANSWER ONLY BASED ON PROVIDED DATA:
   - Never speculate or invent schedules outside the given context.
   - If data is not found, respond: "Sorry, that schedule data was not found."

3. REAL-TIME "NOW" HANDLING:
   - Check 'INFORMASI WAKTU & TANGGAL REAL-TIME SAAT INI'.
   - If outside school hours (before 07.45 or after 14.40 WIB, e.g. evening): politely state that school hours have ended.
   - If during school hours: state the activity happening now based on 'ANALISIS TEPAT PADA JAM'.
   - On weekends: mention that it is the weekend (school closed).

4. SPECIFIC TIME HANDLING:
   - Check the time slot requested. If during recess, mention it is Break. If no class, state Free / No teaching period.

5. DATE / TOMORROW / YESTERDAY HANDLING:
   - Match the exact date requested from the context announcements and duty.

6. CLASS SCHEDULE VS TEACHER SCHEDULE:
   - When asked for Class Schedule, show full periods.
   - When asked for Homeroom teacher, only list Homeroom subjects (UoI, BI, Math, etc.). During specialist subjects, they are Free.

7. DUTY SCHEDULE / TEACHER ON DUTY RULES (CRITICAL):
   - ALWAYS REPLACE THE ASTERISK (*) OR BULLET WITH THE COLOR CIRCLE EMOJI (⚪, 🟢, 🟡, 🔵, 🟠) AT THE START OF EACH LINE!
   - NEVER start the line with an asterisk (*), dash (-), or bullet (•). The color ball itself is the bullet!
   - STRICTLY FORBIDDEN TO DISPLAY ANY STATUS TEXT SUCH AS:
     "Not On Duty", "On Duty", "Belum Duty", "Sudah Duty", "Lagi Duty", "Tidak Duty", "Sedang Jam Piket", "Completed", "Pending", etc.
     DISPLAY ONLY THE COLOR BALL EMOJI (⚪, 🟢, 🟡, 🔵, 🟠) NEXT TO THE TEACHER'S NAME, WITH NO STATUS TEXT WORDS!
   - Meaning of the color balls (for your internal reference only, NEVER print these status words):
     ⚪ = Belum Duty (Jadwal belum mulai)
     🟢 = Lagi Duty (Sedang bertugas & sudah absen)
     🟡 = Sedang Jam Piket (Harusnya duty saat ini tapi belum absen)
     🔵 = Sudah Duty (Selesai piket & sudah absen / terverifikasi)
     🟠 = Tidak Duty (Jam piket sudah lewat tapi tidak absen)
   - If a duty has a substitute teacher (Inval) (e.g. Mr. Kornelius digantikan oleh Mr. Nano):
     The original teacher STILL counts as DUTY (🟢 Lagi Duty during duty hours, 🔵 Sudah Duty after duty hours).
     Display clearly:
     🟢 Mr. Kornelius (ESE Backyard) - [Digantikan oleh Mr. Nano]
     (Or after session ends: 🔵 Mr. Kornelius (ESE Backyard) - [Digantikan oleh Mr. Nano])
     NEVER mark the original teacher as 🟠 Tidak Duty if there is someone substituting them!
   - CORRECT FORMAT EXAMPLES (ONLY COLOR BALL, ABSOLUTELY NO STATUS TEXT):
     🟠 Ms. Meitha (2nd floor lobby)
     🟡 Ms. Phoebe (Canteen)
     🟢 Ms. Kristiani (1st floor lobby)
     🔵 Mr. Dion (Gate)
     ⚪ Ms. Agnes (Gate)
   - INCORRECT FORMAT EXAMPLES (NEVER DO THIS):
     * Ms. Meitha 🟠 (2nd floor lobby)   <-- WRONG! Replace * with 🟠 at the start of the line!
     * Mr. Dion [🟠 Not On Duty]         <-- WRONG! Do NOT write text "[Not On Duty]"!
     🟡 Ms. Phoebe (Sedang Jam Piket)    <-- WRONG! Do NOT write status words "(Sedang Jam Piket)"!

8. REPORT SCHEDULE DISCREPANCIES:
   - If asked where to report schedule errors: "If you notice any schedule discrepancies or errors, please contact Mr. Kornel for system updates."

9. MORNING DEVOTION (07.15 - 07.45 WIB) RULES:
   - Morning Devotion is attended by teaching teachers and confirmed personnel:
     Including Ms. Phoebe, Ms. Agnes, Ms. Ivo, Mr. Hendy, Ms. Joke, Ms. Shenny, Ms. Citra, Mr. Dion, Ms. Sus, Ms. Vita (they can join devotion unless they have a duty scheduled at 07.15 - 07.45 WIB).
   - Part-Time Teacher Exceptions:
     * Mr. Ivan and Ms. Alitha are part-time teachers who do NOT have a morning schedule. Therefore, they do NOT attend Morning Devotion.
   - Duty Exceptions for Morning Devotion (07.15 - 07.45 WIB):
     * Ms. Sus has Morning Duty at Canteen (07.15 - 07.45 WIB) every day (Mon-Fri), so she is actively on duty and does NOT join devotion.
     * Ms. Shenny has Morning Duty on Monday & Tuesday (07.15 - 07.45 at 4th floor lobby), so she does NOT join devotion on Monday & Tuesday, but CAN join on Wednesday, Thursday, Friday.
     * Mr. Dion and Ms. Vita have NO duty at 07.15 - 07.45 WIB, so they CAN join Morning Devotion every day (Mon-Fri).
     * Ms. Phoebe, Ms. Agnes, Ms. Ivo, Mr. Hendy, Ms. Joke, and Ms. Citra also have NO duty at 07.15 - 07.45 WIB, so they attend Morning Devotion every day.
   - Non-teaching staff (Mr. Hakim, Mr. Hindra, Mr. Ardhi, Mr. Benu, Ms. Endah) are NOT required to join devotion.
   - Any person who has duty at 07.15 - 07.45 WIB is exempt from devotion because they are actively on duty.
"""


def clean_duty_bullets(text: str) -> str:
    """
    Mengubah format bullet point duty dari '* Ms. Meitha 🟠' menjadi '🟠 Ms. Meitha'.
    Memastikan:
    1. Bola warna (⚪, 🟢, 🟡, 🔵, 🟠) selalu menggantikan bintang/bullet di awal baris.
    2. Seluruh teks keterangan status (Lagi Duty, Tidak Duty, Sudah Duty, Belum Duty, Sedang Jam Piket, dll)
       dibersihkan sehingga HANYA bola emoji yang ditampilkan sesuai instruksi pengguna.
    """
    if not text:
        return text

    ball_pattern = re.compile(r"[⚪🟢🔵🟠🟡]")
    status_terms = r"(?:Lagi Duty|Sudah Duty|Tidak Duty|Belum Duty|Sedang Jam Piket|Not On Duty|On Duty|Completed|Pending)"
    bracket_status_pattern = re.compile(
        rf"[\(\[]\s*(?:[⚪🟢🔵🟠🟡]\s*)?{status_terms}\s*[\)\]]",
        re.IGNORECASE,
    )
    prefix_status_pattern = re.compile(
        rf"(?:[-–:]\s*){status_terms}",
        re.IGNORECASE,
    )
    standalone_status_pattern = re.compile(
        rf"\b{status_terms}\b",
        re.IGNORECASE,
    )

    lines = text.split("\n")
    new_lines = []

    for line in lines:
        balls = ball_pattern.findall(line)
        if balls:
            target_ball = balls[0]
            # Bersihkan status dalam kurung / kurung siku
            cleaned = bracket_status_pattern.sub("", line)
            # Bersihkan status setelah tanda strip/titik dua
            cleaned = prefix_status_pattern.sub("", cleaned)
            # Bersihkan status kata yang berdiri sendiri
            cleaned = standalone_status_pattern.sub("", cleaned)
            # Hapus semua emoji bola dari dalam teks
            cleaned = ball_pattern.sub("", cleaned)

            # Simpan indentasi baris asli
            indent_m = re.match(r"^(\s*)", line)
            indent = indent_m.group(1) if indent_m else ""

            # Hapus bullet awal (*, -, •, dsb)
            cleaned = re.sub(r"^\s*[\*\-•]\s*", "", cleaned)

            # Bersihkan kurung kosong hasil pembersihan status: (), [], ( - )
            cleaned = re.sub(r"\(\s*[-–:]?\s*\)", "", cleaned)
            cleaned = re.sub(r"\[\s*[-–:]?\s*\]", "", cleaned)

            # Bersihkan sisa tanda strip / titik dua yang menggantung
            cleaned = re.sub(r"\s+[-–:]\s*$", "", cleaned)
            cleaned = re.sub(r"\s+[-–:]\s*(?=\()", " ", cleaned)

            # Rapikan spasi ganda
            cleaned = re.sub(r" {2,}", " ", cleaned).strip()
            new_lines.append(f"{indent}{target_ball} {cleaned}")
        else:
            new_lines.append(line)

    return "\n".join(new_lines)


def call_gemini(
    user_message: str, context: str, model_name: str = "gemini-3.8-flash"
) -> str:
    key = (os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY or "").strip()
    if not key:
        raise Exception("GEMINI_API_KEY not configured")
    import urllib.request
    import json

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
    lang_directive = get_language_directive(user_message)
    full_prompt = f"{SYSTEM_PROMPT}\n\nKONTEKS DATA DARI SEKOLAH:\n{context}\n\nPERTANYAAN PENGGUNA:\n{user_message}{lang_directive}"

    payload = json.dumps({"contents": [{"parts": [{"text": full_prompt}]}]}).encode(
        "utf-8"
    )

    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        candidates = res.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts and "text" in parts[0]:
                return parts[0]["text"].strip()
    raise Exception(f"Empty response from Gemini ({model_name})")


OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")


def call_groq(user_message: str, context: str) -> str:
    key = os.getenv("GROQ_API_KEY") or GROQ_API_KEY
    if not key:
        raise Exception("GROQ_API_KEY not configured")
    import urllib.request
    import json

    url = "https://api.groq.com/openai/v1/chat/completions"
    models_to_try = [
        "groq/compound-mini",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b"
    ]
    last_err = None
    lang_directive = get_language_directive(user_message)

    for m in models_to_try:
        try:
            payload = json.dumps(
                {
                    "model": m,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": f"KONTEKS:\n{context}\n\nPERTANYAAN:\n{user_message}{lang_directive}",
                        },
                    ],
                    "max_tokens": 400,
                    "temperature": 0.3,
                }
            ).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                choices = res.get("choices", [])
                if choices:
                    msg = choices[0].get("message", {}).get("content")
                    if msg:
                        return msg.strip()
        except Exception as e:
            last_err = e
            continue
    raise last_err or Exception("All Groq models failed")


def call_openrouter(user_message: str, context: str) -> str:
    """Fallback ke OpenRouter yang menyediakan puluhan model gratis (tanpa biaya)"""
    if not OPENROUTER_API_KEY:
        raise Exception("OPENROUTER_API_KEY not configured")
    import urllib.request
    import json

    url = "https://openrouter.ai/api/v1/chat/completions"
    free_models = [
        "google/gemini-2.0-flash-lite:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-r1:free",
        "qwen/qwen-2.5-72b-instruct:free",
        "mistralai/mistral-7b-instruct:free"
    ]
    last_err = None
    lang_directive = get_language_directive(user_message)

    for m in free_models:
        try:
            payload = json.dumps({
                "model": m,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"KONTEKS DATA:\n{context}\n\nPERTANYAAN:\n{user_message}{lang_directive}"}
                ],
                "max_tokens": 400,
                "temperature": 0.3
            }).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "ESE Internal Announcement Assistant"
                }
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                choices = res.get("choices", [])
                if choices:
                    msg = choices[0].get("message", {}).get("content")
                    if msg:
                        return msg.strip()
        except Exception as e:
            last_err = e
            continue
    raise last_err or Exception("All OpenRouter free models failed")


@router.post("/chat", response_model=schemas.ChatResponse)
async def chat_with_ai(data: schemas.ChatRequest, db: Session = Depends(get_db)):
    """
    Endpoint interaktif chat asisten informasi sekolah.
    Dioptimalkan dengan:
    1. In-Memory Fast Cache untuk pertanyaan populer (< 10 ms).
    2. Asynchronous Non-Blocking I/O (asyncio.to_thread) agar worker server tidak membeku.
    3. Multi-Tier Fallback urutan model cepat & teruji.
    """
    if not data.message or not data.message.strip():
        raise HTTPException(
            status_code=400, detail="Pesan pertanyaan tidak boleh kosong."
        )

    # 1. Cek In-Memory Cache (Respons Instan < 10 ms)
    cache_key = _get_chat_cache_key(data.message)
    now_mono = time.monotonic()
    if cache_key in _chat_response_cache:
        cached_reply, cached_provider, exp_time = _chat_response_cache[cache_key]
        if now_mono < exp_time:
            return schemas.ChatResponse(
                reply=cached_reply,
                provider_used=f"{cached_provider} (Fast Cache)",
                status="success",
            )

    # 2. Siapkan konteks data yang relevan
    context = build_school_context(data.message, db)

    # 3. AI Waterfall Providers List (Model tercepat dan teruji di awal)
    providers = [
        ("Gemini 3.8 Flash", lambda: call_gemini(data.message, context, "gemini-3.8-flash")),
        ("Gemini 3.5 Flash", lambda: call_gemini(data.message, context, "gemini-3.5-flash")),
        ("Gemini 3.5 Flash Lite", lambda: call_gemini(data.message, context, "gemini-3.5-flash-lite")),
        ("Gemini 2.5 Flash", lambda: call_gemini(data.message, context, "gemini-2.5-flash")),
        ("Gemini 2.5 Flash Lite", lambda: call_gemini(data.message, context, "gemini-2.5-flash-lite")),
        ("Groq AI", lambda: call_groq(data.message, context)),
    ]

    for provider_name, func in providers:
        try:
            # NON-BLOCKING: Jalankan panggilan network di thread terpisah
            # agar worker FastAPI / event loop tidak terkunci (free)
            reply = await asyncio.to_thread(func)
            if reply:
                cleaned_reply = clean_duty_bullets(reply)
                # Simpan ke cache untuk pertanyaan serupa berikutnya
                _chat_response_cache[cache_key] = (
                    cleaned_reply,
                    provider_name,
                    now_mono + _CHAT_CACHE_TTL,
                )
                return schemas.ChatResponse(
                    reply=cleaned_reply, provider_used=provider_name, status="success"
                )
        except Exception as e:
            print(
                f"[AI Fallback Warning] {provider_name} gagal: {e}. Mengalihkan ke provider berikutnya..."
            )
            continue

    # Fallback terakhir jika seluruh provider gagal
    return schemas.ChatResponse(
        reply="Mohon maaf, saat ini server asisten AI sedang mengalami kepadatan antrean. Silakan coba kembali dalam 1 menit.",
        provider_used="System Fallback",
        status="error",
    )
