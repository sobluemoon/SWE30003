import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { rideService, userService } from "../services/api";

const CustomerDashboard = () => {
  const [user, setUser] = useState(null);
  const [showTrack, setShowTrack] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHistoryLink, setShowHistoryLink] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get user from navigation state or sessionStorage
    const userData = location.state?.user || JSON.parse(sessionStorage.getItem('user'));
    
    if (!userData || userData.role !== "customer") {
      navigate("/login");
      return;
    }

    setUser(userData);

    // Check for active rides and ride history
    const checkRides = async () => {
      try {
        const rides = await rideService.getUserRides(userData.user_id, "customer");
        
        // Check for active ride
        const activeRide = rides.find(ride => ride.status === "Ongoing");
        if (activeRide) {
          setShowTrack(true);
        }

        // Check for completed ride without feedback
        const completedRide = rides.find(ride => 
          ride.status === "Completed" && 
          !ride.feedback
        );
        if (completedRide) {
          setShowFeedback(true);
        }

        // Show history if there are any rides
        if (rides.length > 0) {
          setShowHistoryLink(true);
        }
      } catch (error) {
        console.error("Error fetching rides:", error);
      }
    };

    checkRides();
  }, [navigate, location]);

  const logout = () => {
    // Clear user data from both storage locations
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    
    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been successfully logged out.",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      navigate("/");
    });
  };

  const handleBookClick = async () => {
    try {
      const rides = await rideService.getUserRides(user.user_id, "customer");
      const activeRide = rides.find(ride => ride.status === "Ongoing");
      
      if (activeRide) {
        Swal.fire({
          icon: "info",
          title: "Ride In Progress",
          text: "Please complete your current ride before booking another.",
          confirmButtonText: "Track Ride",
        }).then(() => {
          navigate("/track", { state: { ride: activeRide } });
        });
        return;
      }

      navigate("/book", { state: { user } });
    } catch (error) {
      console.error("Error checking rides:", error);
      navigate("/book", { state: { user } });
    }
  };

  const handleFeedbackClick = async () => {
    try {
      const rides = await rideService.getUserRides(user.user_id, "customer");
      const completedRide = rides.find(ride => 
        ride.status === "Completed" && 
        !ride.feedback
      );

      if (!completedRide) {
        Swal.fire({
          icon: "warning",
          title: "No Recent Ride",
          text: "Please complete a ride before giving feedback.",
        });
        return;
      }

      navigate("/feedback", { state: { ride: completedRide, user } });
    } catch (error) {
      console.error("Error checking rides:", error);
    }
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
            Welcome, {user ? user.email.split("@")[0] : ""}!
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
