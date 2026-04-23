import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Jika file ProtectedRoute.jsx berada di dalam folder yang sama dengan App.jsx:
import ProtectedRoute from "./pages/ProtectedRoute";

// PERHATIKAN TITIK DI AWAL INI:
import Announcements from "./pages/announcements";
import Admin from "./pages/Admin";
import Login from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/Announcements" element={<Announcements />} />

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
