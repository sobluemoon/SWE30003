// src/pages/DriverDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Swal from "sweetalert2";
import { rideService, notificationService } from "../services/api";

const DriverDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeRides, setActiveRides] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch pending ride requests
  const fetchPendingRequests = useCallback(async () => {
    if (!user || !user.user_id) return;
    
    try {
      // For demo purposes, we'll get all rides with "Pending" status
      // In a real app, you would filter by driver_id via the API
      const rides = await rideService.getRides();
      
      // Filter for pending rides, regardless of the driver_id
      // This allows drivers to see all pending rides in the system
      const pendingRides = rides.filter(ride => ride.status === "Pending");
      
      setPendingRequests(pendingRides);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load ride requests",
      });
    }
  }, [user]);

  // Fetch active rides
  const fetchActiveRides = useCallback(async () => {
    if (!user || !user.user_id) return;
    
    try {
      // Method 1: Get rides specifically assigned to this driver with status "Ongoing"
      let ongoingRides = [];
      try {
        const rides = await rideService.getUserRides(user.user_id, "driver");
        ongoingRides = rides.filter(ride => ride.status === "Ongoing");
      } catch (error) {
        console.error("Error getting user rides:", error);
        
        // Method 2: Fallback - get all rides and filter by driver_id and status
        try {
          const allRides = await rideService.getRides();
          ongoingRides = allRides.filter(
            ride => ride.driver_id === user.user_id && ride.status === "Ongoing"
          );
        } catch (fallbackError) {
          console.error("Error with fallback ride fetch:", fallbackError);
        }
      }
      
      setActiveRides(ongoingRides);
    } catch (error) {
      console.error("Error fetching rides:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load your active rides",
      });
    }
  }, [user]);

  // Setup interval to refresh data
  useEffect(() => {
    if (user) {
      fetchPendingRequests();
      fetchActiveRides();
      
      // Refresh data every 10 seconds
      const interval = setInterval(() => {
        fetchPendingRequests();
        fetchActiveRides();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [user, fetchPendingRequests, fetchActiveRides]);

  useEffect(() => {
    // Get user from navigation state or local storage
    const userData = location.state?.user || JSON.parse(localStorage.getItem("user") || "null");
    
    if (!userData || userData.role !== "driver") {
      navigate("/login");
      return;
    }

    setUser(userData);
  }, [navigate, location]);

  const handleAccept = async (ride) => {
    setIsLoading(true);
    try {
      // Parse ride_id to ensure it's a number
      const rideId = parseInt(ride.ride_id, 10);
      if (isNaN(rideId)) {
        throw new Error(`Invalid ride ID: ${ride.ride_id}`);
      }

      // First try the dedicated endpoint
      try {
        await notificationService.acceptRideRequest(rideId, user.user_id);
        console.log("Ride accepted successfully via dedicated endpoint");
      } catch (error) {
        console.error("Error with accept endpoint, falling back to status update:", error);
        
        // Fallback to simple status update
        await rideService.updateRideStatus(rideId, "Ongoing");
        console.log("Ride accepted successfully via status update");
      }
      
      // Refresh the lists
      await fetchPendingRequests();
      await fetchActiveRides();
      
      Swal.fire({
        icon: "success",
        title: "Ride Accepted!",
        text: "You have accepted the ride request.",
      });
    } catch (error) {
      console.error("Error accepting ride:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to accept ride request",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (ride) => {
    setIsLoading(true);
    try {
      // Parse ride_id to ensure it's a number
      const rideId = parseInt(ride.ride_id, 10);
      if (isNaN(rideId)) {
        throw new Error(`Invalid ride ID: ${ride.ride_id}`);
      }

      // First try the dedicated endpoint
      try {
        await notificationService.rejectRideRequest(rideId, user.user_id);
        console.log("Ride rejected successfully via dedicated endpoint");
      } catch (error) {
        console.error("Error with reject endpoint, falling back to status update:", error);
        
        // Fallback to simple status update
        await rideService.updateRideStatus(rideId, "Cancelled");
        console.log("Ride rejected successfully via status update");
      }
      
      // Refresh the list
      await fetchPendingRequests();
      
      Swal.fire({
        icon: "info",
        title: "Ride Rejected",
        text: "You have rejected the ride request",
      });
    } catch (error) {
      console.error("Error rejecting ride:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to reject ride request",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
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

      {/* New Ride Requests Section */}
      <div className="container my-5">
        <h3 className="mb-4">Ride Requests</h3>
        {isLoading ? (
          <div className="d-flex justify-content-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : pendingRequests.length > 0 ? (
          <div className="row">
            {pendingRequests.map((request) => (
              <div className="col-md-6 mb-3" key={request.ride_id}>
                <div className="card border-primary h-100">
                  <div className="card-header bg-primary text-white">
                    <h5 className="card-title mb-0">New Ride Request #{request.ride_id}</h5>
                  </div>
                  <div className="card-body">
                    <p><strong>From:</strong> {request.pickup_location}</p>
                    <p><strong>To:</strong> {request.dropoff_location}</p>
                    <p><strong>Customer ID:</strong> {request.customer_id}</p>
                    <div className="d-flex justify-content-between mt-3">
                      <button 
                        className="btn btn-success" 
                        onClick={() => handleAccept(request)}
                        disabled={isLoading}
                      >
                        Accept
                      </button>
                      <button 
                        className="btn btn-danger" 
                        onClick={() => handleReject(request)}
                        disabled={isLoading}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert alert-info">
            No new ride requests at the moment.
          </div>
        )}
      </div>

      {/* Dashboard Cards */}
      <div className="container my-5">
        <h3 className="mb-4">Driver Tools</h3>
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
          
          {/* Ride History */}
          <div className="col-md-4">
            <div className="bg-light text-center p-4 rounded shadow-sm h-100">
              <i className="fas fa-history fa-3x text-info mb-3"></i>
              <h5 className="mb-2">Ride History</h5>
              <p>View your completed rides</p>
              <button
                onClick={() => navigate("/driver-history", { state: { user } })}
                className="btn btn-outline-info btn-sm rounded-pill"
              >
                View History
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
