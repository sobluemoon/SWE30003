// src/pages/DriverDashboard.jsx
import React, { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Swal from "sweetalert2";

const DriverDashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser) {
      window.location.href = "/login";
    } else if (storedUser.role !== "driver") {
      if (storedUser.role === "admin") {
        window.location.href = "/admin-dashboard";
      } else {
        window.location.href = "/customer-dashboard";
      }
    } else {
      setUser(storedUser);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been logged out successfully.",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      window.location.href = "/";
    });
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      {/* Hero Section */}
      <div className="container-fluid bg-dark text-white py-5">
        <div className="container text-center">
          <h1 className="display-4 fw-bold">
            Welcome, {user ? user.fullname || user.email.split("@")[0] : "Driver"}!
          </h1>
          <p className="lead">Manage your SmartRide responsibilities here.</p>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="container my-5">
        <div className="row g-4 justify-content-center">
          <div className="col-md-4">
            <div className="bg-light text-center p-4 rounded shadow-sm h-100">
              <i className="fas fa-route fa-3x text-primary mb-3"></i>
              <h5 className="mb-2">My Routes</h5>
              <p>View upcoming ride assignments</p>
              <a href="/driver-routes" className="btn btn-outline-primary btn-sm rounded-pill">Go</a>
            </div>
          </div>
          <div className="col-md-4">
            <div className="bg-light text-center p-4 rounded shadow-sm h-100">
              <i className="fas fa-user-clock fa-3x text-success mb-3"></i>
              <h5 className="mb-2">Availability</h5>
              <p>Update your driving schedule</p>
              <a href="/availability" className="btn btn-outline-success btn-sm rounded-pill">Go</a>
            </div>
          </div>
          <div className="col-md-4">
            <div className="bg-light text-center p-4 rounded shadow-sm h-100">
              <i className="fas fa-star fa-3x text-warning mb-3"></i>
              <h5 className="mb-2">My Ratings</h5>
              <p>See your passenger feedback</p>
              <a href="/driver-feedback" className="btn btn-outline-warning btn-sm rounded-pill">Go</a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default DriverDashboard;
