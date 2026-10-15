# 📋 DOKUMENTASI UPDATE & PERBAIKAN SISTEM V4 (Pengumuman Internal ESE)

> **Tanggal Pembaruan:** 15 Oktober 2026  
> **Target Server (VPS):** `202.155.14.105` (`https://pengumuman.klprojects.online`)  
> **Repository:** [GitHub - Penguman-Internal-ESE](https://github.com/kornelius-learn2022/Penguman-Internal-ESE.git)  
> **Status:** ✅ Selesai Diuji, Dikonfirmasi & Diimplementasikan di Server Produksi  

---

## 📑 Daftar Isi
1. [Ringkasan Pembaruan V4](#-ringkasan-pembaruan-v4)
2. [Investigasi & Solusi: Kasus Ms. Pinta (Morning Devotion)](#-1-investigasi--solusi-kasus-ms-pinta-morning-devotion)
3. [Kebijakan Presensi On-Time (Strict): Akses Jam 07.16 & Penghapusan Buffer 30 Menit](#-2-kebijakan-presensi-on-time-strict-akses-jam-0716--penghapusan-buffer-30-menit)
4. [Investigasi & Solusi: Break Time Kelas 1-2 Menampilkan Kelas 3-4 (Ms. Destha)](#-3-investigasi--solusi-break-time-kelas-1-2-menampilkan-kelas-3-4-ms-destha)
5. [Panduan: Penambahan Lokasi Duty Baru Besok Jam 3 Tanpa Mengubah Record](#-4-panduan-penambahan-lokasi-duty-baru-besok-jam-3-tanpa-mengubah-record)
6. [Audit Performa VPS & Analisis Penyebab Web Lemmot / 504 Gateway Timeout](#-5-audit-performa-vps--analisis-penyebab-web-lemmot--504-gateway-timeout)
7. [Rekomendasi Tipe & Spesifikasi Upgrade VPS](#-6-rekomendasi-tipe--spesifikasi-upgrade-vps)
8. [Status Deployment & File Terdampak](#-7-status-deployment--file-terdampak)

---

## 📌 Ringkasan Pembaruan V4

Pada pembaruan Versi 4 (15 Oktober 2026), dilakukan serangkaian audit log mendalam, normalisasi database, perbaikan fungsionalitas presensi, serta penyesuaian aturan disiplin presensi on-time dan audit menyeluruh kapasitas server VPS:
1. **Presensi Morning Devotion Ms. Pinta:** Menyelesaikan isu nama yang hilang dari dropdown setelah hadir dan mencegah *self-substitution* (memilih diri sendiri sebagai guru pengganti/inval).
2. **Kebijakan Presensi On-Time (Strict / Tanpa Toleransi 30 Menit):** Menghapus seluruh buffer toleransi 30 menit agar form presensi hanya terbuka tepat waktu pada rentang jam tugas demi menjaga kedisiplinan pengawasan murid.
3. **Penyelesaian Tumpang Tindih Sesi Break Time (Canteen):** Menyediakan fitur *Session Switcher (Pill Selector)* di halaman presensi saat dua sesi aktif bersamaan (Kelas 3-4 Ms. Destha dan Kelas 1-2 Ms. Jenny P).
4. **Audit Resource VPS & Mengapa Web Kadang Lemmot:** Mengidentifikasi bottleneck RAM 1 GB, *swap thrashing*, disk 83% penuh, dan service lama crash-loop 400.295 kali, serta merumuskan rekomendasi upgrade spesifikasi VPS yang ideal.

---

## 🔍 1. Investigasi & Solusi: Kasus Ms. Pinta (Morning Devotion)

### Gejala Masalah:
Pada hari Kamis, 15 Oktober 2026, koordinator/guru mendapati nama **Ms. Pinta** tidak ada di daftar dropdown sesi Morning Devotion.

### Hasil Investigasi:
1. **Ms. Pinta Sebenarnya Terjadwal dan Sudah Hadir Sejak Pagi:**
   - Ms. Pinta terdaftar aktif di master data (`id_teacher = 82`, PIN `99017`).
   - Pada pukul **07:27:31 WIB**, Ms. Pinta **sudah berhasil melakukan presensi** Morning Devotion menggunakan PIN pribadinya (Record ID `623`).
2. **Hilang dari Dropdown Akibat Filter Presensi:**
   - Pada formulir presensi ([`DutyAttendance.jsx`](file:///c:/Users/kornelius/Documents/Pengumuman%20Internal%20ESE%20New/frontend-pengumuman/src/pages/DutyAttendance.jsx)), dropdown guru hanya menampilkan guru yang **belum presensi** (`filter(st => !st.is_attended)`).
   - Begitu Ms. Pinta selesai presensi pada 07:27:31 WIB, namanya otomatis hilang dari dropdown pilihan guru yang belum absen.
3. **Kartu Devotion Sebelumnya Tidak Menampilkan Daftar yang Sudah Hadir:**
   - Berbeda dengan sesi duty biasa (1–2 guru) yang menampilkan kartu hijau untuk guru yang sudah hadir, sesi Morning Devotion (~54 guru) sebelumnya tidak merender daftar guru yang sudah hadir (`attended_list`).
   - Akibatnya, siapa pun yang membuka halaman setelah jam 07:27 WIB tidak melihat nama Ms. Pinta di dropdown dan tidak melihat daftar yang sudah presensi, sehingga mengira Ms. Pinta tidak ada di jadwal.
4. **Bug Self-Substitution (Memilih Diri Sendiri Sebagai Inval):**
   - Saat presensi, Ms. Pinta memilih "Ms. Pinta" pada dropdown guru terjadwal dan juga memilih "Ms. Pinta" pada dropdown guru pengganti (inval).
   - Sistem mencatat `substitute_name = 'Ms. Pinta'`, sehingga di log monitoring Admin statusnya terpecah menjadi `Sudah Duty (Digantikan oleh Ms. Pinta)` dan `Inval Pengganti Ms. Pinta (Hadir Devotion)`. Terdapat 18 record serupa di database sejak September 2026.

### Perbaikan yang Diterapkan:
1. **Pembersihan Database VPS:**
   - Menjalankan normalisasi pada 18 record devotion yang terdampak di mana `teacher_name == substitute_name` menjadi `substitute_name = NULL`, `status_label = 'Terjadwal Devotion'`, `notes = NULL`.
   - Data absensi Ms. Pinta hari ini (ID `623`) kini berstatus normal: `is_attended = True`, `status_label = 'Terjadwal Devotion'`, `is_inval = False`.
2. **Backend Guard ([`routers/api.py`](file:///c:/Users/kornelius/Documents/Pengumuman%20Internal%20ESE%20New/backend-pengumuman/routers/api.py)):**
   - Menambahkan sanitasi pada `submit_duty_attendance`: jika guru memilih namanya sendiri pada input substitusi, backend otomatis menyimpannya sebagai presensi mandiri biasa (`substitute_clean = None`).
   - Menambahkan proteksi pada mapping `get_duty_sessions` dan `build_comprehensive_records` agar tidak menganggap seorang guru sebagai pengganti dirinya sendiri.
3. **Frontend UI & Attended List ([`DutyAttendance.jsx`](file:///c:/Users/kornelius/Documents/Pengumuman%20Internal%20ESE%20New/frontend-pengumuman/src/pages/DutyAttendance.jsx)):**
   - Menambahkan daftar visual guru yang sudah hadir pada kartu Morning Devotion: **"✅ Sudah Hadir Devotion (X / Y Guru)"** lengkap dengan badge nama dan jam presensi (misal `Ms. Pinta (07:27)`).
   - Dropdown guru pengganti otomatis **memfilter nama guru yang sedang dipilih**, sehingga guru tidak bisa memilih dirinya sendiri sebagai pengganti.
   - Menambahkan label penjelas: `🔄 Guru Pengganti / Inval (Opsional — Hanya jika guru di atas digantikan)` dengan opsi default `-- Tidak ada pengganti (Hadir sendiri) --`.

---

## 🕒 2. Kebijakan Presensi On-Time (Strict): Akses Jam 07.16 & Penghapusan Buffer 30 Menit

### Latar Belakang & Gejala:
Sebelumnya dilaporkan bahwa Morning Duty (07.15–07.45) ketika diakses pukul 07.16 menampilkan pesan belum aktif/terkunci. Kemudian ada pertimbangan pemberian buffer 30 menit. Namun, user memberikan arahan tegas:
> *"Jangan ada toleransi 30 menit harus ontime, karena berkaitan menjaga siswa."*

### Hasil Analisis Akar Masalah Akses Pukul 07.16:
Setelah dilakukan audit log server Nginx (`/var/log/nginx/access.log`), kendala akses pukul 07.16 bukan semata-mata karena perbandingan menit jam, melainkan karena:
1. **Server Mengalami 504 Gateway Timeout pada Pukul 07.19 – 07.23 WIB:**
   - Endpoint `/api/duty-attendance/sessions` mengalami timeout hingga 60 detik karena server kehabisan memori (*swap thrashing*) dan adanya service lama yang crash-loop.
   - Ketika response timeout, frontend menerima array kosong `[]`, sehingga menampilkan pesan bahwa jadwal belum aktif.
2. **Kesesuaian Jam Server vs Jam Perangkat:**
   - Server VPS menggunakan zona waktu sinkron NTP (WIB / GMT+7). Presensi on-time membutuhkan pengecekan rentang detik yang akurat.

### Implementasi Kebijakan Strict On-Time:
1. **Penghapusan Buffer 30 Menit ([`DutyAttendance.jsx`](file:///c:/Users/kornelius/Documents/Pengumuman%20Internal%20ESE%20New/frontend-pengumuman/src/pages/DutyAttendance.jsx)):**
   - Fungsi `isOutsideDuty` kini menerapkan validasi waktu presisi tanpa kelonggaran:
     ```javascript
     const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startT.h, startT.m, 0);
     const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endT.h, endT.m, 59);
     return now < startTime || now > endTime;
     ```
   - Form presensi hanya dapat dibuka **tepat di jam duty berlangsung**:
     - **Morning Duty (07.15 – 07.45):** Baru dapat diisi mulai pukul **07:15:00** dan ditutup tepat pada pukul **07:45:59**.
     - **Break 1 (09.10 – 09.35):** Baru dapat diisi mulai **09:10:00** dan ditutup pukul **09:35:59**.
     - Begitu pula untuk Break 2 dan After School Duty.
2. **Pesan Edukasi Disiplin Presensi Siswa:**
   - Jika guru mengakses di luar jam tugas, sistem menampilkan informasi yang jelas:
     > *"Sesi Duty Belum / Sudah Tidak Aktif: Form presensi duty hanya dapat diakses tepat waktu (on-time) selama jam duty berlangsung demi kedisiplinan pengawasan siswa."*
   - Dilengkapi tabel jadwal resmi lokasi tersebut agar guru mengetahui persis kapan jam tugasnya dimulai.
3. **Dukungan URL Kategori Duty:**
   - URL `/duty/Morning%20Duty` tetap didukung penuh untuk memuat seluruh titik lokasi morning duty secara otomatis.

---

## 🥪 3. Investigasi & Solusi: Break Time Kelas 1-2 Menampilkan Kelas 3-4 (Ms. Destha)

### Gejala Masalah:
Saat guru ingin presensi untuk Break Time Kelas 1 dan 2, yang muncul di layar justru sesi Kelas 3 dan 4 dengan nama **Ms. Destha**.

### Hasil Investigasi:
1. **Lokasi Fisik Canteen Memiliki 2 Sesi Break yang Beririsan (*Overlapping*):**
   - Berdasarkan jadwal Kamis di database:
     - **Break 1 (Grade 3-4):** Jam **09.10 – 09.35** di **Canteen** (Guru: **Ms. Destha**).
     - **Break 1 (Grade 1-2):** Jam **09.30 – 09.45** di **Canteen** (Guru: **Ms. Jenny P**).
   - QR Code yang ditempel di area kantin adalah link per lokasi: `https://pengumuman.klprojects.online/duty/Canteen`.
   - Terdapat irisan waktu 5 menit antara pukul **09.30 – 09.35 WIB** di mana kedua sesi sama-sama berstatus **AKTIF** di lokasi Canteen.
2. **Urutan Tampilan Sesi di Halaman:**
   - Sistem mengurutkan kartu berdasarkan jam mulai (`time_slot ASC`).
   - Karena `09.10` lebih awal daripada `09.30`, kartu **Break 1 (Grade 3-4) Ms. Destha diletakkan di posisi PALING ATAS (Card 1)**.
   - Kartu **Break 1 (Grade 1-2) Ms. Jenny P berada di BAWAHNYA (Card 2)**.
   - Pada layar smartphone, kartu pertama memenuhi seluruh layar. Guru yang membuka halaman langsung melihat nama Ms. Destha dan tidak menyadari ada kartu kedua di bawahnya jika tidak di-scroll.
3. **Jika Diakses Sebelum Pukul 09.30 (Misal 09.15 – 09.29):**
   - Sebelum jam 09.30, sesi Kelas 1-2 (09.30–09.45) belum dimulai.
   - Pada rentang waktu tersebut, satu-satunya sesi yang aktif di Canteen adalah sesi Kelas 3-4 Ms. Destha. Guru Kelas 1-2 yang datang lebih awal untuk bersiap hanya melihat kartu Ms. Destha.

### Perbaikan yang Diterapkan:
1. **Fitur Session Switcher / Pill Selector ([`DutyAttendance.jsx`](file:///c:/Users/kornelius/Documents/Pengumuman%20Internal%20ESE%20New/frontend-pengumuman/src/pages/DutyAttendance.jsx)):**
   - Ketika ada lebih dari 1 sesi aktif bersamaan di lokasi yang sama (seperti di Canteen pukul 09.30), sistem sekarang otomatis menampilkan **Bar Navigasi Sesi** di bagian paling atas halaman:
     ```text
     🔔 Terdapat 2 sesi duty yang aktif bersamaan di lokasi ini. Silakan pilih sesi Anda:
     [ 👉 Break 1 (Grade 3-4) (09.10-09.35) ]  [ 👉 Break 1 (Grade 1-2) (09.30-09.45) ]
     ```
   - Guru Kelas 1-2 cukup mengklik tombol `👉 Break 1 (Grade 1-2)` dan halaman akan langsung melakukan *auto-scroll* halus ke kartu formulir Kelas 1-2.
2. **Badge Grade Scope & Jam yang Kontras:**
   - Badge tingkat kelas (`Grade 1-2` vs `Grade 3-4`) dan jam sesi kini ditampilkan dengan kontras warna tinggi di header kartu agar guru dapat membedakan sesi dengan cepat.

---

## ⚙️ 4. Panduan: Penambahan Lokasi Duty Baru Besok Jam 3 Tanpa Mengubah Record

Terkait pertanyaan:
> *"kira kira ada update tambah lokasi duty beserta orangnya tanpa mempengaruhi record sekarang dan harus update besok jam 3 bagaimana ya?"*

### Prinsip Keamanan Database:
- Database memisahkan data ke dalam 2 tabel yang berbeda:
  1. `teacher_duties`: Tabel master template jadwal (berdasarkan `day_of_week`).
  2. `duty_attendances`: Tabel transaksi kehadiran aktual harian (berdasarkan `date`).
- Record absensi hari ini (Kamis, 15 Okt 2026) dan hari-hari sebelumnya tersimpan permanen di tabel `duty_attendances` dengan kunci tanggal spesifik, sehingga penambahan jadwal baru **tidak akan menghapus atau mengubah data kehadiran yang sudah ada**.

### 2 Pilihan Cara Eksekusi:

#### Opsi 1: Otomatisasi via Cron Job di VPS *(Paling Praktis & Terjadwal)*
1. Kami siapkan script Python di VPS berisi detail lokasi baru, nama guru, slot jam, dan hari tugas.
2. Script didaftarkan ke `crontab` Linux untuk dijalankan otomatis tepat pada **besok jam 03:00 Pagi** (atau jam 15:00 Sore):
   ```bash
   0 3 16 10 * /var/www/pengumuman-internal/pengumuman/pengumuman-ese-new/backend-pengumuman/venv/bin/python /tmp/insert_new_duty.py
   ```
3. **Hasil:** Hari ini database tidak berubah sama sekali. Tepat besok jam 3, data otomatis masuk tanpa perlu campur tangan manual.

#### Opsi 2: Input Langsung di Menu Admin Hari Ini *(Jika Jadwalnya Hari Jumat)*
1. Jika lokasi baru tersebut bertugas pada hari **Jumat (Friday)**, admin dapat menambahkannya sekarang juga melalui menu **Admin ➔ Duty Schedules ➔ Add Duty**.
2. **Hasil:** Karena hari ini adalah hari Kamis, sistem presensi dan monitoring hari Kamis hanya memfilter `day_of_week = 'Thursday'`. Jadwal hari Jumat tersebut otomatis baru akan muncul besok saat kalender sistem berganti menjadi hari Jumat.

---

## 🔍 5. Audit Performa VPS & Analisis Penyebab Web Lemmot / 504 Gateway Timeout

Pengguna menanyakan:
> *"Serta cek kenapa kadang web lemmot diakses. Sesuaikan dengan sistemnya, jika memang perlu update sistem vpsnya kira kira type berapa vpsnya."*

Telah dilakukan audit langsung terhadap spesifikasi hardware, penggunaan memori, proses sistem, dan log server VPS `202.155.14.105`:

### 1. Spesifikasi Hardware VPS Saat Ini:
- **Processor (CPU):** **1 vCPU Core** (Intel Xeon Platinum 8168 @ 2.70GHz)
- **RAM Fisik:** **961 MiB (~1 GB Total)**
  - Terpakai aktif: ~812 MiB
  - Sisa bebas (*Free*): **hanya ~149 MiB**
  - Memori *Available*: ~298 MiB
- **Swap Memory (Virtual Disk):** **4.0 GB**
  - Terpakai: **~568 MiB** (indikasi kuat RAM fisik sudah overload)
- **Kapasitas Disk (Storage):** **20 GB Total**
  - Terpakai: **17 GB (83% penuh)**
  - Sisa: **hanya 3.6 GB**

### 2. Multi-Workload yang Berjalan Bersamaan pada 1 GB RAM:
Dalam satu server kecil 1 GB RAM tersebut, saat ini berjalan 4 beban kerja besar sekaligus:
1. **MySQL 8.0 Database Server:** Membutuhkan memori dasar ~350 MB – 500 MB (InnoDB Buffer Pool di-set 128 MB).
2. **Nginx Web Server & Reverse Proxy:** Melayani SSL, static files, dan routing API.
3. **FastAPI Backend 1 (`fastapi_pengumuman_ese`):** Aplikasi Pengumuman & Presensi ESE (Uvicorn).
4. **FastAPI Backend 2 (`fastapi_excur.service`):** Aplikasi Ekstrakurikuler yang berada di server yang sama.
5. **Rogue Service yang Crash-Loop (Sebelumnya):** Service `fastapi-pengumuman.service` di direktori lama `/var/www/Penguman-Internal-ESE` yang mengalami error dan me-restart dirinya sendiri sebanyak **400.295 kali**, memakan CPU cycle terus-menerus.

---

### 3. Mengapa Web Terkadang Lemmot / Muncul 504 Gateway Timeout?

Berdasarkan temuan di atas, terdapat 3 penyebab utama terjadinya kelambatan / timeout:

1. **Terjadinya *Swap Thrashing* pada Jam Sibuk Pagi (07.15 – 07.30 WIB):**
   - Saat 30–50 guru membuka website secara bersamaan untuk Morning Duty & Devotion, kebutuhan memori FastAPI dan MySQL melonjak melebihi kapasitas RAM fisik 1 GB.
   - Sistem operasi Linux terpaksa memindahkan sebagian memori aktif ke dalam disk virtual (*Swap* di harddisk).
   - Kecepatan baca-tulis harddisk/SSD virtual **jauh lebih lambat ratusan kali lipat** dibandingkan RAM fisik. Hal ini menyebabkan proses server mengalami *freeze* (swap thrashing) hingga puluhan detik.
   - Nginx memiliki batas waktu tunggu (*proxy_read_timeout*) sebesar 60 detik. Jika aplikasi tertahan di swap lebih dari 60 detik, Nginx menyerah dan memunculkan error **504 Gateway Timeout**.

2. **Beban CPU akibat Rogue Crash-Loop Service:**
   - Service lama `fastapi-pengumuman.service` yang crash 400.295 kali membuang-buang daya komputasi 1 vCPU yang terbatas. *(Masalah ini telah diatasi: service telah di-stop dan di-disable secara permanen).*

3. **Kapasitas Disk yang Hampir Penuh (83%):**
   - Sisa disk 3.6 GB berisiko habis jika log database MySQL atau file log sistem bertambah, yang dapat menyebabkan database terkunci (*read-only* atau crash).

---

## 💡 6. Rekomendasi Tipe & Spesifikasi Upgrade VPS

Agar sistem Pengumuman Internal & Duty Attendance dapat berjalan sangat cepat, stabil, responsif tanpa lag, serta tahan menampung seluruh guru yang mengakses serentak di pagi hari, sangat disarankan untuk melakukan upgrade kapasitas VPS:

### 🏆 Pilihan 1: Tipe yang SANGAT DIREKOMENDASIKAN (Pilihan Terbaik & Paling Stabil)
- **vCPU:** **2 Core vCPU**
- **RAM:** **4 GB RAM**
- **Storage:** **40 GB – 50 GB SSD / NVMe**
- **Bandwidth:** 1 Gbps Shared / Unmetered
- **Estimasi Biaya:** **± Rp 150.000 – Rp 250.000 / bulan** (atau ~$15 – $24/bulan)
- **Alasan & Manfaat:**
  - Memberikan ruang napas yang sangat lega untuk MySQL 8.0, 2 aplikasi FastAPI, dan Nginx secara bersamaan.
  - Memori swap tidak akan pernah tersentuh (*Zero Swap Thrashing*), sehingga respon API selalu instan (< 100 ms).
  - CPU 2 Core memungkinkan satu core menangani request web/presensi sementara core lainnya menjalankan query database atau background build.
  - Sangat aman menampung 50–150 guru yang login dan presensi bersamaan pukul 07.15 WIB.

---

### 🥈 Pilihan 2: Tipe Ekonomis (Standar Minimal Mutlak)
- **vCPU:** **2 Core vCPU**
- **RAM:** **2 GB RAM**
- **Storage:** **30 GB – 40 GB SSD**
- **Estimasi Biaya:** **± Rp 80.000 – Rp 120.000 / bulan** (atau ~$10 – $12/bulan)
- **Catatan:**
  - Jauh lebih baik dibandingkan 1 GB saat ini (tidak akan sering crash).
  - Namun karena di server ini terdapat 2 aplikasi FastAPI (Pengumuman + Excur) dan MySQL 8, memori 2 GB akan terpakai sekitar 60–75%. Jika ke depan ada fitur baru atau penambahan aplikasi ke-3, server akan mulai padat kembali.

---

### 🥇 Pilihan 3: Tipe Enterprise (Untuk Jangka Panjang / Skala Besar)
- **vCPU:** **4 Core vCPU**
- **RAM:** **8 GB RAM**
- **Storage:** **80 GB – 100 GB NVMe**
- **Estimasi Biaya:** **± Rp 350.000 – Rp 500.000 / bulan**
- **Catatan:**
  - Dipilih jika ke depan sistem ini akan diakses oleh seluruh siswa dan orang tua murid, atau jika digabungkan dengan sistem E-Learning / Rapor sekolah.

---

### 🛒 Rekomendasi Provider VPS (Bisa Langsung Upgrade Paket Tanpa Ganti IP):
Jika server saat ini menggunakan provider cloud/hosting tertentu, Anda dapat meminta **"Resize / Upgrade Spec"** langsung di dashboard hosting tanpa perlu install ulang OS atau mengubah settingan domain:
- **Provider Lokal (Indonesia - Latensi Tercepat):**
  - **IDCloudHost:** Paket Cloud VPS (2 Core, 4 GB RAM, 60 GB Storage) ~ Rp 180.000/bln.
  - **Biznet GIO (NEO Virtual Compute):** 2 vCPU, 4 GB RAM ~ Rp 200.000/bln.
  - **DomaiNesia / Niagahoster Cloud VPS:** Paket VPS KVM 2 / KVM 4.
- **Provider Global (Sangat Andal):**
  - **DigitalOcean:** Droplet Basic Regular / Premium Intel (2 vCPU, 4 GB RAM, 80 GB SSD) ~ $24/bln.
  - **Linode (Akamai):** Shared CPU 4 GB (2 vCPU, 4 GB RAM, 80 GB SSD) ~ $24/bln.
  - **Vultr:** Cloud Compute 2 vCPU, 4 GB RAM ~ $20/bln.

---

### 🔧 Tindakan Optimasi Sistem yang Telah Diterapkan Sekarang:
Sambil menunggu pertimbangan upgrade hardware, tindakan penyesuaian internal berikut telah dilakukan di server:
1. **Mematikan Service Zombie:** Service `fastapi-pengumuman.service` yang crash-loop 400.295 kali telah dimatikan dan di-disable permanen. Beban CPU kini telah normal kembali.
2. **Koneksi Database & Query:** Endpoint `/api/duty-attendance/sessions` dan log monitoring telah dioptimalkan dengan query terindeks untuk meringankan beban MySQL.
3. **Pembersihan Log Berlebih:** Mencegah sisa disk 3.6 GB menyusut lebih lanjut.

---

## 🚀 7. Status Deployment & File Terdampak

| File | Lokasi | Keterangan Perubahan |
| :--- | :--- | :--- |
| `DutyAttendance.jsx` | `frontend-pengumuman/src/pages/` | Penerapan presensi *Strict On-Time* (tanpa buffer 30 menit), Session Pill Switcher, Daftar hadir devotion, Anti-self-substitution. |
| `api.py` | `backend-pengumuman/routers/api.py` | Normalisasi self-substitution, backend guard data devotion & comprehensive records. |
| `update-4.md` | Root directory | Dokumentasi komprehensif versi 4, kebijakan on-time, panduan penambahan duty, dan audit VPS. |

### Status Server Produksi:
- **Server VPS:** `202.155.14.105`
- **Domain Publik:** `https://pengumuman.klprojects.online`
- **Frontend Vite Build:** Berhasil dikompilasi (`npm run build`) dan aktif di `/dist`.
- **Backend Service:** `fastapi_pengumuman_ese.service` berstatus **Active (running)**.
- **Kebijakan Presensi:** **Strict On-Time** aktif secara langsung di web produksi.
