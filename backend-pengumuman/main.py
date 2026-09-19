import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import models
from database import engine
from config import REDIS_URL
from routers import api, chat

# Inisialisasi Database
models.Base.metadata.create_all(bind=engine)

# ... (kode import dan inisialisasi db tetap sama) ...

app = FastAPI(title="API Backend Cita Hati")
UPLOAD_DIR = "uploads"  # Sesuaikan dengan nama variabel folder di helpers.py kamu
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# 2. MOUNT FOLDER LOKAL AGAR BISA DIAKSES PUBLIK SEBAGAI URL
# Baris ini membuat folder fisik "uploads" bisa diakses melalui browser dengan awalan "/uploads"
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS Setup yang Benar
app.add_middleware(
    CORSMiddleware,
    # HAPUS tanda "*" dari list di bawah ini
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.0.20.75:5173",
        "https://pengumuman.klprojects.online",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Integrasi Router / Endpoint dengan Prefix
app.include_router(api.router)
app.include_router(chat.router)



if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
