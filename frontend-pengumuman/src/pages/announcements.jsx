import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import BannerLoading from "./BannerLoading";
import ChatAssistant from "../components/ChatAssistant";

// --- Sub-Components dengan Aksesibilitas & Kontras Tinggi ---
const SectionHeader = ({ title, icon, colorBadge = "blue", largeText, badgeCount }) => {
  const badgeColors = {
    blue: "bg-blue-100 text-blue-900 border-blue-200",
    amber: "bg-amber-100 text-amber-900 border-amber-300",
    rose: "bg-rose-100 text-rose-900 border-rose-200",
    emerald: "bg-emerald-100 text-emerald-900 border-emerald-200",
  };

  return (
    <div className="flex items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-200">
      <h3
        className={`${
          largeText ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
        } font-black text-slate-900 flex items-center gap-3 tracking-tight transition-all`}
      >
        <span
          className={`p-2.5 rounded-xl border flex items-center justify-center text-xl shadow-xs ${
            badgeColors[colorBadge] || badgeColors.blue
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span>{title}</span>
      </h3>
      {typeof badgeCount === "number" && (
        <span
          className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs"
          title={`${badgeCount} item`}
        >
          {badgeCount}
        </span>
      )}
    </div>
  );
};

function Announcements() {
  const today = new Date().toISOString().split("T")[0];

  // State Management
  const [selectedDate, setSelectedDate] = useState(today);
  const [largeText, setLargeText] = useState(() => {
    try {
      return localStorage.getItem("preferred_large_font") === "true";
    } catch {
      return false;
    }
  });

  const toggleLargeText = () => {
    setLargeText((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("preferred_large_font", String(next));
      } catch {}
      return next;
    });
  };

  const isFirstLoadRef = useRef(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);

  const [copiedId, setCopiedId] = useState(null);
  const [birthdayWishCopied, setBirthdayWishCopied] = useState(null);

  // State untuk Image Modal
  const [selectedImage, setSelectedImage] = useState(null);

  // Keyboard Escape listener untuk Modal Gambar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedImage(null);
      }
    };
    if (selectedImage) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage]);

  // Date Shift Shortcuts
  const handleShiftDate = (days) => {
    const parts = selectedDate.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dt = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${dt}`);
  };

  const handleSetToday = () => {
    setSelectedDate(today);
  };

  // Copy helper untuk guru membagikan pengumuman ke WhatsApp / Grup Kelas
  const handleCopyText = (id, text, dateStr) => {
    const textToCopy = `📢 [PENGUMUMAN SEKOLAH CITA HATI - ${dateStr}]\n\n${text}\n\n- Cita Hati East Surabaya Internal Hub`;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2500);
      })
      .catch(() => {
        // Fallback jika permission clipboard dicegah
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2500);
      });
  };

  // Kirim / Salin Ucapan Ulang Tahun Rekan Guru
  const handleWishBirthday = (item) => {
    const prefix = item.gender?.toLowerCase() === "male" ? "Mr. " : "Ms. ";
    const fullName = `${prefix}${item.name}`;
    const message = `Selamat Ulang Tahun ${fullName}! 🎂🎉 Kiranya Tuhan senantiasa memberikan kesehatan, sukacita, dan hikmat dalam membimbing siswa-siswi Cita Hati East Surabaya. Have a wonderful birthday!`;

    navigator.clipboard
      .writeText(message)
      .then(() => {
        setBirthdayWishCopied(item.id_birthday);
        setTimeout(() => setBirthdayWishCopied(null), 3000);
      })
      .catch(() => {
        setBirthdayWishCopied(item.id_birthday);
        setTimeout(() => setBirthdayWishCopied(null), 3000);
      });
  };

  // Anonymously track website visit once per session
  useEffect(() => {
    try {
      const hasTracked = sessionStorage.getItem("visit_tracked");
      if (!hasTracked) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        fetch(`${baseUrl}/track-visit`, { method: "POST" })
          .then(() => sessionStorage.setItem("visit_tracked", "true"))
          .catch(() => {});
      }
    } catch {
      // Ignore error for tracking
    }
  }, []);

  // --- API Functions (REAL DATA MODE) ---
  const fetchData = useCallback(async () => {
    if (isFirstLoadRef.current) {
      setIsInitialLoading(true);
    }
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      const [announcementsResponse, birthdaysResponse, eventsResponse] =
        await Promise.all([
          fetch(`${baseUrl}/announcements?tanggal=${selectedDate}`),
          fetch(`${baseUrl}/birthdays`),
          fetch(`${baseUrl}/events/schedule?date=${selectedDate}`),
        ]);

      // Announcements
      if (announcementsResponse.ok) {
        const annData = await announcementsResponse.json();
        // Urutkan: Pinned di paling atas, kemudian berdasarkan id atau urutan asli
        const sorted = [...annData].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
        setAnnouncements(sorted);
      } else {
        setAnnouncements([]);
      }

      // Birthdays (Filter sesuai tanggal dan bulan yang dipilih)
      if (birthdaysResponse.ok) {
        const birthData = await birthdaysResponse.json();
        const [, selectedMonth, selectedDay] = selectedDate.split("-");

        const filteredBirthdays = birthData.filter((item) => {
          const tanggalLahir = item.date;
          if (!tanggalLahir) return false;
          const [, itemMonth, itemDay] = tanggalLahir.split("T")[0].split("-");
          return itemMonth === selectedMonth && itemDay === selectedDay;
        });

        setBirthdays(filteredBirthdays);
      } else {
        setBirthdays([]);
      }

      // Special Events Schedule
      if (eventsResponse.ok) {
        const evData = await eventsResponse.json();
        setActiveEvents(evData);
      } else {
        setActiveEvents([]);
      }
    } catch (error) {
      console.error("Failed to connect to server:", error);
      setAnnouncements([]);
      setBirthdays([]);
      setActiveEvents([]);
    } finally {
      if (isFirstLoadRef.current) {
        setIsInitialLoading(false);
        isFirstLoadRef.current = false;
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Formatting Tanggal yang Ramah dan Nyaman Dibaca (Bilingual)
  const formattedDateIndo = useMemo(() => {
    try {
      const parts = selectedDate.split("-");
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const formattedDateEng = useMemo(() => {
    try {
      const parts = selectedDate.split("-");
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  if (isInitialLoading) return <BannerLoading />;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 selection:bg-blue-200 relative font-sans">
      {/* ================= MODAL IMAGE DETAIL (ACCESSIBLE DIALOG) ================= */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Announcement Image Details"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[92dvh] overflow-y-auto bg-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-300 flex flex-col items-center justify-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>🖼️</span> Attached Announcement Image
              </h4>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-blue-600"
                title="Tutup (Tombol Esc)"
                aria-label="Tutup pratinjau gambar"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[50vh] sm:max-h-[66vh] w-full flex items-center justify-center overflow-auto rounded-xl bg-slate-50 border border-slate-200 p-2">
              <img
                src={selectedImage}
                alt="Pengumuman Cita Hati"
                className="max-h-[48vh] sm:max-h-[62vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="mt-4 w-full flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <a
                href={selectedImage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <span>🔍</span> Buka Ukuran Penuh (Tab Baru)
              </a>

              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="px-6 py-2.5 bg-[#1e3a8a] text-white hover:bg-blue-900 rounded-xl font-bold text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= HEADER UTAMA ================= */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3.5 flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-4">
          {/* Logo & Identitas Institusi */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <img
                src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
                alt="Logo Sekolah Cita Hati East Surabaya"
                className="h-10 sm:h-12 w-auto object-contain rounded-md"
              />
              <div>
                <h1 className="text-base sm:text-xl font-black text-[#1e3a8a] tracking-tight leading-tight">
                  Community Hub
                </h1>
                <p className="text-[11px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Cita Hati East Surabaya
                </p>
              </div>
            </div>

            {/* Quick Action Button Guru di Mobile */}
            <div className="flex items-center gap-1.5 md:hidden">
              <Link
                to="/duty-attendance"
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a8a] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                <span>🛡️</span>
                <span>Duty</span>
              </Link>
            </div>
          </div>

          {/* Quick Navigasi & Alat Aksesibilitas */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between sm:justify-end">
            {/* Tombol Ukuran Huruf (Sangat penting bagi guru 25-55 tahun) */}
            <button
              type="button"
              onClick={toggleLargeText}
              className={`flex-1 sm:flex-none min-h-[40px] px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl border transition-all flex items-center justify-center gap-2 shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600 ${
                largeText
                  ? "bg-[#1e3a8a] text-white border-[#1e3a8a] ring-2 ring-blue-300"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
              }`}
              title="Perbesar atau kembalikan ukuran teks"
              aria-label="Pengaturan ukuran teks baca"
            >
              <span className="text-base" aria-hidden="true">
                🔤
              </span>
              <span>{largeText ? "Ukuran: Besar (A+)" : "Ukuran: Normal (A)"}</span>
            </button>


            {/* Link Panduan Guru */}
            <Link
              to="/tutorial"
              className="flex-1 sm:flex-none min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white text-slate-800 hover:bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600"
              title="Open Teacher Guide & Tutorial"
            >
              <span aria-hidden="true">📖</span>
              <span>Guide</span>
            </Link>

            {/* Link Duty Attendance (Desktop) */}
            <Link
              to="/duty-attendance"
              className="min-h-[40px] hidden md:inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-600"
              title="Menuju Presensi Tugas Piket Guru"
            >
              <span aria-hidden="true">🛡️</span>
              <span>Duty Attendance</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ================= TANGGAL & NAVIGASI WAKTU (TACTILE CONTROLLER) ================= */}
      <section className="bg-white border-b border-slate-200 py-4 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Banner Tanggal Besar & Nyaman Dibaca */}
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-[#1e3a8a] text-[11px] font-black uppercase tracking-wider">
                  Schedule & Announcements
                </span>
                {selectedDate === today && (
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[11px] font-black uppercase tracking-wider">
                    ● Hari Ini (Today)
                  </span>
                )}
              </div>
              <h2
                className={`${
                  largeText ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                } font-black text-slate-900 tracking-tight mt-1 transition-all`}
              >
                {formattedDateIndo}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                {formattedDateEng}
              </p>
            </div>

            {/* Tombol Pemilih Tanggal (Touch Target Minimal 44px) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              <div className="inline-flex items-center justify-between sm:justify-start bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleShiftDate(-1)}
                  className="flex-1 sm:flex-none min-h-[42px] px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 hover:bg-white hover:text-[#1e3a8a] rounded-xl transition-all flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-blue-600"
                  title="View yesterday's announcements"
                >
                  <span>◀</span>
                  <span>Kemarin</span>
                </button>

                <button
                  type="button"
                  onClick={handleSetToday}
                  className={`flex-1 sm:flex-none min-h-[42px] px-4 py-2 text-xs sm:text-sm font-black rounded-xl transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600 flex items-center justify-center ${
                    selectedDate === today
                      ? "bg-[#1e3a8a] text-white"
                      : "text-slate-800 hover:bg-white hover:text-[#1e3a8a]"
                  }`}
                  title="Kembali ke hari ini"
                >
                  Hari Ini
                </button>

                <button
                  type="button"
                  onClick={() => handleShiftDate(1)}
                  className="flex-1 sm:flex-none min-h-[42px] px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 hover:bg-white hover:text-[#1e3a8a] rounded-xl transition-all flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-blue-600"
                  title="View tomorrow's announcements"
                >
                  <span>Besok</span>
                  <span>▶</span>
                </button>
              </div>

              {/* Input Tanggal Manual */}
              <div className="relative flex items-center w-full sm:w-auto">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-auto min-h-[44px] bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 hover:border-slate-400 focus:border-[#1e3a8a] focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs transition-all cursor-pointer text-center sm:text-left"
                  title="Pilih tanggal tertentu dari kalender"
                  aria-label="Select announcement date"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= KONTEN UTAMA ================= */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-28 sm:pb-16">
        {/* --- SPECIAL ACTIVE EVENTS (JADWAL KHUSUS ATAU PENYESUAIAN KBM) --- */}
        {activeEvents.length > 0 && (
          <section aria-label="Jadwal Khusus Acara Sekolah" className="mb-8 space-y-4">
            {activeEvents.map((ev) => (
              <div
                key={ev.id_event}
                className="p-5 sm:p-6 rounded-3xl bg-amber-50/90 border-2 border-amber-300 shadow-sm relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 bg-amber-500 text-slate-950 rounded-2xl shadow-xs text-2xl flex-shrink-0"
                      aria-hidden="true"
                    >
                      ⭐
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-200 text-amber-950 border border-amber-400">
                          Agenda Khusus: {ev.target_scope}
                        </span>
                        {ev.affects_kbm && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                            ⚠️ Teaching Schedule Adjustments
                          </span>
                        )}
                      </div>
                      <h3
                        className={`${
                          largeText ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                        } font-black text-slate-900 mt-2 tracking-tight transition-all`}
                      >
                        {ev.event_name}
                      </h3>
                      <p
                        className={`${
                          largeText ? "text-base sm:text-lg font-semibold text-slate-800" : "text-sm sm:text-base text-slate-700 font-medium"
                        } mt-1.5 leading-relaxed transition-all`}
                      >
                        {ev.description}
                      </p>
                    </div>
                  </div>

                  {ev.time_slot && (
                    <div className="flex-shrink-0 md:text-right">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-amber-300 font-bold text-amber-950 text-sm shadow-2xs">
                        <span aria-hidden="true">🕒</span>
                        <span>{ev.time_slot}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* --- GRID UTAMA: PENGUMUMAN & ULANG TAHUN --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* KOLOM KIRI (7/12 atau 8/12): DAFTAR PENGUMUMAN */}
          <div className="lg:col-span-8">
            <section
              aria-label="Daftar Pengumuman Sekolah"
              className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200"
            >
              <SectionHeader
                title="Scheduled Announcements"
                colorBadge="blue"
                largeText={largeText}
                badgeCount={announcements.length}
                icon="📢"
              />

              <div className="space-y-5">
                {announcements.length > 0 ? (
                  announcements.map((item) => (
                    <article
                      key={item.id_announcement}
                      className={`p-5 sm:p-6 rounded-2xl transition-all border print-clean ${
                        item.is_pinned
                          ? "bg-amber-50/50 border-amber-300 shadow-xs"
                          : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {/* Baris Badge Info & Salin Teks */}
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.is_pinned && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-lg bg-amber-400 text-slate-950 border border-amber-500 uppercase tracking-wider shadow-2xs">
                              📌 PENTING
                            </span>
                          )}
                          <span className="text-xs font-bold px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 shadow-2xs">
                            📅{" "}
                            {item.end_date && item.end_date !== item.date
                              ? `${item.date} s/d ${item.end_date}`
                              : item.date}
                          </span>
                        </div>

                        {/* Tombol Salin Teks (Interaktif untuk Guru) */}
                        <button
                          type="button"
                          onClick={() => handleCopyText(item.id_announcement, item.announcement, item.date)}
                          className="min-h-[36px] px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 rounded-xl text-xs font-bold border border-slate-300 shadow-2xs transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600 no-print"
                          title="Copy announcement content to clipboard"
                        >
                          {copiedId === item.id_announcement ? (
                            <>
                              <span className="text-emerald-700">✓</span>
                              <span className="text-emerald-700 font-extrabold">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <span>📋</span>
                              <span>Salin Info</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Teks Pengumuman dengan Tipografi Kontras Tinggi */}
                      <div
                        className={`text-slate-900 leading-relaxed whitespace-pre-line w-full break-words transition-all ${
                          largeText
                            ? "text-lg sm:text-xl font-semibold leading-8"
                            : "text-base sm:text-lg font-medium leading-7"
                        }`}
                      >
                        {item.announcement}
                      </div>

                      {/* Baris Tombol Lampiran (Gambar & Tautan) */}
                      {(item.url_image || item.url_announcemet) && (
                        <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-wrap items-center gap-3 no-print">
                          {/* Tombol Lihat Gambar */}
                          {item.url_image && (
                            <button
                              type="button"
                              onClick={() => {
                                const origin = new URL(import.meta.env.VITE_API_BASE_URL).origin;
                                setSelectedImage(`${origin}${item.url_image}`);
                              }}
                              className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 font-bold text-sm text-[#1e3a8a] bg-blue-50 border border-blue-200 hover:bg-[#1e3a8a] hover:text-white rounded-xl shadow-2xs transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
                            >
                              <span aria-hidden="true">🖼️</span>
                              <span>Lihat Gambar Lampiran</span>
                            </button>
                          )}

                          {/* Tombol Buka Tautan Eksternal */}
                          {item.url_announcemet && (
                            <a
                              href={item.url_announcemet}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 font-bold text-sm text-indigo-900 bg-indigo-50 border border-indigo-200 hover:bg-indigo-900 hover:text-white rounded-xl shadow-2xs transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
                            >
                              <span aria-hidden="true">🔗</span>
                              <span>Buka Tautan Terkait</span>
                            </a>
                          )}
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <EmptyState
                    icon="📅"
                    title="No Announcements Scheduled"
                    message="There are no announcements scheduled for the selected date."
                    largeText={largeText}
                  />
                )}
              </div>
            </section>
          </div>

          {/* KOLOM KANAN (4/12 atau 5/12): ULANG TAHUN & INFO CEPAT */}
          <div className="lg:col-span-4 space-y-6">
            {/* Kartu Ulang Tahun Rekan Guru */}
            <section
              aria-label="Ulang Tahun Guru Hari Ini"
              className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200"
            >
              <SectionHeader
                title="Celebrations"
                colorBadge="rose"
                largeText={largeText}
                badgeCount={birthdays.length}
                icon="🎂"
              />

              <div className="space-y-3.5">
                {birthdays.length > 0 ? (
                  birthdays.map((item) => (
                    <div
                      key={item.id_birthday}
                      className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className="h-12 w-12 rounded-2xl bg-white border border-rose-200 flex items-center justify-center text-2xl shadow-2xs flex-shrink-0"
                          aria-hidden="true"
                        >
                          🎁
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4
                            className={`${
                              largeText ? "text-lg sm:text-xl" : "text-base"
                            } font-extrabold text-slate-900 tracking-tight truncate`}
                          >
                            {item.gender?.toLowerCase() === "male" ? "Mr. " : "Ms. "}
                            {item.name}
                          </h4>
                          <p className="text-xs font-bold text-rose-800 uppercase tracking-wide mt-0.5">
                            Today's Birthdays! 🎉
                          </p>
                        </div>
                      </div>

                      {/* Tombol Interaktif Kirim Ucapan */}
                      <button
                        type="button"
                        onClick={() => handleWishBirthday(item)}
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-rose-100 text-rose-900 font-bold text-xs border border-rose-300 shadow-2xs transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        {birthdayWishCopied === item.id_birthday ? (
                          <>
                            <span>✓</span>
                            <span>Teks Ucapan Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <span>💌</span>
                            <span>Salin Ucapan Selamat</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon="🎂"
                    title="No Birthdays Today"
                    message="No teachers celebrate their birthday on this date."
                    largeText={largeText}
                  />
                )}
              </div>
            </section>

            {/* Quick Links & Info Bantuan untuk Guru & Staf */}
            <section
              aria-label="Tautan Bantuan Guru"
              className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 space-y-3.5 no-print"
            >
              <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <span>💡</span> Bantuan & Akses Cepat
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Have questions regarding teacher duty schedules, teaching materials, or portal access?
              </p>
              <div className="space-y-2 pt-1">
                <Link
                  to="/duty"
                  className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-slate-800 hover:text-[#1e3a8a] text-xs font-bold transition-all shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <span>🛡️</span> Presensi Duty Guru
                  </span>
                  <span>➔</span>
                </Link>

                <Link
                  to="/tutorial"
                  className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-slate-800 hover:text-[#1e3a8a] text-xs font-bold transition-all shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <span>📖</span> Complete Guide & Tutorial
                  </span>
                  <span>➔</span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Floating AI Chat Assistant Widget */}
      <ChatAssistant />
    </div>
  );
}

// --- Helper Empty State Component ---
const EmptyState = ({ icon, title, message, largeText }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200">
    <span
      className={`${largeText ? "text-5xl" : "text-4xl"} mb-2 opacity-60`}
      aria-hidden="true"
    >
      {icon}
    </span>
    {title && (
      <h4
        className={`${
          largeText ? "text-lg font-bold" : "text-base font-bold"
        } text-slate-800 mb-1`}
      >
        {title}
      </h4>
    )}
    <p
      className={`${
        largeText ? "text-base text-slate-600" : "text-sm text-slate-500"
      } font-medium max-w-sm`}
    >
      {message}
    </p>
  </div>
);

export default Announcements;
