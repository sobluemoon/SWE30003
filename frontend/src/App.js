// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home";
import Option from "./pages/Option";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminInsert from "./pages/AdminInsert";
import AdminUpdate from "./pages/AdminUpdate";
import AdminDelete from "./pages/AdminDelete";
import BookRide from "./pages/BookRide";
import TrackRide from "./pages/TrackRide";
import Payment from "./pages/Payment";
import Feedback from "./pages/Feedback";
import RideHistory from "./pages/RideHistory";
import DriverDashboard from "./pages/DriverDashboard";
import DriverRoutes from "./pages/DriverRoutes";
import DriverHistory from "./pages/DriverHistory";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";

// Route protection
import ProtectedRoute from "./components/ProtectedRoute";

// Simple auth check for redirection
const checkAdminLoggedIn = () => {
  const adminUser = localStorage.getItem('adminUser') || sessionStorage.getItem('adminUser');
  return !!adminUser;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/option" element={<Option />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Admin Portal - Separate Entry Point */}
        <Route 
          path="/admin" 
          element={
            checkAdminLoggedIn() ? 
            <AdminDashboard /> : 
            <AdminLogin />
          } 
        />

        {/* Protected Pages (Customer Only) */}
        <Route
          path="/customer-dashboard"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Route for admin dashboard */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-register"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminRegister />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-insert"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminInsert />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-update"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminUpdate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-delete"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDelete />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <BookRide />
            </ProtectedRoute>
          }
        />
        <Route
          path="/track"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <TrackRide />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <Payment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <Feedback />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <RideHistory />
            </ProtectedRoute>
          }
        />

        {/* Protected Pages (Driver Only) */}
        <Route
          path="/driver-dashboard"
          element={
            <ProtectedRoute allowedRoles={["driver"]}>
              <DriverDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver-routes"
          element={
            <ProtectedRoute allowedRoles={["driver"]}>
              <DriverRoutes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver-history"
          element={
            <ProtectedRoute allowedRoles={["driver"]}>
              <DriverHistory />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
