import React, { useState, useRef, useEffect } from "react";

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [chipLang, setChipLang] = useState("all");
  const [showGuide, setShowGuide] = useState(false);

  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Halo! Welcome! 欢迎! 🤖\n\nSaya Asisten Pintar Cita Hati East Surabaya. Rekan-rekan guru dapat menanyakan:\n• 📚 Jadwal kelas (Homeroom & Spesialis)\n• 🛡️ Jadwal duty/piket (Backyard, Kantin, Lobby, Gate)\n• 📢 Pengumuman & agenda sekolah\n• ☕ Jam istirahat & KBM\n\n• 🇬🇧 Ask me in English\n• 🇨🇳 用中文向我提问\n• 🇮🇩 Tanya dalam Bahasa Indonesia\n\n📌 *Catatan: Jika terdapat ketidaksesuaian/kesalahan jadwal, silakan hubungi Mr. Kornel.*",
      provider: "Cita Hati AI",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Fokus input saat widget dibuka
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const allQuickChips = [
    // --- English (For International Teachers) ---
    { lang: "en", label: "📢 Today's Announcements", query: "What are today's school announcements?" },
    { lang: "en", label: "🛡️ Duty Right Now", query: "Who is on duty right now?" },
    { lang: "en", label: "🌳 Backyard Duty Today", query: "Who is on duty in the backyard today?" },
    { lang: "en", label: "☕ Break & Recess Times", query: "What are the school break and recess times today?" },
    { lang: "en", label: "⏰ Class Periods Schedule", query: "What is the teaching period and bell schedule for today?" },
    { lang: "en", label: "📚 Class 3A Schedule", query: "Show the full schedule for Class 3A" },
    { lang: "en", label: "🎂 Today's Birthdays", query: "Who is celebrating a birthday today?" },

    // --- Chinese (For International Teachers) ---
    { lang: "zh", label: "📢 今日学校公告", query: "今天有哪些学校公告？" },
    { lang: "zh", label: "🛡️ 当前谁在值班？", query: "现在谁在值班？" },
    { lang: "zh", label: "🌳 今日后院值班", query: "今天谁在后院值班？" },
    { lang: "zh", label: "☕ 课间休息时间", query: "今天的课间休息（Break）时间是什么时候？" },
    { lang: "zh", label: "⏰ 今日作息时间表", query: "今天的上课节次和作息时间是什么？" },
    { lang: "zh", label: "📚 3A班级课程表", query: "请显示3A班级的完整课程表" },
    { lang: "zh", label: "🎂 今日教师生日", query: "今天谁过生日？" },

    // --- Indonesian ---
    { lang: "id", label: "📢 Pengumuman Hari Ini", query: "Apa saja pengumuman sekolah hari ini?" },
    { lang: "id", label: "🛡️ Jaga Backyard Sekarang", query: "Siapa yang jaga backyard sekarang?" },
    { lang: "id", label: "📍 Jaga Backyard Senin 09.10", query: "Siapa yang jaga backyard hari Senin jam 09.10?" },
    { lang: "id", label: "⏰ Sesi KBM Hari Ini", query: "Bagaimana jadwal sesi belajar mengajar (KBM) hari ini?" },
    { lang: "id", label: "☕ Jam Istirahat Sekolah", query: "Kapan saja jam istirahat (break) sekolah berlangsung?" },
    { lang: "id", label: "📚 Jadwal Kelas 3A", query: "Jadwal kelas 3A" },
    { lang: "id", label: "🎂 Ulang Tahun Hari Ini", query: "Siapa saja yang berulang tahun hari ini?" },
  ];

  const displayedChips = chipLang === "all"
    ? [
        { label: "📢 Announcements", query: "What are today's school announcements?" },
        { label: "🛡️ Duty Right Now", query: "Who is on duty right now?" },
        { label: "🌳 Backyard Duty Today", query: "Who is on duty in the backyard today?" },
        { label: "🇨🇳 今日后院值班", query: "今天谁在后院值班？" },
        { label: "☕ Break Times", query: "What are the school break and recess times today?" },
        { label: "⏰ Sesi KBM Hari Ini", query: "Bagaimana jadwal sesi belajar mengajar (KBM) hari ini?" },
        { label: "📚 Class 3A Schedule", query: "Show full schedule for Class 3A" },
        { label: "🎂 Today's Birthdays", query: "Who is celebrating a birthday today?" },
      ]
    : allQuickChips.filter((c) => c.lang === chipLang);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMessage = {
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = {
        sender: "ai",
        text: data.reply || "Maaf, tidak ada respon.",
        provider: data.provider_used || "AI Assistant",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage = {
        sender: "ai",
        text: "Mohon maaf, terjadi kendala saat menghubungkan ke asisten AI. Silakan coba sesaat lagi.",
        provider: "System Error",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        sender: "ai",
        text: "Percakapan telah direset. Silakan tanyakan jadwal pelajaran, agenda kegiatan, atau pengumuman sekolah! ✨",
        provider: "Cita Hati AI",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* ================= CHAT WINDOW POPUP ================= */}
      {isOpen && (
        <div className="pointer-events-auto mb-4 w-[92vw] sm:w-[420px] h-[580px] max-h-[85dvh] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-900/20 border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/20">
                  🤖
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-blue-700 rounded-full"></span>
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                  Cita Hati AI Assistant
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
                    Dual AI
                  </span>
                </h3>
                <p className="text-[11px] text-blue-100/90 font-medium">
                  Jadwal Guru & Pengumuman Sekolah
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                title="Panduan Penggunaan Chatbot & Kontak"
                className={`p-2 rounded-xl transition-colors ${
                  showGuide ? "bg-white text-blue-700 font-bold shadow-xs" : "hover:bg-white/15 text-blue-100 hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={clearChat}
                title="Reset Percakapan"
                className="p-2 hover:bg-white/15 rounded-xl text-blue-100 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup Chat"
                className="p-2 hover:bg-white/15 rounded-xl text-blue-100 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Guide Overlay Panel */}
          {showGuide && (
            <div className="absolute inset-0 top-[72px] bg-white z-40 flex flex-col p-5 overflow-y-auto animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📖</span>
                  <h4 className="font-bold text-slate-800 text-sm">Panduan Penggunaan Chatbot</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-all text-xs font-bold"
                >
                  ✕ Tutup
                </button>
              </div>

              <div className="py-3 space-y-3 text-xs text-slate-600">
                <div className="bg-blue-50/80 p-3 rounded-2xl border border-blue-100">
                  <p className="font-bold text-blue-900 mb-1.5 flex items-center gap-1.5">
                    <span>🤖</span> Apa Saja yang Bisa Ditanyakan?
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    <li><strong>Jadwal Kelas:</strong> <em>"Jadwal kelas 3A hari Senin"</em> atau <em>"Class 1B schedule"</em> (lengkap Homeroom & Spesialis).</li>
                    <li><strong>Jadwal Piket (Duty):</strong> <em>"Siapa yang jaga backyard sekarang?"</em> atau <em>"Who is on duty in the backyard on Monday at 09.10?"</em></li>
                    <li><strong>Pengumuman:</strong> <em>"Pengumuman hari ini"</em> atau <em>"What are today's school announcements?"</em></li>
                    <li><strong>Jam Istirahat:</strong> <em>"Kapan saja jam break sekolah?"</em></li>
                    <li><strong>Ulang Tahun:</strong> <em>"Siapa yang berulang tahun hari ini?"</em></li>
                  </ul>
                </div>

                <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-100">
                  <p className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                    <span>🌐</span> Dukungan 3 Bahasa (Trilingual):
                  </p>
                  <p className="text-slate-700 leading-relaxed">
                    Gunakan tab <strong>EN</strong> / <strong>中文</strong> / <strong>ID</strong> di atas kolom ketik untuk pertanyaan instan, atau ketik langsung dalam bahasa Anda. AI akan merespons dalam bahasa yang sama.
                  </p>
                </div>

                <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                  <p className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                    <span>⚠️</span> Kontak Koreksi / Kesalahan Jadwal:
                  </p>
                  <p className="text-amber-800 leading-relaxed font-medium">
                    Jika rekan guru menemukan <strong>ketidaksesuaian, kesalahan jadwal, atau perubahan sesi mengajar/duty</strong>, silakan langsung menghubungi <strong>Mr. Kornel</strong> agar database jadwal segera disesuaikan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-auto w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
              >
                Kembali ke Chat
              </button>
            </div>
          )}

          {/* Multilingual Indicator Sub-bar */}
          <div className="bg-slate-50 border-b border-slate-100 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
            <span className="flex items-center gap-1">
              <span>🌐</span> Multi-Language Support
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">🇮🇩 ID</span>
              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">🇬🇧 EN</span>
              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">🇨🇳 中文</span>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs"
                      : "bg-white text-slate-800 border border-slate-200/70 rounded-bl-xs whitespace-pre-line"
                  }`}
                >
                  {msg.text}
                </div>
                <div className="flex items-center gap-2 mt-1 px-1">
                  {msg.sender === "ai" && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
                      ⚡ {msg.provider}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-medium">
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start animate-in fade-in duration-200">
                <div className="bg-white border border-slate-200/70 rounded-2xl rounded-bl-xs px-4 py-3 shadow-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-xs text-slate-400 ml-2 font-medium">
                    Menghubungkan AI...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Language Selector for Instant Chips */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Prompt:</span>
            <div className="flex gap-1">
              {[
                { id: "all", label: "🌐 All" },
                { id: "en", label: "🇬🇧 EN" },
                { id: "zh", label: "🇨🇳 中文" },
                { id: "id", label: "🇮🇩 ID" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setChipLang(tab.id)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                    chipLang === tab.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 bg-white hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="p-2.5 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
            {displayedChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.query)}
                disabled={isLoading}
                className="shrink-0 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-600 border border-slate-200 px-3 py-2 min-h-[36px] rounded-full transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Box Form */}
          <div className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask question / Ketik pertanyaan (EN / 中文 / ID)..."
              disabled={isLoading}
              className="flex-1 bg-slate-100 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 placeholder-slate-400 px-4 py-2.5 rounded-2xl border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className={`p-2.5 rounded-2xl flex items-center justify-center transition-all ${
                inputValue.trim() && !isLoading
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/30 scale-100 active:scale-95"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ================= FLOATING ACTION BUTTON ================= */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto relative group flex items-center justify-center p-0.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        title="Tanya Asisten AI Cita Hati"
      >
        {/* Glowing Background Pulse */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-full blur-sm opacity-70 group-hover:opacity-100 animate-pulse transition duration-500"></div>

        <div className="relative flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-bold text-sm shadow-inner">
          <div className="relative">
            <span className="text-xl">🤖</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
            </span>
          </div>
          <span className="hidden sm:inline tracking-tight">Tanya AI Cita Hati</span>
        </div>
      </button>
    </div>
  );
}
