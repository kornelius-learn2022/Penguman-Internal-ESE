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
