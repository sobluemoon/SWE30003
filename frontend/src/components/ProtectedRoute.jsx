// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ allowedRoles, children }) => {
  // Check for regular user
  const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null");
  
  // Check for admin user
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || sessionStorage.getItem("adminUser") || "null");
  
  // Determine which user to use based on allowed roles
  const activeUser = allowedRoles.includes("admin") ? (adminUser || user) : user;
  
  // No user found at all, redirect to appropriate login
  if (!activeUser) {
    return allowedRoles.includes("admin") ? 
      <Navigate to="/admin" /> : 
      <Navigate to="/login" />;
  }

  // User found but doesn't have the right role
  if (!allowedRoles.includes(activeUser.role)) {
    // If trying to access admin pages but not an admin
    if (allowedRoles.includes("admin")) {
      return <Navigate to="/admin" />;
    }
    
    // For other role mismatches
    if (activeUser.role === "admin") {
      return <Navigate to="/admin-dashboard" />;
    } else if (activeUser.role === "customer") {
      return <Navigate to="/customer-dashboard" />;
    } else if (activeUser.role === "driver") {
      return <Navigate to="/driver-dashboard" />;
    }
    
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
