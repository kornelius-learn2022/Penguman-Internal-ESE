import React from "react";
import { Navigate } from "react-router-dom";
import { isTokenExpired, clearAdminSession } from "../utils/auth";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("jwt_token");

  // Jika token tidak ada atau masa aktif JWT (12 jam) telah habis, tendang ke login
  if (!token || token === "undefined" || token === "null" || isTokenExpired(token)) {
    clearAdminSession();
    return <Navigate to="/login?expired=1" replace />;
  }

  // Jika token valid dan belum kedaluwarsa, izinkan akses ke fitur Admin
  return children;
};

export default ProtectedRoute;
