import React, { useEffect, useState, useCallback } from "react";
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
  const [activeRide, setActiveRide] = useState(null);
  const [pendingRide, setPendingRide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch user's ride data
  const fetchRideData = useCallback(async (userId, userData) => {
    try {
      setIsLoading(true);
      const rides = await rideService.getUserRides(userId, "customer");
      console.log("Customer rides:", rides);
      
      // Check for active ride
      const activeRide = rides.find(ride => ride.status === "Ongoing");
      if (activeRide) {
        console.log("Found active ride:", activeRide);
        setActiveRide(activeRide);
        setShowTrack(true);
        
        // Save to localStorage for tracking
        const rideInfo = {
          ride_id: activeRide.ride_id,
          pickup: activeRide.pickup_location,
          dropoff: activeRide.dropoff_location,
          status: "Ongoing",
          driver: `Driver #${activeRide.driver_id}`,
          userEmail: userData?.email || "customer",
          datetime: new Date(activeRide.start_time || Date.now()).toLocaleString()
        };
        console.log("Saving active ride to localStorage:", rideInfo);
        localStorage.setItem("latestBooking", JSON.stringify(rideInfo));
        localStorage.setItem("trackingStep", "1"); // Driver on the way
      } else {
        setActiveRide(null);
        setShowTrack(false);
      }

      // Check for pending ride
      const pendingRide = rides.find(ride => ride.status === "Pending");
      if (pendingRide) {
        console.log("Found pending ride:", pendingRide);
        setPendingRide(pendingRide);
        
        // Only save pending ride info if there's no active ride
        if (!activeRide) {
          const pendingRideInfo = {
            ride_id: pendingRide.ride_id,
            pickup: pendingRide.pickup_location,
            dropoff: pendingRide.dropoff_location,
            status: "Pending",
            userEmail: userData?.email || "customer",
            datetime: new Date(pendingRide.start_time || Date.now()).toLocaleString()
          };
          console.log("Saving pending ride to localStorage:", pendingRideInfo);
          localStorage.setItem("latestBooking", JSON.stringify(pendingRideInfo));
          localStorage.setItem("trackingStep", "0"); // Waiting for driver
        }
      } else {
        setPendingRide(null);
      }

      // Check for completed ride without feedback
      const completedRide = rides.find(ride => 
        ride.status === "Completed" && 
        !ride.feedback
      );
      if (completedRide) {
        setShowFeedback(true);
      } else {
        setShowFeedback(false);
      }

      // Show history if there are any rides
      if (rides.length > 0) {
        setShowHistoryLink(true);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching rides:", error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get user from navigation state or sessionStorage/localStorage
    const userData = location.state?.user || JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || "null");
    
    if (!userData || userData.role !== "customer") {
      navigate("/login");
      return;
    }

    setUser(userData);

    // Fetch ride data initially
    fetchRideData(userData.user_id, userData);
    
    // Set up polling for ride updates (every 10 seconds)
    const interval = setInterval(() => {
      if (userData && userData.user_id) {
        fetchRideData(userData.user_id, userData);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [navigate, location, fetchRideData]);

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
    if (activeRide) {
      Swal.fire({
        icon: "info",
        title: "Ride In Progress",
        text: "Please complete your current ride before booking another.",
        confirmButtonText: "Track Ride",
      }).then(() => {
        navigate("/track");
      });
      return;
    }
    
    if (pendingRide) {
      Swal.fire({
        icon: "info",
        title: "Ride Pending",
        text: "You already have a ride waiting for a driver. Would you like to track it?",
        showCancelButton: true,
        confirmButtonText: "Yes, track it",
        cancelButtonText: "Cancel the ride",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/track");
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          // Cancel the ride
          rideService.updateRideStatus(pendingRide.ride_id, "Cancelled")
            .then(() => {
              Swal.fire({
                icon: "success",
                title: "Ride Cancelled",
                text: "Your pending ride has been cancelled."
              }).then(() => {
                fetchRideData(user.user_id, user);
              });
            })
            .catch(error => {
              console.error("Error cancelling ride:", error);
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to cancel the ride. Please try again."
              });
            });
        }
      });
      return;
    }

    navigate("/book");
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

  const handleCancelPendingRide = () => {
    if (pendingRide) {
      Swal.fire({
        title: "Cancel Ride?",
        text: "Are you sure you want to cancel your pending ride?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, cancel it",
        cancelButtonText: "No, keep waiting"
      }).then((result) => {
        if (result.isConfirmed) {
          rideService.updateRideStatus(pendingRide.ride_id, "Cancelled")
            .then(() => {
              Swal.fire({
                icon: "success",
                title: "Ride Cancelled",
                text: "Your pending ride has been cancelled."
              }).then(() => {
                fetchRideData(user.user_id, user);
              });
            })
            .catch(error => {
              console.error("Error cancelling ride:", error);
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to cancel the ride. Please try again."
              });
            });
        }
      });
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

      {/* Active Ride Alert */}
      {(activeRide || pendingRide) && (
        <div className="container mt-4">
          {activeRide && (
            <div className="alert alert-success d-flex align-items-center justify-content-between">
              <div>
                <i className="fas fa-car-side me-2"></i>
                <strong>You have an active ride in progress!</strong> 
                <p className="mb-0 mt-1 small">
                  <strong>Ride #:</strong> {activeRide.ride_id} | 
                  <strong> From:</strong> {activeRide.pickup_location?.substring(0, 30)}... | 
                  <strong> To:</strong> {activeRide.dropoff_location?.substring(0, 30)}...
                </p>
              </div>
              <button 
                className="btn btn-sm btn-success" 
                onClick={() => {
                  // Ensure latest ride data is in localStorage before tracking
                  const rideInfo = {
                    ride_id: activeRide.ride_id,
                    pickup: activeRide.pickup_location,
                    dropoff: activeRide.dropoff_location,
                    status: "Ongoing",
                    driver: `Driver #${activeRide.driver_id}`,
                    userEmail: user?.email,
                    datetime: new Date(activeRide.start_time || Date.now()).toLocaleString()
                  };
                  localStorage.setItem("latestBooking", JSON.stringify(rideInfo));
                  localStorage.setItem("trackingStep", "1"); // Driver on the way
                  navigate("/track");
                }}
              >
                Track Ride
              </button>
            </div>
          )}

          {pendingRide && !activeRide && (
            <div className="alert alert-info d-flex align-items-center justify-content-between">
              <div>
                <i className="fas fa-search me-2"></i>
                <strong>Searching for a driver for your ride!</strong>
                <p className="mb-0 mt-1 small">
                  <strong>Ride #:</strong> {pendingRide.ride_id} | 
                  <strong> From:</strong> {pendingRide.pickup_location?.substring(0, 30)}... | 
                  <strong> To:</strong> {pendingRide.dropoff_location?.substring(0, 30)}...
                </p>
              </div>
              <div>
                <button 
                  className="btn btn-sm btn-primary me-2" 
                  onClick={() => {
                    // Ensure latest ride data is in localStorage before tracking
                    const pendingRideInfo = {
                      ride_id: pendingRide.ride_id,
                      pickup: pendingRide.pickup_location,
                      dropoff: pendingRide.dropoff_location,
                      status: "Pending",
                      userEmail: user?.email,
                      datetime: new Date(pendingRide.start_time || Date.now()).toLocaleString()
                    };
                    localStorage.setItem("latestBooking", JSON.stringify(pendingRideInfo));
                    localStorage.setItem("trackingStep", "0"); // Waiting for driver
                    navigate("/track");
                  }}
                >
                  Track Status
                </button>
                <button 
                  className="btn btn-sm btn-outline-danger" 
                  onClick={handleCancelPendingRide}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="container my-5">
        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading your dashboard...</p>
          </div>
        ) : (
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
                  <button 
                    onClick={() => navigate("/track")} 
                    className="btn btn-outline-success btn-sm rounded-pill"
                  >
                    Go
                  </button>
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
                  <button
                    onClick={() => navigate("/history")}
                    className="btn btn-outline-info btn-sm rounded-pill"
                  >
                    Go
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
};

export default CustomerDashboard;
