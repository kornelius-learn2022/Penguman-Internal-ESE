# Rencana Pembaruan Fitur & Penambahan Data Morning Devotion

Dokumen ini berisi rencana implementasi penambahan fitur dan integrasi data **Morning Devotion (07.15 - 07.45)** ke dalam sistem **Pengumuman Internal ESE** tanpa merubah maupun merusak fitur yang sudah berjalan.

---

## 1. Analisis Status Saat Ini
- **Jadwal Duty Saat Ini:** Disimpan dalam tabel `teacher_duties` (berisi piket area: Canteen, ESE Backyard, Lobby Lantai 2, 3, 4, dan Announcer Gerbang).
- **Morning Devotion Saat Ini:** Di backend (`routers/api.py`) sebelumnya digenerate secara *virtual session* (tidak tersimpan di tabel `teacher_duties`), sehingga di panel Admin tab **Duty Schedules**, admin tidak bisa melihat, mengedit, ataupun menambahkan sesi Morning Devotion secara langsung.
- **Tujuan Pembaruan:**
  1. Menambahkan opsi "Morning Devotion" pada form Tambah & Edit Jadwal Duty di panel Admin.
  2. Menyimpan data jadwal Morning Devotion guru secara riil ke tabel `teacher_duties` dan master CSV.
  3. Memastikan semua fitur absensi dan filter yang sudah ada tetap berfungsi 100% normal.

---

## 2. Struktur Data Jadwal Morning Devotion (07.15 - 07.45)
- **Kategori (`category`):** `Morning Devotion`
- **Lokasi (`location`):** `Morning Devotion`
- **Jam Sesi (`time_slot`):** `07.15-07.45`
- **Lingkup Jenjang (`grade_scope`):** `All Teachers`
- **Tugas / Keterangan (`task`):** `Morning Devotion (07.15-07.45)`
- **Hari:** Senin s/d Jumat (`Monday` - `Friday`)

Setiap hari kerja, terdapat:
- **5 Guru** bertugas piket fisik (Canteen, Backyard, Lobby).
- **51 Guru** bertugas mengikuti Morning Devotion.
- **Total Entri Jadwal Devotion:** 51 guru × 5 hari = **255 data entri**.

---

## 3. Rencana Langkah Kerja (Action Plan)

### Langkah 1: Frontend (`frontend-pengumuman/src/pages/Admin.jsx`)
1. **Modal Tambah Duty (`isCreateDutyOpen`):**
   - Tambahkan opsi `<option value="Morning Devotion">Morning Devotion</option>` pada dropdown **Lokasi Duty**.
   - Tambahkan opsi `<option value="Morning Devotion">Morning Devotion</option>` pada dropdown **Kategori Sesi**.
   - Tambahkan logika kemudahan (autofill): Saat admin memilih kategori "Morning Devotion":
     - Jam otomatis terisi `07.15-07.45`
     - Lokasi otomatis terpilih `Morning Devotion`
     - Grade scope otomatis terisi `All Teachers`
2. **Modal Edit Duty (`editDutyModal`):**
   - Tambahkan opsi `Morning Devotion` pada dropdown Lokasi dan Kategori di modal edit.
3. **Tampilan & Filter:**
   - Pertahankan seluruh opsi duty yang sudah ada (Canteen, Backyard, Lobby, Announcer, Break 1-2, Go Home).

### Langkah 2: Backend & Database
1. **Validasi Model & API (`routers/api.py`):**
   - Pastikan endpoint `POST /api/duties` dan `PUT /api/duties/{id_duty}` mendukung data Morning Devotion tanpa kendala.
   - Pada endpoint absensi sesi (`/duty-attendance/sessions`), sesuaikan agar membaca sesi Morning Devotion dari data riil tabel `teacher_duties` tanpa terjadi duplikasi data.
2. **Data Master & Migrasi:**
   - Perbarui file `JADWAL_DUTY_MASTER.csv` dengan menambahkan entri Morning Devotion.
   - Masukkan 255 entri jadwal Morning Devotion ke dalam tabel `teacher_duties` di server database MySQL (`db_pengumuman`).

### Langkah 3: Pengujian & Verifikasi
1. Verifikasi penambahan entri jadwal Morning Devotion di panel Admin UI.
2. Uji filter pencarian dan edit jadwal duty.
3. Pastikan tidak ada regresi pada modul lain (Pengumuman, Ulang Tahun, Inval Duty, Absensi Duty).
