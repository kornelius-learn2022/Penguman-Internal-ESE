import datetime
import uuid
import os
import shutil
from typing import Optional
from fastapi import UploadFile

# Buat direktori penyimpanan lokal jika belum ada
UPLOAD_DIR = "uploads/images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

BULAN_INDO = {
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


def interpretasi_pesan_ke_tanggal(teks: str) -> Optional[str]:
    hari_ini = (datetime.datetime.utcnow() + datetime.timedelta(hours=7)).date()
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


def save_image_locally(file: UploadFile) -> Optional[str]:
    if not file:
        return None

    try:
        # Ambil ekstensi file (contoh: .jpg, .png)
        ekstensi = file.filename.split(".")[-1] if "." in file.filename else "png"

        # Buat nama file unik menggunakan UUID
        nama_file_unik = f"{uuid.uuid4().hex}.{ekstensi}"
        file_path = os.path.join(UPLOAD_DIR, nama_file_unik)

        # Simpan file ke dalam direktori lokal
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Kembalikan path lokal agar bisa diakses via URL di frontend
        return f"/uploads/images/{nama_file_unik}"
    except Exception as e:
        print(f"Gagal menyimpan gambar secara lokal: {e}")
        return None


def is_time_in_range(time_to_check: str, time_range_str: str) -> bool:
    if not time_to_check:
        return True
    try:
        start_str, end_str = time_range_str.split("-")
        start_mins = int(start_str.split(".")[0]) * 60 + int(start_str.split(".")[1])
        end_mins = int(end_str.split(".")[0]) * 60 + int(end_str.split(".")[1])
        check_mins = int(time_to_check.split(".")[0]) * 60 + int(
            time_to_check.split(".")[1]
        )
        return start_mins <= check_mins < end_mins
    except:
        return False
