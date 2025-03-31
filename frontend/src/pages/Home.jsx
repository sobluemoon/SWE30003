// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../assets/css/style.css";

const Home = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const logout = () => {
    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been successfully logged out.",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      localStorage.removeItem("user");
      window.location.href = "/";
    });
  };

  const handleBookClick = () => {
    if (!user) {
      window.location.href = "/option";
      return;
    }

    const booking = JSON.parse(localStorage.getItem("latestBooking"));
    const step = parseInt(localStorage.getItem("trackingStep") || "0");

    if (booking && booking.userEmail === user.email && !booking.paid) {
      if (step < 5) {
        Swal.fire({
          icon: "info",
          title: "Ride In Progress",
          text: "You already have a ride in progress. Please complete it before booking a new one.",
          confirmButtonText: "Track Ride",
        }).then(() => {
          window.location.href = "/track";
        });
        return;
      } else if (step === 5) {
        Swal.fire({
          icon: "info",
          title: "Pending Payment",
          text: "Please complete your payment before booking another ride.",
          confirmButtonText: "Go to Payment",
        }).then(() => {
          window.location.href = "/payment";
        });
        return;
      }
    }

    window.location.href = "/book";
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      {/* Hero Section */}
      <div
        className="container-fluid hero-section py-5 mb-5 text-white text-center"
        style={{
          background: "url('img/taxi.jpg') center center/cover no-repeat",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
          }}
        ></div>
        <div className="container py-5" style={{ position: "relative", zIndex: 2 }}>
          <h1 className="display-4 fw-bold text-white">Smart, Fast, Reliable Rides</h1>
          <p className="lead">Your journey starts here. Safe rides, happy passengers.</p>
          <button onClick={handleBookClick} className="btn btn-primary rounded-pill px-4 py-2">
            Book a Ride
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="container py-5">
        <div className="row g-4 text-center">
          <div className="col-md-4">
            <div className="bg-light p-4 rounded shadow-sm">
              <i className="fas fa-clock fa-2x text-primary mb-3"></i>
              <h5>24/7 Availability</h5>
              <p>Book a ride anytime, anywhere</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="bg-light p-4 rounded shadow-sm">
              <i className="fas fa-credit-card fa-2x text-primary mb-3"></i>
              <h5>Seamless Payment</h5>
              <p>Pay online with your preferred method</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="bg-light p-4 rounded shadow-sm">
              <i className="fas fa-car-side fa-2x text-primary mb-3"></i>
              <h5>Trusted Drivers</h5>
              <p>Verified and professional drivers only</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Home;
