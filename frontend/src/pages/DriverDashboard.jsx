// src/pages/DriverDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Swal from "sweetalert2";
import { rideService } from "../services/api";

const DriverDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeRides, setActiveRides] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get user from navigation state
    const userData = location.state?.user;
    
    if (!userData || userData.role !== "driver") {
      navigate("/login");
      return;
    }

    setUser(userData);

    // Fetch active rides
    const fetchActiveRides = async () => {
      try {
        const rides = await rideService.getUserRides(userData.user_id, "driver");
        const ongoingRides = rides.filter(ride => ride.status === "Ongoing");
        setActiveRides(ongoingRides);
      } catch (error) {
        console.error("Error fetching rides:", error);
      }
    };

    fetchActiveRides();
  }, [navigate, location]);

  const logout = () => {
    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been logged out successfully.",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      navigate("/");
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
            Welcome, {user ? user.email.split("@")[0] : "Driver"}!
          </h1>
          <p className="lead">Manage your SmartRide responsibilities here.</p>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="container my-5">
        <div className="row g-4 justify-content-center">
          {/* Active Rides */}
          {activeRides.length > 0 && (
            <div className="col-md-4">
              <div className="bg-light text-center p-4 rounded shadow-sm h-100">
                <i className="fas fa-route fa-3x text-primary mb-3"></i>
                <h5 className="mb-2">Active Rides</h5>
                <p>You have {activeRides.length} active ride{activeRides.length > 1 ? 's' : ''}</p>
                <button 
                  onClick={() => navigate("/driver-routes", { state: { user, rides: activeRides } })}
                  className="btn btn-outline-primary btn-sm rounded-pill"
                >
                  View Rides
                </button>
              </div>
            </div>
          )}

          {/* Availability */}
          <div className="col-md-4">
            <div className="bg-light text-center p-4 rounded shadow-sm h-100">
              <i className="fas fa-user-clock fa-3x text-success mb-3"></i>
              <h5 className="mb-2">Availability</h5>
              <p>Update your driving schedule</p>
              <button 
                onClick={() => navigate("/availability", { state: { user } })}
                className="btn btn-outline-success btn-sm rounded-pill"
              >
                Update
              </button>
            </div>
          </div>

          {/* Ratings */}
          <div className="col-md-4">
            <div className="bg-light text-center p-4 rounded shadow-sm h-100">
              <i className="fas fa-star fa-3x text-warning mb-3"></i>
              <h5 className="mb-2">My Ratings</h5>
              <p>See your passenger feedback</p>
              <button 
                onClick={() => navigate("/driver-feedback", { state: { user } })}
                className="btn btn-outline-warning btn-sm rounded-pill"
              >
                View Feedback
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default DriverDashboard;
