import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  // const API_URL = "http://202.155.14.105:8000/api";
  const API_URL = "http://localhost:8000/api";
  useEffect(() => {
    document.title = "Login - Cita Hati";
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("jwt_token", data.access_token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("username", data.username);
        localStorage.setItem("id_admin", data.id_admin);
        navigate("/admin");
      } else {
        setErrorMsg(data.detail || "Username atau password salah.");
      }
    } catch (error) {
      setErrorMsg("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
      <div className="w-full max-w-md px-6">
        {/* Card Container */}
        <div className="bg-white p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-[#1e3a8a] tracking-tight">
              Login Portal
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Silakan masuk untuk mengelola sistem Cita Hati
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded-md">
              <p className="text-red-700 text-xs font-semibold">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all duration-200 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all duration-200 text-slate-800"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg shadow-blue-900/20 transition-all duration-300 transform active:scale-[0.98] ${
                loading
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-[#1e3a8a] hover:bg-[#162d6b] hover:shadow-xl"
              }`}
            >
              {loading ? "Memproses..." : "Masuk ke Dashboard"}
            </button>
          </form>

          {/* Footer Card */}
          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Cita Hati. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
