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
    return query.order_by(models.Announcements.date.desc(), models.Announcements.id_announcement.desc()).all()


@router.post("/announcements")
async def create_announcement(
    announcement: str = Form(...),
    tanggal_masuk: date = Form(...),
    admin_update: int = Form(...),
    end_date: Optional[date] = Form(None),
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
    if image:
        pengumuman_lama.url_image = save_image_locally(image)

    db.commit()
    db.refresh(pengumuman_lama)

    return {"message": "Pengumuman berhasil diupdate!", "data": pengumuman_lama}


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
