import os
from dotenv import load_dotenv

load_dotenv()

# Variabel Environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SECRET_KEY = os.getenv("SECRET_KEY", "kunci_rahasia_sekolah_kita")
ALGORITHM = "HS256"
REDIS_URL = os.getenv("REDIS_URL", "redis://:PasswordKuatRedis123!@redis:6379")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
BUCKET_NAME = "pengumuman-image"
