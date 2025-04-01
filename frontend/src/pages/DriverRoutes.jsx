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

  // Define the ride process steps for driver perspective - matching the steps in TrackRide
  const rideSteps = [
    { id: "step1", label: "Accepted ride", icon: "fas fa-check-circle" },
    { id: "step2", label: "Driving to pickup", icon: "fas fa-car-side" },
    { id: "step3", label: "Arrived at pickup", icon: "fas fa-map-marker-alt" },
    { id: "step4", label: "Passenger picked up", icon: "fas fa-user-check" },
    { id: "step5", label: "Driving to destination", icon: "fas fa-route" },
    { id: "step6", label: "Ride completed", icon: "fas fa-flag-checkered" },
  ];

  // Function to update the ride status across all components
  const updateRideStatus = (rideId, step, status) => {
    console.log(`Updating ride ${rideId} to step ${step} with status ${status}`);
    
    // Update localStorage with the appropriate status flags
    switch (step) {
      case 3: // Driver arrived at pickup
        localStorage.setItem(`ride_${rideId}_driver_arrived_status`, 'true');
        localStorage.setItem(`driver_arrived_${rideId}`, 'true');
        localStorage.setItem(`ride_${rideId}_currentStep`, '3');
        
        // Dispatch custom event to notify other components
        document.dispatchEvent(new CustomEvent('driverArrivalConfirmed', { 
          detail: { rideId: rideId } 
        }));
        break;
        
      case 4: // Passenger picked up
        localStorage.setItem(`ride_${rideId}_pickup_status`, 'true');
        localStorage.setItem(`passenger_pickup_${rideId}`, 'true');
        localStorage.setItem(`ride_${rideId}_currentStep`, '4');
        
        // Dispatch custom event to notify other components
        document.dispatchEvent(new CustomEvent('ridePickupConfirmed', { 
          detail: { rideId: rideId } 
        }));
        break;
        
      case 5: // On the way to destination
        localStorage.setItem(`ride_${rideId}_enroute_status`, 'true');
        localStorage.setItem(`ride_${rideId}_currentStep`, '5');
        break;
        
      case 6: // Ride completed
        localStorage.setItem(`ride_${rideId}_completed_status`, 'true');
        localStorage.setItem(`ride_${rideId}_currentStep`, '6');
        
        // Dispatch custom event to notify other components
        document.dispatchEvent(new CustomEvent('rideCompleted', { 
          detail: { rideId: rideId } 
        }));
        break;
    }
    
    // Update trackingStep in localStorage to keep the customer's view in sync
    localStorage.setItem("trackingStep", step.toString());
  };

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
        
        // Add status properties to each ride
        const ridesWithStatus = ongoingRides.map(ride => {
          // Check localStorage for the ride's statuses
          const driverArrivedStatus = localStorage.getItem(`ride_${ride.ride_id}_driver_arrived_status`);
          const pickupStatus = localStorage.getItem(`ride_${ride.ride_id}_pickup_status`);
          const currentStepStr = localStorage.getItem(`ride_${ride.ride_id}_currentStep`);
          
          // Calculate the current step more accurately
          let currentStep;
          if (currentStepStr) {
            // Use the stored step if available
            currentStep = parseInt(currentStepStr, 10);
          } else {
            // Otherwise derive from status flags
            if (pickupStatus === 'true') {
              currentStep = 5; // On the way to destination
            } else if (driverArrivedStatus === 'true') {
              currentStep = 3; // Arrived at pickup
            } else {
              currentStep = 2; // Driving to pickup
            }
            // Store the calculated step for future reference
            localStorage.setItem(`ride_${ride.ride_id}_currentStep`, currentStep.toString());
          }
          
          return {
            ...ride,
            driverArrived: driverArrivedStatus === 'true',
            passengerPickedUp: pickupStatus === 'true',
            currentStep: currentStep
          };
        });
        
        setActiveRides(ridesWithStatus);
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

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const arriveAtPickup = async (ride) => {
    try {
      if (ride.driverArrived) {
        Swal.fire({
          icon: "info",
          title: "Already Arrived",
          text: "You've already marked this pickup as arrived.",
        });
        return;
      }

      const result = await Swal.fire({
        icon: "question",
        title: "Confirm Arrival",
        text: "Have you arrived at the pickup location?",
        showCancelButton: true,
        confirmButtonText: "Yes, I'm here",
        cancelButtonText: "No, not yet",
      });

      if (result.isConfirmed) {
        // Call the API to update arrival status - this updates the server and localStorage
        await rideService.setDriverArrived(ride.ride_id);
        
        // Update the local state
        const updatedRides = activeRides.map(r => {
          if (r.ride_id === ride.ride_id) {
            // Update to step 3 - Driver arrived at pickup
            return { ...r, driverArrived: true, currentStep: 3 };
          }
          return r;
        });
        setActiveRides(updatedRides);
        
        // Update ride status in localStorage and dispatch events
        updateRideStatus(ride.ride_id, 3, "Arrived at pickup");
        
        // Show success message with a shorter timeout to get to the next step faster
        await Swal.fire({
          icon: 'success',
          title: 'Arrival Confirmed',
          text: 'Your arrival at the pickup location has been confirmed.',
          timer: 1500,
          showConfirmButton: false
        });
        
        // Force sync localStorage timestamp to ensure cross-browser detection
        localStorage.setItem(`ride_${ride.ride_id}_update_timestamp`, Date.now().toString());
      }
    } catch (error) {
      console.error("Error confirming arrival:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to confirm arrival. Please try again.",
      });
    }
  };

  const confirmPickup = async (ride) => {
    try {
      if (!ride.driverArrived) {
        Swal.fire({
          icon: "warning",
          title: "Not Arrived Yet",
          text: "You need to confirm arrival at pickup location first.",
        });
        return;
      }

      if (ride.passengerPickedUp) {
        Swal.fire({
          icon: "info",
          title: "Already Picked Up",
          text: "You've already confirmed passenger pickup.",
        });
        return;
      }

      const result = await Swal.fire({
        icon: "question",
        title: "Confirm Pickup",
        text: "Has the passenger been picked up?",
        showCancelButton: true,
        confirmButtonText: "Yes, passenger is aboard",
        cancelButtonText: "No, still waiting",
      });

      if (result.isConfirmed) {
        // Call the API to update pickup status - this updates the server and localStorage
        await rideService.setPassengerPickup(ride.ride_id);
        
        // Update the local state
        const updatedRides = activeRides.map(r => {
          if (r.ride_id === ride.ride_id) {
            // Update to step 4 - Passenger picked up
            return { ...r, passengerPickedUp: true, currentStep: 4 };
          }
          return r;
        });
        setActiveRides(updatedRides);
        
        // Update ride status in localStorage and dispatch events for step 4
        updateRideStatus(ride.ride_id, 4, "Passenger picked up");
        
        // After a short delay, transition to step 5
        setTimeout(() => {
          // Update local state to step 5
          const updatedToEnRouteRides = activeRides.map(r => {
            if (r.ride_id === ride.ride_id) {
              return { ...r, passengerPickedUp: true, currentStep: 5 };
            }
            return r;
          });
          setActiveRides(updatedToEnRouteRides);
          
          // Update ride status to step 5 - On the way to destination
          updateRideStatus(ride.ride_id, 5, "On the way to destination");
          
          // Force sync localStorage timestamp to ensure cross-browser detection
          localStorage.setItem(`ride_${ride.ride_id}_update_timestamp`, Date.now().toString());
        }, 2000);
        
        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'Pickup Confirmed',
          text: 'The passenger pickup has been confirmed.',
          timer: 1500,
          showConfirmButton: false
        });
        
        // Force sync localStorage timestamp to ensure cross-browser detection
        localStorage.setItem(`ride_${ride.ride_id}_update_timestamp`, Date.now().toString());
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
      
      const result = await Swal.fire({
        icon: "question",
        title: "Complete Ride",
        text: "Has the passenger been dropped off at the destination?",
        showCancelButton: true,
        confirmButtonText: "Yes, ride complete",
        cancelButtonText: "No, still driving",
      });

      if (result.isConfirmed) {
        // Use the dedicated API method to complete the ride - this updates server and localStorage
        await rideService.completeRide(rideId);
        console.log("Ride completed successfully!");
        
        // Update ride status to step 6 - Ride completed
        updateRideStatus(rideId, 6, "Ride completed");
        
        // Update localStorage with additional metadata and force sync
        localStorage.setItem(`ride_${rideId}_completed_timestamp`, Date.now().toString());
        localStorage.setItem(`ride_${rideId}_update_timestamp`, Date.now().toString());
        
        Swal.fire({
          icon: "success",
          title: "Ride Completed",
          text: "The ride has been marked as completed.",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          // Remove this ride from the active rides list
          setActiveRides(activeRides.filter(r => r.ride_id !== rideId));
        });
      }
    } catch (error) {
      console.error("Error completing ride:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to complete the ride. Please try again.",
      });
    }
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      <div
        className="container-fluid text-white py-5 hero-header"
        style={{
          background: "linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url('img/cab-bg.jpg')",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <div className="container mt-5 py-3">
          <div className="row">
            <div className="col-lg-12 text-center">
              <h1 className="display-4 text-white animated slideInDown">Active Rides</h1>
              <p className="fs-5 text-white">Manage your current rides and view customer details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              {isLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Loading your rides...</p>
                </div>
              ) : activeRides.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-car fa-4x mb-3 text-muted"></i>
                  <h3>No Active Rides</h3>
                  <p className="text-muted">
                    You don't have any ongoing rides at the moment.
                  </p>
                  <button
                    className="btn btn-primary mt-2"
                    onClick={() => navigate("/driver-dashboard")}
                  >
                    Find Available Rides
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="mb-4">Ongoing Rides</h3>
                  {activeRides.map((ride) => (
                    <div
                      key={ride.ride_id}
                      className="card mb-4 border-0 shadow-sm"
                    >
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-8">
                            <h5 className="card-title mb-3">Ride #{ride.ride_id}</h5>
                            <p className="mb-2">
                              <strong>From:</strong> {ride.pickup_location}
                            </p>
                            <p className="mb-2">
                              <strong>To:</strong> {ride.dropoff_location}
                            </p>
                            <p className="mb-2">
                              <strong>Customer:</strong> {ride.customer_name || `Customer #${ride.customer_id}`}
                            </p>
                            
                            <div className="my-4">
                              <h6 className="mb-3">Progress</h6>
                              <div className="d-flex justify-content-between">
                                {rideSteps.map((step, index) => (
                                  <div 
                                    key={step.id} 
                                    className={`step text-center ${index < ride.currentStep ? 'text-success' : ''}`}
                                    style={{ flex: '1', maxWidth: '60px' }}
                                  >
                                    <div className={`step-icon mb-1 ${index < ride.currentStep ? 'bg-success text-white' : 'bg-light'}`} 
                                         style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', 
                                                  alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                      <i className={step.icon} style={{ fontSize: '14px' }}></i>
                                    </div>
                                    <div className="step-label" style={{ fontSize: '10px', lineHeight: '1.2' }}>
                                      {step.label}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <p className="mb-2">
                              <strong>Status:</strong> 
                              <span className="badge bg-success ms-2">Ongoing</span>
                              {ride.passengerPickedUp ? (
                                <span className="badge bg-info ms-2">Driving to Destination</span>
                              ) : ride.driverArrived ? (
                                <span className="badge bg-warning ms-2">At Pickup Location</span>
                              ) : (
                                <span className="badge bg-warning ms-2">En Route to Pickup</span>
                              )}
                            </p>
                            <p className="mb-2"><strong>Started:</strong> {new Date(ride.start_time).toLocaleString()}</p>
                            
                          </div>
                          <div className="col-md-4 d-flex flex-column justify-content-center align-items-center">
                            <div className="d-grid gap-2 w-100">
                              {!ride.driverArrived && (
                                <button
                                  className="btn btn-warning"
                                  onClick={() => arriveAtPickup(ride)}
                                >
                                  <i className="fas fa-map-marker-alt me-2"></i> Arrived at Pickup
                                </button>
                              )}
                              
                              {ride.driverArrived && !ride.passengerPickedUp && (
                                <button
                                  className="btn btn-success"
                                  onClick={() => confirmPickup(ride)}
                                >
                                  <i className="fas fa-user-check me-2"></i> Confirm Pickup
                                </button>
                              )}
                              
                              {ride.passengerPickedUp && (
                                <button
                                  className="btn btn-primary"
                                  onClick={() => completeRide(ride)}
                                >
                                  <i className="fas fa-flag-checkered me-2"></i> Complete Ride
                                </button>
                              )}
                              
                              <button
                                className="btn btn-outline-secondary"
                                onClick={() => navigate(`/route-map/${ride.ride_id}`)}
                              >
                                <i className="fas fa-map me-2"></i> View on Map
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default DriverRoutes; 