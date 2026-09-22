from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
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
    end_date: Optional[date] = None
    is_pinned: bool = False
    admin_pembuat: Optional[AdminResponse]

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    username: str
    password: str


class AnnouncementCreate(BaseModel):
    announcement: str
    date: date
    end_date: Optional[date] = None
    is_pinned: bool = False
    url_announcemet: Optional[str] = None
    url_image: Optional[str] = None
    admin_update: int


class BirthdayCreate(BaseModel):
    name: str
    date: date
    gender: models.GenderType
    admin_update: Optional[int] = None


class BirthdayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[date] = None
    gender: Optional[models.GenderType] = None
    admin_update: Optional[int] = None


class AdminCreate(BaseModel):
    name_admin: str
    password_admin: str
    level_admin: str


class AdminUpdate(BaseModel):
    name_admin: Optional[str] = None
    password_admin: Optional[str] = None
    level_admin: Optional[str] = None


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


# ==========================================
# SKEMA STATISTIK PENGUNJUNG (ADMIN ONLY)
# ==========================================
class TrackVisitRequest(BaseModel):
    path: Optional[str] = "/announcements"


class DailyVisitStat(BaseModel):
    date: str
    count: int


class VisitorStatsResponse(BaseModel):
    total_visits: int
    today_visits: int
    weekly_stats: List[DailyVisitStat]


# ==========================================
# SKEMA INVAL DUTY (SEMENTARA)
# ==========================================
class DutyInvalBase(BaseModel):
    id_duty: Optional[int] = None
    date: date
    original_teacher: str
    substitute_teacher: str
    location: str
    time_slot: str
    reason: Optional[str] = None
    note: Optional[str] = None


class DutyInvalCreate(DutyInvalBase):
    pass


class DutyInvalResponse(DutyInvalBase):
    id_inval: int
    admin_update: int
    admin_pembuat: Optional[AdminResponse] = None

    class Config:
        from_attributes = True


# ==========================================
# SKEMA EVENT SCHEDULE (JADWAL KHUSUS EVENT)
# ==========================================
class EventScheduleBase(BaseModel):
    event_name: str
    target_scope: str  # "Schoolwide", "Grade 1-3", dll.
    date: date
    end_date: Optional[date] = None
    time_slot: Optional[str] = None
    description: str
    affects_kbm: bool = True


class EventScheduleCreate(EventScheduleBase):
    pass


class EventScheduleUpdate(BaseModel):
    event_name: Optional[str] = None
    target_scope: Optional[str] = None
    date: Optional[date] = None
    end_date: Optional[date] = None
    time_slot: Optional[str] = None
    description: Optional[str] = None
    affects_kbm: Optional[bool] = None


class EventScheduleResponse(EventScheduleBase):
    id_event: int
    admin_update: int
    admin_pembuat: Optional[AdminResponse] = None

    class Config:
        from_attributes = True


# ==========================================
# SKEMA ABSENSI DUTY GURU (TEACHER DUTY ATTENDANCE)
# ==========================================
class DutyAttendanceCreate(BaseModel):
    date: date
    location: str
    time_slot: str
    duty_category: Optional[str] = None
    teacher_name: str
    password: str
    notes: Optional[str] = None


class DutyAttendanceResponse(BaseModel):
    id_attendance: int
    date: date
    location: str
    time_slot: str
    duty_category: Optional[str] = None
    teacher_name: str
    check_in_time: datetime
    is_scheduled_duty: bool
    status_label: str
    verified_code: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DutyTeacherStatus(BaseModel):
    teacher_name: str
    status: str  # "Belum Duty" | "Lagi Duty" | "Sudah Duty" | "Tidak Duty"
    color: str  # "grey" | "green" | "blue" | "orange"
    icon: str  # "⚪" | "🟢" | "🔵" | "🟠"
    is_attended: bool = False
    check_in_time: Optional[str] = None
    is_scheduled: bool = True
    task: Optional[str] = None


class DutySessionDetail(BaseModel):
    session_key: str
    location: str
    time_slot: str
    duty_category: Optional[str] = None
    grade_scope: Optional[str] = None
    passcode: str = "citahati"
    scheduled_teachers: List[DutyTeacherStatus] = []
    attended_list: List[DutyAttendanceResponse] = []
    total_scheduled: int = 0
    total_attended: int = 0



