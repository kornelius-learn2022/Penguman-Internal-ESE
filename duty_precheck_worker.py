"""
Script Otomatis Pre-Duty Healthcheck yang Menyesuaikan Jadwal Khusus
Mendukung perbedaan jam duty hari Senin/Selasa/Jumat vs Rabu & Kamis (Jadwal Chapel/Kebaktian).
"""
import urllib.request
import json
import time
import os
import sys
from datetime import datetime, timezone, timedelta

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "5430556207")
WIB = timezone(timedelta(hours=7))

def get_upcoming_sessions_today(now_wib: datetime):
    day_name = now_wib.strftime("%A") # Monday, Tuesday, Wednesday, Thursday, Friday
    
    url = "https://pengumuman.klprojects.online/api/duties"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ESE-PreDuty-Monitor/1.0"})
        with urllib.request.urlopen(req, timeout=10) as res:
            all_duties = json.loads(res.read().decode('utf-8'))
    except Exception as e:
        print(f"Gagal mengambil API duties: {e}")
        return day_name, []

    # Filter duty hari ini
    today_duties = [d for d in all_duties if d.get('day_of_week', '').lower() == day_name.lower()]
    
    # Kelompokkan berdasarkan start time
    upcoming = []
    seen = set()
    
    current_minutes = now_wib.hour * 60 + now_wib.minute

    for d in today_duties:
        time_slot = d.get('time_slot', '') # Contoh: "09.30-09.45" atau "10.05-10.20"
        if not time_slot or '-' not in time_slot:
            continue
            
        start_str = time_slot.split('-')[0].strip().replace(':', '.') # "09.30"
        try:
            parts = start_str.split('.')
            start_h = int(parts[0])
            start_m = int(parts[1])
            slot_minutes = start_h * 60 + start_m
            
            # Cek apakah sesi akan mulai dalam 5 - 20 menit ke depan
            diff = slot_minutes - current_minutes
            if 0 < diff <= 20:
                key = (d.get('category'), d.get('grade_scope'), time_slot)
                if key not in seen:
                    seen.add(key)
                    upcoming.append({
                        "category": d.get('category'),
                        "grade_scope": d.get('grade_scope'),
                        "time_slot": time_slot,
                        "diff_minutes": diff,
                        "start_str": start_str
                    })
        except Exception:
            continue

    return day_name, upcoming

def ping_services():
    t0 = time.time()
    try:
        fe_res = urllib.request.urlopen("https://pengumuman.klprojects.online/", timeout=10)
        fe_code = fe_res.getcode()
        fe_latency = round((time.time() - t0) * 1000)
    except Exception:
        fe_code = "ERR / Timeout"
        fe_latency = 0

    t0 = time.time()
    try:
        be_res = urllib.request.urlopen("https://pengumuman.klprojects.online/api/teachers", timeout=10)
        be_code = be_res.getcode()
        be_latency = round((time.time() - t0) * 1000)
    except Exception:
        be_code = "ERR / Timeout"
        be_latency = 0

    return fe_code, fe_latency, be_code, be_latency

def run_check(force_run: bool = False, custom_time: datetime = None):
    now_wib = custom_time if custom_time else datetime.now(WIB)
    day_name, upcoming = get_upcoming_sessions_today(now_wib)
    
    print(f"Pengecekan: {day_name}, {now_wib.strftime('%H:%M')} WIB. Sesi terdeteksi: {len(upcoming)}")

    if not upcoming and not force_run:
        print("Tidak ada sesi duty yang mulai dalam 15 menit ke depan. Selesai.")
        return

    # Lakukan healthcheck
    fe_code, fe_ms, be_code, be_ms = ping_services()
    is_healthy = (fe_code == 200 and be_code == 200)

    if is_healthy:
        header = "🟢 *[PRE-DUTY CHECK: WEB NORMAL]* 🟢"
        summary = "✅ *Status Web Sehat:* Presensi duty siap digunakan guru dengan lancar."
    else:
        header = "🚨 *[PRE-DUTY WARNING: WEB BERMASALAH]* 🚨"
        summary = "⚠️ *PERHATIAN:* Website mengalami kendala! Segera periksa VPS sebelum guru melakukan scan!"

    # Daftar sesi yang akan mulai
    if upcoming:
        session_lines = []
        for s in upcoming:
            session_lines.append(f"• *{s['category']}* - {s['grade_scope']} (`{s['time_slot']}`)")
        session_text = "\n".join(session_lines)
    else:
        session_text = "• *Simulasi Sesi Duty (Testing)*"

    message = (
        f"{header}\n\n"
        f"👨‍💻 *Halo Developer (Putra), duty akan segera dimulai!*\n"
        f"📅 *Hari:* {day_name} ({now_wib.strftime('%d-%m-%Y')})\n"
        f"⏰ *Sesi Terdekat (Mulai ~10-15 mnt lagi):*\n"
        f"{session_text}\n\n"
        f"📊 *Diagnosa Kesiapan Web:*\n"
        f"• Frontend: HTTP `{fe_code}` ({fe_ms} ms)\n"
        f"• Backend API: HTTP `{be_code}` ({be_ms} ms)\n"
        f"• Server: `pengumuman.klprojects.online`\n\n"
        f"{summary}\n"
        f"🔗 [Buka Web Presensi](https://pengumuman.klprojects.online/duty-attendance)"
    )

    if not BOT_TOKEN:
        print("BOT_TOKEN tidak ditemukan.")
        return

    # Kirim ke Telegram
    payload = {
        "chat_id": CHAT_ID,
        "text": message,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True
    }

    req = urllib.request.Request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        data=json.dumps(payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            res_data = json.loads(res.read().decode('utf-8'))
            if res_data.get("ok"):
                print("Laporan Pre-Duty terkirim ke Telegram!")
    except Exception as e:
        print(f"Gagal mengirim pesan: {e}")

if __name__ == "__main__":
    force = ("--force" in sys.argv)
    run_check(force_run=force)
