import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

export default function DutyAttendance() {
  const navigate = useNavigate();
  const { locationParam } = useParams();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Forms state keyed by session_key
  const [forms, setForms] = useState({});
  const [showPasswords, setShowPasswords] = useState({});
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const todayDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const [submittedSessions, setSubmittedSessions] = useState(() => {
    const initial = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("duty_attended_") && key.endsWith(`_${todayDateStr}`)) {
          const sessKey = key.replace("duty_attended_", "").replace(`_${todayDateStr}`, "");
          initial[sessKey] = localStorage.getItem(key);
        }
      }
    } catch (e) {}
    return initial;
  });

  useEffect(() => {
    // Real-time clock update
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [freeTeachersBySlot, setFreeTeachersBySlot] = useState({});
  const inFlightSlotsRef = useRef(new Set());

  const fetchFreeTeachers = async (timeSlot) => {
    if (!timeSlot || freeTeachersBySlot[timeSlot] || inFlightSlotsRef.current.has(timeSlot)) return;
    inFlightSlotsRef.current.add(timeSlot);
    try {
      const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      const res = await fetch(`/api/duty-attendance/free-teachers?date=${todayStr}&time_slot=${encodeURIComponent(timeSlot)}`);
      if (res.ok) {
        const data = await res.json();
        setFreeTeachersBySlot((prev) => ({ ...prev, [timeSlot]: data }));
      }
    } catch (err) {
      console.error("Failed to load free teachers:", err);
    } finally {
      inFlightSlotsRef.current.delete(timeSlot);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      const [resSess, resTeach] = await Promise.all([
        fetch(`/api/duty-attendance/sessions?tanggal=${todayStr}`),
        fetch(`/api/duty-attendance/teachers`),
      ]);
      if (resSess.ok) {
        const data = await resSess.json();
        setSessions(data);
      } else {
        setFetchError(true);
      }
      if (resTeach.ok) {
        const data = await resTeach.json();
        const names = Array.from(new Set(data.map((t) => (typeof t === "string" ? t : t.db_name || t.teacher_name)))).filter(Boolean).sort();
        setAllTeachers(names);
      }
    } catch (err) {
      console.error(err);
      setFetchError(true);
    }
    setLoading(false);
  };

  const showToast = (msg, type = "success") => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  const setSessionFormField = (sessionKey, field, value) => {
    setForms((prev) => ({
      ...prev,
      [sessionKey]: {
        ...(prev[sessionKey] || { teacherName: "", password: "", isSubmitting: false }),
        [field]: value,
      },
    }));
  };

  const handleCheckIn = async (session) => {
    const form = forms[session.session_key] || {};
    if (!form.teacherName) {
      showToast("Please select your teacher name from the list first!", "error");
      return;
    }
    
    const subClean = form.substituteName && form.substituteName.trim().toLowerCase() !== form.teacherName.trim().toLowerCase()
      ? form.substituteName.trim()
      : null;

    setSessionFormField(session.session_key, "isSubmitting", true);
    try {
      const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      const res = await fetch("/api/duty-attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayStr,
          teacher_name: form.teacherName,
          location: session.location,
          time_slot: session.time_slot,
          password: form.password.trim(),
          substitute_name: subClean,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const displayName = subClean
          ? `${subClean} (covering for ${form.teacherName})`
          : form.teacherName;
        showToast(`Great! Attendance for ${displayName} has been successfully recorded in the system.`, "success");
        setSubmittedSessions(prev => ({ ...prev, [session.session_key]: displayName }));
        try {
          localStorage.setItem(`duty_attended_${session.session_key}_${todayStr}`, displayName);
        } catch (e) {}

        setSessionFormField(session.session_key, "teacherName", "");
        setSessionFormField(session.session_key, "substituteName", "");
        setSessionFormField(session.session_key, "password", "");
        fetchData();
      } else {
        showToast(data.detail || "Failed to record attendance. Please try again.", "error");
      }
    } catch (err) {
      showToast("Network error occurred. Please check your connection and try again.", "error");
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
    try {
      const clean = (timeSlot || "").replace(/\s+/g, "").replace("–", "-");
      const parts = clean.split("-");
      if (parts.length === 2) {
        const startT = parseTime(parts[0]);
        const endT = parseTime(parts[1]);
        if (startT && endT && !isNaN(startT.h) && !isNaN(startT.m) && !isNaN(endT.h) && !isNaN(endT.m)) {
          // Strict on-time: duty attendance is only open strictly within the scheduled time slot
          const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startT.h, startT.m, 0);
          const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endT.h, endT.m, 59);
          return now < startTime || now > endTime;
        }
      }
    } catch (e) {
      console.error("Error in isOutsideDuty:", e);
    }
    return false;
  };

  // If no location in URL, show buttons for all available locations today
  if (!locationParam) {
    const uniqueLocations = Array.from(new Set(sessions.map((s) => s.location)));

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
                alt="Cita Hati Logo"
                className="h-10 w-auto object-contain flex-shrink-0"
              />
              <div>
                <h1 className="text-lg font-black text-[#1e3a8a] tracking-tight">
                  Duty Attendance
                </h1>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                  {currentDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/tutorial"
                className="px-3 py-1.5 bg-blue-50 text-[#1e3a8a] hover:bg-blue-100 rounded-xl text-xs font-bold transition-all border border-blue-200"
              >
                📖 Teacher Guide
              </Link>
              <Link
                to="/"
                className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                📢 Announcements
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col items-center justify-center">
          {loading ? (
            <div className="text-slate-500 font-bold animate-pulse">Loading locations...</div>
          ) : uniqueLocations.length === 0 ? (
            <div className="text-slate-500 font-medium">No duty schedules found for today.</div>
          ) : (
            <div className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-center text-lg font-black text-slate-700 mb-6 uppercase tracking-wider">
                Select Your Duty Location
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

  // Filter sessions by URL param (supports both exact location and duty category like "Morning Duty")
  const decodedLocation = decodeURIComponent(locationParam || "");
  const locationSessions = sessions.filter((s) => {
    const loc = (s.location || "").toLowerCase().trim();
    const cat = (s.duty_category || "").toLowerCase().trim();
    const target = decodedLocation.toLowerCase().trim();
    return loc === target || cat === target || loc.includes(target) || target.includes(loc);
  });

  // Filter only sessions that are currently active (strictly within scheduled time window)
  const activeSessions = locationSessions.filter((s) => !isOutsideDuty(s.time_slot, currentDate));

  return (
    <div className="min-h-screen bg-slate-100 pb-20 font-sans">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2 animate-bounce ${
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? "✅" : "⚠️"} {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
              alt="Cita Hati Logo"
              className="h-10 w-auto object-contain flex-shrink-0"
            />
            <div>
              <h1 className="text-lg font-black text-[#1e3a8a] tracking-tight">
                Duty Attendance: {decodedLocation}
              </h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                {currentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/tutorial"
              className="px-3 py-1.5 bg-blue-50 text-[#1e3a8a] hover:bg-blue-100 rounded-xl text-xs font-bold transition-all border border-blue-200"
            >
              📖 Teacher Guide
            </Link>
            <Link
              to="/"
              className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
            >
              📢 Announcements
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 mt-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1e3a8a] border-t-transparent"></div>
          </div>
        ) : fetchError ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-red-200 shadow-sm p-6 space-y-3">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-lg font-bold text-slate-800">Gagal Memuat Jadwal Duty</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Koneksi ke server sempat terputus atau server sedang sibuk. Silakan coba muat ulang.
            </p>
            <button
              type="button"
              onClick={fetchData}
              className="bg-[#1e3a8a] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-800 shadow-md transition-all active:scale-95"
            >
              🔄 Coba Muat Ulang
            </button>
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="text-4xl">🕒</div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Sesi Duty Belum / Sudah Tidak Aktif</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                Form presensi duty hanya dapat diakses tepat waktu (on-time) selama jam duty berlangsung demi kedisiplinan pengawasan siswa.
              </p>
            </div>
            {locationSessions.length > 0 && (
              <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Jadwal Duty di Lokasi Ini Hari Ini:
                </div>
                <div className="space-y-2">
                  {locationSessions.map((ls, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700">{ls.time_slot} ({ls.duty_category})</span>
                      <span className="text-slate-500 font-medium">
                        {(ls.scheduled_teachers || []).map(t => t.teacher_name).join(", ") || "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {activeSessions.length > 1 && (
              <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm space-y-2.5">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="text-base">🔔</span>
                  <span>
                    Terdapat <strong>{activeSessions.length} sesi duty</strong> yang aktif bersamaan di lokasi ini. Silakan pilih sesi Anda:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeSessions.map((s, idx) => (
                    <a
                      key={idx}
                      href={`#session-${s.session_key}`}
                      className="px-3.5 py-2 bg-blue-50 hover:bg-[#1e3a8a] text-[#1e3a8a] hover:text-white rounded-xl text-xs font-extrabold border border-blue-200 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <span>👉</span>
                      <span>{s.duty_category} ({s.time_slot})</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {activeSessions.map((session, sIdx) => {
              const currentForm = forms[session.session_key] || {
                teacherName: "",
                password: "",
                isSubmitting: false,
              };

              return (
                <div
                  key={sIdx}
                  id={`session-${session.session_key}`}
                  className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden scroll-mt-20"
                >
                  {/* Card Header (Dark Blue) */}
                  <div className="bg-[#1b2744] p-6 text-white relative overflow-hidden">
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
                          <span className="flex items-center gap-1.5">🕒 {session.time_slot}</span>
                          <span className="flex items-center gap-1.5">👥 {session.grade_scope}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-5">
                    {(() => {
                      const isDevotion =
                        (session.location || "").toLowerCase().includes("devotion") ||
                        (session.duty_category || "").toLowerCase().includes("devotion") ||
                        (decodedLocation || "").toLowerCase().includes("devotion");

                      const availableScheduled = (session.scheduled_teachers || []).filter(st => !st.is_attended);
                      const mySubmittedTeacher = submittedSessions[session.session_key];

                      const isAlreadyAttended = isDevotion
                        ? Boolean(mySubmittedTeacher) || (availableScheduled.length === 0 && (session.scheduled_teachers || []).length > 0)
                        : (
                            Boolean(submittedSessions[session.session_key]) ||
                            (session.attended_list && session.attended_list.length > 0 && (
                              (session.scheduled_teachers && session.scheduled_teachers.length > 0 && session.scheduled_teachers.every(t => t.is_attended)) ||
                              (session.attended_list.length >= (session.total_scheduled || 1))
                            ))
                          );

                      return (
                        <>
                          {/* Success Banner & Attended Section */}
                          {isDevotion ? (
                            <div className="space-y-3">
                              {mySubmittedTeacher && (
                                <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl shadow-sm flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <img
                                      src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
                                      alt="Cita Hati Logo"
                                      className="h-10 w-auto object-contain flex-shrink-0"
                                    />
                                    <div className="text-sm font-bold text-emerald-950">
                                      <span className="font-extrabold text-[#1e3a8a] text-base">{mySubmittedTeacher}</span> has been recorded in the system
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSubmittedSessions((prev) => {
                                        const next = { ...prev };
                                        delete next[session.session_key];
                                        return next;
                                      });
                                      try {
                                        localStorage.removeItem(`duty_attended_${session.session_key}_${todayDateStr}`);
                                      } catch (e) {}
                                    }}
                                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline flex-shrink-0"
                                  >
                                    Check in another
                                  </button>
                                </div>
                              )}

                              {session.attended_list && session.attended_list.length > 0 && (
                                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-sm space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                                      <span>✅</span>
                                      <span>
                                        Sudah Hadir Devotion ({session.attended_list.length} / {session.total_scheduled || (session.scheduled_teachers || []).length}):
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full">
                                      {session.attended_list.length} Guru Hadir
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                    {session.attended_list.map((att) => (
                                      <span
                                        key={att.id_attendance}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-slate-800 shadow-2xs"
                                        title={`Presensi pukul ${att.check_in_time ? (typeof att.check_in_time === 'string' ? att.check_in_time.slice(11, 16) || att.check_in_time : '') : ''}`}
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                                        <span className="font-bold text-slate-900">{att.teacher_name}</span>
                                        {att.substitute_name && att.substitute_name.trim().toLowerCase() !== att.teacher_name.trim().toLowerCase() && (
                                          <span className="text-[10px] text-blue-600 font-semibold">(Inval: {att.substitute_name})</span>
                                        )}
                                        {att.check_in_time && (
                                          <span className="text-[10px] text-slate-400">
                                            {typeof att.check_in_time === 'string' ? (att.check_in_time.slice(11, 16) || att.check_in_time.slice(0, 5)) : ''}
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {availableScheduled.length === 0 && (session.scheduled_teachers || []).length > 0 && !mySubmittedTeacher && (
                                <div className="p-4 bg-blue-50/90 border border-blue-200 rounded-2xl text-center text-sm font-bold text-[#1e3a8a]">
                                  All scheduled teachers for Morning Devotion have completed attendance.
                                </div>
                              )}
                            </div>
                          ) : (
                            session.attended_list && session.attended_list.length > 0 && (
                              <div className="space-y-3">
                                {session.attended_list.map((att) => (
                                  <div
                                    key={att.id_attendance}
                                    className="flex items-center gap-3 p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl shadow-sm"
                                  >
                                    <img
                                      src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
                                      alt="Cita Hati Logo"
                                      className="h-10 w-auto object-contain flex-shrink-0"
                                    />
                                    <div className="text-sm font-bold text-emerald-950">
                                      <span className="font-extrabold text-[#1e3a8a] text-base">{att.teacher_name}</span> has been recorded in the system
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          )}

                          {/* JIKA BELUM SELESAI ABSEN: Tampilkan Form */}
                          {!isAlreadyAttended && (
                            <div>
                              <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                                ✍️ {isDevotion ? "Morning Devotion Check-In Form" : "Duty Check-In Form"}
                              </span>

                              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                                {/* Friendly Guidance Box */}
                                <div className="mb-4 p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                                  <span className="text-base flex-shrink-0">ℹ️</span>
                                  <p className="leading-relaxed font-medium">
                                    {isDevotion ? (
                                      <>
                                        <strong>How to check in:</strong> Select your name from the scheduled list below (or choose a substitute if covering/swapping), then enter the passcode to record your Morning Devotion attendance.
                                      </>
                                    ) : (
                                      <>
                                        <strong>How to check in:</strong> Select your name from the scheduled list below (or choose a free substitute if you are substituting), then enter the passcode to record your attendance.
                                      </>
                                    )}
                                  </p>
                                </div>

                                <div className="space-y-4">
                                  {/* Input Nama Guru */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                                      Select Teacher Name *
                                    </label>
                                    <div className="space-y-2.5">
                                      <select
                                        value={currentForm.teacherName}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setSessionFormField(session.session_key, "teacherName", val);
                                          if (currentForm.substituteName && currentForm.substituteName.trim().toLowerCase() === val.trim().toLowerCase()) {
                                            setSessionFormField(session.session_key, "substituteName", "");
                                          }
                                        }}
                                        className="w-full bg-white border border-slate-300 text-sm font-bold text-slate-800 px-3.5 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                                      >
                                        <option value="">
                                          {isDevotion ? "-- Select Scheduled Teacher (Devotion) --" : "-- Select Scheduled Teacher (Today) --"}
                                        </option>
                                        {availableScheduled.map((st, idx) => (
                                          <option key={idx} value={st.teacher_name}>
                                            {st.is_inval
                                              ? `🔄 ${st.teacher_name} (Substitute for ${st.original_teacher})`
                                              : st.teacher_name}
                                          </option>
                                        ))}
                                      </select>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                                          🔄 Guru Pengganti / Inval (Opsional — Hanya jika guru di atas digantikan)
                                        </label>
                                        <select
                                          value={currentForm.substituteName || ""}
                                          onChange={(e) => {
                                            setSessionFormField(session.session_key, "substituteName", e.target.value);
                                          }}
                                          className="w-full bg-white border border-slate-300 text-sm font-medium text-slate-700 px-3.5 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                                        >
                                          <option value="">-- Tidak ada pengganti (Hadir sendiri) --</option>
                                          {allTeachers
                                            .filter((t) => t.trim().toLowerCase() !== (currentForm.teacherName || "").trim().toLowerCase())
                                            .map((t, idx) => (
                                              <option key={`sub-${idx}`} value={t}>
                                                Digantikan oleh: {t}
                                              </option>
                                            ))}
                                        </select>
                                        {currentForm.substituteName && currentForm.substituteName.trim().toLowerCase() !== (currentForm.teacherName || "").trim().toLowerCase() && (
                                          <div className="mt-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800 flex items-center gap-1.5">
                                            <span>🔄</span>
                                            <span>
                                              <strong>{currentForm.substituteName}</strong> akan presensi menggantikan <strong>{currentForm.teacherName || "guru terpilih"}</strong>. Masukkan PIN milik {currentForm.substituteName}.
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Input Password with Show/Hide Toggle */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                                      Attendance Passcode *
                                    </label>
                                    <div className="relative">
                                      <input
                                        type={showPasswords[session.session_key] ? "text" : "password"}
                                        value={currentForm.password}
                                        onChange={(e) =>
                                          setSessionFormField(session.session_key, "password", e.target.value)
                                        }
                                        placeholder="Enter your Teacher PIN / Code"
                                        className="w-full bg-white border border-slate-300 font-mono text-sm font-bold text-slate-800 px-3.5 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 pr-20 shadow-xs"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setShowPasswords((prev) => ({
                                            ...prev,
                                            [session.session_key]: !prev[session.session_key],
                                          }))
                                        }
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                                      >
                                        {showPasswords[session.session_key] ? "👁️ Hide" : "👁️ Show"}
                                      </button>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                                      Enter your personal Teacher Code / PIN (or substitute code if covering)
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={currentForm.isSubmitting}
                                    onClick={() => handleCheckIn(session)}
                                    className="w-full mt-2 bg-[#1e3a8a] hover:bg-blue-800 text-white text-sm font-extrabold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                  >
                                    <span>✅</span>
                                    <span>
                                      {currentForm.isSubmitting
                                        ? "Processing Attendance..."
                                        : `Confirm Attendance ${
                                            currentForm.substituteName
                                              ? `(${currentForm.substituteName} covering for ${currentForm.teacherName})`
                                              : currentForm.teacherName
                                              ? `(${currentForm.teacherName})`
                                              : ""
                                          }`}
                                    </span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
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
