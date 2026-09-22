import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

export default function DutyAttendance() {
  const getTodayDateString = () => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [selectedLocation, setSelectedLocation] = useState("");
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  const [locations, setLocations] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form submission state per session key: { [sessionKey]: { teacherName, password, notes, isSubmitting } }
  const [formStates, setFormStates] = useState({});
  const [notification, setNotification] = useState(null); // { type: "success" | "error", message: string }
  const [isSeedingDummy, setIsSeedingDummy] = useState(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // Realtime clock (WIB / Local)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch unique locations taken directly from duty master
  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/duty-attendance/locations`);
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (e) {
      console.error("Gagal mengambil daftar lokasi duty:", e);
    }
  }, [baseUrl]);

  // Fetch all teachers for substitute / manual dropdown
  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/duty-attendance/teachers`);
      if (res.ok) {
        const data = await res.json();
        setAllTeachers(data);
      }
    } catch (e) {
      console.error("Gagal mengambil daftar guru:", e);
    }
  }, [baseUrl]);

  // Fetch sessions for the selected date & location
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `${baseUrl}/duty-attendance/sessions?tanggal=${selectedDate}`;
      if (selectedLocation) {
        url += `&location=${encodeURIComponent(selectedLocation)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      } else {
        setSessions([]);
      }
    } catch (e) {
      console.error("Gagal mengambil sesi duty:", e);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, selectedDate, selectedLocation]);

  useEffect(() => {
    fetchLocations();
    fetchTeachers();
  }, [fetchLocations, fetchTeachers]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Initialize or update form state for a session
  const setSessionFormField = (sessionKey, field, value) => {
    setFormStates((prev) => ({
      ...prev,
      [sessionKey]: {
        teacherName: "",
        password: "citahati",
        notes: "",
        isSubmitting: false,
        ...(prev[sessionKey] || {}),
        [field]: value,
      },
    }));
  };

  const getSessionForm = (sessionKey) => {
    return (
      formStates[sessionKey] || {
        teacherName: "",
        password: "citahati",
        notes: "",
        isSubmitting: false,
      }
    );
  };

  // Submit check-in
  const handleCheckIn = async (session) => {
    const form = getSessionForm(session.session_key);
    if (!form.teacherName) {
      showNotice("error", "Pilih atau isi nama guru yang akan absen!");
      return;
    }
    if (!form.password) {
      showNotice("error", "Masukkan password absensi 'citahati'!");
      return;
    }

    setSessionFormField(session.session_key, "isSubmitting", true);
    try {
      const payload = {
        date: selectedDate,
        location: session.location,
        time_slot: session.time_slot,
        duty_category: session.duty_category,
        teacher_name: form.teacherName,
        password: form.password,
        notes: form.notes || null,
      };

      const res = await fetch(`${baseUrl}/duty-attendance/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Gagal melakukan absensi duty.");
      }

      showNotice(
        "success",
        `Absensi berhasil tercatat! [${data.status_label}] untuk ${data.teacher_name}`
      );
      // Reset form field for this session
      setSessionFormField(session.session_key, "teacherName", "");
      setSessionFormField(session.session_key, "notes", "");
      // Refresh sessions
      fetchSessions();
    } catch (e) {
      showNotice("error", e.message);
    } finally {
      setSessionFormField(session.session_key, "isSubmitting", false);
    }
  };

  const showNotice = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Seed Dummy Data for Verification
  const handleSeedDummy = async () => {
    setIsSeedingDummy(true);
    try {
      const res = await fetch(`${baseUrl}/duty-attendance/seed-dummy`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal seed dummy");
      showNotice(
        "success",
        `1 Data Dummy Berhasil Dibuat! [${data.scheduled_teacher} (Sudah Duty)] & [${data.unscheduled_teacher} (Bukan Jadwal Duty)]`
      );
      setSelectedDate(data.date);
      fetchSessions();
    } catch (e) {
      showNotice("error", e.message);
    } finally {
      setIsSeedingDummy(false);
    }
  };

  // KPI Calculations across all sessions
  let kpiBelum = 0;
  let kpiLagi = 0;
  let kpiSudah = 0;
  let kpiTidak = 0;
  sessions.forEach((s) => {
    s.scheduled_teachers.forEach((t) => {
      if (t.status === "Sudah Duty") kpiSudah++;
      else if (t.status === "Lagi Duty") kpiLagi++;
      else if (t.status === "Tidak Duty") kpiTidak++;
      else kpiBelum++;
    });
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Notification Toast */}
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 border ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <span className="text-xl">
              {notification.type === "success" ? "✅" : "⚠️"}
            </span>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {notification.message}
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 font-bold text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
                alt="Logo Cita Hati"
                className="h-10 w-auto rounded-lg shadow-sm group-hover:scale-105 transition-transform"
              />
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-800 leading-tight">
                  Absensi Guru Piket
                </h1>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  Cita Hati East Surabaya
                </p>
              </div>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-colors md:hidden"
            >
              📢 Pengumuman
            </Link>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-black font-mono text-slate-700">
                {currentTimeStr}
              </span>
            </div>

            <Link
              to="/"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3.5 py-2 rounded-xl transition-colors"
            >
              📢 Halaman Pengumuman
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="bg-gradient-to-b from-[#1e3a8a] to-[#172554] text-white pt-8 pb-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-200 px-3 py-1 rounded-full border border-blue-400/30 mb-2">
                🛡️ Teacher on Duty Attendance System
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                Sistem Absensi Waktu Duty
              </h2>
              <p className="text-blue-100/80 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
                Pilih tempat tugas dan nama guru, lalu masukkan password tetap{" "}
                <span className="font-mono font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-md">
                  citahati
                </span>{" "}
                untuk konfirmasi kehadiran piket.
              </p>
            </div>

            {/* Test Dummy Action */}
            <div className="flex-shrink-0">
              <button
                onClick={handleSeedDummy}
                disabled={isSeedingDummy}
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs px-4 py-2.5 rounded-2xl shadow-lg shadow-amber-900/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <span>🧪</span>
                <span>
                  {isSeedingDummy ? "Memproses Dummy..." : "Uji Coba Data Dummy"}
                </span>
              </button>
            </div>
          </div>

          {/* FILTER BAR: TANGGAL & TEMPAT DUTY */}
          <div className="mt-8 bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-white/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-blue-200 mb-1.5">
                📅 Tanggal Duty
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-2xl outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-blue-200 mb-1.5">
                📍 Tempat Duty (Dari Daftar Duty)
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-white text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-2xl outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
              >
                <option value="">Semua Tempat Duty (All Locations)</option>
                {locations.map((loc, idx) => (
                  <option key={idx} value={loc}>
                    📍 {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-end">
              <div className="text-[11px] text-blue-200/90 font-medium">
                Hari:{" "}
                <span className="font-bold text-white uppercase tracking-wider">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "id-ID",
                    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
                  )}
                </span>
              </div>
              <p className="text-[10px] text-blue-300 mt-1">
                Password absensi:{" "}
                <strong className="text-amber-300 font-mono text-xs">citahati</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* KPI STATUS BAR (4 LINGKARAN WARNA) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-200/60 border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-2xl">⚪</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Belum Duty
              </p>
              <p className="text-lg font-black text-slate-700">{kpiBelum} Guru</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
            <span className="text-2xl animate-pulse">🟢</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                Lagi Duty
              </p>
              <p className="text-lg font-black text-emerald-800">{kpiLagi} Guru</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 border border-blue-100">
            <span className="text-2xl">🔵</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                Sudah Duty
              </p>
              <p className="text-lg font-black text-blue-800">{kpiSudah} Guru</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-orange-50 border border-orange-100">
            <span className="text-2xl">🟠</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                Tidak Duty
              </p>
              <p className="text-lg font-black text-orange-800">{kpiTidak} Guru</p>
            </div>
          </div>
        </div>
      </div>

      {/* SESSIONS LIST */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              Daftar Sesi Duty & Tampilan Code
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Menampilkan {sessions.length} sesi duty untuk tempat & waktu yang dipilih
            </p>
          </div>

          <button
            onClick={fetchSessions}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors"
          >
            🔄 Segarkan Data
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-600">
              Memuat data jadwal duty & status kehadiran...
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <div className="text-5xl mb-3 opacity-60">🛡️</div>
            <h4 className="text-base font-bold text-slate-800">
              Tidak Ada Jadwal Duty Ditemukan
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Tidak ada jadwal guru piket pada tanggal atau filter tempat yang dipilih.
              (Pastikan tanggal yang dipilih adalah hari sekolah Senin–Jumat, atau klik tombol Uji Coba Dummy di atas).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sessions.map((session) => {
              const currentForm = getSessionForm(session.session_key);

              return (
                <div
                  key={session.session_key}
                  className="bg-white rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-slate-200 overflow-hidden flex flex-col justify-between"
                >
                  {/* CARD HEADER: TEMPAT & WAKTU */}
                  <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/10 text-amber-300 border border-white/10 inline-block mb-2">
                          {session.duty_category || "Duty Session"}
                        </span>
                        <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                          <span>📍</span>
                          <span>{session.location}</span>
                        </h4>
                        <p className="text-xs text-slate-300 font-mono mt-0.5 flex items-center gap-1.5">
                          <span>🕒</span>
                          <span className="font-bold">{session.time_slot}</span>
                          {session.grade_scope && (
                            <span className="text-[10px] text-slate-400">
                              • {session.grade_scope}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* TAMPILAN CODE / PASSWORD CARD */}
                      <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/20 text-center flex-shrink-0">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-slate-300">
                          Password Absen
                        </span>
                        <span className="font-mono font-black text-sm text-amber-300 tracking-wider">
                          citahati
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText("citahati");
                            showNotice("success", "Password 'citahati' disalin!");
                          }}
                          className="mt-1 block text-[9px] font-bold text-blue-200 hover:text-white underline mx-auto"
                        >
                          Salin Kode
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CARD BODY */}
                  <div className="p-6 space-y-5 flex-1">
                    {/* SECTION: SIAPA SAJA YANG DUTY */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          👥 Guru Terjadwal Duty ({session.scheduled_teachers.length})
                        </span>
                        <span className="text-[11px] font-bold text-blue-600">
                          {session.total_attended} / {session.total_scheduled} Hadir
                        </span>
                      </div>

                      <div className="space-y-2">
                        {session.scheduled_teachers.map((t, tIdx) => (
                          <div
                            key={tIdx}
                            className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                              t.status === "Sudah Duty"
                                ? "bg-blue-50/70 border-blue-200 text-blue-900"
                                : t.status === "Lagi Duty"
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                                : t.status === "Tidak Duty"
                                ? "bg-orange-50/60 border-orange-200 text-orange-900"
                                : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-base flex-shrink-0">
                                {t.icon}
                              </span>
                              <div className="truncate">
                                <p className="text-xs font-bold truncate">
                                  {t.teacher_name}
                                </p>
                                {t.task && (
                                  <p className="text-[10px] text-slate-500 truncate">
                                    {t.task}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  t.status === "Sudah Duty"
                                    ? "bg-blue-100 text-blue-800 border-blue-300"
                                    : t.status === "Lagi Duty"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : t.status === "Tidak Duty"
                                    ? "bg-orange-100 text-orange-800 border-orange-300"
                                    : "bg-slate-200 text-slate-600 border-slate-300"
                                }`}
                              >
                                {t.status}
                              </span>

                              {/* Quick pick button */}
                              {!t.is_attended && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSessionFormField(
                                      session.session_key,
                                      "teacherName",
                                      t.teacher_name
                                    )
                                  }
                                  className="text-[10px] font-bold text-blue-600 bg-white hover:bg-blue-600 hover:text-white px-2 py-1 rounded-lg border border-blue-200 transition-colors"
                                >
                                  Pilih
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SECTION: FORM ABSENSI CEPAT */}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        ✍️ Form Absensi Kehadiran
                      </p>

                      <div className="space-y-2.5">
                        {/* Option Nama Guru */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">
                            Nama Guru yang Absen *
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Pilihan cepat dari guru terjadwal */}
                            <select
                              value={currentForm.teacherName}
                              onChange={(e) =>
                                setSessionFormField(
                                  session.session_key,
                                  "teacherName",
                                  e.target.value
                                )
                              }
                              className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Pilih Guru Terjadwal --</option>
                              {session.scheduled_teachers.map((st, sIdx) => (
                                <option key={sIdx} value={st.teacher_name}>
                                  {st.teacher_name} {st.is_attended ? "(Sudah Absen)" : ""}
                                </option>
                              ))}
                            </select>

                            {/* Dropdown guru lain jika inval / pengganti */}
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  setSessionFormField(
                                    session.session_key,
                                    "teacherName",
                                    e.target.value
                                  );
                                }
                              }}
                              className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600 px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Atau Pilih Guru Lain / Inval...</option>
                              {allTeachers.map((teach, idx) => (
                                <option key={idx} value={teach}>
                                  {teach}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Input Password & Catatan */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              Password Absensi *
                            </label>
                            <input
                              type="text"
                              value={currentForm.password}
                              onChange={(e) =>
                                setSessionFormField(
                                  session.session_key,
                                  "password",
                                  e.target.value
                                )
                              }
                              placeholder="Ketik 'citahati'"
                              className="w-full bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-slate-800 px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              Catatan (Opsional)
                            </label>
                            <input
                              type="text"
                              value={currentForm.notes}
                              onChange={(e) =>
                                setSessionFormField(
                                  session.session_key,
                                  "notes",
                                  e.target.value
                                )
                              }
                              placeholder="Misal: Inval / aman"
                              className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={currentForm.isSubmitting}
                          onClick={() => handleCheckIn(session)}
                          className="w-full mt-2 bg-[#1e3a8a] hover:bg-blue-800 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-[0.99] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <span>✅</span>
                          <span>
                            {currentForm.isSubmitting
                              ? "Memproses Absensi..."
                              : `Konfirmasi Hadir ${
                                  currentForm.teacherName
                                    ? `(${currentForm.teacherName})`
                                    : ""
                                }`}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* SECTION: RIWAYAT SUDAH ABSEN */}
                    {session.attended_list && session.attended_list.length > 0 && (
                      <div className="pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                          📋 Tercatat di Sistem ({session.attended_list.length})
                        </span>
                        <div className="space-y-1.5">
                          {session.attended_list.map((att) => (
                            <div
                              key={att.id_attendance}
                              className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl border border-slate-100"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    att.is_scheduled_duty
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {att.is_scheduled_duty
                                    ? "🛡️ Terjadwal Duty"
                                    : "⚠️ Bukan Jadwal Duty"}
                                </span>
                                <span className="font-bold text-slate-800">
                                  {att.teacher_name}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-slate-400">
                                {new Date(att.check_in_time).toLocaleTimeString(
                                  "id-ID",
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
