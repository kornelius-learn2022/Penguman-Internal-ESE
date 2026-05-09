import React, { useState, useEffect } from "react";

// 1. Import useNavigate
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // const API_URL = "http://localhost:8000/api";
  const API_URL = "http://202.155.14.105:8000/api";

  // 2. Aktifkan fitur navigasi
  const navigate = useNavigate();
  // Mengubah judul tab browser saat masuk ke halaman Login
  useEffect(() => {
    document.title = "Login - Cita Hati";
  }, []);
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }).then(console.log("error"));

      const data = await response.json();

      if (response.ok) {
        // --- JIKA BERHASIL LOGIN ---

        // 3. Simpan token JWT ke "brankas" browser (localStorage)
        localStorage.setItem("jwt_token", data.access_token);

        // (Opsional) Simpan role jika butuh untuk mengatur tampilan menu
        localStorage.setItem("role", data.role);
        localStorage.setItem("username", data.username);
        localStorage.setItem("id_admin", data.id_admin);

        // 4. PINDAH HALAMAN SECARA OTOMATIS KE DASHBOARD ADMIN
        navigate("/admin");
      } else {
        // --- JIKA GAGAL (Contoh: Password salah) ---
        setErrorMsg(data.detail); // Menampilkan pesan dari FastAPI
      }
    } catch (error) {
      setErrorMsg("Gagal terhubung ke server.");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-[#1e3a8a]">
          Login Portal
        </h2>

        {/* Tampilkan pesan error jika ada */}
        {errorMsg && (
          <p className="text-red-500 mb-4 text-sm font-bold">{errorMsg}</p>
        )}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 p-3 border rounded-lg"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 p-3 border rounded-lg"
        />

        <button
          type="submit"
          className="w-full bg-[#1e3a8a] text-white p-3 rounded-lg font-bold"
        >
          Masuk
        </button>
      </form>
    </div>
  );
}
