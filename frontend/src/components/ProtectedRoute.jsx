// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ userRole, allowedRoles, children }) => {
  // Check both localStorage and sessionStorage for user data
  const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user"));

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
