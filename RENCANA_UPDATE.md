# 📋 Rencana Pembaruan & Roadmap Fitur - Pengumuman Internal ESE (Cita Hati)

Dokumen ini mencatat daftar ide, rencana pembaruan, dan spesifikasi fitur yang sedang dikumpulkan untuk pengembangan aplikasi Pengumuman Internal ESE.

---

## 📌 Status Sistem Saat Ini (Live & Aktif)

- **Backend (FastAPI)**: `http://127.0.0.1:8000` (Dokumentasi API Swagger: `http://127.0.0.1:8000/docs`)
- **Frontend (Vite React)**: `http://localhost:5173/`
- **Halaman Login**: `http://localhost:5173/login` atau `http://localhost:5173/AdminLogin`
- **Kredensial Admin**:
  - **Username**: `kornelius`
  - **Password**: `password_anda`
  - **Role**: `Super` Admin

---

## 🚀 Daftar Rencana Fitur & Pembaruan

### 1. Fitur Pin / Pengumuman Prioritas (_Sticky Announcement_)

> **Tujuan**: Menyorot pengumuman mendesak/darurat agar selalu tampil paling atas di halaman utama.

- **Skema Database (`models.Announcements`)**:
  - Menambahkan kolom `is_pinned` bertipe `Boolean` (default: `False`).
  - _(Opsional)_ Kolom `pinned_until` bertipe `Date` (Nullable) untuk otomatis lepas pin jika tanggal lewat.
- **Skema Backend (`routers/api.py`)**:
  - Logika Sorting: `order_by(models.Announcements.is_pinned.desc(), models.Announcements.date.desc())`.
  - Endpoint Cepat: `PATCH /api/announcements/{id}/toggle-pin` untuk menyematkan/melepas pin 1 klik.
  - Opsi Tampilan saat Filter Tanggal:
    - **Global Sticky**: Pengumuman yang di-pin tetap tampil terlepas dari filter tanggal yang dipilih pengguna.
- **Opsi Jumlah Pin yang Diizinkan**:
  - **Opsi A (Rekomendasi)**: Maksimal 2–3 pengumuman pin (mencegah halaman tertutup terlalu banyak pin).
  - **Opsi B**: Single-pin (hanya 1 pengumuman utama, pin baru menggantikan pin lama).
  - **Opsi C**: Multi-pin bebas tanpa batas.
- **Tampilan Frontend**:
  - **Publik (`announcements.jsx`)**: Kartu dengan badge `📌 PENTING` / `🚨 PRIORITAS` dan aksen border warna khusus (misal kuning/amber).
  - **Admin (`Admin.jsx`)**: Tombol/ikon pin langsung di baris tabel + switch "Sematkan Pengumuman" di form input.

---

### 2. Judul & Kategori Pengumuman

> **Tujuan**: Mempermudah pembaca memahami inti informasi secara sekilas.

- **Kolom Tambahan**:
  - `title`: Judul singkat pengumuman (misal: "Pemberitahuan Ujian Akhir Semester").
  - `category`: Kategori (pilihan: `Akademik`, `Kegiatan/Event`, `Libur`, `Ujian`, `Darurat/Urgent`, `Umum`).
- **Tampilan**:
  - Tag badge berwarna-warni di setiap kartu pengumuman (misal: Merah untuk Urgent, Biru untuk Akademik, Hijau untuk Event).
  - Tombol filter berdasarkan kategori di frontend.

---

### 3. Rentang Tanggal Pengumuman (_Start Date & End Date_)

> **Tujuan**: Menangani acara atau informasi yang berlangsung lebih dari satu hari.

- **Kolom Tambahan**:
  - `start_date`: Tanggal mulai tayang.
  - `end_date`: Tanggal selesai tayang.
- **Manfaat**: Pengumuman seperti "Pekan Ujian 20–25 Oktober" akan otomatis muncul terus selama rentang tanggal tersebut aktif tanpa harus diinput berulang kali.

---

### 4. Mode TV / Lobi Sekolah (_Kiosk & Digital Signage Mode_)

> **Tujuan**: Menampilkan pengumuman di layar TV lobi / lorong sekolah secara otomatis.

