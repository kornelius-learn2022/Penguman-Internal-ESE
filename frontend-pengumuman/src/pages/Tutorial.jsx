import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Tutorial() {
  const [activeTab, setActiveTab] = useState("duty");

  // Simulation states for Announcement preview
  const [simDate, setSimDate] = useState("Today");
  const [simLargeText, setSimLargeText] = useState(false);
  const [simImageOpen, setSimImageOpen] = useState(false);

  // Simulation states for Duty Attendance preview
  const [simSession, setSimSession] = useState("g34_b1");
  const [simFloor, setSimFloor] = useState("1st floor Canteen");
  const [simTeacher, setSimTeacher] = useState("Ms. Destha");
  const [simInval, setSimInval] = useState("");
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
      setSimError("Please select the scheduled teacher!");
      return;
    }
    if (simPin.length !== 5) {
      setSimError("PIN must be exactly 5 digits!");
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
      name: simDevotionInval ? `${simDevotionTeacher} (Sub: ${simDevotionInval})` : simDevotionTeacher,
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      isInval: !!simDevotionInval,
    };
    setSimDevotionList([newEntry, ...simDevotionList]);
    setSimDevotionTeacher("");
    setSimDevotionInval("");
    setSimDevotionPin("");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
              alt="Cita Hati Logo"
              className="h-10 w-auto object-contain"
            />
            <div>
              <h1 className="text-base sm:text-lg font-black text-[#1e3a8a] tracking-tight">
                Teacher System Guide & Attendance Tutorial
              </h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cita Hati East Surabaya • Announcements & Duty Attendance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/duty"
              className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all border border-indigo-200"
            >
              🛡️ Duty Attendance
            </Link>
            <Link
              to="/announcements/today"
              className="px-3.5 py-1.5 bg-blue-50 text-[#1e3a8a] hover:bg-blue-100 rounded-xl text-xs font-bold transition-all border border-blue-200"
            >
              📢 Announcements
            </Link>
          </div>
        </div>

        {/* Tab Buttons (Teacher-Only, No Admin) */}
        <div className="max-w-5xl mx-auto px-4 mt-2">
          <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 scrollbar-none">
            <button
              onClick={() => setActiveTab("duty")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "duty"
                  ? "bg-[#1e3a8a] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>🛡️</span>
              <span>1. Duty Attendance & 1 QR Canteen</span>
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
              <span>2. Morning Devotion & Substitution</span>
            </button>

            <button
              onClick={() => setActiveTab("announcements")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === "announcements"
                  ? "bg-[#1e3a8a] text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>📢</span>
              <span>3. Announcements Hub</span>
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
              <span>4. Teacher FAQ & Help</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 mt-6">
        {/* ================= TAB 1: DUTY ATTENDANCE (ZERO TOLERANCE + 1 QR CANTEEN) ================= */}
        {activeTab === "duty" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Zero Tolerance Banner */}
            <div className="bg-gradient-to-r from-red-950 via-red-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-md border border-red-700/50">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-red-500/30 text-red-200 border border-red-400/40 rounded-full text-xs font-extrabold uppercase tracking-wider">
                  ⚠️ Strict Policy: Student Safety & Supervision
                </span>
                <span className="px-2.5 py-0.5 bg-amber-400 text-amber-950 rounded-full text-[10px] font-black uppercase">
                  No Late Buffer
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black">
                Strict On-Time Check-In (Zero Tolerance)
              </h2>
              <p className="text-slate-200 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
                Teacher duty is dedicated to <strong>safeguarding and supervising students</strong> during recess, morning arrival, and dismissal. To maintain child safety, <strong>THERE IS NO 30-MINUTE GRACE PERIOD</strong>. Check-in unlocks exclusively during scheduled minutes:
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                  <span className="text-red-300 font-bold block uppercase text-[10px]">Morning Duty</span>
                  <span className="font-black text-base text-white">07:15 – 07:45</span>
                  <p className="text-[11px] text-slate-300 mt-1">Canteen, Lobby & ESE Backyard</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                  <span className="text-red-300 font-bold block uppercase text-[10px]">Break 1 Recess</span>
                  <span className="font-black text-base text-white">09:10 / 10:20</span>
                  <p className="text-[11px] text-slate-300 mt-1">Gr 1-4 (09:10) • Gr 5-6 (10:20)</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                  <span className="text-red-300 font-bold block uppercase text-[10px]">Break 2 Lunch</span>
                  <span className="font-black text-base text-white">11:20 / 11:55</span>
                  <p className="text-[11px] text-slate-300 mt-1">Gr 1-2 (11:20) • Gr 3-6 (11:55)</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                  <span className="text-red-300 font-bold block uppercase text-[10px]">Go Home Announcer</span>
                  <span className="font-black text-base text-white">13:00 – 14:35</span>
                  <p className="text-[11px] text-slate-300 mt-1">Front Gate Dismissal</p>
                </div>
              </div>
            </div>

            {/* Feature Highlight: 1 QR Code Canteen System */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍔</span>
                <h3 className="text-base font-black text-[#1e3a8a]">
                  NEW: 1 Single QR Code for the Entire Canteen (1st Floor & 2nd Floor)
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                There is now <strong>only 1 QR Code sheet posted at the Canteen</strong> (<code className="bg-blue-100 text-blue-900 font-bold px-1.5 py-0.5 rounded">/duty/Canteen</code>). Whether you are assigned to <strong>1st floor Canteen</strong> or <strong>2nd floor Canteen</strong>, across Grade 1–2, Grade 3–4, or Grade 5–6, scan this single QR code!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white p-3 rounded-xl border border-blue-200">
                  <strong className="text-blue-900 block font-black">1. Scan Once:</strong>
                  <span className="text-slate-600">Scan the single QR code on the canteen wall using your phone.</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-200">
                  <strong className="text-blue-900 block font-black">2. Tap Your Session:</strong>
                  <span className="text-slate-600">If multiple breaks overlap, tap your grade session pill button at the top.</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-200">
                  <strong className="text-blue-900 block font-black">3. Select Floor & Submit:</strong>
                  <span className="text-slate-600">Choose Lantai 1 or Lantai 2, enter your 5-digit PIN, and submit on-time.</span>
                </div>
              </div>
            </div>

            {/* Step-by-Step & Interactive Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Visual Step by Step */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-[#1e3a8a] flex items-center justify-center font-black text-xs">
                    5
                  </span>
                  Step-by-Step Check-In Procedure
                </h3>

                {/* Step 1 */}
                <div className="flex gap-3.5">
                  <div className="w-8 h-8 rounded-2xl bg-blue-50 text-[#1e3a8a] border border-blue-200 flex items-center justify-center font-black text-sm flex-shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-800">
                      Arrive at Your Duty Post 2-3 Minutes Early
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Walk to your assigned location (Canteen, Lobby, or ESE Backyard). Find the printed QR code on the wall or reception desk.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3.5 border-t border-slate-100 pt-3.5">
                  <div className="w-8 h-8 rounded-2xl bg-blue-50 text-[#1e3a8a] border border-blue-200 flex items-center justify-center font-black text-sm flex-shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-800">
                      Scan the QR Code with Your Phone Camera
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Scan the QR code to open the attendance link. At the Canteen, tap your active grade session button at the top if multiple grades overlap.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3.5 border-t border-slate-100 pt-3.5">
                  <div className="w-8 h-8 rounded-2xl bg-blue-50 text-[#1e3a8a] border border-blue-200 flex items-center justify-center font-black text-sm flex-shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-800">
                      Select Scheduled Teacher Name
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Pick the scheduled teacher's name. If you are covering for an absent colleague, pick their name first.
                    </p>
                  </div>
                </div>

                {/* Step 4 (Inval) */}
                <div className="flex gap-3.5 border-t border-slate-100 pt-3.5 bg-amber-50/70 p-3 rounded-2xl border border-amber-200">
                  <div className="w-8 h-8 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center font-black text-sm flex-shrink-0">
                    4
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-amber-950 flex items-center gap-1.5">
                      <span>🔄</span> Are You a Substitute (Inval)?
                    </h4>
                    <p className="text-amber-800 text-xs leading-relaxed">
                      If you are substituting for an absent colleague, select <strong>your own name</strong> in the <strong>"🔄 Guru Pengganti / Inval"</strong> dropdown. Then enter <strong>your own 5-digit PIN</strong>. The system records your attendance while crediting the substitution!
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex gap-3.5 border-t border-slate-100 pt-3.5">
                  <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-black text-sm flex-shrink-0">
                    5
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-800">
                      Enter 5-Digit PIN & Confirm Green Badge
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Enter your secret 5-digit PIN and tap <strong>"Submit Attendance"</strong>. Look for the green confirmation card <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">✅ Attended</span> showing your exact on-time timestamp.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Duty Simulator */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-blue-300 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-xs font-black uppercase text-[#1e3a8a] tracking-wider">
                      Interactive Practice Screen
                    </span>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-xl">
                    Try It Below
                  </span>
                </div>

                {/* Session Selector Pill Simulation */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-600 block">
                    1. Choose Active Break Session (Canteen):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSimSession("g34_b1");
                        setSimTeacher("Ms. Destha");
                        setSimSubmitted(false);
                      }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all ${
                        simSession === "g34_b1"
                          ? "bg-[#1e3a8a] text-white shadow-xs"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      👉 Gr 3-4 (Break 1: 09.10)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSimSession("g12_b1");
                        setSimTeacher("Ms. Jenny P");
                        setSimSubmitted(false);
                      }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all ${
                        simSession === "g12_b1"
                          ? "bg-[#1e3a8a] text-white shadow-xs"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      👉 Gr 1-2 (Break 1: 09.30)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSimSession("g56_b1");
                        setSimTeacher("Mr. Percy");
                        setSimSubmitted(false);
                      }}
                      className={`px-2.5 py-1 text-xs font-bold rounded-xl border transition-all ${
                        simSession === "g56_b1"
                          ? "bg-[#1e3a8a] text-white shadow-xs"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      👉 Gr 5-6 (Break 1: 10.20)
                    </button>
                  </div>
                </div>

                {/* Form Simulation Box */}
                {!simSubmitted ? (
                  <form onSubmit={handleSimDutySubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#1e3a8a]">
                        📍 Canteen ({simSession === "g34_b1" ? "Grade 3-4" : simSession === "g12_b1" ? "Grade 1-2" : "Grade 5-6"})
                      </span>
                      <span className="text-[10px] font-black bg-red-100 text-red-800 px-2 py-0.5 rounded border border-red-200">
                        ON-TIME WINDOW
                      </span>
                    </div>

                    {/* Floor Selector */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Canteen Area / Floor:
                      </label>
                      <select
                        value={simFloor}
                        onChange={(e) => setSimFloor(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="1st floor Canteen">1st floor Canteen (Lantai 1)</option>
                        <option value="2nd floor Canteen">2nd floor Canteen (Lantai 2)</option>
                      </select>
                    </div>

                    {/* Scheduled Teacher Selector */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Select Scheduled Teacher (Guru Terjadwal):
                      </label>
                      <select
                        value={simTeacher}
                        onChange={(e) => setSimTeacher(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        {simSession === "g34_b1" ? (
                          <>
                            <option value="Ms. Destha">Ms. Destha (Scheduled - 1st fl)</option>
                            <option value="Ms. Endah">Ms. Endah (Scheduled - 2nd fl)</option>
                            <option value="Mr. Kornelius">Mr. Kornelius</option>
                          </>
                        ) : simSession === "g12_b1" ? (
                          <>
                            <option value="Ms. Jenny P">Ms. Jenny P (Scheduled)</option>
                            <option value="Ms. Rahayu">Ms. Rahayu</option>
                          </>
                        ) : (
                          <>
                            <option value="Mr. Percy">Mr. Percy (Scheduled - 1st fl)</option>
                            <option value="Mr. Gideon">Mr. Gideon (Scheduled - 2nd fl)</option>
                            <option value="Mr. Minh">Mr. Minh</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Substitute Teacher Selector */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        🔄 Guru Pengganti / Inval (Optional: If replacing absent teacher):
                      </label>
                      <select
                        value={simInval}
                        onChange={(e) => setSimInval(e.target.value)}
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700"
                      >
                        <option value="">-- Tidak ada pengganti (Hadir sendiri) --</option>
                        <option value="Mr. Dion">Mr. Dion (Inval Substitute)</option>
                        <option value="Ms. Meitha">Ms. Meitha (Inval Substitute)</option>
                        <option value="Mr. Kornelius">Mr. Kornelius (Inval Substitute)</option>
                      </select>
                      {simInval && simInval !== simTeacher && (
                        <div className="mt-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800 flex items-center gap-1.5">
                          <span>🔄</span>
                          <span>
                            <strong>{simInval}</strong> will check in replacing <strong>{simTeacher}</strong>. Enter <strong>{simInval}'s PIN</strong>.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* PIN Input */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Secret 5-Digit PIN:
                      </label>
                      <input
                        type="password"
                        maxLength={5}
                        value={simPin}
                        onChange={(e) => setSimPin(e.target.value)}
                        placeholder="Enter your 5-digit PIN"
                        className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-200 bg-white tracking-widest"
                      />
                    </div>

                    {simError && (
                      <div className="p-2.5 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                        ⚠️ {simError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#1e3a8a] hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all"
                    >
                      Submit Attendance (Practice Check-In)
                    </button>
                  </form>
                ) : (
                  <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-2xl text-center space-y-3">
                    <div className="text-3xl">✅</div>
                    <div className="text-sm font-black text-emerald-950">
                      Attendance Successfully Recorded!
                    </div>
                    {simInval ? (
                      <p className="text-xs text-emerald-800 font-medium">
                        <span className="text-amber-800 font-bold block mb-1">🔄 Inval Substitution Recorded:</span>
                        <strong>{simInval}</strong> successfully checked in as Substitute for <strong>{simTeacher}</strong> at <strong>{simFloor}</strong>.
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-800 font-medium">
                        <strong>{simTeacher}</strong> checked in successfully for self at <strong>{simFloor}</strong>.
                      </p>
                    )}
                    <span className="inline-block px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded-lg text-[11px] font-black">
                      Status: Terjadwal Duty (On-Time)
                    </span>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setSimSubmitted(false);
                          setSimPin("");
                          setSimInval("");
                        }}
                        className="mt-2 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs"
                      >
                        Try Another Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MORNING DEVOTION & SUBSTITUTION ================= */}
        {activeTab === "devotion" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-md border border-purple-800/40">
              <span className="px-3 py-1 bg-purple-500/30 text-purple-200 border border-purple-400/40 rounded-full text-xs font-bold uppercase tracking-wider">
                Chapel Morning Service
              </span>
              <h2 className="text-2xl font-black mt-2">Morning Devotion & Substitution (Inval)</h2>
              <p className="text-slate-200 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
                How to check in for devotion if you are attending yourself, or if you are stepping in to substitute for an absent colleague.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-700">
                  Two Devotion Check-In Scenarios
                </h3>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <strong className="text-slate-900 text-sm block">Case 1: Attending for Yourself</strong>
                    <p className="text-slate-600">
                      Select your name. Leave the substitute field as: <code className="bg-white px-1.5 py-0.5 rounded font-bold border border-slate-200">-- No substitute (Attending for myself) --</code>. Enter your PIN and submit.
                    </p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-1">
                    <strong className="text-purple-950 text-sm block">Case 2: Replacing an Absent Colleague (Inval)</strong>
                    <p className="text-purple-900">1. On <strong>Scheduled Teacher</strong>: Select your <strong>colleague's name</strong>.</p>
                    <p className="text-purple-900">2. On <strong>Substitute Teacher</strong>: Select <strong>your own name</strong>.</p>
                    <p className="text-purple-900">3. Enter <strong>your own 5-digit PIN</strong> and submit.</p>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-xs">
                    <strong>Notice:</strong> The system automatically blocks selecting yourself in both dropdowns (anti self-substitution protection).
                  </div>
                </div>
              </div>

              {/* Devotion Simulator */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-purple-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-black uppercase text-purple-900 tracking-wider">
                    Practice Devotion
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-lg">
                    Live Test
                  </span>
                </div>

                <form onSubmit={handleSimDevotionSubmit} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      Scheduled Teacher:
                    </label>
                    <select
                      value={simDevotionTeacher}
                      onChange={(e) => setSimDevotionTeacher(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="">-- Choose Scheduled Teacher --</option>
                      <option value="Mr. Kevin">Mr. Kevin (Absent)</option>
                      <option value="Ms. Maria">Ms. Maria</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      🔄 Substitute (Inval) - Optional:
                    </label>
                    <select
                      value={simDevotionInval}
                      onChange={(e) => setSimDevotionInval(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="">-- No substitute (Attending for myself) --</option>
                      <option value="Ms. Jessica">Ms. Jessica (Inval substitute)</option>
                      <option value="Mr. Kornelius">Mr. Kornelius (Inval substitute)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      5-Digit PIN:
                    </label>
                    <input
                      type="password"
                      maxLength={5}
                      value={simDevotionPin}
                      onChange={(e) => setSimDevotionPin(e.target.value)}
                      placeholder="Enter your PIN"
                      className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-200 bg-white tracking-widest"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-purple-800 hover:bg-purple-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all"
                  >
                    Simulate Devotion Check-In
                  </button>
                </form>

                <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-bold text-purple-950 block">
                    Recorded Devotion Attendance:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {simDevotionList.map((entry, idx) => (
                      <span
                        key={idx}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                          entry.isInval
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {entry.isInval ? `🔄 ${entry.name} (${entry.time})` : `👤 ${entry.name} (${entry.time})`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: ANNOUNCEMENTS HUB ================= */}
        {activeTab === "announcements" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-md border border-blue-800/40">
              <span className="px-3 py-1 bg-blue-500/30 text-blue-200 border border-blue-400/40 rounded-full text-xs font-bold uppercase tracking-wider">
                Schoolwide Communications
              </span>
              <h2 className="text-2xl font-black mt-2">Announcements Hub & Senior-Friendly Reader</h2>
              <p className="text-slate-200 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
                Stay informed with official circulars, event agendas, and daily memos. Optimized with large text toggles for effortless mobile reading.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-700">
                  Reader Controls for Teachers
                </h3>

                <div className="flex gap-3 text-xs leading-relaxed">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black flex-shrink-0">1</div>
                  <div>
                    <strong className="text-slate-800">Date Switcher (Yesterday, Today, Tomorrow):</strong>
                    <p className="text-slate-500 mt-0.5">Quickly view announcements for any day without typing dates.</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex gap-3 text-xs leading-relaxed">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black flex-shrink-0">2</div>
                  <div>
                    <strong className="text-slate-800">🔍 Larger Font (A+ Mode):</strong>
                    <p className="text-slate-500 mt-0.5">Tap the <strong>"Larger Font (A+)"</strong> button anytime to enlarge fonts for crystal-clear reading on small phone screens.</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex gap-3 text-xs leading-relaxed">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black flex-shrink-0">3</div>
                  <div>
                    <strong className="text-slate-800">Full-Screen Image Posters:</strong>
                    <p className="text-slate-500 mt-0.5">Tap any poster or flyer attachment to expand full screen. Tap ✕ to dismiss.</p>
                  </div>
                </div>
              </div>

              {/* Simulator */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-blue-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Preview Controls</span>
                  <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-lg">Try It</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSimLargeText(!simLargeText)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border"
                  >
                    {simLargeText ? "🔍 Standard Font" : "🔍 Larger Font (A+)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimDate("Today")}
                    className="px-2.5 py-1.5 bg-[#1e3a8a] text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Today
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                  <div className="bg-slate-50 p-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">ACADEMIC</span>
                    <span className="text-xs text-slate-400 font-semibold">{simDate}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className={`font-black text-slate-900 transition-all ${simLargeText ? "text-lg" : "text-sm"}`}>
                      Parent-Teacher Conference (PTC)
                    </h4>
                    <p className={`text-slate-600 leading-relaxed transition-all ${simLargeText ? "text-sm" : "text-xs"}`}>
                      Consultations take place this Friday. Please ensure all student portfolios are ready in your homeroom.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: TEACHER HELP & FAQ ================= */}
        {activeTab === "faq" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl p-6 shadow-md border border-slate-700/50">
              <h2 className="text-xl font-black">Teacher Help & Frequently Asked Questions</h2>
              <p className="text-slate-300 text-xs mt-1">Simple answers to common questions about duty check-in and system policies.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a]">❓ Why is there only 1 QR code at the Canteen now?</h4>
                <p className="text-slate-600">
                  To prevent confusion with multiple printed papers. Whether you are on <strong>Lantai 1</strong> or <strong>Lantai 2</strong>, scan the single Canteen QR code on the wall. Your phone will show the session selector to pick your grade and floor.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a]">❓ How do I check in as a Substitute Teacher (Inval)?</h4>
                <p className="text-slate-600">
                  On the check-in form, select the <strong>absent teacher's name</strong> on the first dropdown. Then on the <strong>"🔄 Guru Pengganti / Inval"</strong> dropdown, select <strong>your own name</strong> and enter <strong>your own 5-digit PIN</strong>.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a]">❓ Why does the system refuse check-in 10 minutes early?</h4>
                <p className="text-slate-600">
                  Under the <strong>Strict Zero-Tolerance Policy</strong>, teacher presence is tracked when students are actively in the duty zone. The check-in unlocks right on schedule (e.g. 07:15 for morning duty). Please arrive 2-3 minutes beforehand.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a]">❓ What should I do if school Wi-Fi is slow or disconnects?</h4>
                <p className="text-slate-600">
                  Switch your mobile phone to cellular data (4G/5G). The attendance page is ultra-lightweight (less than 25 KB) and transmits in under 1 second even on weak mobile signals.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a]">❓ What if I forget my 5-digit PIN?</h4>
                <p className="text-slate-600">
                  Your 5-digit PIN is permanently assigned to your teacher account. Contact the Duty Coordinator or school administration to quickly look up or reset your passcode.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a]">❓ How do I ask the AI Chatbot about my duty schedule?</h4>
                <p className="text-slate-600">
                  Open the chat window on the web portal and type: <em>"Jadwal piket [Your Name]"</em> or <em>"Siapa yang piket di kantin hari Kamis?"</em>. The AI assistant responds instantly with your real-time duties.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
