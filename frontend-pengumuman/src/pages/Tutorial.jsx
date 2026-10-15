import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Tutorial() {
  const [activeTab, setActiveTab] = useState("duty");

  // Simulation states for Announcement preview
  const [simDate, setSimDate] = useState("Today");
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
      setSimError("Please select your name first!");
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
                Teacher System Guide & Tutorial
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
              <span>1. Duty Attendance (Strict On-Time)</span>
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
        {/* ================= TAB 1: DUTY ATTENDANCE (ZERO TOLERANCE) ================= */}
        {activeTab === "duty" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Zero Tolerance Banner */}
            <div className="bg-gradient-to-r from-red-900 via-rose-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-md">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/30 text-red-200 border border-red-400/30 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                <span>⚠️ Strict Policy</span>
                <span>•</span>
                <span>Child Safety & Supervision</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black">
                Strict On-Time Check-In (Zero Tolerance)
              </h2>
              <p className="text-slate-200 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
                Teacher duty is directly responsible for <strong>guarding and supervising students</strong> at all school premises. To maintain student safety and discipline, <strong>THERE IS ZERO TOLERANCE BUFFER</strong>:
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                  <span className="text-red-300 font-bold block uppercase text-[10px]">Morning Duty</span>
                  <span className="font-black text-sm">07:15 – 07:45</span>
                  <p className="text-[11px] text-slate-300 mt-1">Form opens at 07:15:00 and closes at 07:45:59</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                  <span className="text-red-300 font-bold block uppercase text-[10px]">Break 1</span>
                  <span className="font-black text-sm">09:10 / 09:30</span>
                  <p className="text-[11px] text-slate-300 mt-1">Opens only during exact scheduled recess</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                  <span className="text-red-300 font-bold block uppercase text-[10px]">Break 2</span>
                  <span className="font-black text-sm">11:55 / 12:00</span>
                  <p className="text-[11px] text-slate-300 mt-1">Opens only during exact scheduled recess</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                  <span className="text-red-300 font-bold block uppercase text-[10px]">After School</span>
                  <span className="font-black text-sm">14:30 – 15:00</span>
                  <p className="text-[11px] text-slate-300 mt-1">Opens during student dismissal</p>
                </div>
              </div>
            </div>

            {/* Step-by-Step & Interactive Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Visual Step by Step */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-5">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-black text-xs">
                    4
                  </span>
                  Simple Steps to Complete Your Duty Check-In
                </h3>

                {/* Step 1 */}
                <div className="flex gap-3.5">
                  <div className="w-8 h-8 rounded-2xl bg-blue-50 text-[#1e3a8a] border border-blue-200 flex items-center justify-center font-black text-sm flex-shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-800">
                      Scan the QR Code at Your Duty Post
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Walk to your assigned location (e.g. Canteen, 2nd Floor Lobby, 3rd Floor Lobby, Backyard) and scan the QR code posted on the wall using your phone camera. It will open your location’s duty page directly.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3.5 border-t border-slate-100 pt-4">
                  <div className="w-8 h-8 rounded-2xl bg-blue-50 text-[#1e3a8a] border border-blue-200 flex items-center justify-center font-black text-sm flex-shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-800">
                      If at Canteen: Tap the Blue Session Button
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      The Canteen has two overlapping break sessions. If you are duty teacher for <strong>Grade 1-2</strong>, tap the button at the top:
                      <br />
                      <span className="inline-block mt-1 px-2.5 py-1 bg-blue-100 text-blue-800 font-extrabold text-xs rounded-lg border border-blue-200">
                        👉 Break 1 (Grade 1-2) (09.30-09.45)
                      </span>
                      <br />
                      The screen will automatically scroll to your grade’s attendance card.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3.5 border-t border-slate-100 pt-4">
                  <div className="w-8 h-8 rounded-2xl bg-blue-50 text-[#1e3a8a] border border-blue-200 flex items-center justify-center font-black text-sm flex-shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-800">
                      Select Your Name & Enter Your 5-Digit PIN
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Choose your name from the scheduled dropdown. Then enter your personal 5-digit PIN code (from the school passcodes file).
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-3.5 border-t border-slate-100 pt-4">
                  <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-black text-sm flex-shrink-0">
                    4
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-800">
                      Tap "Submit Attendance" & Verify Green Checkmark
                    </h4>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Tap the blue submit button. Once accepted, your name will display with a green checkmark badge <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">✅ Attended</span> showing your on-time timestamp. You are all set!
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Duty Simulator */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-red-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      Interactive Practice
                    </span>
                  </div>
                  <span className="text-xs bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-lg">
                    Try It Now
                  </span>
                </div>

                {/* Session Selector Pill Simulation */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-600 block">
                    1. Try Session Selector (Canteen):
                  </span>
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
                      👉 Grade 3-4 (09.10)
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
                      👉 Grade 1-2 (09.30)
                    </button>
                  </div>
                </div>

                {/* Form Simulation Box */}
                {!simSubmitted ? (
                  <form onSubmit={handleSimDutySubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#1e3a8a]">
                        📍 {simLocation} — {simSession === "break1_g34" ? "Grade 3-4" : "Grade 1-2"}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        🟢 STRICT ON-TIME
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Select Scheduled Teacher:
                      </label>
                      <select
                        value={simTeacher}
                        onChange={(e) => setSimTeacher(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="">-- Choose Your Name --</option>
                        {simSession === "break1_g34" ? (
                          <option value="Ms. Destha">Ms. Destha (Scheduled)</option>
                        ) : (
                          <option value="Ms. Jenny P">Ms. Jenny P (Scheduled)</option>
                        )}
                        <option value="Mr. Kornelius">Mr. Kornelius</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Enter 5-Digit PIN:
                      </label>
                      <input
                        type="password"
                        maxLength={5}
                        placeholder="e.g. 12345"
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
                      className="w-full py-2.5 bg-[#1e3a8a] hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95"
                    >
                      Submit Attendance (Practice)
                    </button>
                  </form>
                ) : (
                  <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-2xl text-center space-y-2.5">
                    <div className="text-3xl">✅</div>
                    <div className="font-black text-sm text-emerald-900">
                      Attendance Successfully Recorded!
                    </div>
                    <p className="text-xs text-emerald-700">
                      <strong>{simTeacher}</strong> is verified on-time at <strong>{simLocation}</strong>.
                    </p>
                    <button
                      onClick={() => {
                        setSimSubmitted(false);
                        setSimTeacher("");
                        setSimPin("");
                      }}
                      className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      Reset & Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MORNING DEVOTION & INVAL ================= */}
        {activeTab === "devotion" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Banner */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-md">
              <span className="px-3 py-1 bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Morning Devotion
              </span>
              <h2 className="text-2xl md:text-3xl font-black mt-2">
                Morning Devotion Attendance & Teacher Substitution (Inval)
              </h2>
              <p className="text-slate-200 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
                All 50+ teachers gather at the Chapel every morning. If you are present for yourself or substituting for an absent colleague, follow the rules below.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Guidelines */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-700">
                  How Devotion Attendance Works
                </h3>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                    <strong className="text-slate-800 text-sm block">
                      Case A: You Are Attending for Yourself
                    </strong>
                    <p className="text-slate-600">
                      1. Select your own name from the <strong>Scheduled Teacher</strong> dropdown.
                    </p>
                    <p className="text-slate-600">
                      2. Leave the substitute field as: <code className="bg-white px-1.5 py-0.5 rounded font-bold border border-slate-200">-- No substitute (Attending for myself) --</code>.
                    </p>
                    <p className="text-slate-600">
                      3. Enter your 5-digit PIN and tap Submit.
                    </p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-1.5">
                    <strong className="text-purple-900 text-sm block">
                      Case B: You Are Replacing an Absent Colleague (Inval)
                    </strong>
                    <p className="text-purple-800">
                      1. In the <strong>Scheduled Teacher</strong> dropdown: Select your <strong>colleague's name</strong> (the person you are replacing).
                    </p>
                    <p className="text-purple-800">
                      2. In the <strong>🔄 Substitute Teacher (Inval)</strong> dropdown: Select <strong>your own name</strong>.
                    </p>
                    <p className="text-purple-800">
                      3. Enter <strong>your own 5-digit PIN</strong> and tap Submit.
                    </p>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-900 space-y-1">
                    <strong className="text-xs font-bold block">
                      🛡️ Anti Self-Substitution Protection:
                    </strong>
                    <p className="text-xs">
                      The system automatically prevents selecting your own name as a substitute for yourself. This keeps school records accurate.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Devotion Practice */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border-2 border-purple-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    Devotion Practice Box
                  </span>
                  <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-lg">
                    Live Demo
                  </span>
                </div>

                <form onSubmit={handleSimDevotionSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      1. Scheduled Teacher:
                    </label>
                    <select
                      value={simDevotionTeacher}
                      onChange={(e) => setSimDevotionTeacher(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="">-- Choose Teacher --</option>
                      <option value="Mr. Kevin">Mr. Kevin</option>
                      <option value="Ms. Maria">Ms. Maria</option>
                      <option value="Mr. Andreas">Mr. Andreas</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      2. 🔄 Substitute (Inval) - Optional:
                    </label>
                    <select
                      value={simDevotionInval}
                      onChange={(e) => setSimDevotionInval(e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="">-- No substitute (Attending for myself) --</option>
                      <option value="Ms. Jessica">Ms. Jessica (Inval)</option>
                      <option value="Mr. Kornelius">Mr. Kornelius (Inval)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      3. Enter 5-Digit PIN:
                    </label>
                    <input
                      type="password"
                      maxLength={5}
                      placeholder="e.g. 12345"
                      value={simDevotionPin}
                      onChange={(e) => setSimDevotionPin(e.target.value)}
                      className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-200 bg-white tracking-widest"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-purple-800 hover:bg-purple-900 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95"
                  >
                    Simulate Devotion Check-In
                  </button>
                </form>

                {/* Attended List View */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                    <span>✅ Already Attended ({simDevotionList.length} Teachers)</span>
                    <span className="text-[11px] text-slate-400">Live list</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
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

        {/* ================= TAB 3: ANNOUNCEMENTS HUB ================= */}
        {activeTab === "announcements" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Banner */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-md">
              <span className="px-3 py-1 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Community Hub
              </span>
              <h2 className="text-2xl md:text-3xl font-black mt-2">
                How to Read Daily School Announcements
              </h2>
              <p className="text-slate-200 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
                Centralized bulletin board for circulars, academic notices, event schedules, teacher birthdays, and an interactive AI assistant.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Steps */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-700">
                  Easy Reading Features
                </h3>

                <div className="flex gap-3 text-xs leading-relaxed">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black flex-shrink-0">1</span>
                  <div>
                    <strong className="text-slate-800">Quick Date Navigation:</strong>
                    <p className="text-slate-500 mt-0.5">Use the top buttons <strong>◀ Yesterday</strong>, <strong>Today</strong>, or <strong>Tomorrow ▶</strong> to view notices across days.</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex gap-3 text-xs leading-relaxed">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black flex-shrink-0">2</span>
                  <div>
                    <strong className="text-slate-800">Larger Font Toggle (A+):</strong>
                    <p className="text-slate-500 mt-0.5">Tap <strong>🔍 Larger Font (A+)</strong> to enlarge text for comfortable reading on phones or during morning briefing.</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex gap-3 text-xs leading-relaxed">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black flex-shrink-0">3</span>
                  <div>
                    <strong className="text-slate-800">Full-Screen Image View:</strong>
                    <p className="text-slate-500 mt-0.5">Tap any poster or flyer image to expand it full-screen. Tap ✕ to close.</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex gap-3 text-xs leading-relaxed">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black flex-shrink-0">4</span>
                  <div>
                    <strong className="text-slate-800">Birthdays & Events:</strong>
                    <p className="text-slate-500 mt-0.5">Scroll to the bottom of the page to celebrate colleagues’ birthdays and view the upcoming calendar events.</p>
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
                    onClick={() => setSimLargeText(!simLargeText)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border ${
                      simLargeText ? "bg-indigo-600 text-white" : "bg-white text-slate-700"
                    }`}
                  >
                    {simLargeText ? "🔍 Standard Font" : "🔍 Larger Font (A+)"}
                  </button>
                  <button
                    onClick={() => setSimDate(simDate === "Today" ? "Yesterday" : "Today")}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border"
                  >
                    Switch Date ({simDate})
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">ACADEMIC</span>
                    <span className="text-xs text-slate-400 font-semibold">{simDate}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className={`font-black text-slate-900 transition-all ${simLargeText ? "text-lg" : "text-sm"}`}>
                      Parent-Teacher Conference (PTC)
                    </h4>
                    <p className={`text-slate-600 leading-relaxed transition-all ${simLargeText ? "text-sm" : "text-xs"}`}>
                      Please ensure all student portfolios are completed before Friday's conference.
                    </p>
                    <div
                      onClick={() => setSimImageOpen(!simImageOpen)}
                      className="cursor-pointer bg-slate-100 hover:bg-blue-50 border border-dashed border-slate-300 rounded-xl p-3 text-center text-xs font-bold text-slate-500 transition-all"
                    >
                      🖼️ [Tap to Test Full-Screen Poster Modal]
                    </div>
                  </div>
                </div>

                {simImageOpen && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center space-y-2">
                    <div className="text-xs font-bold text-blue-900">✅ Poster View Opened Full Screen</div>
                    <button
                      onClick={() => setSimImageOpen(false)}
                      className="px-3 py-1 bg-blue-700 text-white text-xs font-bold rounded-lg"
                    >
                      Close Modal
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: TEACHER FAQ & HELP ================= */}
        {activeTab === "faq" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-md">
              <h2 className="text-2xl font-black">Teacher Help & Common Questions</h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                Quick solutions for teachers who encounter issues during duty check-in.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
              {/* Q1 */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a] flex items-center gap-2">
                  <span>❓</span> It is 07:14 and the form says "Duty Locked / Not Active". Why?
                </h4>
                <p className="text-slate-600">
                  The system enforces <strong>Strict On-Time (Zero Tolerance)</strong> check-in. Morning duty form opens exactly at <strong>07:15:00</strong>. You cannot check in early because duty requires physical presence watching students during the designated duty window.
                </p>
              </div>

              {/* Q2 */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a] flex items-center gap-2">
                  <span>❓</span> I forgot my 5-digit PIN. What should I do?
                </h4>
                <p className="text-slate-600">
                  Your PIN is a permanent 5-digit passcode recorded in the teacher passcodes file. Please ask your Duty Coordinator or IT support to verify your PIN.
                </p>
              </div>

              {/* Q3 */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a] flex items-center gap-2">
                  <span>❓</span> I am at the Canteen, but I see another grade's teacher. Where is my form?
                </h4>
                <p className="text-slate-600">
                  The Canteen holds both Grade 3-4 and Grade 1-2 breaks. Look at the top of the screen and tap the blue button: <strong className="text-blue-700">"👉 Break 1 (Grade 1-2)"</strong> to jump directly to your grade's card.
                </p>
              </div>

              {/* Q4 */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
                <h4 className="font-extrabold text-sm text-[#1e3a8a] flex items-center gap-2">
                  <span>❓</span> Can I check in from home or from my car?
                </h4>
                <p className="text-slate-600">
                  No. Duty attendance must be submitted on-site at your duty post during duty hours to ensure the safety and supervision of students.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
