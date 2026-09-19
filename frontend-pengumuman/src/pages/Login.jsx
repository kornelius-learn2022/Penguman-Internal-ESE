import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // State baru untuk fitur show/hide password
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Login - Cita Hati";

    // Cek jika sudah login, lempar langsung ke admin
    const token = localStorage.getItem("jwt_token");
    if (token) {
      navigate("/admin");
    }
  }, [navigate]);

  // Fungsi Login yang sudah terkoneksi ke Server (Real API)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // Mengambil alamat base URL dari .env
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      const response = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Sesuai dengan skema schemas.LoginRequest dari Pydantic
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await response.json();

      // Jika response tidak ok (misalnya 401 Unauthorized dari FastAPI)
      if (!response.ok) {
        // data.detail adalah format error standar bawaan HTTPException FastAPI
        throw new Error(
          data.detail || "Gagal masuk. Periksa koneksi atau kredensial Anda.",
        );
      }

      // Jika berhasil, simpan semua data balikan dari API ke localStorage
      localStorage.setItem("jwt_token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);
      localStorage.setItem("id_admin", data.id_admin);

      // Arahkan ke dashboard admin
      navigate("/admin");
    } catch (error) {
      console.error("Login Error:", error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 text-slate-900 selection:bg-blue-100 transition-colors duration-500">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white p-10 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          {/* Header */}
          <div className="text-center mb-10">
            {/* Logo Section */}
            <div className="relative group inline-block mb-6">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <img
                src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
                alt="Logo Cita Hati"
                className="relative h-16 w-auto mx-auto drop-shadow-sm"
              />
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Login{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Portal
              </span>
            </h2>
            <p className="text-slate-500 mt-2 font-medium text-sm">
              Silakan masuk untuk mengelola sistem Cita Hati
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
              <p className="text-rose-600 text-xs font-bold tracking-wide">
                {errorMsg}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                Username
              </label>
              <input
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-transparent rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder:text-slate-400 placeholder:font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-transparent rounded-xl pl-4 pr-12 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder:text-slate-400 placeholder:font-medium"
                  required
                />

                {/* Tombol Toggle Password */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                >
                  {showPassword ? (
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
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 transform active:scale-[0.98] ${
                  loading
                    ? "bg-slate-400 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700"
                }`}
              >
                {loading ? "Memproses..." : "Masuk ke Dashboard"}
              </button>
            </div>
          </form>

          {/* Footer Card */}
          <div className="mt-10 text-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">
              © {new Date().getFullYear()} Cita Hati. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
