import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const CustomerDashboard = () => {
  const [user, setUser] = useState(null);
  const [showTrack, setShowTrack] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHistoryLink, setShowHistoryLink] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const latestBooking = JSON.parse(localStorage.getItem("latestBooking"));
    const rideHistory = JSON.parse(localStorage.getItem("rideHistory") || "[]");
    const step = parseInt(localStorage.getItem("trackingStep") || "0");

    if (!storedUser || storedUser.role !== "customer") {
      if (!storedUser) navigate("/login");
      else if (storedUser.role === "admin") navigate("/admin-dashboard");
      else navigate("/driver-dashboard");
      return;
    }

    setUser(storedUser);

    if (latestBooking && latestBooking.userEmail === storedUser.email) {
      if (!latestBooking.paid) {
        if (step < 5) {
          setShowTrack(true);
        } else if (step === 5) {
          setShowFeedback(true);
        }
      } else if (latestBooking.paid && !latestBooking.feedback) {
        setShowFeedback(true);
      }
    }

    if (rideHistory.length > 0) {
      setShowHistoryLink(true);
    }
  }, [navigate]);

  const logout = () => {
    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been successfully logged out.",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      localStorage.removeItem("user");
      navigate("/");
    });
  };

  const handleBookClick = () => {
    const latestBooking = JSON.parse(localStorage.getItem("latestBooking"));
    const step = parseInt(localStorage.getItem("trackingStep") || "0");

    if (latestBooking && latestBooking.userEmail === user.email && !latestBooking.paid) {
      if (step < 5) {
        Swal.fire({
          icon: "info",
          title: "Ride In Progress",
          text: "Please complete your current ride before booking another.",
          confirmButtonText: "Track Ride",
        }).then(() => {
          navigate("/track");
        });
        return;
      } else if (step === 5) {
        Swal.fire({
          icon: "info",
          title: "Pending Payment",
          text: "Please complete your payment before booking another ride.",
          confirmButtonText: "Go to Payment",
        }).then(() => {
          navigate("/payment");
        });
        return;
      }
    }

    navigate("/book");
  };

  const handleFeedbackClick = () => {
    const latestBooking = JSON.parse(localStorage.getItem("latestBooking"));
    const step = parseInt(localStorage.getItem("trackingStep") || "0");

    if (!latestBooking || latestBooking.userEmail !== user.email) {
      Swal.fire({
        icon: "warning",
        title: "No Recent Ride",
        text: "Please complete a ride before giving feedback.",
      });
      return;
    }

    if (!latestBooking.paid || step < 5) {
      Swal.fire({
        icon: "info",
        title: "Pending Payment",
        text: "Please complete your payment before leaving feedback.",
        confirmButtonText: "Go to Payment",
      }).then(() => {
        navigate("/payment");
      });
      return;
    }

    navigate("/feedback");
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      {/* Dashboard Hero */}
      <div
        className="container-fluid text-white py-5 dashboard-hero"
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
        <div className="container text-center" style={{ position: "relative", zIndex: 2 }}>
          <h1 className="display-4 text-white fw-bold">
            Welcome, {user ? user.fullname || user.email.split("@")[0] : ""}!
          </h1>
          <p className="lead">Manage your SmartRide experience here.</p>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="container my-5">
        <div className="row g-4 justify-content-center">
          {/* Book a Ride */}
          <div className="col-md-4 animate__animated animate__fadeInUp">
            <div className="bg-light text-center p-4 rounded shadow-sm h-100 dashboard-card">
              <i className="fas fa-car fa-3x text-primary mb-3"></i>
              <h5 className="mb-2">Book a Ride</h5>
              <p>Plan your trip easily</p>
              <button
                onClick={handleBookClick}
                className="btn btn-outline-primary btn-sm rounded-pill"
              >
                Go
              </button>
            </div>
          </div>

          {/* Track Ride */}
          {showTrack && (
            <div className="col-md-4 animate__animated animate__fadeInUp" style={{ animationDelay: "0.2s" }}>
              <div className="bg-light text-center p-4 rounded shadow-sm h-100 dashboard-card">
                <i className="fas fa-map-marker-alt fa-3x text-success mb-3"></i>
                <h5 className="mb-2">Track Ride</h5>
                <p>Live location updates</p>
                <a href="/track" className="btn btn-outline-success btn-sm rounded-pill">Go</a>
              </div>
            </div>
          )}

          {/* Feedback */}
          {showFeedback && (
            <div className="col-md-4 animate__animated animate__fadeInUp" style={{ animationDelay: "0.3s" }}>
              <div className="bg-light text-center p-4 rounded shadow-sm h-100 dashboard-card">
                <i className="fas fa-comments fa-3x text-warning mb-3"></i>
                <h5 className="mb-2">Feedback</h5>
                <p>Share your experience</p>
                <button
                  onClick={handleFeedbackClick}
                  className="btn btn-outline-warning btn-sm rounded-pill"
                >
                  Go
                </button>
              </div>
            </div>
          )}

          {/* History */}
          {showHistoryLink && (
            <div className="col-md-4 animate__animated animate__fadeInUp" style={{ animationDelay: "0.4s" }}>
              <div className="bg-light text-center p-4 rounded shadow-sm h-100 dashboard-card">
                <i className="fas fa-history fa-3x text-info mb-3"></i>
                <h5 className="mb-2">Ride History</h5>
                <p>View your past rides</p>
                <a href="/history" className="btn btn-outline-info btn-sm rounded-pill">Go</a>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default CustomerDashboard;
