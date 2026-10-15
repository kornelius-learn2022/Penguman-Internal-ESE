# 📋 DOKUMENTASI UPDATE & PERBAIKAN SISTEM V4 (Pengumuman Internal ESE)

> **Tanggal Pembaruan:** 15 Oktober 2026  
> **Target Server (VPS):** `202.155.14.105` (`https://pengumuman.klprojects.online`)  
> **Repository:** [GitHub - Penguman-Internal-ESE](https://github.com/kornelius-learn2022/Penguman-Internal-ESE.git)  
> **Status:** ✅ Selesai Diuji, Dikonfirmasi & Diimplementasikan di Server Produksi  

---

## 📑 Daftar Isi
1. [Ringkasan Pembaruan V4](#-ringkasan-pembaruan-v4)
2. [Investigasi & Solusi: Kasus Ms. Pinta (Morning Devotion)](#-1-investigasi--solusi-kasus-ms-pinta-morning-devotion)
3. [Investigasi & Solusi: Akses Morning Duty Jam 07.16 ("Belum Bisa Diakses")](#-2-investigasi--solusi-akses-morning-duty-jam-0716-belum-bisa-diakses)
4. [Investigasi & Solusi: Break Time Kelas 1-2 Menampilkan Kelas 3-4 (Ms. Destha)](#-3-investigasi--solusi-break-time-kelas-1-2-menampilkan-kelas-3-4-ms-destha)
5. [Panduan: Penambahan Lokasi Duty Baru Besok Jam 3 Tanpa Mengubah Record](#-4-panduan-penambahan-lokasi-duty-baru-besok-jam-3-tanpa-mengubah-record)
6. [Status Deployment & File Terdampak](#-5-status-deployment--file-terdampak)

---

## 📌 Ringkasan Pembaruan V4

Pada pembaruan Versi 4 (15 Oktober 2026), dilakukan serangkaian audit log, perbaikan fungsional, dan penyempurnaan UI/UX pada modul **Duty Attendance (Presensi Piket & Morning Devotion)**. Pembaruan ini menyelesaikan masalah guru yang seolah hilang dari presensi, form piket yang terkunci akibat perbedaan jam perangkat, tumpang tindih sesi istirahat (*break time*) di lokasi Canteen, serta menstabilkan performa server VPS.

---

## 🔍 1. Investigasi & Solusi: Kasus Ms. Pinta (Morning Devotion)

### Gejala Masalah:
Pada hari Kamis, 15 Oktober 2026, koordinator/guru mendapati nama **Ms. Pinta** tidak ada di daftar sesi Morning Devotion.

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

## 🕒 2. Investigasi & Solusi: Akses Morning Duty Jam 07.16 ("Belum Bisa Diakses")

### Gejala Masalah:
Sesi Morning Duty (07.15–07.45) ketika diakses pada pukul 07.16 masih tidak bisa diakses dan menampilkan pesan terkunci: *"No Active Duty Schedule at This Time"*.

### Hasil Investigasi:
1. **Filter Waktu Ketat Tanpa Toleransi (*Zero Buffer*) di Frontend:**
   - Fungsi `isOutsideDuty` membandingkan waktu sekarang (`currentDate = new Date()`) secara absolut:
     ```javascript
     return now < startTime || now > endTime;
     ```
   - Nilai `now` diambil dari jam lokal perangkat user.
   - Jika jam HP/laptop guru **lebih lambat 1–2 menit** dari jam server (misal jam dinding 07.16, tetapi jam HP 07.14), sistem mendeteksi `now < 07.15` dan **langsung mengunci form presensi**.
   - Guru yang tiba lebih awal (07.05–07.14) untuk bersiap piket juga langsung terkunci.
2. **Server Sempat Mengalami Gateway Timeout (504) Pukul 07.19 – 07.23:**
   - Berdasarkan log Nginx `/var/log/nginx/access.log`, saat user mengakses `/api/duty-attendance/sessions` pada jam 07.19 dan 07.23, server mengembalikan status **504 Gateway Timeout**.
   - Ketika endpoint sesi gagal/timeout, array sesi menjadi kosong (`[]`), dan UI secara keliru menyimpulkan bahwa tidak ada jadwal yang aktif.
   - **Penyebab timeout:** Ditemukan service lama `fastapi-pengumuman.service` di VPS yang mengalami *crash-loop* restart terus-menerus (mencapai 400.295 kali restart) dan membebani resource CPU/database.
3. **Perbedaan URL Kategori vs Lokasi Fisik:**
   - Jika guru mengakses URL `/duty/Morning%20Duty` (bukan nama lokasi fisik seperti `/duty/Canteen` atau `/duty/2nd%20floor%20lobby`), sebelumnya sistem mencari lokasi bernama "Morning Duty" dan gagal mencocokkannya.

### Perbaikan yang Diterapkan:
1. **Penambahan Toleransi Waktu Buffer 30 Menit ([`DutyAttendance.jsx`](file:///c:/Users/kornelius/Documents/Pengumuman%20Internal%20ESE%20New/frontend-pengumuman/src/pages/DutyAttendance.jsx)):**
   - Form presensi duty sekarang dibuka **30 menit sebelum jadwal** dan tetap dibuka hingga **30 menit setelah jadwal selesai**.
   - Untuk Morning Duty `07.15 – 07.45`:
     - **Mulai dibuka:** pukul **06.45 WIB** (guru yang datang pagi bisa langsung absen).
     - **Batas akhir:** pukul **08.15 WIB** (guru yang sedikit terlambat tetap bisa menyelesaikan presensi).
   - Perbedaan jam perangkat hingga 30 menit tidak akan lagi menyebabkan form terkunci.
2. **Dukungan URL Berbasis Kategori:**
   - URL `/duty/Morning%20Duty` sekarang otomatis mengenali dan menampilkan seluruh lokasi Morning Duty (`2nd floor lobby`, `3rd floor lobby`, `4th floor lobby`, `Canteen`, dan `ESE Backyard`).
3. **Mematikan Service Crash-Loop di VPS:**
   - Menjalankan `systemctl stop fastapi-pengumuman.service` dan `systemctl disable fastapi-pengumuman.service`. Beban CPU server kini sangat ringan dan stabil.
4. **Penanganan Error Network yang Ramah Pengguna:**
   - Jika koneksi server sempat terganggu, UI kini menampilkan tombol `🔄 Coba Muat Ulang` alih-alih menampilkan pesan jadwal tidak ada.
   - Jika pengguna membuka halaman di luar jendela jam aktif, UI menampilkan jadwal lengkap sesi duty di lokasi tersebut.

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
4. **Discrepancy Master Schedule:**
   - Pada file `JADWAL_DUTY_MASTER.csv`, jadwal Break 1 Canteen sebenarnya adalah **Mr. Kornelius**, sedangkan **Ms. Destha** bertugas di Break 2 Canteen (11.55–12.25). Di tabel database `teacher_duties`, kedua nama tersebut tertukar posisi.

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

### 3 Pilihan Cara Eksekusi:

#### Opsi 1: Otomatisasi via Cron Job di VPS *(Paling Praktis)*
1. Kami buatkan script Python di VPS berisi detail lokasi baru, nama guru, slot jam, dan hari tugas.
2. Script didaftarkan ke `crontab` Linux untuk dijalankan otomatis tepat pada **besok jam 03:00 Pagi** (atau jam 15:00 Sore):
   ```bash
   0 3 16 10 * /var/www/pengumuman-internal/pengumuman/pengumuman-ese-new/backend-pengumuman/venv/bin/python /tmp/insert_new_duty.py
   ```
3. **Hasil:** Hari ini database tidak berubah sama sekali. Tepat besok jam 3, data otomatis masuk tanpa perlu campur tangan manual.

#### Opsi 2: Input Langsung di Menu Admin Hari Ini *(Jika Jadwalnya Hari Jumat)*
1. Jika lokasi baru tersebut bertugas pada hari **Jumat (Friday)**, admin dapat menambahkannya sekarang juga melalui menu **Admin ➔ Duty Schedules ➔ Add Duty**.
2. **Hasil:** Karena hari ini adalah hari Kamis, sistem presensi dan monitoring hari Kamis hanya memfilter `day_of_week = 'Thursday'`. Jadwal hari Jumat tersebut otomatis baru akan muncul besok saat kalender sistem berganti menjadi hari Jumat.

---

## 🚀 5. Status Deployment & File Terdampak

| File | Lokasi | Keterangan Perubahan |
| :--- | :--- | :--- |
| `DutyAttendance.jsx` | `frontend-pengumuman/src/pages/` | Penambahan buffer 30 menit, session pill switcher, daftar hadir devotion, anti-self-substitution. |
| `api.py` | `backend-pengumuman/routers/api.py` | Normalisasi self-substitution, guard mapping inval devotion & comprehensive records. |
| `update-4.md` | Root directory | Dokumentasi komprehensif seluruh investigasi dan perbaikan versi 4. |

### Status Server Produksi:
- **Server VPS:** `202.155.14.105`
- **Domain Publik:** `https://pengumuman.klprojects.online`
- **Frontend Vite Build:** Berhasil dikompilasi (`npm run build`) dan di-deploy ke `/dist`.
- **Backend Service:** `fastapi_pengumuman_ese.service` berstatus **Active (running)**.
- **Git Status:** Seluruh perubahan telah di-commit dan di-push ke branch `main` di GitHub repo.
