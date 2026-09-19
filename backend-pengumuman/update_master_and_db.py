import csv
import io
import os
import re
import sys
from dotenv import load_dotenv

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Set paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend-pengumuman")
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
sys.path.append(BACKEND_DIR)

import database
import models

RAW_FILE = r"C:\Users\kornelius\.gemini\antigravity\brain\c418eb99-d6d4-4801-aecd-2f4920d7aae8\scratch\raw_pasted_data.txt"
MODIFIED_CSV_PATH = os.path.join(BASE_DIR, "JADWAL_GURU_MASTER_MODIFIED.csv")
MASTER_CSV_PATH = os.path.join(BASE_DIR, "JADWAL_GURU_MASTER.csv")


def run():
    print(f"Membaca data sumber dari: {RAW_FILE}")
    with open(RAW_FILE, "r", encoding="utf-8") as f:
        text = f.read()

    lines = [l.strip() for l in text.splitlines()]

    # Temukan semua blok jadwal guru
    block_indices = []
    for i in range(len(lines)):
        if i + 1 < len(lines):
            line = lines[i]
            next_line = lines[i + 1]
            first_cell = line.split(",")[0].strip()
            next_first_cell = next_line.split(",")[0].strip()
            if any(
                k in first_cell for k in ["Grade", "Gr ", "Library"]
            ) and next_first_cell.startswith("Time"):
                block_indices.append(i)

    blocks = []
    for idx, b_start in enumerate(block_indices):
        b_end = block_indices[idx + 1] if idx + 1 < len(block_indices) else len(lines)
        block_lines = [l for l in lines[b_start:b_end] if l and set(l) != {","}]
        blocks.append(block_lines)

    print(f"Terdeteksi {len(blocks)} blok guru/mapel.")

    matrix_rows = []
    master_records = []

    # Ambil admin id default (kornelius)
    db = next(database.get_db())
    admin_obj = db.query(models.Admin).first()
    admin_id = admin_obj.id_admin if admin_obj else 1

    for idx, b in enumerate(blocks):
        title = b[0].split(",")[0].strip()

        # Ekstrak subject_grade dan teacher_name
        m_teacher = re.search(r"\((.*?)\)", title)
        if m_teacher:
            teacher_name = m_teacher.group(1).strip()
            subject_grade = re.sub(r"\(.*?\)", "", title).strip()
        else:
            subject_grade = title.strip()
            teacher_name = "Library Team" if "Library" in title else title.strip()

        header_line = b[1]
        header_cols = [c.strip() for c in next(csv.reader(io.StringIO(header_line)))]
        is_pattern_1 = header_cols[4].lower() == "time 2"

        if is_pattern_1:
            std_header = [
                "Time 1",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Time 2",
                "Thursday",
                "Time 1",
                "Friday",
            ]
        else:
            std_header = [
                "Time 1",
                "Monday",
                "Tuesday",
                "Time 2",
                "Wednesday",
                "Time 1",
                "Thursday",
                "Friday",
            ]

        matrix_rows.append([title] + [""] * 7)
        matrix_rows.append(std_header)

        for r_line in b[2:]:
            cols = [c.strip() for c in next(csv.reader(io.StringIO(r_line)))]
            while len(cols) > 8 and not cols[-1]:
                cols.pop()
            if len(cols) > 8 and cols[-1] in [",", ""]:
                cols = cols[:8]
            while len(cols) < 8:
                cols.append("")

            matrix_rows.append(cols)

            if is_pattern_1:
                day_mappings = [
                    ("Monday", cols[0], cols[1], "Time 1"),
                    ("Tuesday", cols[0], cols[2], "Time 1"),
                    ("Wednesday", cols[0], cols[3], "Time 1"),
                    ("Thursday", cols[4], cols[5], "Time 2"),
                    ("Friday", cols[6], cols[7], "Time 1"),
                ]
            else:
                if (
                    "Singing Grade 4" in title
                    and cols[0] == "14.10-14.20"
                    and cols[3] == "Preparation"
                ):
                    day_mappings = [
                        ("Monday", cols[0], cols[1], "Time 1"),
                        ("Tuesday", cols[0], cols[2], "Time 1"),
                        ("Wednesday", cols[0], cols[3], "Time 1"),
                        ("Thursday", cols[4], cols[6], "Time 2"),
                        ("Friday", cols[5], cols[7], "Time 1"),
                    ]
                else:
                    day_mappings = [
                        ("Monday", cols[0], cols[1], "Time 1"),
                        ("Tuesday", cols[0], cols[2], "Time 1"),
                        ("Wednesday", cols[3], cols[4], "Time 2"),
                        ("Thursday", cols[5], cols[6], "Time 1"),
                        ("Friday", cols[5], cols[7], "Time 1"),
                    ]

            for day, t_slot, c_name, note in day_mappings:
                if c_name:
                    master_records.append(
                        {
                            "subject_grade": subject_grade,
                            "teacher_name": teacher_name,
                            "day_of_week": day,
                            "time_slot": t_slot,
                            "class_name": c_name,
                            "note": note,
                        }
                    )

        matrix_rows.append([""] * 8)

    # 1. Simpan JADWAL_GURU_MASTER_MODIFIED.csv
    print(f"Menulis {MODIFIED_CSV_PATH} ({len(matrix_rows)} baris)...")
    with open(MODIFIED_CSV_PATH, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerows(matrix_rows)

    # 2. Simpan JADWAL_GURU_MASTER.csv
    print(f"Menulis {MASTER_CSV_PATH} ({len(master_records)} record)...")
    fieldnames = [
        "subject_grade",
        "teacher_name",
        "day_of_week",
        "time_slot",
        "class_name",
        "note",
    ]
    with open(MASTER_CSV_PATH, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(master_records)

    # 3. Sinkronisasi ke Database MySQL
    print(
        f"Menyinkronkan ke tabel database MySQL (teacher_schedules) dengan admin_update={admin_id}..."
    )
    try:
        deleted = db.query(models.TeacherSchedule).delete()
        print(f"Menghapus {deleted} record jadwal lama dari DB.")
        db_items = [
            models.TeacherSchedule(
                subject_grade=r["subject_grade"],
                teacher_name=r["teacher_name"],
                day_of_week=r["day_of_week"],
                time_slot=r["time_slot"],
                class_name=r["class_name"],
                note=r["note"],
                admin_update=admin_id,
            )
            for r in master_records
        ]
        db.bulk_save_objects(db_items)
        db.commit()
        print(
            f"Berhasil menyimpan {len(db_items)} record jadwal baru ke database MySQL!"
        )
    except Exception as e:
        db.rollback()
        print(f"Gagal sinkron database: {e}")
        raise
    finally:
        db.close()

    print("\n[SUKSES] SEMUA FILE CSV & DATABASE BERHASIL DIPERBARUI!")


if __name__ == "__main__":
    run()
