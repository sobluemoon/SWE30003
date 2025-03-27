// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home";
import Option from "./pages/Option";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CustomerDashboard from "./pages/CustomerDashboard";
import BookRide from "./pages/BookRide";
import TrackRide from "./pages/TrackRide";
import Payment from "./pages/Payment";
import Feedback from "./pages/Feedback";
import RideHistory from "./pages/RideHistory";
import DriverDashboard from "./pages/DriverDashboard";

// Route protection
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/option" element={<Option />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Pages (Customer Only) */}
        <Route
          path="/customer-dashboard"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerDashboard />
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
      </Routes>
    </Router>
  );
}

export default App;