- **Fitur**:
  - Tombol fullscreen / Mode Kiosk di pojok layar.
  - Auto-slide bergantian antara pengumuman penting, flyer poster gambar, dan ucapan ulang tahun staf/guru setiap beberapa detik.
  - Jam digital ukuran besar dan widget tanggal berjalan.

---

### 5. Asisten AI Chatbot Q&A (Tanya-Jawab Pengumuman, Jadwal Guru & Duty)

> **Tujuan**: Memudahkan siswa, guru, dan staf menanyakan informasi harian sekolah melalui bahasa alami.

- **Pondasi Tersedia**:
  - Konfigurasi API Key `GEMINI_API_KEY` dan `GROQ_API_KEY` sudah ada di `.env`.
  - Tabel `feedback_logs` di database sudah siap.
  - File router `backend-pengumuman/routers/chat.py` siap diimplementasikan.
- **Kemampuan Pertanyaan yang Didukung**:
  1. **Tanya Pengumuman Sekolah**:
     - _"Ada pengumuman apa saja hari ini / besok?"_
     - _"Kapan pendaftaran lomba ditutup?"_
     - _"Hari Senin depan upacara seragam apa?"_
  2. **Tanya Jadwal Guru (Teaching Schedules)**:
     - _"Pak Kornelius hari ini mengajar di kelas mana saja?"_
     - _"Siapa guru Matematika di kelas 10A jam ke-2?"_
  3. **Tanya Jadwal Duty / Guru Piket**:
     - _"Siapa guru yang duty di gerbang pagi ini?"_
     - _"Apakah Bu Maria jadwal duty hari ini?"_
- **Kebutuhan Tabel Baru di Database**:
  - Tabel `teacher_duties` (id, teacher_name, date, location_or_role, time_range).
  - Tabel `teacher_schedules` (id, teacher_name, subject, class_name, day_of_week, start_time, end_time, room).
- **Fitur di Dashboard Admin**:
  - Form input & upload data (bisa import Excel/CSV untuk jadwal duty dan jadwal pelajaran rutin).
- **Arsitektur 4 AI Cascade Fallback (Anti-Kelebihan Kuota / Gratis & Kuota Besar)**:
  - Sistem menggunakan **4 Provider AI Gratis** yang bekerja secara berurutan (*Waterfall Fallback*). Jika AI pertama habis kuota/token (*Rate Limit / HTTP 429*), sistem otomatis melompat ke AI kedua, ketiga, hingga keempat tanpa jeda:
    1. **AI 1 (Utama)**: **Google Gemini 1.5 / 2.0 Flash** (Gratis 1.500 request/hari, context window 1 juta token).
    2. **AI 2 (Fallback 1)**: **Groq (Llama 3.3 70B / 8B)** (Gratis puluhan ribu token/hari, kecepatan ultra-tinggi ~400 token/detik).
    3. **AI 3 (Fallback 2)**: **OpenRouter (Free Tier Models: Qwen 2.5 / Llama 3.1 Free)** (Akses model open-source gratis tanpa kartu kredit).
    4. **AI 4 (Fallback 3)**: **Mistral AI / API Key Cadangan Groq-Gemini ke-2** (Penjaga terakhir agar layanan tidak pernah down).
  - **Mekanisme Switch**: Menggunakan blok `try-except` di Python backend (`routers/chat.py`). Error `429 Too Many Requests` langsung ditangkap dan diteruskan ke AI berikutnya dalam milidetik.
- **Tampilan Frontend**:
  - Floating Chat Widget di pojok kanan bawah halaman publik dengan quick buttons: `[📅 Pengumuman Hari Ini]`, `[🛡️ Guru Duty Hari Ini]`, `[👨‍🏫 Jadwal Guru]`.

---

### 6. Dukungan 3 Bahasa (Trilingual: Indonesia, Inggris, & Mandarin / 中文)

> **Tujuan**: Menyesuaikan kebutuhan kurikulum dan komunitas internasional Cita Hati (Siswa, Guru Ekspatriat, dan Orang Tua).

