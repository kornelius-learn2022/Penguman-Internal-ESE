import { useState, useEffect } from "react";

// Simulated Data (Will be replaced with API Fetch later)
const DUMMY_DATA = [
  {
    id: 1,
    type: "event",
    title: "Weekly Evaluation Meeting",
    time: "10:00 AM",
    date: "2026-04-09",
  },
  {
    id: 2,
    type: "birthday",
    title: "Budi Santoso",
    role: "IT Staff",
    date: "2026-04-09",
  },
  {
    id: 3,
    type: "event",
    title: "Basic Python Workshop",
    time: "01:00 PM",
    date: "2026-04-10",
  },
  {
    id: 4,
    type: "birthday",
    title: "Siti Aminah",
    role: "HR Dept.",
    date: "2026-04-11",
  },
];

function Home() {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // React State
  const [selectedDate, setSelectedDate] = useState(today);
  const [announcements, setAnnouncements] = useState([]);
  const [birthdays, setBirthdays] = useState([]);

  // useEffect: Runs automatically when 'selectedDate' changes
  useEffect(() => {
    const todaysData = DUMMY_DATA.filter((item) => item.date === selectedDate);

    setAnnouncements(todaysData.filter((item) => item.type === "event"));
    setBirthdays(todaysData.filter((item) => item.type === "birthday"));
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ========================================
        HEADER SECTION WITH LOGO
        ========================================
      */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Branding Area */}
          <div className="flex items-center gap-4">
            {/* The Logo Image */}
            <img
              src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
              alt="Cita Hati Logo"
              className="h-16 w-auto object-contain rounded-md"
            />
            {/* Subtitle */}
            <div className="hidden sm:block border-l-2 border-slate-200 pl-4">
              <h1 className="text-xl font-bold tracking-tight text-[#1e3a8a]">
                Community Hub
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Daily Information Center ESE Internal
              </p>
            </div>
          </div>

          {/* Date Picker Section */}
          <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-lg border border-slate-200 w-full sm:w-auto justify-between">
            <label
              htmlFor="date-select"
              className="text-sm font-semibold text-slate-600 uppercase tracking-wider pl-2 whitespace-nowrap"
            >
              Select Date
            </label>
            <input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition-all cursor-pointer font-medium"
            />
          </div>
        </div>
      </header>

      {/* ========================================
        MAIN CONTENT AREA
        ========================================
      */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Date Context Header */}
        <div className="mb-8 border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-bold text-slate-800">
            Announcements for{" "}
            <span className="text-[#1e3a8a]">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Events */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
            {/* Decorative Top Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#1e3a8a]"></div>

            <h3 className="text-lg font-bold mb-5 text-slate-800 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-[#1e3a8a]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
              Scheduled Events
            </h3>

            {announcements.length > 0 ? (
              <ul className="space-y-4">
                {announcements.map((item) => (
                  <li
                    key={item.id}
                    className="p-4 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-100 transition-colors"
                  >
                    <span className="inline-block px-2 py-1 bg-white text-xs font-bold text-[#1e3a8a] border border-[#1e3a8a]/20 rounded mb-2 shadow-sm">
                      {item.time}
                    </span>
                    <h4 className="text-base font-semibold text-slate-800 leading-snug">
                      {item.title}
                    </h4>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-60">
                <svg
                  className="w-12 h-12 text-slate-300 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  ></path>
                </svg>
                <p className="text-slate-500 italic text-sm">
                  No events scheduled for this date.
                </p>
              </div>
            )}
          </section>

          {/* Right Column: Birthdays */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
            {/* Decorative Top Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#dc2626]"></div>

            <h3 className="text-lg font-bold mb-5 text-slate-800 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-[#dc2626]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
                ></path>
              </svg>
              Today's Birthdays
            </h3>

            {birthdays.length > 0 ? (
              <ul className="space-y-4">
                {birthdays.map((item) => (
                  <li
                    key={item.id}
                    className="p-4 bg-slate-50 hover:bg-red-50/50 rounded-lg border border-slate-100 flex items-center gap-4 transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center text-xl shadow-sm border border-red-100">
                      🎁
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-800">
                        {item.title}
                      </h4>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {item.role}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-60">
                <div className="text-4xl grayscale opacity-40 mb-3">🎂</div>
                <p className="text-slate-500 italic text-sm">
                  No birthdays today.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default Home;
