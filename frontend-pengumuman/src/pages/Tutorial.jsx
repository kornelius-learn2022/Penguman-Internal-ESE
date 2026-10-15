import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Tutorial() {
  const [activeTab, setActiveTab] = useState("announcements");

  // Simulation states for Announcement preview
  const [simDate, setSimDate] = useState("2026-10-15");
  const [simLargeText, setSimLargeText] = useState(false);
  const [simImageOpen, setSimImageOpen] = useState(false);

  // Simulation states for Duty Attendance preview
  const [simLocation, setSimLocation] = useState("Canteen");
  const [simSession, setSimSession] = useState("break1_g12");
  const [simTeacher, setSimTeacher] = useState("");
  const [simPin, setSimPin] = useState("");
  const [simSubmitted, setSimSubmitted] = useState(false);
  const [simError, setSimError] = useState("");

  // Simulation states for Morning Devotion preview
  const [simDevotionTeacher, setSimDevotionTeacher] = useState("");
  const [simDevotionInval, setSimDevotionInval] = useState("");
  const [simDevotionPin, setSimDevotionPin] = useState("");
  const [simDevotionList, setSimDevotionList] = useState([
    { name: "Ms. Pinta", time: "07:27", isInval: false },
    { name: "Mr. Andreas", time: "07:18", isInval: false },
    { name: "Ms. Destha", time: "07:22", isInval: false },
  ]);

  const handleSimDutySubmit = (e) => {
    e.preventDefault();
    if (!simTeacher) {
      setSimError("Silakan pilih guru terlebih dahulu!");
      return;
    }
    if (simPin.length !== 5) {
      setSimError("PIN harus terdiri dari 5 digit angka!");
      return;
    }
    setSimError("");
    setSimSubmitted(true);
  };

  const handleSimDevotionSubmit = (e) => {
    e.preventDefault();
    if (!simDevotionTeacher) return;
    if (simDevotionPin.length !== 5) return;

    const newEntry = {
      name: simDevotionInval ? `${simDevotionTeacher} (Inval: ${simDevotionInval})` : simDevotionTeacher,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      isInval: !!simDevotionInval,
    };
    setSimDevotionList([newEntry, ...simDevotionList]);
    setSimDevotionTeacher("");
    setSimDevotionInval("");
    setSimDevotionPin("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      {/* Top Banner / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
              alt="Cita Hati Logo"
              className="h-10 w-auto object-contain"
            />
            <div>
              <h1 className="text-lg font-black text-[#1e3a8a] tracking-tight">
                Pusat Panduan & Tutorial Sistem
              </h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pengumuman Internal & Duty Attendance ESE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/announcements/today"
              className="px-3.5 py-1.5 bg-blue-50 text-[#1e3a8a] hover:bg-blue-100 rounded-xl text-xs font-bold transition-all border border-blue-200"
            >
              📢 Buka Pengumuman
            </Link>
            <Link
              to="/duty"
              className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all border border-indigo-200"
            >
              🛡️ Buka Presensi Duty
            </Link>
            <Link
              to="/login"
              className="px-3.5 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              🔐 Admin Portal
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto px-4 mt-2">
          <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 scrollbar-none">
            <button
              onClick={() => setActiveTab("announcements")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "announcements"
                  ? "bg-[#1e3a8a] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>📢</span>
              <span>1. Pengumuman Internal</span>
            </button>

            <button
              onClick={() => setActiveTab("duty")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "duty"
                  ? "bg-[#1e3a8a] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>🛡️</span>
              <span>2. Presensi Piket (Duty)</span>
            </button>

            <button
              onClick={() => setActiveTab("devotion")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "devotion"
                  ? "bg-[#1e3a8a] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>🙏</span>
              <span>3. Morning Devotion</span>
            </button>

            <button
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "admin"
                  ? "bg-[#1e3a8a] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>⚙️</span>
              <span>4. Monitoring & Admin</span>
            </button>

            <button
              onClick={() => setActiveTab("faq")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "faq"
                  ? "bg-[#1e3a8a] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>💡</span>
              <span>5. FAQ & Troubleshooting</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 mt-6">
        {/* ================= TAB 1: PENGUMUMAN INTERNAL ================= */}
        {activeTab === "announcements" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Intro Hero */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
              <div className="max-w-2xl">
                <span className="px-3 py-1 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
                  Modul 1: Community Hub
                </span>
                <h2 className="text-2xl md:text-3xl font-black mt-3">
                  Panduan Penggunaan Pengumuman Internal
                </h2>
                <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                  Pusat informasi harian guru dan staf Cita Hati East Surabaya. Memuat pengumuman akademik, jadwal kegiatan, hari ulang tahun guru, dan asisten AI pintar.
                </p>
              </div>
            </div>

            {/* Step-by-Step Guide & Interactive Simulation Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Detailed Steps */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-100 text-[#1e3a8a] rounded-lg flex items-center justify-center font-black text-sm">
                    1
                  </span>
                  Langkah-Langkah Mengakses Pengumuman
                </h3>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex gap-3">
                    <span className="text-xl">📅</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        1. Navigasi Tanggal (Yesterday, Today, Tomorrow)
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Gunakan tombol cepat di kanan atas untuk berpindah antara tanggal kemarin, hari ini, atau besok. Anda juga dapat memilih tanggal tertentu lewat pemilih kalender untuk melihat arsip pengumuman lampau.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex gap-3">
                    <span className="text-xl">🔍</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        2. Tombol Pengatur Ukuran Huruf (Larger Font A+)
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Klik tombol <strong>Larger Font (A+)</strong> jika Anda memerlukan teks pengumuman yang lebih besar dan nyaman dibaca saat presentasi atau melalui ponsel.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex gap-3">
                    <span className="text-xl">🖼️</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        3. Melihat Gambar Flyer / Poster Resolusi Penuh
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Jika pengumuman memiliki gambar poster, cukup klik gambar tersebut untuk membukanya dalam tampilan *Full Screen Modal*. Klik tombol ✕ atau luar layar untuk menutup.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex gap-3">
                    <span className="text-xl">🎂</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        4. Ulang Tahun Guru & Acara Khusus
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Di bawah pengumuman, sistem secara otomatis menampilkan rekan guru/staf yang sedang berulang tahun hari ini serta agenda kalender akademik yang aktif.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex gap-3">
                    <span className="text-xl">🤖</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        5. Asisten AI Interaktif (Chat Assistant)
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Di pojok kanan bawah terdapat tombol Chat AI yang siap menjawab pertanyaan seputar jadwal piket, kegiatan sekolah, atau pencarian pengumuman lama secara cerdas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Simulation Card */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-blue-200 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      Simulasi Interaktif
                    </span>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-lg">
                    Live Demo
                  </span>
                </div>

                {/* Simulated Header Controls */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-600">Coba Kontrol Tampilan:</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSimDate("2026-10-14")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                        simDate === "2026-10-14" ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-700"
                      }`}
                    >
                      Kemarin
                    </button>
                    <button
                      onClick={() => setSimDate("2026-10-15")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                        simDate === "2026-10-15" ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-700"
                      }`}
                    >
                      Hari Ini
                    </button>
                    <button
                      onClick={() => setSimLargeText(!simLargeText)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                        simLargeText ? "bg-indigo-600 text-white" : "bg-white text-slate-700"
                      }`}
                    >
                      {simLargeText ? "🔍 Font Normal" : "🔍 Font A+"}
                    </button>
                  </div>
                </div>

                {/* Simulated Announcement Card */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                      📌 Academic Notice
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{simDate}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <h4 className={`font-black text-slate-900 transition-all ${simLargeText ? "text-lg" : "text-sm"}`}>
                      Parent-Teacher Conference (PTC) Semester Ganjil
                    </h4>
                    <p className={`text-slate-600 leading-relaxed transition-all ${simLargeText ? "text-sm" : "text-xs"}`}>
                      Diharapkan seluruh wali kelas mempersiapkan portofolio siswa sebelum pelaksanaan PTC hari Jumat mendatang.
                    </p>
                    <div
                      onClick={() => setSimImageOpen(true)}
                      className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center p-4 text-center hover:bg-slate-200 transition-all"
                    >
                      <div className="text-xs text-slate-500 font-bold group-hover:text-blue-700">
                        🖼️ [Klik untuk Uji Tampilan Modal Poster]
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Simulator */}
                {simImageOpen && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-center space-y-2">
                    <div className="text-xs font-bold text-indigo-900">
                      ✅ Berhasil Membuka Modal Poster (Full Screen)
                    </div>
                    <button
                      onClick={() => setSimImageOpen(false)}
                      className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-xs"
                    >
                      Tutup Modal
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PRESENSI PIKET (DUTY ATTENDANCE) ================= */}
        {activeTab === "duty" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Banner Strict On-Time */}
            <div className="bg-gradient-to-r from-red-900 via-rose-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
              <span className="px-3 py-1 bg-red-500/30 text-red-200 border border-red-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Aturan Kedisiplinan Siswa
              </span>
              <h2 className="text-2xl md:text-3xl font-black mt-3">
                Kebijakan Presensi On-Time (Tanpa Toleransi 30 Menit)
              </h2>
              <p className="text-slate-200 text-sm mt-2 leading-relaxed max-w-3xl">
                Tugas piket berkaitan langsung dengan pengawasan dan keselamatan siswa di area sekolah. Oleh karena itu, formulir presensi <strong>HANYA DAPAT DIISI TEPAT WAKTU</strong> selama rentang jam tugas aktif. Tidak ada toleransi sebelum atau sesudah jam piket berakhir.
              </p>
            </div>

            {/* Steps & Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Tutorial Steps */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span className="w-7 h-7 bg-red-100 text-red-700 rounded-lg flex items-center justify-center font-black text-sm">
                    2
                  </span>
                  Tata Cara Presensi di Lokasi Piket
                </h3>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex gap-3">
                    <span className="text-xl">📍</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        1. Scan QR Code di Lokasi Tugas
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Setiap lokasi piket (seperti Kantin, Lobby Lt 2, Lobby Lt 3, Backyard) memiliki QR Code fisik yang ditempel di dinding. Arahkan kamera smartphone ke QR Code untuk membuka halaman presensi lokasi tersebut.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex gap-3">
                    <span className="text-xl">🔀</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        2. Tombol Navigasi Sesi (Pill Selector) jika Ada 2 Sesi Beririsan
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Khusus lokasi seperti <strong>Kantin</strong> yang memiliki 2 jadwal berdekatan (Break Grade 3-4 dan Grade 1-2), sistem menampilkan bar navigasi biru di bagian paling atas:
                        <br />
                        <code className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-blue-700 font-bold inline-block mt-1">
                          👉 Break 1 (Grade 1-2) (09.30-09.45)
                        </code>
                        <br />
                        Klik tombol sesi Anda agar layar langsung melompat ke kartu sesi yang tepat.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex gap-3">
                    <span className="text-xl">👤</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        3. Pilih Nama Anda dari Dropdown Terjadwal
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Pilih nama Anda. Dropdown hanya menampilkan guru yang belum melakukan presensi. Guru yang sudah absen akan otomatis berpindah ke kartu hijau "Sudah Hadir".
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex gap-3">
                    <span className="text-xl">🔑</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        4. Masukkan 5-Digit PIN Rahasia
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Ketik 5 digit passcode pribadi Anda (sesuai data passcodes guru). PIN ini melindungi keaslian presensi mandiri Anda.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex gap-3">
                    <span className="text-xl">✅</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        5. Konfirmasi Berhasil Hadir
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Setelah menekan tombol "Submit Attendance", sistem memunculkan notifikasi sukses hijau dan status Anda langsung tercatat rapi di monitor koordinator.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Duty Attendance Simulator */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-red-200 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      Simulasi Presensi Piket
                    </span>
                  </div>
                  <span className="text-xs bg-red-50 text-red-700 font-bold px-2 py-1 rounded-lg">
                    Coba Langsung
                  </span>
                </div>

                {/* Simulated Location & Session Switcher */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-600">Simulasi Pilih Sesi (Kantin):</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSimSession("break1_g34");
                        setSimSubmitted(false);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        simSession === "break1_g34"
                          ? "bg-[#1e3a8a] text-white shadow-xs"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      👉 Grade 3-4 (09.10-09.35)
                    </button>
                    <button
                      onClick={() => {
                        setSimSession("break1_g12");
                        setSimSubmitted(false);
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        simSession === "break1_g12"
                          ? "bg-[#1e3a8a] text-white shadow-xs"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      👉 Grade 1-2 (09.30-09.45)
                    </button>
                  </div>
                </div>

                {/* Simulated Form Card */}
                {!simSubmitted ? (
                  <form onSubmit={handleSimDutySubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#1e3a8a]">
                        📍 {simLocation} — {simSession === "break1_g34" ? "Break 1 (Grade 3-4)" : "Break 1 (Grade 1-2)"}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        🟢 On-Time Active
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Pilih Guru Terjadwal:
                      </label>
                      <select
                        value={simTeacher}
                        onChange={(e) => setSimTeacher(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="">-- Pilih Guru --</option>
                        {simSession === "break1_g34" ? (
                          <option value="Ms. Destha">Ms. Destha (Terjadwal)</option>
                        ) : (
                          <option value="Ms. Jenny P">Ms. Jenny P (Terjadwal)</option>
                        )}
                        <option value="Mr. Kornelius">Mr. Kornelius</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        PIN Passcode (5 Digit):
                      </label>
                      <input
                        type="password"
                        maxLength={5}
                        placeholder="Contoh: 12345"
                        value={simPin}
                        onChange={(e) => setSimPin(e.target.value)}
                        className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-200 bg-white tracking-widest"
                      />
                    </div>

                    {simError && (
                      <div className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg">
                        ⚠️ {simError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#1e3a8a] hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
                    >
                      Kirim Presensi (Submit)
                    </button>
                  </form>
                ) : (
                  <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-2xl text-center space-y-3">
                    <div className="text-3xl">✅</div>
                    <div className="font-black text-sm text-emerald-900">
                      Presensi Piket Berhasil Terverifikasi!
                    </div>
                    <p className="text-xs text-emerald-700">
                      <strong>{simTeacher}</strong> telah tercatat hadir on-time di lokasi <strong>{simLocation}</strong>.
                    </p>
                    <button
                      onClick={() => {
                        setSimSubmitted(false);
                        setSimTeacher("");
                        setSimPin("");
                      }}
                      className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                    >
                      Ulangi Simulasi
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: MORNING DEVOTION ================= */}
        {activeTab === "devotion" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Banner Morning Devotion */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
              <span className="px-3 py-1 bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Modul 3: Kebaktian Pagi Guru
              </span>
              <h2 className="text-2xl md:text-3xl font-black mt-3">
                Panduan Presensi Morning Devotion & Konsep Inval
              </h2>
              <p className="text-slate-200 text-sm mt-2 leading-relaxed max-w-3xl">
                Sesi Morning Devotion diikuti oleh 50+ guru setiap pagi di Chapel. Fitur ini dilengkapi sistem pencarian cepat, daftar hadir real-time (*Attended List*), dan alur substitusi/inval yang aman dari duplikasi.
              </p>
            </div>

            {/* Steps & Devotion Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Rules & Steps */}
              <div className="lg:col-span-7 space-y-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span className="w-7 h-7 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-black text-sm">
                    3
                  </span>
                  Cara Melakukan Presensi Devotion
                </h3>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex gap-3">
                    <span className="text-xl">🔍</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        1. Memilih Nama dari Daftar 50+ Guru
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Pilih nama Anda di dropdown. Nama guru yang sudah hadir otomatis disaring dan disembunyikan dari dropdown agar dropdown semakin ringkas seiring berjalannya pagi.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex gap-3">
                    <span className="text-xl">🔄</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        2. Konsep Inval / Guru Pengganti (Subtitusi)
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        - <strong>Jika hadir untuk diri sendiri:</strong> Biarkan opsi default <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-700">-- Tidak ada pengganti (Hadir sendiri) --</code>.
                        <br />
                        - <strong>Jika menggantikan rekan lain:</strong> Pilih nama rekan yang berhalangan pada nama guru, lalu pilih nama Anda pada kolom guru pengganti.
                        <br />
                        - <strong>Proteksi Anti Self-Substitution:</strong> Sistem otomatis mencegah Anda memilih nama Anda sendiri sebagai pengganti diri sendiri.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex gap-3">
                    <span className="text-xl">👥</span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        3. Melihat Daftar yang Sudah Hadir (Attended List)
                      </h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Daftar guru yang telah hadir ditampilkan dalam barisan badge hijau di bawah form (misal: <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Ms. Pinta (07:27)</span>). Ini memastikan guru yang sudah absen dapat melihat bukti kehadirannya secara transparan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Devotion Simulator */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-purple-200 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-purple-500 animate-pulse"></span>
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      Simulasi Morning Devotion
                    </span>
                  </div>
                  <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2 py-1 rounded-lg">
                    Live Demo
                  </span>
                </div>

                <form onSubmit={handleSimDevotionSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      Pilih Guru:
                    </label>
                    <select
                      value={simDevotionTeacher}
                      onChange={(e) => setSimDevotionTeacher(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="">-- Pilih Guru Belum Hadir --</option>
                      <option value="Mr. Kornelius">Mr. Kornelius</option>
                      <option value="Ms. Maria">Ms. Maria</option>
                      <option value="Mr. Kevin">Mr. Kevin</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      🔄 Inval / Pengganti (Opsional):
                    </label>
                    <select
                      value={simDevotionInval}
                      onChange={(e) => setSimDevotionInval(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="">-- Tidak ada pengganti (Hadir Sendiri) --</option>
                      <option value="Mr. David">Mr. David (Inval)</option>
                      <option value="Ms. Jessica">Ms. Jessica (Inval)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      PIN Passcode:
                    </label>
                    <input
                      type="password"
                      maxLength={5}
                      placeholder="5 digit PIN"
                      value={simDevotionPin}
                      onChange={(e) => setSimDevotionPin(e.target.value)}
                      className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-200 bg-white tracking-widest"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-purple-800 hover:bg-purple-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Simulasikan Hadir Devotion
                  </button>
                </form>

                {/* Simulated Attended List */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                    <span>✅ Sudah Hadir Devotion ({simDevotionList.length} Guru)</span>
                    <span className="text-[11px] text-slate-400">Real-time</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {simDevotionList.map((item, idx) => (
                      <span
                        key={idx}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 ${
                          item.isInval
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        <span>{item.isInval ? "🔄" : "👤"}</span>
                        <span>{item.name}</span>
                        <span className="text-[10px] text-slate-400">({item.time})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: PANEL MONITORING & ADMIN ================= */}
        {activeTab === "admin" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Banner Admin */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
              <span className="px-3 py-1 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Modul 4: Koordinator & Admin
              </span>
              <h2 className="text-2xl md:text-3xl font-black mt-3">
                Panduan Panel Monitoring & Pengelolaan Jadwal
              </h2>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed max-w-3xl">
                Fitur lengkap untuk koordinator piket dan administrator sekolah: memantau presensi guru secara langsung, mengelola master jadwal, mencetak QR Code per lokasi, dan ekspor rekapan ke Excel.
              </p>
            </div>

            {/* Admin Capabilities Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="text-2xl">📊</div>
                <h4 className="font-extrabold text-sm text-slate-800">Monitoring Real-Time</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Melihat status kehadiran detik per detik: Hadir Tepat Waktu, Guru Inval/Pengganti, atau Belum Hadir.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="text-2xl">📅</div>
                <h4 className="font-extrabold text-sm text-slate-800">Master Jadwal Duty</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Menambah atau memperbarui jadwal piket guru berdasarkan hari (Senin–Jumat) dan kategori jam tugas.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="text-2xl">🖨️</div>
                <h4 className="font-extrabold text-sm text-slate-800">Cetak QR Code</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Menghasilkan QR Code siap cetak untuk setiap titik lokasi (Kantin, Lobby, Backyard, Chapel).
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="text-2xl">📥</div>
                <h4 className="font-extrabold text-sm text-slate-800">Export Rekap Excel</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Sekali klik mengunduh laporan presensi bulanan/mingguan dalam format .xlsx siap serah yayasan.
                </p>
              </div>
            </div>

            {/* Guide: Adding New Location at 3 PM Without Affecting Records */}
            <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h4 className="font-black text-sm text-blue-900">
                    Prosedur Menambah Lokasi Duty Baru Besok Jam 3 Tanpa Mengganggu Data Hari Ini
                  </h4>
                  <p className="text-blue-700 text-xs mt-0.5">
                    Penjelasan teknis pembagian data master vs data transaksi harian
                  </p>
                </div>
              </div>

              <p className="text-slate-600 text-xs leading-relaxed">
                Database sistem memisahkan tabel menjadi dua: <strong>teacher_duties</strong> (template jadwal mingguan) dan <strong>duty_attendances</strong> (rekaman aktual kehadiran per tanggal). Menambahkan lokasi atau guru baru <strong>TIDAK AKAN PERNAH</strong> menghapus atau merusak presensi yang sudah tersimpan hari ini.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-blue-100 text-xs space-y-1.5">
                  <span className="font-extrabold text-[#1e3a8a] block">Opsi A: Input Langsung Hari Ini</span>
                  <p className="text-slate-500 leading-relaxed">
                    Jika lokasi baru tersebut untuk jadwal besok (misal hari Jumat), Admin dapat menginputnya hari ini di menu <strong>Admin ➔ Add Duty Schedule</strong> dengan memilih hari "Friday". Sistem hari Kamis tidak akan menampilkannya hingga jam 00:00 berganti hari.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-blue-100 text-xs space-y-1.5">
                  <span className="font-extrabold text-[#1e3a8a] block">Opsi B: Otomatisasi Terjadwal (Cron Job)</span>
                  <p className="text-slate-500 leading-relaxed">
                    Dapat didaftarkan script di server Linux VPS untuk berjalan tepat pukul 03:00 pagi atau 15:00 sore secara otomatis tanpa perlu campur tangan manual.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: FAQ & TROUBLESHOOTING ================= */}
        {activeTab === "faq" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-lg">
              <h2 className="text-2xl font-black">Pertanyaan Sering Diajukan (FAQ)</h2>
              <p className="text-slate-300 text-xs mt-1">
                Solusi cepat untuk kendala umum yang sering dihadapi guru dan koordinator.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a] flex items-center gap-2">
                  <span>❓</span> Mengapa form presensi tertulis "Belum Aktif"?
                </h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Sistem menerapkan kebijakan <strong>Strict On-Time</strong>. Form presensi hanya dibuka tepat sesuai jam tugas berlangsung (misal Morning Duty 07.15 – 07.45). Sebelum pukul 07.15:00 form akan terkunci demi kedisiplinan pengawasan murid di titik tugas.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a] flex items-center gap-2">
                  <span>❓</span> Bagaimana jika saya lupa nomor PIN saya?
                </h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  PIN Anda adalah 5 digit rahasia yang tercantum di file passcodes resmi guru. Silakan hubungi koordinator piket atau IT Administrator sekolah untuk verifikasi PIN Anda.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a] flex items-center gap-2">
                  <span>❓</span> Di Kantin kenapa muncul nama guru sesi lain?
                </h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Area kantin memiliki 2 sesi beririsan (Grade 3-4 dan Grade 1-2). Cukup klik tombol biru di bagian atas: <span className="font-bold text-blue-700">"👉 Break 1 (Grade 1-2)"</span> untuk melompat langsung ke formulir kelas Anda.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a] flex items-center gap-2">
                  <span>❓</span> Mengapa web kadang sempat terasa lemmot di jam 07.20?
                </h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Pada jam sibuk pagi puluhan guru mengakses serentak, sementara kapasitas RAM server saat ini baru 1 GB sehingga memori sempat meluap ke disk swap. Telah direkomendasikan upgrade paket VPS ke 2 vCPU / 4 GB RAM agar akses selalu instan tanpa hambatan.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
