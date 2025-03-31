import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { rideService } from "../services/api";

const DriverHistory = () => {
  const [user, setUser] = useState(null);
  const [completedRides, setCompletedRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch driver's completed rides
  const fetchCompletedRides = useCallback(async (driverId) => {
    try {
      setIsLoading(true);
      console.log("Fetching completed rides for driver:", driverId);
      
      // First try to get rides using the getUserRides endpoint
      let rides = [];
      try {
        rides = await rideService.getUserRides(driverId, "driver");
        console.log("Rides received from getUserRides:", rides);
      } catch (error) {
        console.error("Error using getUserRides:", error);
        
        // Fallback: get all rides and filter
        try {
          const allRides = await rideService.getRides();
          rides = allRides.filter(ride => ride.driver_id === driverId);
          console.log("Rides received from fallback method:", rides);
        } catch (fallbackError) {
          console.error("Error with fallback method:", fallbackError);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load your ride history",
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Filter for completed rides
      const completed = rides.filter(ride => ride.status === "Completed");
      console.log("Completed rides:", completed);
      setCompletedRides(completed);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching ride history:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load your ride history",
      });
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get user from navigation state or local storage
    const userData = location.state?.user || JSON.parse(localStorage.getItem("user") || "null");
    
    if (!userData || userData.role !== "driver") {
      navigate("/login");
      return;
    }

    setUser(userData);
    fetchCompletedRides(userData.user_id);
  }, [navigate, location, fetchCompletedRides]);

  const generateStars = (rating) => {
    if (!rating) return <span className="text-muted">Not rated</span>;
    
    return [...Array(5)].map((_, i) => (
      <i
        key={i}
        className={`fa-star ${i < rating ? "fas text-warning" : "far text-warning"}`}
      ></i>
    ));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return dateString;
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
        <div className="container">
          <h1 className="fw-bold">Your Ride History</h1>
          <p className="lead">View details of your completed rides</p>
        </div>
      </div>

      {/* Completed Rides Table */}
      <div className="container py-5">
        <h3 className="mb-4">Completed Rides</h3>
        
        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading your ride history...</p>
          </div>
        ) : completedRides.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-primary">
                <tr>
                  <th>#</th>
                  <th>Ride ID</th>
                  <th>Pickup</th>
                  <th>Dropoff</th>
                  <th>Customer</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Fare</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {completedRides.map((ride, index) => (
                  <tr key={ride.ride_id}>
                    <td>{index + 1}</td>
                    <td>{ride.ride_id}</td>
                    <td>{ride.pickup_location}</td>
                    <td>{ride.dropoff_location}</td>
                    <td>Customer #{ride.customer_id}</td>
                    <td>{formatDate(ride.start_time)}</td>
                    <td>{formatDate(ride.end_time)}</td>
                    <td>${ride.fare || "N/A"}</td>
                    <td>{generateStars(ride.rating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-5">
            <i className="fas fa-history fa-3x text-muted mb-3"></i>
            <h4>No Completed Rides</h4>
            <p className="text-muted">
              You haven't completed any rides yet. They will appear here once completed.
            </p>
            <button
              className="btn btn-primary mt-3"
              onClick={() => navigate("/driver-dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
};

export default DriverHistory; 