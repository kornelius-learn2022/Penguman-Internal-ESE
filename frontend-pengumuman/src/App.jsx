import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Jika file ProtectedRoute.jsx berada di dalam folder yang sama dengan App.jsx:
import ProtectedRoute from "./pages/ProtectedRoute";

// PERHATIKAN TITIK DI AWAL INI:
import Announcements from "./pages/announcements";
import Admin from "./pages/Admin";
import Login from "./pages/Login";

const generateRandomHash = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate to={`/announcements/${generateRandomHash()}`} replace />
          }
        />

        {/* LANGKAH 2: RUTE DINAMIS
          Menambahkan "/:id" di belakang rute. Ini memberi tahu React Router bahwa 
          apapun teks acak di belakang "/announcements/", tetap buka halaman Announcements.
        */}
        <Route path="/announcements/:id" element={<Announcements />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
