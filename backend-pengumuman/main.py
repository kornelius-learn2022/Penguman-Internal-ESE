from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer # <-- TAMBAHAN IMPORT BARU
from pydantic import BaseModel
from datetime import date
from typing import Optional, List
import jwt
import datetime

# Import file lokal kita
import models
from database import engine, get_db

# Otomatis membuat tabel jika belum ada
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Backend Cita Hati")
SECRET_KEY = "kunci_rahasia_sekolah_kita"
ALGORITHM = "HS256"

# ==========================================
# KONFIGURASI CORS
# ==========================================
origins = [
    "http://localhost:5173",        # Akses dari laptop sendiri
    "http://10.0.20.75:5173",      # Akses dari HP lewat IP Wi-Fi
    "*",                            # Tanda bintang ini adalah kunci pamungkas
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# ==========================================
# PYDANTIC SCHEMAS (Untuk Validasi Input dari React)
# ==========================================

class AdminCreate(BaseModel):
    name_admin : str
    password_admin : str
    level_admin : str

    
class AnnouncementCreate(BaseModel):
    announcement: str
    date: date
    admin_update: int
    

class BirthdayCreate(BaseModel):
    name: str
    date: date
    gender: models.GenderType 
    admin_update: int 
    
class LoginRequest(BaseModel):
    username: str
    password: str

class AdminResponse(BaseModel):
    id_admin: int
    name_admin: str
    level_admin: str

class AnnouncementCombinedResponse(BaseModel):
    id_announcement: int
    announcement: str
    date: date
    admin_pembuat: Optional[AdminResponse] 

    class Config:
        from_attributes = True 


 

# ==========================================
# FUNGSI KEAMANAN & CEK JWT (SATPAM) - TAMBAHAN BARU
# ==========================================
# Memberi tahu FastAPI (dan Swagger UI) di mana URL untuk mendapatkan token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Fungsi ini otomatis membedah token yang dikirim React, 
    mengecek keasliannya dengan SECRET_KEY, dan membaca isi payload-nya.
    """
    kesalahan_kredensial = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Akses Ditolak! Token palsu, rusak, atau tidak terbaca.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Membaca token dengan Secret Key kita
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Mengekstrak ID Admin dari dalam Payload
        id_admin: int = payload.get("id_admin")
        
        # Jika di dalam token tidak ada data id_admin, berarti token bermasalah
        if id_admin is None:
            raise kesalahan_kredensial
            
        # Mengembalikan seluruh isi Payload jika token sah
        return payload
        
    except jwt.ExpiredSignatureError:
        # Jika waktu token (exp) sudah habis
        raise HTTPException(status_code=401, detail="Token sudah kedaluwarsa! Silakan login ulang.")
    except jwt.PyJWTError:
        # Jika token dimanipulasi/dihack (Signature Error)
        raise kesalahan_kredensial


# ==========================================
# ROUTES / API ENDPOINTS
# ==========================================

@app.get("/")
def home():
    return {"pesan": "Backend FastAPI dengan Skema Relasi aktif!"}

# --- 1. API ANNOUNCEMENTS (PENGUMUMAN) ---
@app.get("/api/announcements")
def get_all_announcements(tanggal: Optional[date] = None, db: Session = Depends(get_db)):
    pencarian = db.query(models.Announcements)
    if tanggal:
        pencarian = pencarian.filter(models.Announcements.date == tanggal)
    pengumuman = pencarian.order_by(models.Announcements.date.desc()).all()
    return pengumuman

# TAMBAHAN: Memasang satpam (get_current_user) di fungsi POST
@app.post("/api/announcements")
def create_announcement(
    data: AnnouncementCreate, 
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user) # <-- SATPAM BERJAGA DI SINI
):
    cek_admin = db.query(models.Admin).filter(models.Admin.id_admin == data.admin_update).first()
    if not cek_admin:
        raise HTTPException(status_code=404, detail="Admin tidak ditemukan! Tidak bisa memposting.")

    pengumuman_baru = models.Announcements(
        announcement=data.announcement,
        date=data.date,
        admin_update=data.admin_update
    )
    db.add(pengumuman_baru)
    db.commit()
    db.refresh(pengumuman_baru)
    return {"pesan": "Pengumuman berhasil diposting!", "data": pengumuman_baru}

@app.get("/api/announcements-with-admin", response_model=List[AnnouncementCombinedResponse])
def get_announcements_with_admin_details(db: Session = Depends(get_db)):    
    try:
        pengumuman_join = db.query(models.Announcements).all()
        return pengumuman_join
    except Exception as e:
        print(f"Error saat mengambil data gabungan: {e}")
        raise HTTPException(status_code=500, detail="Terjadi kesalahan server internal.")

# --- 2. API BIRTHDAYS (ULANG TAHUN) ---
@app.get("/api/birthdays")
def get_all_birthdays(db: Session = Depends(get_db)):
    ultah = db.query(models.Birthdays).all()
    return ultah

# TAMBAHAN: Memasang satpam (get_current_user) di fungsi POST Ulang Tahun
@app.post("/api/birthdays")
def create_birthday(
    data: BirthdayCreate, 
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user) # <-- SATPAM BERJAGA DI SINI
):
    cek_admin = db.query(models.Admin).filter(models.Admin.id_admin == data.admin_update).first()
    if not cek_admin:
        raise HTTPException(status_code=404, detail="Admin tidak ditemukan!")

    ultah_baru = models.Birthdays(
        name=data.name,
        date=data.date,
        gender=data.gender,
        admin_update=data.admin_update
    )
    db.add(ultah_baru)
    db.commit()
    db.refresh(ultah_baru)
    return {"pesan": "Data ulang tahun berhasil ditambahkan!", "data": ultah_baru}

# TAMBAHAN: Memasang satpam (get_current_user) di fungsi PUT/UPDATE Pengumuman
@app.put("/api/announcements/{id_announcement}")
def update_announcement(
    id_announcement: int, 
    data_baru: AnnouncementCreate, 
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user) # <-- SATPAM BERJAGA DI SINI
):
    pengumuman_lama = db.query(models.Announcements).filter(
        models.Announcements.id_announcement == id_announcement
    ).first()
    
    if not pengumuman_lama:
        raise HTTPException(status_code=404, detail="Pengumuman tidak ditemukan di database.")
    
    pengumuman_lama.announcement = data_baru.announcement
    pengumuman_lama.date = data_baru.date
    pengumuman_lama.admin_update = data_baru.admin_update
    
    db.commit()
    db.refresh(pengumuman_lama)
    
    return {
        "message": "Pengumuman berhasil diupdate!", 
        "data": pengumuman_lama
    }
@app.put("/api/birthdays/{id_birthday}")
def update_birthday(
    id_birthday: int, 
    data_baru: BirthdayCreate, 
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user) # <-- SATPAM BERJAGA DI SINI
):
    birthday_lama = db.query(models.Birthdays).filter(
        models.Birthdays.id_birthday == id_birthday
    ).first()
    
    if not birthday_lama:
        raise HTTPException(status_code=404, detail="Pengumuman tidak ditemukan di database.")
    
    birthday_lama.name = data_baru.name
    birthday_lama.date = data_baru.date
    birthday_lama.gender = data_baru.gender
    birthday_lama.admin_update = data_baru.admin_update
    
    db.commit()
    db.refresh(birthday_lama)
    
    return {
        "message": "Pengumuman berhasil diupdate!", 
        "data": birthday_lama
    }
# ==========================================
# FUNGSI HAPUS PENGUMUMAN (DELETE)
# ==========================================
# TAMBAHAN: Memasang satpam (get_current_user) di fungsi DELETE
@app.delete("/api/announcements/{id_announcement}")
def delete_announcement(
    id_announcement: int, 
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user) # <-- SATPAM BERJAGA DI SINI
):
    pengumuman_target = db.query(models.Announcements).filter(
        models.Announcements.id_announcement == id_announcement
    ).first()
    
    if not pengumuman_target:
        raise HTTPException(status_code=404, detail="Pengumuman tidak ditemukan atau sudah dihapus.")
    
    db.delete(pengumuman_target)
    db.commit()
    
    return {"message": "Pengumuman berhasil dihapus secara permanen!"}

@app.delete("/api/birthdays/{id_birthday}")
def delete_birthday(
    id_birthday: int, 
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user) # <-- SATPAM BERJAGA DI SINI
):
    list_target_birthday = db.query(models.Birthdays).filter(
        models.Birthdays.id_birthday == id_birthday
    ).first()
    
    if not list_target_birthday:
        raise HTTPException(status_code=404, detail="List ulang tahun tidak ditemukan atau sudah dihapus.")
    
    db.delete(list_target_birthday)
    db.commit()
    
    return {"message": "List ulang Tahun berhasil dihapus secara permanen!"}


def create_access_token(data: dict):
    # Token akan kedaluwarsa dalam 24 jam
    expire = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    data.update({"exp": expire})
    encoded_jwt = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Api untuk login
@app.post("/api/login")
def login_admin(data: LoginRequest, db: Session = Depends(get_db)):
    login_admin = db.query(models.Admin).filter(models.Admin.name_admin == data.username).first()
    
    if not login_admin or login_admin.password_admin != data.password:
        raise HTTPException(status_code=401, detail= "Username and Password Wrong!")
    
    token_data ={ "username" : login_admin.name_admin, "id_admin" : login_admin.id_admin, "role":login_admin.level_admin}

    jwt_token = create_access_token(data=token_data)
    return {
        "pesan": "Login berhasil!",
        "access_token": jwt_token, 
        "token_type": "bearer",
        "role" : login_admin.level_admin,
        "username": login_admin.name_admin,
        "id_admin": login_admin.id_admin
    }
@app.get("/api/admin")
def get_all_birthdays(db: Session = Depends(get_db)):
    admin_ambil = db.query(models.Admin).all()
    return admin_ambil

# api create andmin
@app.post("/api/admin")
def create_admin( data: AdminCreate, db: Session = Depends(get_db), user_aktif: dict = Depends(get_current_user)):
    new_admin =(models.Admin(name_admin=data.name_admin, password_admin = data.password_admin, level_admin=data.level_admin))
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return {"pesan":"data admin sudah disimpan!", "data":new_admin}

@app.put("/api/admin/{id_admin}")
def update_admin(
    id_admin: int, 
    data_baru: AdminCreate, 
    db: Session = Depends(get_db),
    user_aktif: dict = Depends(get_current_user) # <-- SATPAM BERJAGA DI SINI
):
    id_admin_lama = db.query(models.Admin).filter(
        models.Admin.id_admin == id_admin
    ).first()
    
    if not id_admin_lama:
        raise HTTPException(status_code=404, detail="Admin tidak ditemukan")
    
    id_admin_lama.name_admin = data_baru.name_admin
    id_admin_lama.password_admin = data_baru.password_admin
    id_admin_lama.level_admin = data_baru.level_admin
    db.commit()
    db.refresh(id_admin_lama)
    return {
        "message": "Admin berhasil diupdate!", 
        "data": id_admin_lama
    }
@app.delete("/api/admin/{id_admin}")
def delete_admin(
    id_admin: int, 
    db: Session = Depends(get_db),
    # user_aktif: dict = Depends(get_current_user) # <-- SATPAM BERJAGA DI SINI
):
    list_target_admin = db.query(models.Admin).filter(
        models.Admin.id_admin == id_admin
    ).first()
    
    if not list_target_admin:
        raise HTTPException(status_code=404, detail="List ulang tahun tidak ditemukan atau sudah dihapus.")
    
    db.delete(list_target_admin)
    db.commit()
    
    return {"message": "List admin  berhasil dihapus secara permanen!"}

if __name__ == "__main__":
    import uvicorn
    # PASTIKAN HOST ADALAH 0.0.0.0
    uvicorn.run(app, host="0.0.0.0", port=8000)