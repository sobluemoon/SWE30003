// src/pages/Option.jsx
import React, { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../assets/css/style.css"; // only if you moved custom styles here

const Option = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const step = parseInt(localStorage.getItem("trackingStep") || "0");
    const booking = JSON.parse(localStorage.getItem("latestBooking"));

    if (storedUser) {
      setUser(storedUser);

      if (booking && !booking.paid) {
        if (step < 4) {
          alert("Ride in progress. Please finish tracking before booking a new ride.");
          window.location.href = "/track";
        } else if (step === 4) {
          alert("You haven’t completed payment for your last ride.");
          window.location.href = "/payment";
        }
      }
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      {/* Hero Section */}
      <div className="container-fluid text-white py-5 hero-option" style={{
        background: "url('img/taxi.jpg') center center/cover no-repeat",
        position: "relative"
      }}>
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)"
        }}></div>
        <div className="container text-center" style={{ position: "relative", zIndex: 2 }}>
          <h1 className="display-4 text-white fw-bold">Get Started with SmartRide</h1>
          <p className="lead">Choose your path and join the ride</p>
        </div>
      </div>

      {/* Option Section */}
      <div className="container py-5">
        <div className="text-center mb-4">
          <h2 className="display-5">Welcome to SmartRide</h2>
          <p className="lead">Please select an option to continue</p>
        </div>
        <div className="row justify-content-center g-4">
          <div className="col-md-4">
            <div className="card text-center p-4 animate__animated animate__fadeInLeft">
              <i className="fas fa-sign-in-alt fa-3x text-primary mb-3"></i>
              <h5 className="mb-3">Already a user?</h5>
              <a href="/login" className="btn btn-primary rounded-pill px-4">Login</a>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card text-center p-4 animate__animated animate__fadeInRight">
              <i className="fas fa-user-plus fa-3x text-success mb-3"></i>
              <h5 className="mb-3">New to SmartRide?</h5>
              <a href="/register" className="btn btn-success rounded-pill px-4">Register</a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Option;