- **Pada Asisten AI Chatbot**:
  - **Auto Language Detection**: AI secara otomatis mendeteksi bahasa yang digunakan penanya dan membalas dalam bahasa tersebut:
    - 🇮🇩 **Bahasa Indonesia**: _"Siapa guru piket hari ini?"_ ➔ Dibalas dalam Bahasa Indonesia.
    - 🇬🇧 **English**: _"Who is on duty at the main gate today?"_ ➔ Replied in English.
    - 🇨🇳 **Mandarin (中文)**: _"今天谁负责值日？"_ / _"今天有哪些公告？"_ ➔ 用中文回答.
  - **Terjemahan Pengumuman Otomatis oleh AI**: Jika pengumuman diinput dalam Bahasa Indonesia, AI dapat menerjemahkan dan merangkumnya ke dalam Bahasa Inggris atau Mandarin saat ditanya oleh ekspatriat/orang tua.
- **Pada Tampilan Antarmuka Halaman Publik (UI Localization / i18n)**:
  - Tombol Pengganti Bahasa di Header Navbar: `[ 🇮🇩 ID | 🇬🇧 EN | 🇨🇳 中文 ]`.
  - Label-label halaman berganti otomatis (contoh: _Scheduled Events / Agenda Acara / 日程安排_, _Celebrations / Ulang Tahun / 生日祝福_, _No events scheduled / 没有安排的活动_).

---

### 7. Pembaruan Fitur Ulang Tahun (_Celebrations_)

> **Tujuan**: Apresiasi staf dan guru yang lebih menarik.

- **Upcoming Birthdays**: Menampilkan daftar siapa saja yang berulang tahun dalam 3–7 hari ke depan, bukan hanya hari ini.
- **Filter Bulan**: Kemampuan melihat daftar ulang tahun per bulan di halaman admin.
- **Generator Kartu Ucapan**: Tombol untuk generate kartu ucapan bergambar otomatis bertema sekolah Cita Hati.

---

### 8. Editor Format Teks Kaya (_Rich Text / Markdown_)

> **Tujuan**: Teks pengumuman tidak monoton dan mudah dibaca.

- Mendukung teks tebal (**bold**), miring (_italic_), daftar poin/bullet points, penomoran, dan highlight penting.

---

### 9. Keamanan & Utilitas Sistem

> **Tujuan**: Menjamin keamanan data dan kemudahan administrasi.

- **Hashing Password Admin**: Menggunakan enkripsi Bcrypt/Argon2 agar password di database tidak terbaca teks polos.
- **Export Data**: Fitur download laporan daftar pengumuman dan data ulang tahun ke Excel (CSV/XLSX) atau PDF.
- **Banner Carousel**: Mengaktifkan kembali flyer gambar geser di bagian atas halaman utama.

---

### 📝 Catatan & Ide Tambahan dari Pengguna (Sedang Dikumpulkan)

- [x] Fitur Pin / Sticky Announcement (Maksimal 2-3 pengumuman disematkan di paling atas).
- [x] Asisten AI Chatbot: Bisa tanya Jadwal Guru, Duty / Piket Guru, dan Pengumuman Harian.
- [x] Dukungan 3 Bahasa (Trilingual: Indonesia 🇮🇩, Inggris 🇬🇧, dan Mandarin 🇨🇳) untuk AI & Tampilan Web.
- [x] Modul Jadwal Guru Berdiri Sendiri (Tidak diintegrasikan dengan pengumuman event, data merujuk langsung ke CSV / database).
- [ ] ...

---

## Referensi Master Data Jadwal Guru (Database / CSV)

> **Catatan Arsitektur**:
>
> - Jadwal guru **TIDAK di-hardcode di dalam dokumen rancangan ini** dan **TIDAK diintegrasikan dengan pengumuman event** (masing-masing berdiri sendiri).
> - Asisten AI dalam menjawab jadwal guru **hanya akan merujuk langsung ke database / file master**:
>   - **File Master CSV**: [`JADWAL_GURU_MASTER.csv`](file:///c:/Users/kornelius/Documents/Pengumuman%20Internal%20ESE%20New/JADWAL_GURU_MASTER.csv)
>   - **Panduan Aturan AI (Low AI)**: [`PROMPT_ATURAN_AI.md`](file:///c:/Users/kornelius/Documents/Pengumuman%20Internal%20ESE%20New/PROMPT_ATURAN_AI.md)
>   - **Tabel Database**: `teacher_schedules` & `teacher_duties`
>   - **Format Waktu**: 2 blok jam pelajaran disatukan menjadi 1 slot utuh (70 menit).
