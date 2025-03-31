import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { rideService } from "../services/api";

const DriverRoutes = () => {
  const [user, setUser] = useState(null);
  const [activeRides, setActiveRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get user and rides from navigation state or fetch them
    const userData = location.state?.user || JSON.parse(localStorage.getItem("user"));
    
    if (!userData || userData.role !== "driver") {
      navigate("/login");
      return;
    }

    setUser(userData);

    const fetchActiveRides = async () => {
      try {
        setIsLoading(true);
        const rides = await rideService.getUserRides(userData.user_id, "driver");
        const ongoingRides = rides.filter(ride => ride.status === "Ongoing");
        
        // Add a 'passengerPickedUp' property to each ride
        const ridesWithPickupStatus = ongoingRides.map(ride => {
          // Check localStorage for the ride's pickup status
          const pickupStatus = localStorage.getItem(`ride_${ride.ride_id}_pickup_status`);
          return {
            ...ride,
            passengerPickedUp: pickupStatus === 'true'
          };
        });
        
        setActiveRides(ridesWithPickupStatus);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching rides:", error);
        setIsLoading(false);
      }
    };

    // Fetch initially
    fetchActiveRides();
    
    // Set up polling
    const interval = setInterval(fetchActiveRides, 10000);
    
    return () => clearInterval(interval);
  }, [navigate, location]);

  const confirmPickup = async (ride) => {
    try {
      console.log("Confirming passenger pickup for ride:", ride.ride_id);
      
      // Parse ride_id to ensure it's a number
      const rideId = parseInt(ride.ride_id, 10);
      if (isNaN(rideId)) {
        throw new Error(`Invalid ride ID: ${ride.ride_id}`);
      }
      
      // Show confirmation dialog
      const result = await Swal.fire({
        title: 'Confirm Passenger Pickup',
        text: 'Have you picked up the passenger?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, passenger is in the vehicle',
        cancelButtonText: 'No, not yet'
      });
      
      if (result.isConfirmed) {
        // Mark the passenger as picked up in localStorage
        localStorage.setItem(`ride_${rideId}_pickup_status`, 'true');
        
        // Dispatch a custom event to notify all listeners (including TrackRide in other tabs)
        const pickupEvent = new CustomEvent('ridePickupConfirmed', { 
          detail: { rideId: rideId } 
        });
        document.dispatchEvent(pickupEvent);
        
        // To ensure pickup is detected across browser tabs, also set a timestamp in localStorage
        localStorage.setItem(`ride_${rideId}_pickup_timestamp`, Date.now().toString());
        
        // Update the active rides list
        const updatedRides = activeRides.map(r => {
          if (r.ride_id === ride.ride_id) {
            return { ...r, passengerPickedUp: true };
          }
          return r;
        });
        setActiveRides(updatedRides);
        
        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'Pickup Confirmed',
          text: 'The passenger pickup has been confirmed.',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error("Error confirming pickup:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to confirm passenger pickup. Please try again.",
      });
    }
  };

  const completeRide = async (ride) => {
    try {
      console.log("Attempting to complete ride:", ride.ride_id, "with driver:", user.user_id);
      
      // Parse ride_id to ensure it's a number
      const rideId = parseInt(ride.ride_id, 10);
      if (isNaN(rideId)) {
        throw new Error(`Invalid ride ID: ${ride.ride_id}`);
      }
      
      // Use the dedicated API method to complete the ride
      await rideService.completeRide(rideId);
      console.log("Ride completed successfully!");
      
      // Clean up the pickup status from localStorage
      localStorage.removeItem(`ride_${rideId}_pickup_status`);
      
      Swal.fire({
        icon: "success",
        title: "Ride Completed",
        text: "The ride has been marked as completed.",
      }).then(() => {
        // Refresh the ride list
        const updatedRides = activeRides.filter(r => r.ride_id !== ride.ride_id);
        setActiveRides(updatedRides);
        
        // Suggest driver to view their history
        Swal.fire({
          icon: "info",
          title: "View Ride History?",
          text: "Would you like to view your ride history?",
          showCancelButton: true,
          confirmButtonText: "Yes, view history",
          cancelButtonText: "No, stay here"
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/driver-history", { state: { user } });
          }
        });
      });
    } catch (error) {
      console.error("Error completing ride:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to complete the ride. Please try again.",
      });
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
          <h1 className="fw-bold">Your Active Routes</h1>
          <p className="lead">Manage and complete your current rides</p>
        </div>
      </div>

      {/* Active Rides */}
      <div className="container py-5">
        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading your active rides...</p>
          </div>
        ) : activeRides.length > 0 ? (
          <div className="row">
            {activeRides.map((ride) => (
              <div className="col-lg-6 mb-4" key={ride.ride_id}>
                <div className="card border-primary">
                  <div className="card-header bg-primary text-white">
                    <h5 className="card-title mb-0">Ride #{ride.ride_id}</h5>
                  </div>
                  <div className="card-body">
                    <h6 className="mb-3">Customer ID: {ride.customer_id}</h6>
                    <p className="mb-2"><strong>Pickup:</strong> {ride.pickup_location}</p>
                    <p className="mb-2"><strong>Dropoff:</strong> {ride.dropoff_location}</p>
                    <p className="mb-2">
                      <strong>Status:</strong> 
                      <span className="badge bg-success ms-2">Ongoing</span>
                      {ride.passengerPickedUp ? (
                        <span className="badge bg-info ms-2">Passenger Picked Up</span>
                      ) : (
                        <span className="badge bg-warning ms-2">En Route to Pickup</span>
                      )}
                    </p>
                    <p className="mb-2"><strong>Started:</strong> {new Date(ride.start_time).toLocaleString()}</p>
                    
                    <div className="mt-4 d-flex justify-content-between">
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(ride.passengerPickedUp ? ride.dropoff_location : ride.pickup_location)}`, '_blank')}
                      >
                        <i className="fas fa-map-marker-alt me-2"></i>
                        Navigate to {ride.passengerPickedUp ? 'Dropoff' : 'Pickup'}
                      </button>
                      
                      {ride.passengerPickedUp ? (
                        <button
                          className="btn btn-success"
                          onClick={() => completeRide(ride)}
                        >
                          <i className="fas fa-check me-2"></i>
                          Complete Ride
                        </button>
                      ) : (
                        <button
                          className="btn btn-info text-white"
                          onClick={() => confirmPickup(ride)}
                        >
                          <i className="fas fa-user-check me-2"></i>
                          Confirm Pickup
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5">
            <i className="fas fa-car-side fa-3x text-muted mb-3"></i>
            <h4>No Active Rides</h4>
            <p className="text-muted">You don't have any ongoing rides at the moment.</p>
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

export default DriverRoutes; 