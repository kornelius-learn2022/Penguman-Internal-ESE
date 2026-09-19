import { useState, useEffect, useCallback } from "react";
import BannerLoading from "./BannerLoading";
import ChatAssistant from "../components/ChatAssistant";

// --- Sub-Components untuk Kerapihan ---
const SectionHeader = ({ title, icon, color }) => (
  <h3
    className={`text-lg font-bold mb-5 text-slate-800 flex items-center gap-2`}
  >
    <span className={`p-2 rounded-lg bg-${color}-50 text-${color}-600`}>
      {icon}
    </span>
    {title}
  </h3>
);

function Announcements() {
  const today = new Date().toISOString().split("T")[0];

  // State Management
  const [selectedDate, setSelectedDate] = useState(today);
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);

  // State untuk Image Modal
  const [selectedImage, setSelectedImage] = useState(null);

  // Anonymously track website visit once per session (Admin analytics only)
  useEffect(() => {
    try {
      const hasTracked = sessionStorage.getItem("visit_tracked");
      if (!hasTracked) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        fetch(`${baseUrl}/track-visit`, { method: "POST" })
          .then(() => sessionStorage.setItem("visit_tracked", "true"))
          .catch(() => {});
      }
    } catch (e) {
      // Ignore error for tracking
    }
  }, []);

  // --- API Functions (REAL DATA MODE) ---
  const fetchData = useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      const [announcementsResponse, birthdaysResponse, eventsResponse] =
        await Promise.all([
          fetch(`${baseUrl}/announcements?tanggal=${selectedDate}`),
          fetch(`${baseUrl}/birthdays`),
          fetch(`${baseUrl}/events/schedule?date=${selectedDate}`),
        ]);

      // Handle Data Announcements
      if (announcementsResponse.ok) {
        const annData = await announcementsResponse.json();
        setAnnouncements(annData);
      } else {
        console.error(
          `HTTP error Announcements! status: ${announcementsResponse.status}`,
        );
        setAnnouncements([]);
      }

      // Handle Data Birthdays (FILTER FRONTEND)
      if (birthdaysResponse.ok) {
        const birthData = await birthdaysResponse.json();

        // 1. Pecah tanggal yang dipilih (misal: "2026-08-15") menjadi [tahun, bulan, hari]
        const [, selectedMonth, selectedDay] = selectedDate.split("-");

        // 2. Filter data dari backend
        const filteredBirthdays = birthData.filter((item) => {
          const tanggalLahir = item.date;
          if (!tanggalLahir) return false;
          const [, itemMonth, itemDay] = tanggalLahir.split("T")[0].split("-");
          return itemMonth === selectedMonth && itemDay === selectedDay;
        });

        setBirthdays(filteredBirthdays);
      } else {
        console.error(
          `HTTP error Birthdays! status: ${birthdaysResponse.status}`,
        );
        setBirthdays([]);
      }

      // Handle Data Special Events Schedule
      if (eventsResponse.ok) {
        const evData = await eventsResponse.json();
        setActiveEvents(evData);
      } else {
        setActiveEvents([]);
      }
    } catch (error) {
      console.error("Gagal menghubungi server:", error);
      setAnnouncements([]);
      setBirthdays([]);
      setActiveEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) return <BannerLoading />;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-blue-100 transition-colors duration-500 relative">
      {/* ================= MODAL IMAGE ================= */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm transition-opacity"
          onClick={() => setSelectedImage(null)} // Tutup jika background diklik
        >
          <div
            className="relative max-w-4xl w-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()} // Hindari tutup saat gambar diklik
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 md:-right-12 bg-white text-slate-800 rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-slate-100 font-bold transition-colors"
            >
              ✕
            </button>
            <img
              src={selectedImage}
              alt="Announcement Detail"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-white"
            />
          </div>
        </div>
      )}
      {/* =============================================== */}

      {/* Mengaktifkan Banner jika komponen Banner sudah tersedia */}
      {/* <Banner /> */}

      {/* --- Modern Header --- */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <img
                src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
                alt="Logo"
                className="relative h-14 w-auto rounded-lg"
              />
            </div>
            <div className="h-10 w-[1px] bg-slate-200 hidden md:block" />
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">
                Community Hubb
              </h1>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mt-1">
                Cita Hati Information
              </p>
            </div>
          </div>

          <div className="relative group">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Daily{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Updates
            </span>
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>


        {/* --- Special Active Events Banner --- */}
        {activeEvents.length > 0 && (
          <div className="mb-8 space-y-4">
            {activeEvents.map((ev) => (
              <div
                key={ev.id_event}
                className="p-6 rounded-[2rem] bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-200 shadow-lg shadow-amber-500/5 relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-500 text-white rounded-2xl text-xl shadow-md shadow-amber-500/20 flex-shrink-0">
                      ⭐
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                          Special Event: {ev.target_scope}
                        </span>
                        {ev.affects_kbm && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                            Penyesuaian Jam KBM
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mt-1.5 tracking-tight">
                        {ev.event_name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed font-medium">
                        {ev.description}
                      </p>
                    </div>
                  </div>
                  {ev.time_slot && (
                    <div className="flex-shrink-0 md:text-right">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-amber-200 text-xs font-bold text-amber-900 shadow-sm">
                        🕒 {ev.time_slot}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* --- Events Section --- */}
          <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 hover:scale-[1.01] transition-transform duration-300">
            <SectionHeader
              title="Scheduled Events"
              color="blue"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
            />

            <div className="space-y-4">
              {announcements.length > 0 ? (
                announcements.map((item) => (
                  <div
                    key={item.id_announcement}
                    className="group p-5 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 flex flex-col items-start"
                  >
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-600 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors uppercase tracking-wider">
                      {item.end_date && item.end_date !== item.date
                        ? `📅 ${item.date} s/d ${item.end_date}`
                        : item.date}
                    </span>
                    <p className="mt-3 text-slate-700 font-semibold leading-relaxed whitespace-pre-line w-full break-words">
                      {item.announcement}
                    </p>

                    {/* Wrapper untuk Tombol Image dan URL agar berjejer rapi */}
                    {(item.url_image || item.url_announcemet) && (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {/* Tombol Show Image */}
                        {item.url_image && (
                          <button
                            onClick={() =>
                              setSelectedImage(
                                `${new URL(import.meta.env.VITE_API_BASE_URL).origin}${item.url_image}`,
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-blue-600 bg-white border border-blue-200 shadow-sm hover:bg-blue-600 hover:text-white rounded-lg transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              ></path>
                            </svg>
                            Show Image
                          </button>
                        )}

                        {/* Tombol Link URL Aktif */}
                        {item.url_announcemet && (
                          <a
                            href={item.url_announcemet}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 shadow-sm hover:bg-indigo-600 hover:text-white rounded-lg transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                              ></path>
                            </svg>
                            Buka Tautan
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState icon="📅" message="No events scheduled" />
              )}
            </div>
          </section>

          {/* --- Birthdays Section --- */}
          <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 hover:scale-[1.01] transition-transform duration-300">
            <SectionHeader
              title="Celebrations"
              color="rose"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
                  />
                </svg>
              }
            />

            <div className="space-y-4">
              {birthdays.length > 0 ? (
                birthdays.map((item) => (
                  <div
                    key={item.id_birthday}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-rose-100 hover:bg-rose-50 transition-all"
                  >
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-xl shadow-sm">
                      🎁
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">
                        {item.gender?.toLowerCase() === "male"
                          ? "Mr. "
                          : "Ms. "}
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-rose-500 font-bold uppercase tracking-tighter">
                        Birthday Today
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon="🎂" message="No birthdays today" />
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Floating AI Chat Assistant Widget */}
      <ChatAssistant />
    </div>
  );
}

// --- Helper Components ---
const EmptyState = ({ icon, message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
    <span className="text-4xl mb-3 opacity-50 grayscale">{icon}</span>
    <p className="text-sm font-medium italic">{message}</p>
  </div>
);

export default Announcements;
