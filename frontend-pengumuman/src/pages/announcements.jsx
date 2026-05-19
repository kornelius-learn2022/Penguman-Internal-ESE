import { useState, useEffect, useRef, useCallback } from "react";
import BannerLoading from "./BannerLoading";

// --- Sub-Components untuk Kerapihan ---
const SectionHeader = ({ title, icon, color }) => (
  <h3 className="text-lg font-bold mb-5 text-slate-800 flex items-center gap-2">
    <span className={`p-2 rounded-lg bg-${color}-50 text-${color}-600`}>
      {icon}
    </span>
    {title}
  </h3>
);

function Announcements() {
  const today = new Date().toISOString().split("T")[0];
  // const API_URL = "http://localhost:8000/api";
  const API_URL = "http://202.155.14.105:8000/api";
  // State Management
  const [selectedDate, setSelectedDate] = useState(today);
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [birthdays, setBirthdays] = useState([]);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const ws = useRef(null);
  const scrollRef = useRef(null);

  // --- API Functions ---
  const fetchData = useCallback(async () => {
    try {
      // Fetch Announcements
      const annRes = await fetch(
        `${API_URL}/announcements?tanggal=${selectedDate}`,
        { cache: "no-store" },
      );
      const annData = await annRes.json();
      setAnnouncements(annData);

      // Fetch Birthdays
      const bdayRes = await fetch(`${API_URL}/birthdays`);
      const bdayData = await bdayRes.json();
      const monthDay = selectedDate.substring(5);

      if (Array.isArray(bdayData)) {
        setBirthdays(bdayData.filter((b) => b.date?.endsWith(monthDay)));
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Fetch Error:", err);
      setIsLoading(false);
    }
  }, [selectedDate]);

  // --- WebSocket Logic ---
  useEffect(() => {
    ws.current = new WebSocket("ws://202.155.14.105:8000/ws/chat");

    ws.current.onmessage = (event) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "bot", text: event.data },
      ]);
      setIsTyping(false);
    };

    return () => ws.current?.close();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userMsg = { id: Date.now(), sender: "user", text: chatInput };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(chatInput);
    }
    setChatInput("");
  };

  // --- FUNGSI FEEDBACK BARU ---
  const handleFeedback = async (pesanUserSebelumnya, jawabanAI) => {
    try {
      const response = await fetch(`${API_URL}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pertanyaan_user: pesanUserSebelumnya || "Tidak diketahui",
          jawaban_ai: jawabanAI,
          catatan_user: "Dilaporkan oleh user via tombol chat",
        }),
      });

      if (response.ok) {
        alert("Terima kasih! Laporan kesalahan AI sudah dikirim ke Admin.");
      }
    } catch (error) {
      console.error("Gagal mengirim feedback:", error);
    }
  };

  if (isLoading) return <BannerLoading />;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-blue-100 transition-colors duration-500">
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
                Community Hub
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
                    className="group p-5 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                  >
                    <span className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-500 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors uppercase tracking-wider">
                      {item.date}
                    </span>
                    <p className="mt-3 text-slate-700 font-semibold leading-relaxed whitespace-pre-line">
                      {item.announcement}
                    </p>
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

      {/* --- Modern Chat System --- */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-500 ${isChatOpen ? "visible" : "invisible"}`}
      >
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${isChatOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsChatOpen(false)}
        />

        <aside
          className={`absolute right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-2xl transition-transform duration-500 ease-out flex flex-col ${isChatOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <h2 className="font-bold tracking-tight">AI Assistant</h2>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="hover:rotate-90 transition-transform p-1"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50"
          >
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
              >
                {/* Pembungkus untuk Balon Chat dan Tombol Feedback */}
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-sm ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text
                        // Regex di-upgrade: Tambah penangkap Raw URL (https://...)
                        .split(
                          /(!\[.*?\]\(.*?\)|\[.*?\]\(.*?\)|\*\*.*?\*\*|https?:\/\/[^\s]+)/,
                        )
                        .map((part, i) => {
                          if (!part) return null;

                          // 1. RENDER GAMBAR: ![alt](url)
                          const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
                          if (imgMatch) {
                            return (
                              <div key={i} className="my-3 group">
                                <img
                                  src={imgMatch[2]}
                                  alt={imgMatch[1]}
                                  className="max-w-full rounded-xl shadow-md border border-slate-100 transition-transform hover:scale-[1.01]"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              </div>
                            );
                          }

                          // 2. RENDER LINK MARKDOWN: [teks](url)
                          const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
                          if (linkMatch) {
                            return (
                              <div key={i} className="my-3">
                                <a
                                  href={linkMatch[2]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-semibold transition-colors border border-blue-200 break-all"
                                >
                                  🔗 {linkMatch[1]}
                                </a>
                              </div>
                            );
                          }

                          // 3. RENDER BOLD TEKS: **teks**
                          const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
                          if (boldMatch) {
                            return (
                              <strong
                                key={i}
                                className="font-bold text-inherit"
                              >
                                {boldMatch[1]}
                              </strong>
                            );
                          }

                          // 4. RENDER RAW URL (Jika AI mengirim link tanpa kurung siku)
                          const rawUrlMatch = part.match(
                            /^(https?:\/\/[^\s]+)$/,
                          );
                          if (rawUrlMatch) {
                            return (
                              <div key={i} className="my-3">
                                <a
                                  href={rawUrlMatch[1]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  // Memakai class Tailwind yang persis sama dengan tombol Markdown
                                  className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-semibold transition-colors border border-blue-200"
                                >
                                  🔗 Buka Tautan
                                </a>
                              </div>
                            );
                          }

                          // 5. RENDER TEKS BIASA (Support Enter / Baris Baru)
                          return (
                            <span key={i}>
                              {part.split("\n").map((line, j, arr) => (
                                <span key={j}>
                                  {line}
                                  {j < arr.length - 1 && <br />}
                                </span>
                              ))}
                            </span>
                          );
                        })}
                    </div>
                  </div>

                  {/* TOMBOL FEEDBACK: Hanya Tampil untuk Pesan Bot */}
                  {msg.sender === "bot" && (
                    <div className="flex justify-start pl-2">
                      <button
                        onClick={() => {
                          // Mencari pesan user terakhir sebelum pesan bot ini
                          let lastUserMsg = "Tidak diketahui";
                          for (let j = index - 1; j >= 0; j--) {
                            if (messages[j].sender === "user") {
                              lastUserMsg = messages[j].text;
                              break;
                            }
                          }
                          handleFeedback(lastUserMsg, msg.text);
                        }}
                        className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 bg-transparent border-none cursor-pointer"
                        title="Laporkan jawaban ini jika salah/rusak"
                      >
                        👎 Laporkan salah
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && <TypingIndicator />}
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask me something..."
                className="flex-1 bg-transparent border-none px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-md"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 12h14M12 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 h-14 w-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 transform hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <svg
          className="w-6 h-6 group-hover:rotate-12 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
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

const TypingIndicator = () => (
  <div className="flex justify-start animate-fadeIn">
    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex gap-1">
      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
    </div>
  </div>
);

export default Announcements;
