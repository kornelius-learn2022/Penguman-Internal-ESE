from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- KONFIGURASI DOCKER ---
# Format: mysql+pymysql://username:password@nama_service_di_docker:port/nama_database
# Username: root (bawaan docker mysql)
# Password: password_anda (sesuai docker-compose)
# Host: db (nama service di docker-compose)
# Database: db_pengumuman

SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:password_anda@db:3306/db_pengumuman"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Fungsi bantuan untuk membuka dan menutup koneksi database
def get_db():
    db = SessionLocal() 
    try:
        yield db
    finally:
        db.close()