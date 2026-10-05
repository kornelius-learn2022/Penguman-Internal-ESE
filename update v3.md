# 📋 Laporan Pembaruan & Perbaikan Web Pengumuman Internal ESE (Versi 3.0)

Dokumen ini mencatat seluruh perbaikan bug, penyesuaian fungsionalitas, peningkatan keamanan, integrasi model AI Gemini 3.8 Flash, serta penambahan fitur **Substitusi / Swap Guru Morning Devotion & Duty**.

---

## 🔍 1. Hasil Audit & Bug yang Telah Diperbaiki

### 🐛 Bug 1: Model AI Menggunakan Versi Lama & Timeout Pendek
- **Lokasi File:** `backend-pengumuman/routers/chat.py`
- **Sebelumnya:** Menggunakan model `gemini-1.5-flash` / `gemini-2.0-flash` yang rentan 404 / deprecated di library `google-genai` versi terbaru, serta timeout default HTTPX terlalu pendek.
- **Perbaikan:**
  1. Diperbarui ke model **Gemini 3.8 Flash** (`gemini-3.8-flash`) sebagai prioritas utama.
  2. Fallback cascade bertingkat: `gemini-3.8-flash` ➔ `gemini-3.5-flash-lite` ➔ `gemini-2.5-flash` ➔ `gemini-2.0-flash`.
  3. Timeout pemanggilan API Gemini dinaikkan menjadi **10.0 detik**.

---

### 🐛 Bug 2: Kerentanan Keamanan PIN Guru Tanpa Autentikasi (Critical)
- **Lokasi File:** `backend-pengumuman/routers/api.py`
- **Sebelumnya:** Endpoint `/api/admin/teachers`, `/api/admin/teachers/{id}/pin`, dan endpoint download Excel dapat diakses publik tanpa login admin.
- **Perbaikan:**
  - Ditambahkan proteksi dependensi token login admin: `user_aktif: dict = Depends(get_current_user)`.
  - Sekarang siapapun yang mencoba mengakses tanpa login admin akan diblokir dengan **HTTP 401 Unauthorized**.

---

### 🐛 Bug 3: Bottleneck Performa Frontend (7 Request Konkuren Tiap Detik)
- **Lokasi File:** `frontend-pengumuman/src/pages/DutyAttendance.jsx`
- **Sebelumnya:** Saat membuka halaman Duty Attendance, aplikasi melakukan 7 pemanggilan HTTP paralel ke `/api/duty-attendance/free-teachers` sekaligus.
- **Perbaikan:**
  - Pemanggilan pre-fetch paralel dihilangkan. Pengambilan data guru kosong di-cache dan hanya dipanggil on-demand sesuai slot waktu aktif.

---

### 🐛 Bug 4: Vite Dev Server Proxy Tidak Dikonfigurasi
- **Lokasi File:** `frontend-pengumuman/vite.config.js`
- **Perbaikan:** Menambahkan konfigurasi `server.proxy` untuk meneruskan request `/api` ke backend FastAPI (`http://localhost:8002`).

---

### 🐛 Bug 5: Error Nginx Try Files pada SPA Single-Page Routing
- **Lokasi:** Konfigurasi Nginx VPS `/etc/nginx/sites-available/pengumuman-internal`
- **Perbaikan:** Konfigurasi `try_files $uri $uri/ /index.html;` untuk memastikan semua route client-side dimuat tanpa HTTP 404.

---

## 🔄 2. Pembaruan Fitur: Substitusi / Swap Guru Morning Devotion & Duty

Sesuai permintaan:
> *"untuk duty morning devotion memang ada konsep subtitusi jika guru devotion diganti guru duty atau sebaliknya. Buat perubahan itu saja"*

### Implementasi:
1. **Frontend (`DutyAttendance.jsx`):**
   - Mengaktifkan dropdown pemilihan guru pengganti (*substitute*) pada formulir kehadiran sesi Morning Devotion (sebelumnya dinonaktifkan khusus untuk devotion).
   - Menyesuaikan panduan formulir agar guru mengetahui bahwa mereka dapat memilih guru pengganti jika sedang bertukar tugas atau menggantikan rekan lain.
   - Tombol konfirmasi kehadiran otomatis menampilkan nama pengganti dan nama guru yang digantikan, misal: `Confirm Attendance (Mr. Hendy covering for Ms. Phoebe)`.
   - Reset formulir membersihkan pilihan `substituteName` setelah absensi berhasil dicatat.

2. **Backend (`routers/api.py`):**
   - **Endpoint Check-In (`/duty-attendance/check-in`):**
     - Memeriksa PIN milik guru pengganti yang sedang melakukan absensi.
     - Menyimpan `substitute_name` dan memberikan label status `Inval (<nama_pengganti>)` serta catatan inval pengganti pada Morning Devotion.
   - **Endpoint Sesi (`/duty-attendance/sessions` & `get_duty_sessions`):**
     - Penentuan guru yang bertugas duty pagi (07.15–07.45) kini memperhitungkan tabel inval dan swap:
       - Jika guru devotion bertukar tugas menggantikan guru duty pagi: guru pengganti otomatis ditandai sibuk bertugas duty (sehingga tidak muncul di daftar devotion).
       - Guru duty yang digantikan menjadi bebas tugas duty dan otomatis terdaftar serta dapat hadir pada sesi Morning Devotion.
     - Sesi Morning Devotion menampilkan status inval lengkap (baik guru asli maupun guru pengganti) dengan badge `🔄 Inval (Substitute for ...)` sehingga guru pengganti dapat langsung memilih namanya atau nama guru yang digantikannya.
   - **Rekap & Laporan Lengkap (`build_comprehensive_records`):**
     - Log kehadiran Morning Devotion mencatat dan membedakan guru asli dan guru pengganti dengan label status `Inval Pengganti ... (Hadir Devotion)` serta tanda verifikasi.

---

## 🚀 3. Status Deployment VPS & Git

- **Server VPS:** `202.155.14.105` (Domain: `https://pengumuman.klprojects.online`)
- **Service Backend:** `fastapi_pengumuman_ese.service` (Aktif / Running)
- **Frontend Build:** Selesai dikompilasi menggunakan Vite dan di-deploy ke `/var/www/pengumuman-internal/pengumuman/pengumuman-ese-new/frontend-pengumuman/dist`
- **Git Commit:** Telah di-commit dan di-push ke branch `main` pada remote repository GitHub `https://github.com/kornelius-learn2022/Penguman-Internal-ESE.git`.
