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
    // Real-time clock update
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
        fetch(`/api/duty-attendance/teachers`),
      ]);
      if (resSess.ok) {
        const data = await resSess.json();
        setSessions(data);
      }
      if (resTeach.ok) {
        const data = await resTeach.json();
        const names = Array.from(new Set(data.map((t) => t.teacher_name || t))).sort();
        setAllTeachers(names);
      }
    } catch (err) {
      console.error(err);
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
      showToast("Please select your teacher name first!", "error");
      return;
    }
    if ((form.password || "").trim().toLowerCase() !== "citahati") {
      showToast("Incorrect password!", "error");
      return;
    }

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
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Attendance successfully recorded in system!", "success");
        // Reset form
        setSessionFormField(session.session_key, "teacherName", "");
        setSessionFormField(session.session_key, "password", "");
        fetchData();
      } else {
        showToast(data.detail || "Failed to record attendance", "error");
      }
    } catch (err) {
      showToast("Network error occurred. Please try again.", "error");
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
    const uniqueLocations = Array.from(new Set(sessions.map((s) => s.location)));

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
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

  // Filter sessions by the URL param
  const decodedLocation = decodeURIComponent(locationParam);
  const locationSessions = sessions.filter(
    (s) => s.location.toLowerCase() === decodedLocation.toLowerCase()
  );

  // Strictly filter only sessions that are active RIGHT NOW
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
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
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
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 mt-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1e3a8a] border-t-transparent"></div>
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="text-lg font-bold text-slate-700">No Active Duty Schedule at This Time</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              Duty attendance forms are only accessible during active duty hours.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeSessions.map((session, sIdx) => {
              const currentForm = forms[session.session_key] || {
                teacherName: "",
                password: "",
                isSubmitting: false,
              };

              return (
                <div
                  key={sIdx}
                  className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden"
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
                  <div className="p-6 space-y-6">
                    {/* SECTION: FORM ABSENSI */}
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        ✍️ Duty Check-In Form
                      </span>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                        <div className="space-y-3">
                          {/* Input Nama Guru */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              Select Teacher Name *
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                              {/* Pilihan Cepat dari Guru Terjadwal */}
                              <select
                                value={currentForm.teacherName}
                                onChange={(e) =>
                                  setSessionFormField(session.session_key, "teacherName", e.target.value)
                                }
                                className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-700 px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">-- Select Scheduled Teacher --</option>
                                {session.scheduled_teachers.map((st, idx) => (
                                  <option key={idx} value={st.teacher_name}>
                                    {st.teacher_name} {st.is_attended ? "🔵" : ""}
                                  </option>
                                ))}
                              </select>

                              {/* Dropdown Inval / Substitute */}
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    setSessionFormField(session.session_key, "teacherName", e.target.value);
                                  }
                                }}
                                className="w-full bg-white border border-slate-200 text-xs font-medium text-slate-600 px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Or Select Other Teacher / Substitute...</option>
                                {allTeachers.map((teach, idx) => (
                                  <option key={idx} value={teach}>
                                    {teach}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Input Password */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              Attendance Password *
                            </label>
                            <input
                              type="password"
                              value={currentForm.password}
                              onChange={(e) =>
                                setSessionFormField(session.session_key, "password", e.target.value)
                              }
                              placeholder="Enter password"
                              className="w-full bg-white border border-slate-200 font-mono text-xs font-bold text-slate-800 px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
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
                                ? "Processing Attendance..."
                                : `Confirm Attendance ${
                                    currentForm.teacherName ? `(${currentForm.teacherName})` : ""
                                  }`}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SECTION: TERCATAT DI SISTEM (RECORDED IN SYSTEM) */}
                    {session.attended_list && session.attended_list.length > 0 && (
                      <div className="pt-3 border-t border-slate-100">
                        <div className="space-y-2">
                          {session.attended_list.map((att) => (
                            <div
                              key={att.id_attendance}
                              className="flex items-center gap-3 p-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl shadow-sm"
                            >
                              <img
                                src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
                                alt="Cita Hati Logo"
                                className="h-9 w-auto object-contain flex-shrink-0"
                              />
                              <div className="text-xs font-bold text-emerald-950">
                                <span className="font-extrabold text-[#1e3a8a]">{att.teacher_name}</span> telah tercatat dalam sistem
                              </div>
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
