import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

export default function DutyAttendance() {
  const navigate = useNavigate();
  const { locationParam } = useParams();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms state keyed by session_key
  const [forms, setForms] = useState({});
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  useEffect(() => {
    // Realtime clock
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      const [resSess, resTeach] = await Promise.all([
        fetch(`/api/duty-attendance/sessions?tanggal=${todayStr}`),
        fetch(`/api/teachers`),
      ]);
      if (resSess.ok) {
        const data = await resSess.json();
        setSessions(data);
      }
      if (resTeach.ok) {
        const data = await resTeach.json();
        const names = Array.from(new Set(data.map((t) => t.teacher_name))).sort();
        setAllTeachers(names);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const showToast = (msg, type = "success") => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const setSessionFormField = (sessionKey, field, value) => {
    setForms((prev) => ({
      ...prev,
      [sessionKey]: {
        ...(prev[sessionKey] || { teacherName: "", password: "", notes: "", isSubmitting: false }),
        [field]: value,
      },
    }));
  };

  const handleCheckIn = async (session) => {
    const form = forms[session.session_key] || {};
    if (!form.teacherName) {
      showToast("Pilih nama guru terlebih dahulu!", "error");
      return;
    }
    if (form.password !== "citahati") {
      showToast("Password salah!", "error");
      return;
    }

    setSessionFormField(session.session_key, "isSubmitting", true);
    try {
      const res = await fetch("/api/duty-attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_name: form.teacherName,
          location: session.location,
          time_slot: session.time_slot,
          passcode: form.password,
          notes: form.notes || "",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Absen berhasil dikonfirmasi!", "success");
        // Reset form
        setSessionFormField(session.session_key, "teacherName", "");
        setSessionFormField(session.session_key, "password", "");
        setSessionFormField(session.session_key, "notes", "");
        fetchData();
      } else {
        showToast(data.detail || "Gagal absen", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan jaringan", "error");
    }
    setSessionFormField(session.session_key, "isSubmitting", false);
  };

  const parseTime = (timeStr) => {
    try {
      const [h, m] = timeStr.replace(":", ".").split(".");
      return { h: parseInt(h, 10), m: parseInt(m, 10) };
    } catch {
      return null;
    }
  };

  const isOutsideDuty = (timeSlot, now) => {
    const parts = timeSlot.replace(" ", "").replace("–", "-").split("-");
    if (parts.length === 2) {
      const startT = parseTime(parts[0]);
      const endT = parseTime(parts[1]);
      if (startT && endT) {
        const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startT.h, startT.m, 0);
        const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endT.h, endT.m, 0);
        return now < startTime || now > endTime;
      }
    }
    return false;
  };

  // If no location in URL, show buttons for all available locations today
  if (!locationParam) {
    const uniqueLocations = Array.from(new Set(sessions.map(s => s.location)));
    
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-[#1e3a8a] tracking-tight">
                Absensi Duty
              </h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
                {currentDate.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                {currentDate.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col items-center justify-center">
          {loading ? (
            <div className="text-slate-500 font-bold animate-pulse">Memuat lokasi...</div>
          ) : uniqueLocations.length === 0 ? (
            <div className="text-slate-500">Tidak ada jadwal duty hari ini.</div>
          ) : (
            <div className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-center text-lg font-black text-slate-700 mb-6 uppercase tracking-wider">
                Pilih Lokasi Duty Anda
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {uniqueLocations.map((loc, idx) => {
                  const urlSafeLoc = encodeURIComponent(loc);
                  return (
                    <Link
                      key={idx}
                      to={`/duty/${urlSafeLoc}`}
                      className="bg-slate-50 hover:bg-[#1e3a8a] text-slate-700 hover:text-white border border-slate-200 hover:border-[#1e3a8a] transition-all duration-200 font-bold py-4 px-4 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">📍</span>
                      <span className="text-sm">{loc}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Filter sessions by the URL param
  const decodedLocation = decodeURIComponent(locationParam);
  const locationSessions = sessions.filter(s => s.location.toLowerCase() === decodedLocation.toLowerCase());
  
  // Hanya tampilkan sesi yang SEDANG BERLANGSUNG saat ini!
  const activeSessions = locationSessions.filter(s => !isOutsideDuty(s.time_slot, currentDate));

  return (
    <div className="min-h-screen bg-slate-100 pb-20 font-sans">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 animate-bounce ${
            toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? "✅" : "⚠️"} {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => navigate("/duty")} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <h1 className="text-xl font-black text-[#1e3a8a] tracking-tight">
                Absensi Duty: {decodedLocation}
              </h1>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-11">
              {currentDate.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center justify-end">
            <div className="text-xl font-mono font-bold text-slate-700 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
              {currentDate.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 mt-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1e3a8a] border-t-transparent"></div>
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="text-lg font-bold text-slate-700">Tidak ada jadwal</h3>
            <p className="text-slate-500 text-sm mt-1">Tidak ditemukan jadwal duty untuk lokasi ini pada hari ini.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeSessions.map((session, sIdx) => {
              const currentForm = forms[session.session_key] || {
                teacherName: "",
                password: "",
                notes: "",
                isSubmitting: false,
              };
              
              

              return (
                <div
                  key={sIdx}
                  className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden"
                >
                  {/* Card Header (Dark Blue) */}
                  <div className="bg-[#1b2744] p-6 text-white relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute -right-10 -top-10 opacity-10">
                      <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                    </div>

                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <div className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-[10px] font-black uppercase tracking-widest text-amber-300 mb-3">
                          {session.duty_category}
                        </div>
                        <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
                          <span>📍</span> {session.location}
                        </h2>
                        <div className="flex items-center gap-4 text-sm font-semibold text-slate-300">
                          <span className="flex items-center gap-1.5">
                            🕒 {session.time_slot}
                          </span>
                          <span className="flex items-center gap-1.5">
                            👥 {session.grade_scope}
                          </span>
                        </div>
                      </div>

                      
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-6">
                    {/* SECTION: GURU TERJADWAL */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          👥 Guru Terjadwal Duty ({session.total_scheduled})
                        </span>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {session.total_attended} / {session.total_scheduled} Hadir
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {session.scheduled_teachers.map((st, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-2xl border ${
                              st.is_attended
                                ? "bg-blue-50/50 border-blue-200"
                                : "bg-white border-slate-200"
                            } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-4 h-4 mt-0.5 rounded-full shadow-inner flex-shrink-0 ${
                                  st.is_attended ? "bg-blue-500" : "bg-slate-200"
                                }`}
                              ></div>
                              <div>
                                <div className="font-bold text-slate-800 text-sm">
                                  {st.teacher_name}
                                </div>
                                {st.task && (
                                  <div className="text-[11px] font-medium text-slate-500 leading-tight mt-0.5 max-w-md">
                                    {st.task}
                                  </div>
                                )}
                              </div>
                            </div>
                            {st.is_attended ? (
                              <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-100 px-3 py-1 rounded-lg self-start sm:self-center">
                                Sudah Duty
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SECTION: FORM ABSENSI */}
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        ✍️ Form Absensi Kehadiran
                      </span>
                      
                      {/* Form Absensi - Pasti ditampilkan karena sudah difilter */}
                      (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                          <div className="space-y-3">
                            {/* Input Nama */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                Nama Guru yang Absen *
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {/* Pilihan cepat */}
                                <select
                                  onChange={(e) =>
                                    setSessionFormField(session.session_key, "teacherName", e.target.value)
                                  }
                                  className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-700 px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">-- Pilih Guru Terjadwal --</option>
                                  {session.scheduled_teachers.map((st, sIdx) => (
                                    <option key={sIdx} value={st.teacher_name}>
                                      {st.teacher_name} {st.is_attended ? "(Sudah Absen)" : ""}
                                    </option>
                                  ))}
                                </select>

                                {/* Dropdown Inval */}
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setSessionFormField(session.session_key, "teacherName", e.target.value);
                                    }
                                  }}
                                  className="w-full bg-white border border-slate-200 text-xs font-medium text-slate-600 px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
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
                                    setSessionFormField(session.session_key, "password", e.target.value)
                                  }
                                  placeholder="Ketik 'citahati'"
                                  className="w-full bg-white border border-slate-200 font-mono text-xs font-bold text-slate-800 px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
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
                                    setSessionFormField(session.session_key, "notes", e.target.value)
                                  }
                                  placeholder="Misal: Inval / aman"
                                  className="w-full bg-white border border-slate-200 text-xs font-medium text-slate-700 px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={currentForm.isSubmitting}
                              onClick={() => handleCheckIn(session)}
                              className="w-full mt-2 bg-[#1e3a8a] hover:bg-blue-800 text-white text-xs font-bold py-3 rounded-xl shadow-md transition-all active:scale-[0.99] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <span>✅</span>
                              <span>
                                {currentForm.isSubmitting
                                  ? "Memproses Absensi..."
                                  : `Konfirmasi Hadir ${
                                      currentForm.teacherName ? `(${currentForm.teacherName})` : ""
                                    }`}
                              </span>
                            </button>
                          </div>
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
                                    : "🔄 Bukan Jadwal Duty"}
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
