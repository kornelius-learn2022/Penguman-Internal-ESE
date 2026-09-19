import os
import re
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
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

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
    now_wib = datetime.datetime.utcnow() + datetime.timedelta(hours=7)
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
            inval_map[(inv.original_teacher.strip().lower(), inv.time_slot.strip())] = inv
            inval_map[(inv.location.strip().lower(), inv.time_slot.strip())] = inv

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

        if duties:
            context_lines.append("=== INFORMASI JADWAL DUTY / PIKET GURU (TEACHER ON DUTY) ===")
            active_duties_now = []
            
            day_order = {d: i for i, d in enumerate(DAYS_NAME)}
            duties_sorted = sorted(duties, key=lambda x: (day_order.get(x.day_of_week, 99), x.time_slot, x.location))
            
            for day_k, day_group in groupby(duties_sorted, key=lambda x: x.day_of_week):
                d_trans = DAY_TRANS.get(day_k, day_k)
                context_lines.append(f"\n[Jadwal Duty Hari: {d_trans}]")
                for d in day_group:
                    task_info = f" (Tugas: {d.task})" if d.task else ""
                    time_marker = ""
                    matching_inval = inval_map.get((d.teacher_name.strip().lower(), d.time_slot.strip())) or inval_map.get((d.location.strip().lower(), d.time_slot.strip()))
                    if matching_inval:
                        teacher_display = f"{d.teacher_name} -> [DIGANTIKAN SEMENTARA OLEH {matching_inval.substitute_teacher}]"
                        active_teacher = f"{matching_inval.substitute_teacher} (Inval pengganti {d.teacher_name})"
                    else:
                        teacher_display = d.teacher_name
                        active_teacher = d.teacher_name

                    if query_time and is_time_in_slot(query_time, d.time_slot):
                        time_marker = f" <--- [SEDANG/TEPAT BERLANGSUNG PADA JAM {query_time_str}]"
                        active_duties_now.append(
                            f"- Lokasi {d.location} ({d.category}): {active_teacher} (sesi {d.time_slot}){task_info}"
                        )
                    context_lines.append(
                        f"  * {d.time_slot} | Lokasi: {d.location} | Kategori: {d.category} | Guru: {teacher_display}{task_info}{time_marker}"
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
        return "\n\n[MANDATORY LANGUAGE DIRECTIVE: Pertanyaan pengguna dalam BAHASA INDONESIA. Anda WAJIB menjawab dalam BAHASA INDONESIA.]"
    
    return "\n\n[MANDATORY LANGUAGE DIRECTIVE: You MUST detect the user's input language and reply in the EXACT SAME LANGUAGE as the user's question (English -> English, Chinese -> Chinese, Indonesian -> Indonesian).]"


SYSTEM_PROMPT = """Kamu adalah Asisten Informasi Cita Hati East Surabaya.
Tugas utamamu adalah menjawab pertanyaan seputar jadwal guru, tugas piket/duty, agenda, dan pengumuman sekolah secara akurat, sopan, dan ringkas.

ATURAN WAJIB DIPATUHI:
1. ATURAN BAHASA (STRICT LANGUAGE MATCHING - PRIORITAS UTAMA):
   - WAJIB MEMBALAS DALAM BAHASA YANG SAMA PERSIS DENGAN BAHASA INPUT PENGGUNA:
     * Jika pertanyaan dalam BAHASA INGGRIS (English) -> Reply 100% in clear, natural ENGLISH! Do NOT speak Indonesian.
     * Jika pertanyaan dalam BAHASA MANDARIN (中文) -> 必须完全用中文（Mandarin）回答！不得使用印尼语。
     * Jika pertanyaan dalam BAHASA INDONESIA -> Balaslah seluruhnya dalam BAHASA INDONESIA yang ramah dan jelas.
   - Panggilan guru setara antar bahasa (contoh: 'Mr. [Nama]' = 'Pak [Nama]' = '[Nama] 老师', 'Ms. [Nama]' = 'Bu [Nama]').

2. JAWAB HANYA BERDASARKAN DATA YANG DIBERIKAN:
   - Jangan pernah menebak atau mengarang jadwal di luar data konteks.
   - Jika guru, kelas, atau jam benar-benar tidak ada dalam konteks, katakan:
     * (EN): "Sorry, that schedule data was not found."
     * (ZH): "抱歉，未找到该日程信息。"
     * (ID): "Maaf, data jadwal tersebut tidak ditemukan."

3. ATURAN PENANGANAN "SEKARANG" / "SAAT INI" (REAL-TIME):
   - Perhatikan bagian 'INFORMASI WAKTU & TANGGAL REAL-TIME SAAT INI'.
   - Jika penanya bertanya "sekarang di mana" / "sedang apa sekarang" / "who is on duty now":
     * Jika jam saat ini berada DI LUAR JAM SEKOLAH (sebelum 07.45 atau setelah 14.40 WIB, misal malam hari):
       Jelaskan dengan ramah bahwa saat ini sudah di luar jam KBM sekolah / sudah jam pulang. Jika ada di konteks, Anda boleh menyebutkan ringkasan jadwal kegiatan tadi saat jam sekolah.
     * Jika jam saat ini berada di JAM KBM (07.45 - 14.40 WIB):
       Sebutkan aktivitas tepat yang sedang berlangsung saat ini berdasarkan bagian 'ANALISIS TEPAT PADA JAM'.
     * Jika hari ini adalah Sabtu atau Minggu:
       Jelaskan bahwa hari ini adalah akhir pekan (libur sekolah).

4. ATURAN PENANGANAN "JAM SPESIFIK":
   - Jika penanya menanyakan jam tertentu (misal: "jam 10.00", "at 08.20"):
     * Lihat bagian 'ANALISIS TEPAT PADA JAM'.
     * Sebutkan kelas atau aktivitas di rentang jam tersebut.
     * Jika jam tersebut adalah jam istirahat (Break), katakan sedang istirahat / on break.
     * Jika tidak ada kelas pada jam tersebut selama KBM, katakan sedang Free / Tidak ada jam mengajar.

5. ATURAN PENANGANAN "TANGGAL" / "BESOK" / "KEMARIN" / "LUSA":
   - Pahami tanggal dan hari yang ditanyakan:
     * Jika menanyakan pengumuman pada tanggal tertentu, jawab persis pengumuman yang tercatat di tanggal tersebut.
     * Jika tidak ada pengumuman di tanggal itu, katakan dengan jelas bahwa tidak ada pengumuman di tanggal tersebut.
     * Jika menanyakan jadwal guru pada tanggal tertentu, cocokkan dengan hari jatuhnya tanggal tersebut.

6. ATURAN JADWAL KELAS VS JADWAL GURU:
   - JIKA DITANYA JADWAL KELAS (misal: "jadwal kelas 1A", "Class 3A schedule"):
     Tampilkan FULL JADWAL KELAS secara lengkap dari sesi awal hingga selesai, mencakup SELURUH mata pelajaran Homeroom maupun mata pelajaran Spesialis beserta nama guru pengajarnya sesuai data pada bagian 'FULL JADWAL KELAS'.
   - JIKA DITANYA JADWAL GURU WALI KELAS (misal: "Ms. Debby mengajar apa?", "jadwal Ms. Tina"):
     Guru wali kelas (Homeroom Teacher) TIDAK MENGAJAR mata pelajaran spesialis (seperti IT, Mandarin, Olahraga/PSPE, English, VA, Music, Singing, Library, Reacter, SEL).
     Sebutkan HANYA mata pelajaran homeroom yang beliau ajar (UoI, BI, Math di Gr 1-4, P.Pancasila, PC Session, Assembly, Preparation).
     Pada jam mata pelajaran spesialis, beliau berstatus Free / Tidak Mengajar karena kelasnya sedang diajar oleh Guru Spesialis.

7. ATURAN JADWAL DUTY / JAGA PIKET (TEACHER ON DUTY):
   - Jika penanya bertanya tentang jadwal duty / jaga / piket (misal: duty di backyard, canteen, lobby/corridor, gate, atau duty guru):
     * Rujuk data pada bagian 'INFORMASI JADWAL DUTY / PIKET GURU (TEACHER ON DUTY)'.
     * Jika ditanyakan waktu "sekarang" atau jam tertentu (misal: "who is on duty now?", "siapa duty jam 09.10"):
       - Rujuk bagian 'ANALISIS DUTY TEPAT PADA JAM'. Jika ada guru yang bertugas pada jam tersebut, sebutkan nama guru, lokasi, dan kategori sesinya dengan jelas dan ramah.
       - Jika saat ini berada di luar jam operasional duty / malam hari atau di luar sesi istirahat: jelaskan secara sopan bahwa saat ini bukan jam duty / di luar jam sekolah, lalu sertakan jadwal lengkap duty di lokasi tersebut untuk hari terkait.
     * Jika ditanyakan jadwal duty seorang guru (misal: "jadwal duty Mr. Kornelius"):
       - Tampilkan seluruh sesi jaga beliau secara teratur berdasarkan hari, jam, lokasi, dan tugasnya.
     * Jika ditanyakan hari dan jam tertentu (misal: "who is on duty in the backyard on Monday at 09.10?"):
       - Sebutkan nama guru yang bertugas di lokasi dan jam tersebut dalam bahasa yang sesuai.

8. ATURAN LAPOR KESALAHAN JADWAL (CONTACT PERSON):
   - Jika penanya bertanya ke mana harus melapor jika jadwal salah, atau penanya menyatakan bahwa jadwalnya salah / tidak sesuai:
     * (ID): "Jika terdapat ketidaksesuaian atau kesalahan data jadwal, silakan langsung menghubungi Mr. Kornel untuk pembaruan sistem."
     * (EN): "If you notice any schedule discrepancies or errors, please contact Mr. Kornel for system updates."
     * (ZH): "如果发现日程安排有误或与实际不符，请直接联系 Mr. Kornel 进行系统更新。"
"""


def call_gemini(
    user_message: str, context: str, model_name: str = "gemini-2.5-flash"
) -> str:
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY not configured")
    import urllib.request
    import json

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
    lang_directive = get_language_directive(user_message)
    full_prompt = f"{SYSTEM_PROMPT}\n\nKONTEKS DATA DARI SEKOLAH:\n{context}\n\nPERTANYAAN PENGGUNA:\n{user_message}{lang_directive}"

    payload = json.dumps({"contents": [{"parts": [{"text": full_prompt}]}]}).encode(
        "utf-8"
    )

    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
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
            with urllib.request.urlopen(req, timeout=10) as resp:
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
            with urllib.request.urlopen(req, timeout=15) as resp:
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
    Menerapkan Dual AI Auto-Fallback:
    1. Gemini 2.5 Flash
    2. Gemini 2.5 Flash Lite
    3. Gemini 3.6 Flash
    4. Groq Fallback
    """
    if not data.message or not data.message.strip():
        raise HTTPException(
            status_code=400, detail="Pesan pertanyaan tidak boleh kosong."
        )

    # 1. Siapkan konteks data yang relevan
    context = build_school_context(data.message, db)

    # 2. AI Waterfall Providers List (Multi-Tier Fallback)
    # Jika model pertama terkena kuota limit (HTTP 429), timeout, atau error,
    # sistem otomatis mencoba model berikutnya secara berurutan.
    providers = [
        ("Gemini 3.5 Flash Lite", lambda: call_gemini(data.message, context, "gemini-3.5-flash-lite")),
        ("Groq AI", lambda: call_groq(data.message, context)),
        ("Gemini 3.5 Flash", lambda: call_gemini(data.message, context, "gemini-3.5-flash")),
        ("Gemini Flash Lite Latest", lambda: call_gemini(data.message, context, "gemini-flash-lite-latest")),
        ("Gemini 2.5 Flash Lite", lambda: call_gemini(data.message, context, "gemini-2.5-flash-lite")),
        ("Gemini 2.5 Flash", lambda: call_gemini(data.message, context, "gemini-2.5-flash")),
    ]

    for provider_name, func in providers:
        try:
            reply = func()
            if reply:
                return schemas.ChatResponse(
                    reply=reply, provider_used=provider_name, status="success"
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
