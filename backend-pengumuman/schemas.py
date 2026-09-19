from pydantic import BaseModel
from typing import Optional
from datetime import date
import models


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


class AdminResponse(BaseModel):
    id_admin: int
    name_admin: str
    level_admin: str

    class Config:
        from_attributes = True  # Supay


class FeedbackCreate(BaseModel):
    pertanyaan_user: str
    jawaban_ai: str
    catatan_user: str = "Jawaban tidak sesuai/format rusak"


class TeacherScheduleBase(BaseModel):
    subject_grade: str
    teacher_name: str
    day_of_week: str
    time_slot: str
    class_name: str
    note: Optional[str] = None


class TeacherScheduleCreate(TeacherScheduleBase):
    pass


class TeacherScheduleUpdate(BaseModel):
    subject_grade: Optional[str] = None
    teacher_name: Optional[str] = None
    day_of_week: Optional[str] = None
    time_slot: Optional[str] = None
    class_name: Optional[str] = None
    note: Optional[str] = None


class TeacherScheduleResponse(TeacherScheduleBase):
    id_schedule: int
    admin_update: int
    admin_pembuat: Optional[AdminResponse] = None

    class Config:
        from_attributes = True


class TeacherDutyBase(BaseModel):
    category: str
    grade_scope: str
    location: str
    day_of_week: str
    time_slot: str
    teacher_name: str
    task: Optional[str] = None


class TeacherDutyCreate(TeacherDutyBase):
    pass


class TeacherDutyUpdate(BaseModel):
    category: Optional[str] = None
    grade_scope: Optional[str] = None
    location: Optional[str] = None
    day_of_week: Optional[str] = None
    time_slot: Optional[str] = None
    teacher_name: Optional[str] = None
    task: Optional[str] = None


class TeacherDutyResponse(TeacherDutyBase):
    id_duty: int
    admin_update: int
    admin_pembuat: Optional[AdminResponse] = None

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    language: Optional[str] = "id"


class ChatResponse(BaseModel):
    reply: str
    provider_used: str
    status: str = "success"

