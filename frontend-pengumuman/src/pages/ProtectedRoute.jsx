// File: src/components/ProtectedRoute.jsx (atau sesuaikan dengan folder kamu)
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("jwt_token");

  // Jika tidak ada token di brankas, langsung tendang ke /login
  if (!token || token === null || token === "undefined") {
    return <Navigate to="/login" replace />;
  }

  // Jika token ada, silakan masuk ke komponen yang dibungkus
  return children;
};

export default ProtectedRoute;
