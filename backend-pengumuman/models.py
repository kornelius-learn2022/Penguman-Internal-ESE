from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
import datetime
import enum

# INI KUNCI UTAMANYA AGAR TIDAK ERROR "Base":
from database import Base


# ==========================================
# DEFINISI ENUM (Pilihan Kaku / Dropdown)
# ==========================================
class LevelAdminType(str, enum.Enum):
    Normal = "Normal"
    Super = "Super"


class GenderType(str, enum.Enum):
    Male = "Male"
    Female = "Female"


# ==========================================
# STRUKTUR TABEL
# ==========================================


class Admin(Base):
    __tablename__ = "Admin"

    id_admin = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name_admin = Column(String(100), nullable=False)
    password_admin = Column(String(255), nullable=False)
    level_admin = Column(Enum(LevelAdminType), nullable=False)

    # RELASI: Satu admin bisa punya "banyak" pengumuman dan ulang tahun
    announcements = relationship("Announcements", back_populates="admin_pembuat")
    birthdays = relationship("Birthdays", back_populates="admin_pembuat")


class Announcements(Base):
    __tablename__ = "Announcements"

    id_announcement = Column(Integer, primary_key=True, index=True, autoincrement=True)
    announcement = Column(Text, nullable=False)

    url_announcemet = Column(String(500), nullable=True)
    url_image = Column(String(500), nullable=True)

    date = Column(Date, nullable=False)

    # FOREIGN KEY: Menghubungkan ke tabel Admin
    admin_update = Column(
        Integer,
        ForeignKey("Admin.id_admin", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )

    # RELASI BALIK: Agar Python bisa langsung memanggil nama Admin dari pengumuman
    admin_pembuat = relationship("Admin", back_populates="announcements")


class Birthdays(Base):
    __tablename__ = "Birthdays"

    id_birthday = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    date = Column(Date, nullable=False)
    gender = Column(Enum(GenderType), nullable=False)

    # FOREIGN KEY: Menghubungkan ke tabel Admin
    admin_update = Column(
        Integer,
        ForeignKey("Admin.id_admin", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )

    # ---> PERBAIKAN: RELASI INI SEKARANG BERADA DI TEMPAT YANG BENAR <---
    # RELASI BALIK: Agar Python bisa langsung memanggil nama Admin pembuatnya
    admin_pembuat = relationship("Admin", back_populates="birthdays")


class FeedbackLog(Base):
    __tablename__ = "feedback_logs"

    id_feedback = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pertanyaan_user = Column(Text, nullable=False)
    jawaban_ai = Column(Text, nullable=False)
    catatan_user = Column(String, nullable=True)  # Alasan kenapa disalahkan
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class TeacherSchedule(Base):
    __tablename__ = "teacher_schedules"

    id_schedule = Column(Integer, primary_key=True, index=True, autoincrement=True)
    subject_grade = Column(String(100), nullable=False)
    teacher_name = Column(String(100), nullable=False)
    day_of_week = Column(String(20), nullable=False)
    time_slot = Column(String(50), nullable=False)
    class_name = Column(String(50), nullable=False)
    note = Column(String(255), nullable=True)
    admin_update = Column(
        Integer,
        ForeignKey("Admin.id_admin", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )

    admin_pembuat = relationship("Admin", backref="teacher_schedules")


class TeacherDuty(Base):
    __tablename__ = "teacher_duties"

    id_duty = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category = Column(String(100), nullable=False)
    grade_scope = Column(String(50), nullable=False)
    location = Column(String(100), nullable=False)
    day_of_week = Column(String(20), nullable=False)
    time_slot = Column(String(50), nullable=False)
    teacher_name = Column(String(100), nullable=False)
    task = Column(String(255), nullable=True)
    admin_update = Column(
        Integer,
        ForeignKey("Admin.id_admin", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )

    admin_pembuat = relationship("Admin", backref="teacher_duties")

