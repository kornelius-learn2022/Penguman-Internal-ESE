# 1. Gunakan Python versi ringan
FROM python:3.12-slim

# 2. Tentukan folder kerja di dalam Docker
WORKDIR /app

# 3. Copy file requirements dan instal
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy seluruh kode backend kamu ke dalam Docker
COPY . .

# 5. Jalankan server FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]