import os
import hashlib
import datetime
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from sqlalchemy import extract, or_, and_, desc, func
import models
import schemas
from database import get_db
from auth import create_access_token, get_current_user
from helpers import save_image_locally

router = APIRouter(prefix="/api")


@router.post("/feedback")
async def submit_feedback(data: schemas.FeedbackCreate, db: Session = Depends(get_db)):
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


@router.post("/login")
async def login_admin(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    admin_user = (
        db.query(models.Admin).filter(models.Admin.name_admin == data.username).first()
    )

    if not admin_user or admin_user.password_admin != data.password:
        raise HTTPException(status_code=401, detail="Username and Password Wrong!")

    token_data = {
        "username": admin_user.name_admin,
        "id_admin": admin_user.id_admin,
        "role": admin_user.level_admin,
    }

    jwt_token = create_access_token(data=token_data)

    return {
        "pesan": "Login berhasil!",
        "access_token": jwt_token,
        "token_type": "bearer",
        "role": admin_user.level_admin,
        "username": admin_user.name_admin,
        "id_admin": admin_user.id_admin,
    }


@router.get("/announcements", response_model=List[schemas.AnnouncementCombinedResponse])
def get_announcements(tanggal: Optional[date] = None, db: Session = Depends(get_db)):
    query = db.query(models.Announcements)
    if tanggal:
        query = query.filter(
            or_(
                and_(models.Announcements.end_date == None, models.Announcements.date == tanggal),
                and_(
                    models.Announcements.end_date != None,
                    models.Announcements.date <= tanggal,
                    models.Announcements.end_date >= tanggal,
                ),
            )
        )
    return query.order_by(models.Announcements.is_pinned.desc(), models.Announcements.date.desc(), models.Announcements.id_announcement.desc()).all()


@router.post("/announcements")
async def create_announcement(
    announcement: str = Form(...),
    tanggal_masuk: date = Form(...),
    admin_update: int = Form(...),
    end_date: Optional[date] = Form(None),
    is_pinned: bool = Form(False),
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

    img_url = save_image_locally(image) if image else None
    new_entry = models.Announcements(
        announcement=announcement,
        date=tanggal_masuk,
        end_date=end_date,
        is_pinned=is_pinned,
        admin_update=admin_update,
        url_announcemet=url_announcemet,
        url_image=img_url,
    )
    db.add(new_entry)
    db.commit()

    return {"message": "Pengumuman berhasil dibuat!", "data": new_entry}


@router.put("/announcements/{id_announcement}")
async def update_announcement(
    id_announcement: int,
    announcement: str = Form(...),
    tanggal_masuk: date = Form(...),
    admin_update: int = Form(...),
    end_date: Optional[date] = Form(None),
    is_pinned: Optional[bool] = Form(None),
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
    pengumuman_lama.end_date = end_date
    pengumuman_lama.admin_update = admin_update
    pengumuman_lama.url_announcemet = url_announcemet
    if is_pinned is not None:
        pengumuman_lama.is_pinned = is_pinned
    if image:
        pengumuman_lama.url_image = save_image_locally(image)

    db.commit()
    db.refresh(pengumuman_lama)

    return {"message": "Pengumuman berhasil diupdate!", "data": pengumuman_lama}


@router.patch("/announcements/{id_announcement}/toggle-pin")
async def toggle_pin_announcement(
    id_announcement: int,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    pengumuman = (
        db.query(models.Announcements)
        .filter(models.Announcements.id_announcement == id_announcement)
        .first()
    )
    if not pengumuman:
        raise HTTPException(status_code=404, detail="Pengumuman tidak ditemukan.")

    pengumuman.is_pinned = not bool(pengumuman.is_pinned)
    pengumuman.admin_update = user_aktif.get("id_admin", 1)
    db.commit()
    db.refresh(pengumuman)

    return {
        "message": f"Pengumuman berhasil {'disematkan (pin)' if pengumuman.is_pinned else 'dilepas pin'}.",
        "is_pinned": pengumuman.is_pinned,
    }


@router.delete("/announcements/{id_announcement}")
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
        raise HTTPException(status_code=404, detail="Pengumuman tidak ditemukan.")
    db.delete(pengumuman_target)
    db.commit()

    return {"message": "Pengumuman berhasil dihapus!"}


def verify_super_admin(user: dict):
    role = user.get("role")
    role_str = getattr(role, "value", str(role))
    if role_str != "Super":
        raise HTTPException(
            status_code=403,
            detail="Akses ditolak. Hanya Super Admin yang diizinkan untuk tindakan ini.",
        )


# ==========================================
# ENDPOINT BIRTHDAYS (ULANG TAHUN)
# ==========================================
@router.get("/birthdays")
def get_all_birthdays(db: Session = Depends(get_db)):
    return db.query(models.Birthdays).all()


@router.post("/birthdays")
def create_birthday(
    data: schemas.BirthdayCreate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Menambah daftar ulang tahun baru. Memerlukan autentikasi JWT admin yang aktif.
    """
    admin_id = user_aktif.get("id_admin", 1)
    new_bday = models.Birthdays(
        name=data.name,
        date=data.date,
        gender=data.gender,
        admin_update=admin_id,
    )
    db.add(new_bday)
    db.commit()
    db.refresh(new_bday)
    return {"message": "Data ulang tahun berhasil ditambahkan!", "data": new_bday}


@router.put("/birthdays/{id_birthday}")
def update_birthday(
    id_birthday: int,
    data: schemas.BirthdayUpdate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Mengupdate data ulang tahun. Memerlukan autentikasi JWT admin yang aktif.
    """
    bday = (
        db.query(models.Birthdays)
        .filter(models.Birthdays.id_birthday == id_birthday)
        .first()
    )
    if not bday:
        raise HTTPException(status_code=404, detail="Data ulang tahun tidak ditemukan.")

    if data.name is not None:
        bday.name = data.name
    if data.date is not None:
        bday.date = data.date
    if data.gender is not None:
        bday.gender = data.gender
    bday.admin_update = user_aktif.get("id_admin", bday.admin_update)

    db.commit()
    db.refresh(bday)
    return {"message": "Data ulang tahun berhasil diupdate!", "data": bday}


@router.delete("/birthdays/{id_birthday}")
def delete_birthday(
    id_birthday: int,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Menghapus data ulang tahun. Memerlukan autentikasi JWT admin yang aktif.
    """
    bday = (
        db.query(models.Birthdays)
        .filter(models.Birthdays.id_birthday == id_birthday)
        .first()
    )
    if not bday:
        raise HTTPException(status_code=404, detail="Data ulang tahun tidak ditemukan.")

    db.delete(bday)
    db.commit()
    return {"message": "Data ulang tahun berhasil dihapus!"}


# ==========================================
# ENDPOINT MANAJEMEN ADMIN
# ==========================================
@router.get("/admin", response_model=List[schemas.AdminResponse])
def get_all_admins(
    db: Session = Depends(get_db), user_aktif: dict = Depends(get_current_user)
):
    """
    Endpoint untuk mengambil seluruh daftar admin yang ada di database.
    """
    admins = db.query(models.Admin).all()
    return admins


@router.post("/admin")
def create_admin(
    data: schemas.AdminCreate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Endpoint untuk mendaftarkan atau membuat admin baru ke dalam database.
    Hanya Super Admin yang diizinkan.
    """
    verify_super_admin(user_aktif)
    # Cek apakah username/name_admin sudah digunakan sebelumnya
    existing_admin = (
        db.query(models.Admin)
        .filter(models.Admin.name_admin == data.name_admin)
        .first()
    )
    if existing_admin:
        raise HTTPException(status_code=400, detail="Username admin sudah terdaftar!")

    # Buat objek admin baru
    new_admin = models.Admin(
        name_admin=data.name_admin,
        password_admin=data.password_admin,
        level_admin=data.level_admin,
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return {
        "message": "Admin baru berhasil dibuat!",
        "data": {
            "id_admin": new_admin.id_admin,
            "name_admin": new_admin.name_admin,
            "level_admin": new_admin.level_admin,
        },
    }


@router.put("/admin/{id_admin}")
def update_admin(
    id_admin: int,
    data: schemas.AdminUpdate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Mengupdate akun admin. Hanya Super Admin yang dapat mengakses.
    """
    verify_super_admin(user_aktif)
    admin_target = (
        db.query(models.Admin).filter(models.Admin.id_admin == id_admin).first()
    )
    if not admin_target:
        raise HTTPException(status_code=404, detail="Admin tidak ditemukan.")

    if data.name_admin is not None:
        admin_target.name_admin = data.name_admin
    if data.level_admin is not None:
        admin_target.level_admin = data.level_admin
    if data.password_admin:
        admin_target.password_admin = data.password_admin

    db.commit()
    db.refresh(admin_target)
    return {
        "message": "Data admin berhasil diperbarui!",
        "data": {
            "id_admin": admin_target.id_admin,
            "name_admin": admin_target.name_admin,
            "level_admin": admin_target.level_admin,
        },
    }


@router.delete("/admin/{id_admin}")
def delete_admin(
    id_admin: int,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Menghapus akun admin. Hanya Super Admin yang dapat mengakses.
    """
    verify_super_admin(user_aktif)
    if user_aktif.get("id_admin") == id_admin:
        raise HTTPException(
            status_code=400,
            detail="Tidak dapat menghapus akun admin yang sedang login!",
        )

    admin_target = (
        db.query(models.Admin).filter(models.Admin.id_admin == id_admin).first()
    )
    if not admin_target:
        raise HTTPException(status_code=404, detail="Admin tidak ditemukan.")

    db.delete(admin_target)
    db.commit()
    return {"message": "Akun admin berhasil dihapus."}


# ==========================================
# ENDPOINT JADWAL GURU (TEACHER SCHEDULES)



@router.get("/schedules", response_model=List[schemas.TeacherScheduleResponse])
def get_teacher_schedules(
    teacher: Optional[str] = None,
    day: Optional[str] = None,
    class_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Mengambil seluruh daftar jadwal guru, dengan filter opsional berdasarkan nama guru, hari, atau kelas.
    """
    query = db.query(models.TeacherSchedule)
    if teacher:
        query = query.filter(models.TeacherSchedule.teacher_name.ilike(f"%{teacher}%"))
    if day:
        query = query.filter(models.TeacherSchedule.day_of_week.ilike(f"%{day}%"))
    if class_name:
        query = query.filter(models.TeacherSchedule.class_name.ilike(f"%{class_name}%"))
    return query.order_by(
        models.TeacherSchedule.teacher_name.asc(),
        models.TeacherSchedule.id_schedule.asc(),
    ).all()


@router.post("/schedules", response_model=schemas.TeacherScheduleResponse)
def create_teacher_schedule(
    data: schemas.TeacherScheduleCreate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Membuat jadwal guru baru. Hanya Super Admin yang dapat mengakses.
    """
    verify_super_admin(user_aktif)
    new_schedule = models.TeacherSchedule(
        subject_grade=data.subject_grade,
        teacher_name=data.teacher_name,
        day_of_week=data.day_of_week,
        time_slot=data.time_slot,
        class_name=data.class_name,
        note=data.note,
        admin_update=user_aktif.get("id_admin", 1),
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    return new_schedule


@router.put("/schedules/{id_schedule}", response_model=schemas.TeacherScheduleResponse)
def update_teacher_schedule(
    id_schedule: int,
    data: schemas.TeacherScheduleUpdate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Mengupdate jadwal guru. Hanya Super Admin yang dapat mengakses.
    """
    verify_super_admin(user_aktif)
    schedule = (
        db.query(models.TeacherSchedule)
        .filter(models.TeacherSchedule.id_schedule == id_schedule)
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Jadwal guru tidak ditemukan.")

    if data.subject_grade is not None:
        schedule.subject_grade = data.subject_grade
    if data.teacher_name is not None:
        schedule.teacher_name = data.teacher_name
    if data.day_of_week is not None:
        schedule.day_of_week = data.day_of_week
    if data.time_slot is not None:
        schedule.time_slot = data.time_slot
    if data.class_name is not None:
        schedule.class_name = data.class_name
    if data.note is not None:
        schedule.note = data.note
    schedule.admin_update = user_aktif.get("id_admin", 1)

    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete("/schedules/{id_schedule}")
def delete_teacher_schedule(
    id_schedule: int,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Menghapus jadwal guru. Hanya Super Admin yang dapat mengakses.
    """
    verify_super_admin(user_aktif)
    schedule = (
        db.query(models.TeacherSchedule)
        .filter(models.TeacherSchedule.id_schedule == id_schedule)
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Jadwal guru tidak ditemukan.")

    db.delete(schedule)
    db.commit()
    return {"message": "Jadwal guru berhasil dihapus."}


@router.post("/schedules/sync-master")
def sync_master_schedules(
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Sinkronisasi ulang seluruh jadwal guru dari file JADWAL_GURU_MASTER.csv.
    Hanya Super Admin yang dapat mengakses.
    """
    verify_super_admin(user_aktif)
    import csv

    csv_candidates = [
        os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "JADWAL_GURU_MASTER.csv",
        ),
        os.path.join(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ),
            "JADWAL_GURU_MASTER.csv",
        ),
        "JADWAL_GURU_MASTER.csv",
        "../JADWAL_GURU_MASTER.csv",
    ]
    csv_path = None
    for p in csv_candidates:
        if os.path.exists(p):
            csv_path = p
            break

    if not csv_path:
        raise HTTPException(
            status_code=404,
            detail="File master JADWAL_GURU_MASTER.csv tidak ditemukan.",
        )

    records = []
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            subject_grade = row.get("subject_grade", "").strip()
            teacher = row.get("teacher_name", "").strip()
            day = row.get("day_of_week", "").strip()
            time_slot = row.get("time_slot", "").strip()
            class_name = row.get("class_name", "").strip()
            note = row.get("note", "").strip() or None

            if teacher and day and time_slot and class_name:
                records.append(
                    models.TeacherSchedule(
                        subject_grade=subject_grade,
                        teacher_name=teacher,
                        day_of_week=day,
                        time_slot=time_slot,
                        class_name=class_name,
                        note=note,
                        admin_update=user_aktif.get("id_admin", 1),
                    )
                )

    if records:
        db.query(models.TeacherSchedule).delete()
        db.bulk_save_objects(records)
        db.commit()

    return {
        "message": f"Berhasil sinkronisasi {len(records)} jadwal dari master CSV.",
        "total_records": len(records),
    }


# ==========================================
# ENDPOINT JADWAL DUTY GURU (TEACHER DUTIES)
# ==========================================
@router.get("/duties", response_model=List[schemas.TeacherDutyResponse])
def get_teacher_duties(
    teacher: Optional[str] = None,
    day: Optional[str] = None,
    location: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Mengambil seluruh daftar jadwal duty/piket guru, dengan filter opsional berdasarkan guru, hari, lokasi, atau kategori.
    """
    query = db.query(models.TeacherDuty)
    if teacher:
        query = query.filter(models.TeacherDuty.teacher_name.ilike(f"%{teacher}%"))
    if day:
        query = query.filter(models.TeacherDuty.day_of_week.ilike(f"%{day}%"))
    if location:
        query = query.filter(models.TeacherDuty.location.ilike(f"%{location}%"))
    if category:
        query = query.filter(models.TeacherDuty.category.ilike(f"%{category}%"))

    return query.order_by(
        models.TeacherDuty.day_of_week.asc(),
        models.TeacherDuty.time_slot.asc(),
        models.TeacherDuty.location.asc(),
        models.TeacherDuty.id_duty.asc(),
    ).all()


@router.post("/duties", response_model=schemas.TeacherDutyResponse)
def create_teacher_duty(
    data: schemas.TeacherDutyCreate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Membuat jadwal duty baru. Hanya Super Admin yang dapat mengakses.
    """
    verify_super_admin(user_aktif)
    new_duty = models.TeacherDuty(
        category=data.category,
        grade_scope=data.grade_scope,
        location=data.location,
        day_of_week=data.day_of_week,
        time_slot=data.time_slot,
        teacher_name=data.teacher_name,
        task=data.task,
        admin_update=user_aktif.get("id_admin", 1),
    )
    db.add(new_duty)
    db.commit()
    db.refresh(new_duty)
    return new_duty


@router.put("/duties/{id_duty}", response_model=schemas.TeacherDutyResponse)
def update_teacher_duty(
    id_duty: int,
    data: schemas.TeacherDutyUpdate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Mengupdate jadwal duty. Hanya Super Admin yang dapat mengakses.
    """
    verify_super_admin(user_aktif)
    duty = (
        db.query(models.TeacherDuty)
        .filter(models.TeacherDuty.id_duty == id_duty)
        .first()
    )
    if not duty:
        raise HTTPException(status_code=404, detail="Jadwal duty tidak ditemukan.")

    if data.category is not None:
        duty.category = data.category
    if data.grade_scope is not None:
        duty.grade_scope = data.grade_scope
    if data.location is not None:
        duty.location = data.location
    if data.day_of_week is not None:
        duty.day_of_week = data.day_of_week
    if data.time_slot is not None:
        duty.time_slot = data.time_slot
    if data.teacher_name is not None:
        duty.teacher_name = data.teacher_name
    if data.task is not None:
        duty.task = data.task
    duty.admin_update = user_aktif.get("id_admin", 1)

    db.commit()
    db.refresh(duty)
    return duty


@router.delete("/duties/{id_duty}")
def delete_teacher_duty(
    id_duty: int,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Menghapus jadwal duty. Hanya Super Admin yang dapat mengakses.
    """
    verify_super_admin(user_aktif)
    duty = (
        db.query(models.TeacherDuty)
        .filter(models.TeacherDuty.id_duty == id_duty)
        .first()
    )
    if not duty:
        raise HTTPException(status_code=404, detail="Jadwal duty tidak ditemukan.")

    db.delete(duty)
    db.commit()
    return {"message": "Jadwal duty berhasil dihapus."}


@router.post("/duties/sync-master")
def sync_master_duties(
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Sinkronisasi ulang seluruh jadwal duty dari file JADWAL_DUTY_MASTER.csv.
    Hanya Super Admin yang dapat mengakses.
    """
    verify_super_admin(user_aktif)
    import csv

    csv_candidates = [
        os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "JADWAL_DUTY_MASTER.csv",
        ),
        os.path.join(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ),
            "JADWAL_DUTY_MASTER.csv",
        ),
        "JADWAL_DUTY_MASTER.csv",
        "../JADWAL_DUTY_MASTER.csv",
    ]
    csv_path = None
    for p in csv_candidates:
        if os.path.exists(p):
            csv_path = p
            break

    if not csv_path:
        raise HTTPException(
            status_code=404,
            detail="File master JADWAL_DUTY_MASTER.csv tidak ditemukan.",
        )

    records = []
    with open(csv_path, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            category = row.get("category", "").strip()
            grade_scope = row.get("grade_scope", "").strip()
            location = row.get("location", "").strip()
            day = row.get("day_of_week", "").strip()
            time_slot = row.get("time_slot", "").strip()
            teacher = row.get("teacher_name", "").strip()
            task = row.get("task", "").strip() or None

            if category and location and day and time_slot and teacher:
                records.append(
                    models.TeacherDuty(
                        category=category,
                        grade_scope=grade_scope,
                        location=location,
                        day_of_week=day,
                        time_slot=time_slot,
                        teacher_name=teacher,
                        task=task,
                        admin_update=user_aktif.get("id_admin", 1),
                    )
                )

    if records:
        db.query(models.TeacherDuty).delete()
        db.bulk_save_objects(records)
        db.commit()

    return {
        "message": f"Berhasil sinkronisasi {len(records)} jadwal duty dari master CSV.",
        "total_records": len(records),
    }


# ==========================================
# ENDPOINT STATISTIK PENGUNJUNG (ADMIN ONLY)
# ==========================================
@router.post("/track-visit")
async def track_visit(request: Request, db: Session = Depends(get_db)):
    """
    Mencatat kunjungan anonim ke website untuk statistik admin (Unique daily visitor).
    """
    try:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"

        user_agent = request.headers.get("User-Agent", "")[:250]
        ip_hash = hashlib.sha256(client_ip.encode("utf-8")).hexdigest()
        today = datetime.date.today()

        exists = (
            db.query(models.VisitorLog)
            .filter(
                models.VisitorLog.ip_hash == ip_hash,
                models.VisitorLog.visit_date == today,
            )
            .first()
        )

        if not exists:
            log = models.VisitorLog(
                ip_hash=ip_hash,
                user_agent=user_agent,
                visit_date=today,
                visited_at=datetime.datetime.utcnow(),
            )
            db.add(log)
            db.commit()

        return {"status": "ok"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "detail": str(e)}


@router.get("/admin/visitor-stats", response_model=schemas.VisitorStatsResponse)
def get_visitor_stats(
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Mengambil ringkasan statistik kunjungan website khusus untuk Admin dashboard.
    """
    today = datetime.date.today()
    total_visits = db.query(models.VisitorLog).count()
    today_visits = (
        db.query(models.VisitorLog)
        .filter(models.VisitorLog.visit_date == today)
        .count()
    )

    # 7 hari terakhir
    start_date = today - datetime.timedelta(days=6)
    weekly_records = (
        db.query(models.VisitorLog.visit_date, func.count(models.VisitorLog.id_visit))
        .filter(models.VisitorLog.visit_date >= start_date)
        .group_by(models.VisitorLog.visit_date)
        .order_by(models.VisitorLog.visit_date.asc())
        .all()
    )
    records_dict = {row[0]: row[1] for row in weekly_records}

    weekly_stats = []
    for i in range(7):
        d = start_date + datetime.timedelta(days=i)
        weekly_stats.append(
            schemas.DailyVisitStat(
                date=d.isoformat(), count=records_dict.get(d, 0)
            )
        )

    return schemas.VisitorStatsResponse(
        total_visits=total_visits,
        today_visits=today_visits,
        weekly_stats=weekly_stats,
    )


# ==========================================
# ENDPOINT INVAL DUTY (SEMENTARA)
# ==========================================
@router.get("/duties/inval", response_model=List[schemas.DutyInvalResponse])
def get_duty_invals(
    date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """
    Mendapatkan daftar inval duty / pergantian piket sementara.
    Bisa difilter berdasarkan tanggal tertentu.
    """
    query = db.query(models.DutyInval)
    if date:
        query = query.filter(models.DutyInval.date == date)
    return query.order_by(
        models.DutyInval.date.desc(), models.DutyInval.id_inval.desc()
    ).all()


@router.post("/duties/inval", response_model=schemas.DutyInvalResponse)
def create_duty_inval(
    data: schemas.DutyInvalCreate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Menambahkan pergantian guru piket (inval) sementara untuk tanggal tertentu.
    """
    new_inval = models.DutyInval(
        id_duty=data.id_duty,
        date=data.date,
        original_teacher=data.original_teacher,
        substitute_teacher=data.substitute_teacher,
        location=data.location,
        time_slot=data.time_slot,
        reason=data.reason,
        note=data.note,
        admin_update=user_aktif.get("id_admin", 1),
    )
    db.add(new_inval)
    db.commit()
    db.refresh(new_inval)
    return new_inval


@router.delete("/duties/inval/{id_inval}")
def delete_duty_inval(
    id_inval: int,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Menghapus data pergantian guru piket (inval).
    """
    inval = (
        db.query(models.DutyInval)
        .filter(models.DutyInval.id_inval == id_inval)
        .first()
    )
    if not inval:
        raise HTTPException(
            status_code=404, detail="Data inval duty tidak ditemukan."
        )
    db.delete(inval)
    db.commit()
    return {"message": "Data pergantian piket (inval) berhasil dihapus."}


# ==========================================
# ENDPOINT EVENT SCHEDULE (JADWAL KHUSUS EVENT)
# ==========================================
@router.get("/events/schedule", response_model=List[schemas.EventScheduleResponse])
def get_event_schedules(
    date: Optional[date] = None,
    scope: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Mendapatkan daftar event schedule khusus (Assembly, Retreat, Exam, dsb).
    Bisa difilter berdasarkan tanggal aktif atau scope.
    """
    query = db.query(models.EventSchedule)
    if date:
        query = query.filter(
            models.EventSchedule.date <= date,
            or_(
                models.EventSchedule.end_date == None,
                models.EventSchedule.end_date >= date,
            ),
        )
    if scope:
        query = query.filter(models.EventSchedule.target_scope.ilike(f"%{scope}%"))
    return query.order_by(
        models.EventSchedule.date.desc(), models.EventSchedule.id_event.desc()
    ).all()


@router.post("/events/schedule", response_model=schemas.EventScheduleResponse)
def create_event_schedule(
    data: schemas.EventScheduleCreate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Membuat jadwal event khusus baru (Schoolwide / Grade-specific).
    """
    new_event = models.EventSchedule(
        event_name=data.event_name,
        target_scope=data.target_scope,
        date=data.date,
        end_date=data.end_date,
        time_slot=data.time_slot,
        description=data.description,
        affects_kbm=data.affects_kbm,
        admin_update=user_aktif.get("id_admin", 1),
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event


@router.put("/events/schedule/{id_event}", response_model=schemas.EventScheduleResponse)
def update_event_schedule(
    id_event: int,
    data: schemas.EventScheduleUpdate,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Mengupdate jadwal event khusus.
    """
    event = (
        db.query(models.EventSchedule)
        .filter(models.EventSchedule.id_event == id_event)
        .first()
    )
    if not event:
        raise HTTPException(
            status_code=404, detail="Jadwal event tidak ditemukan."
        )

    if data.event_name is not None:
        event.event_name = data.event_name
    if data.target_scope is not None:
        event.target_scope = data.target_scope
    if data.date is not None:
        event.date = data.date
    if data.end_date is not None:
        event.end_date = data.end_date
    if data.time_slot is not None:
        event.time_slot = data.time_slot
    if data.description is not None:
        event.description = data.description
    if data.affects_kbm is not None:
        event.affects_kbm = data.affects_kbm

    event.admin_update = user_aktif.get("id_admin", 1)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/schedule/{id_event}")
def delete_event_schedule(
    id_event: int,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Menghapus jadwal event khusus.
    """
    event = (
        db.query(models.EventSchedule)
        .filter(models.EventSchedule.id_event == id_event)
        .first()
    )
    if not event:
        raise HTTPException(
            status_code=404, detail="Jadwal event tidak ditemukan."
        )
    db.delete(event)
    db.commit()
    return {"message": "Jadwal event berhasil dihapus."}


# ==========================================
# ENDPOINT ABSENSI DUTY GURU (TEACHER DUTY ATTENDANCE)
# ==========================================
def get_now_wib():
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    wib_now = utc_now + datetime.timedelta(hours=7)
    return wib_now


def parse_time_slot_range(time_slot: str):
    try:
        clean = time_slot.replace(" ", "").replace("–", "-")
        parts = clean.split("-")
        if len(parts) == 2:
            s_hour, s_min = [int(x) for x in parts[0].replace(":", ".").split(".")]
            e_hour, e_min = [int(x) for x in parts[1].replace(":", ".").split(".")]
            return datetime.time(s_hour, s_min), datetime.time(e_hour, e_min)
    except Exception:
        pass
    return None, None


@router.get("/duty-attendance/locations", response_model=List[str])
def get_duty_locations(db: Session = Depends(get_db)):
    """
    Mengambil seluruh daftar lokasi tempat duty dari master teacher_duties.
    """
    results = (
        db.query(models.TeacherDuty.location)
        .distinct()
        .order_by(models.TeacherDuty.location.asc())
        .all()
    )
    return [r[0] for r in results if r[0]]


@router.get("/duty-attendance/teachers", response_model=List[str])
def get_all_duty_teachers(db: Session = Depends(get_db)):
    """
    Mengambil daftar seluruh guru untuk dropdown pemilihan guru.
    """
    duty_teachers = (
        db.query(models.TeacherDuty.teacher_name).distinct().all()
    )
    schedule_teachers = (
        db.query(models.TeacherSchedule.teacher_name).distinct().all()
    )
    all_names = set(
        [r[0].strip() for r in duty_teachers if r[0] and r[0].strip()]
        + [r[0].strip() for r in schedule_teachers if r[0] and r[0].strip()]
    )
    return sorted(list(all_names))


@router.get("/duty-attendance/sessions", response_model=List[schemas.DutySessionDetail])
def get_duty_sessions(
    tanggal: Optional[date] = None,
    location: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Mengambil seluruh sesi duty per tempat dan waktu pada tanggal tertentu,
    menghitung status kehadiran guru (⚪ Belum Duty, 🟢 Lagi Duty, 🔵 Sudah Duty, 🟠 Tidak Duty)
    berdasarkan waktu saat ini dan riwayat absensi.
    """
    wib_now = get_now_wib()
    today_wib = wib_now.date()
    target_date = tanggal if tanggal else today_wib
    day_of_week = target_date.strftime("%A")  # Monday, Tuesday, ...

    # Query master duties for this day
    query = db.query(models.TeacherDuty).filter(
        models.TeacherDuty.day_of_week.ilike(day_of_week)
    )
    if location:
        query = query.filter(models.TeacherDuty.location == location)

    duties = query.order_by(
        models.TeacherDuty.time_slot.asc(),
        models.TeacherDuty.location.asc(),
        models.TeacherDuty.id_duty.asc(),
    ).all()

    # Query invals for this date
    invals = (
        db.query(models.DutyInval)
        .filter(models.DutyInval.date == target_date)
        .all()
    )
    # Map invals: (location, time_slot, original_teacher) -> substitute_teacher
    inval_map = {}
    for inv in invals:
        key = (inv.location.strip().lower(), inv.time_slot.strip().lower(), inv.original_teacher.strip().lower())
        inval_map[key] = inv.substitute_teacher.strip()

    # Query attendances for this date
    attendances = (
        db.query(models.DutyAttendance)
        .filter(models.DutyAttendance.date == target_date)
        .order_by(models.DutyAttendance.check_in_time.asc())
        .all()
    )
    # Map attendance: (location, time_slot, teacher_name) -> attendance_record
    attendance_map = {}
    attendance_by_session = {}
    for att in attendances:
        sess_key = f"{att.location}_{att.time_slot}"
        attendance_by_session.setdefault(sess_key, []).append(att)
        t_key = (att.location.strip().lower(), att.time_slot.strip().lower(), att.teacher_name.strip().lower())
        attendance_map[t_key] = att

    # Group duties by (location, time_slot)
    grouped_sessions = {}
    for duty in duties:
        sess_key = f"{duty.location}_{duty.time_slot}"
        if sess_key not in grouped_sessions:
            grouped_sessions[sess_key] = {
                "session_key": sess_key,
                "location": duty.location,
                "time_slot": duty.time_slot,
                "duty_category": duty.category,
                "grade_scope": duty.grade_scope,
                "passcode": "citahati",
                "raw_teachers": [],
            }
        grouped_sessions[sess_key]["raw_teachers"].append(duty)

    # Build response list
    results = []
    current_time_wib = wib_now.time()

    for sess_key, sess_info in grouped_sessions.items():
        loc_clean = sess_info["location"].strip().lower()
        slot_clean = sess_info["time_slot"].strip().lower()
        start_t, end_t = parse_time_slot_range(sess_info["time_slot"])

        scheduled_teacher_statuses = []
        for d in sess_info["raw_teachers"]:
            orig_teacher = d.teacher_name.strip()
            inv_key = (loc_clean, slot_clean, orig_teacher.lower())
            is_inval = inv_key in inval_map
            effective_teacher = inval_map[inv_key] if is_inval else orig_teacher

            att_key = (loc_clean, slot_clean, effective_teacher.lower())
            att_record = attendance_map.get(att_key)

            if att_record:
                is_attended = True
                check_in_str = att_record.check_in_time.strftime("%H:%M:%S")
                if target_date < today_wib:
                    status = "Sudah Duty"
                    color = "blue"
                    icon = "🔵"
                elif target_date > today_wib:
                    status = "Sudah Duty"
                    color = "blue"
                    icon = "🔵"
                else:
                    if start_t and end_t:
                        if current_time_wib > end_t:
                            status = "Sudah Duty"
                            color = "blue"
                            icon = "🔵"
                        else:
                            status = "Lagi Duty"
                            color = "green"
                            icon = "🟢"
                    else:
                        status = "Sudah Duty"
                        color = "blue"
                        icon = "🔵"
            else:
                is_attended = False
                check_in_str = None
                if target_date < today_wib:
                    status = "Tidak Duty"
                    color = "orange"
                    icon = "🟠"
                elif target_date > today_wib:
                    status = "Belum Duty"
                    color = "grey"
                    icon = "⚪"
                else:
                    if start_t and end_t:
                        if current_time_wib > end_t:
                            status = "Tidak Duty"
                            color = "orange"
                            icon = "🟠"
                        else:
                            # Jika belum absen (baik jam piket belum mulai atau sedang berlangsung)
                            status = "Belum Duty"
                            color = "grey"
                            icon = "⚪"
                    else:
                        status = "Belum Duty"
                        color = "grey"
                        icon = "⚪"

            task_info = d.task
            if is_inval:
                task_info = f"Inval pengganti dari {orig_teacher}. {task_info or ''}".strip()

            scheduled_teacher_statuses.append(
                schemas.DutyTeacherStatus(
                    teacher_name=effective_teacher,
                    status=status,
                    color=color,
                    icon=icon,
                    is_attended=is_attended,
                    check_in_time=check_in_str,
                    is_scheduled=True,
                    task=task_info,
                )
            )

        attended_list = attendance_by_session.get(sess_key, [])
        total_scheduled = len(scheduled_teacher_statuses)
        total_attended = len([s for s in scheduled_teacher_statuses if s.is_attended])

        results.append(
            schemas.DutySessionDetail(
                session_key=sess_key,
                location=sess_info["location"],
                time_slot=sess_info["time_slot"],
                duty_category=sess_info["duty_category"],
                grade_scope=sess_info["grade_scope"],
                passcode="citahati",
                scheduled_teachers=scheduled_teacher_statuses,
                attended_list=attended_list,
                total_scheduled=total_scheduled,
                total_attended=total_attended,
            )
        )

    return results


@router.post("/duty-attendance/check-in", response_model=schemas.DutyAttendanceResponse)
def submit_duty_attendance(
    data: schemas.DutyAttendanceCreate,
    db: Session = Depends(get_db),
):
    """
    Melakukan absensi guru pada sesi duty tertentu dengan password 'citahati'.
    Sistem otomatis memeriksa apakah guru terjadwal duty (atau pengganti inval)
    dan menandainya di database.
    """
    # 1. Validasi Password Tetap "citahati"
    if data.password.strip().lower() != "citahati":
        raise HTTPException(
            status_code=400,
            detail="Password salah! Password absensi duty adalah 'citahati'.",
        )

    teacher_clean = data.teacher_name.strip()
    loc_clean = data.location.strip()
    slot_clean = data.time_slot.strip()

    # 2. Cek apakah guru sudah absen di sesi dan lokasi ini
    already_attended = (
        db.query(models.DutyAttendance)
        .filter(
            models.DutyAttendance.date == data.date,
            models.DutyAttendance.location == loc_clean,
            models.DutyAttendance.time_slot == slot_clean,
            models.DutyAttendance.teacher_name.ilike(teacher_clean),
        )
        .first()
    )
    if already_attended:
        raise HTTPException(
            status_code=400,
            detail=f"{teacher_clean} sudah tercatat absen untuk duty di {loc_clean} ({slot_clean}).",
        )

    # 3. Cek apakah guru terjadwal duty pada hari, tempat, dan jam tersebut
    day_of_week = data.date.strftime("%A")
    scheduled_duty = (
        db.query(models.TeacherDuty)
        .filter(
            models.TeacherDuty.day_of_week.ilike(day_of_week),
            models.TeacherDuty.location.ilike(loc_clean),
            models.TeacherDuty.time_slot.ilike(slot_clean),
            models.TeacherDuty.teacher_name.ilike(f"%{teacher_clean}%"),
        )
        .first()
    )

    # Cek juga di duty invals (guru pengganti sah)
    inval_record = (
        db.query(models.DutyInval)
        .filter(
            models.DutyInval.date == data.date,
            models.DutyInval.location.ilike(loc_clean),
            models.DutyInval.time_slot.ilike(slot_clean),
            models.DutyInval.substitute_teacher.ilike(f"%{teacher_clean}%"),
        )
        .first()
    )

    if scheduled_duty or inval_record:
        is_scheduled = True
        status_label = "Terjadwal Duty"
    else:
        is_scheduled = False
        status_label = "Bukan Jadwal Duty / Pengganti"

    now_wib = get_now_wib()

    new_attendance = models.DutyAttendance(
        date=data.date,
        location=loc_clean,
        time_slot=slot_clean,
        duty_category=data.duty_category,
        teacher_name=teacher_clean,
        check_in_time=now_wib,
        is_scheduled_duty=is_scheduled,
        status_label=status_label,
        verified_code="citahati",
        notes=data.notes,
        created_at=now_wib,
    )

    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)
    return new_attendance


@router.get("/duty-attendance/records", response_model=List[schemas.DutyAttendanceResponse])
def get_duty_attendance_records(
    tanggal: Optional[date] = None,
    location: Optional[str] = None,
    is_scheduled_duty: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """
    Mengambil riwayat log absensi guru lengkap.
    """
    query = db.query(models.DutyAttendance)
    if tanggal:
        query = query.filter(models.DutyAttendance.date == tanggal)
    if location:
        query = query.filter(models.DutyAttendance.location == location)
    if is_scheduled_duty is not None:
        query = query.filter(models.DutyAttendance.is_scheduled_duty == is_scheduled_duty)

    return query.order_by(
        models.DutyAttendance.date.desc(),
        models.DutyAttendance.check_in_time.desc(),
        models.DutyAttendance.id_attendance.desc(),
    ).all()


@router.delete("/duty-attendance/records/{id_attendance}")
def delete_duty_attendance_record(
    id_attendance: int,
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user),
):
    """
    Menghapus data absensi duty (Admin only).
    """
    record = (
        db.query(models.DutyAttendance)
        .filter(models.DutyAttendance.id_attendance == id_attendance)
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=404, detail="Data absensi tidak ditemukan."
        )
    db.delete(record)
    db.commit()
    return {"message": "Data absensi berhasil dihapus."}


@router.post("/duty-attendance/seed-dummy")
def seed_dummy_duty_attendance(
    db: Session = Depends(get_db),
):
    """
    Membuat 1 set data dummy absensi untuk hari ini agar dapat memverifikasi
    status (Sudah Duty, Bukan Jadwal Duty) langsung di tampilan.
    """
    wib_now = get_now_wib()
    today_date = wib_now.date()
    day_of_week = today_date.strftime("%A")

    # Cari 1 duty yang ada hari ini
    sample_duty = (
        db.query(models.TeacherDuty)
        .filter(models.TeacherDuty.day_of_week.ilike(day_of_week))
        .first()
    )

    if not sample_duty:
        # Jika hari ini weekend (Sabtu/Minggu), ambil sampel Senin
        sample_duty = db.query(models.TeacherDuty).first()

    if not sample_duty:
        raise HTTPException(status_code=404, detail="Data master duty kosong.")

    # 1. Hapus jika sudah ada dummy sebelumnya di slot ini agar tidak dobel
    db.query(models.DutyAttendance).filter(
        models.DutyAttendance.date == today_date,
        models.DutyAttendance.location == sample_duty.location,
        models.DutyAttendance.time_slot == sample_duty.time_slot,
    ).delete()

    # 2. Buat absensi untuk guru yang memang terjadwal (Terjadwal Duty -> 🔵 Sudah Duty)
    dummy_scheduled = models.DutyAttendance(
        date=today_date,
        location=sample_duty.location,
        time_slot=sample_duty.time_slot,
        duty_category=sample_duty.category,
        teacher_name=sample_duty.teacher_name,
        check_in_time=wib_now,
        is_scheduled_duty=True,
        status_label="Terjadwal Duty",
        verified_code="citahati",
        notes="Absensi dummy uji coba - Terjadwal Duty",
        created_at=wib_now,
    )
    db.add(dummy_scheduled)

    # 3. Buat absensi untuk guru yang TIDAK terjadwal (Bukan Jadwal Duty / Pengganti)
    dummy_unscheduled = models.DutyAttendance(
        date=today_date,
        location=sample_duty.location,
        time_slot=sample_duty.time_slot,
        duty_category=sample_duty.category,
        teacher_name="Mr. Dummy Pengganti",
        check_in_time=wib_now,
        is_scheduled_duty=False,
        status_label="Bukan Jadwal Duty / Pengganti",
        verified_code="citahati",
        notes="Absensi dummy uji coba - Guru Pengganti / Luar Jadwal",
        created_at=wib_now,
    )
    db.add(dummy_unscheduled)

    db.commit()

    return {
        "message": "Data dummy absensi duty berhasil dibuat untuk pengujian!",
        "date": today_date.isoformat(),
        "location": sample_duty.location,
        "time_slot": sample_duty.time_slot,
        "scheduled_teacher": sample_duty.teacher_name,
        "unscheduled_teacher": "Mr. Dummy Pengganti",
    }

