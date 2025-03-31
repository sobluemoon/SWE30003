import React, { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import "animate.css";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { rideService, gpsService, driverService } from "../services/api";

const BookRide = () => {
  const [user, setUser] = useState(null);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [rideType, setRideType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [fareEstimate, setFareEstimate] = useState("");
  const [etaEstimate, setEtaEstimate] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [pendingRide, setPendingRide] = useState(null);
  const [searchingDriver, setSearchingDriver] = useState(false);
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);
  const statusCheckInterval = useRef(null);
  const navigate = useNavigate();

  const pricing = {
    bike: { fare: 5, eta: "5-10 mins" },
    car4: { fare: 10, eta: "8-15 mins" },
    car7: { fare: 15, eta: "10-20 mins" },
  };

  // Function to fetch location suggestions
  const fetchSuggestions = async (query, setSuggestions) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=vn`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  // Debounced function to prevent too many API calls
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Debounced fetch suggestions
  const debouncedFetchSuggestions = useRef(
    debounce((query, setSuggestions) => {
      fetchSuggestions(query, setSuggestions);
    }, 300)
  ).current;

  // Handle pickup input change
  const handlePickupChange = (e) => {
    const value = e.target.value;
    setPickup(value);
    debouncedFetchSuggestions(value, setPickupSuggestions);
    setShowPickupSuggestions(true);
  };

  // Handle dropoff input change
  const handleDropoffChange = (e) => {
    const value = e.target.value;
    setDropoff(value);
    debouncedFetchSuggestions(value, setDropoffSuggestions);
    setShowDropoffSuggestions(true);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion, isPickup) => {
    const displayName = suggestion.display_name;
    const coords = [parseFloat(suggestion.lat), parseFloat(suggestion.lon)];

    if (isPickup) {
      setPickup(displayName);
      setPickupCoords(coords);
      setShowPickupSuggestions(false);
    } else {
      setDropoff(displayName);
      setDropoffCoords(coords);
      setShowDropoffSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickupRef.current && !pickupRef.current.contains(event.target)) {
        setShowPickupSuggestions(false);
      }
      if (dropoffRef.current && !dropoffRef.current.contains(event.target)) {
        setShowDropoffSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser || storedUser.role !== "customer") {
      navigate("/login");
    } else {
      setUser(storedUser);
    }

    // Check if there's a pending ride
    const checkPendingRide = async () => {
      if (storedUser && storedUser.user_id) {
        try {
          const rides = await rideService.getUserRides(storedUser.user_id, "customer");
          const pendingRide = rides.find(ride => ride.status === "Pending");
          if (pendingRide) {
            setPendingRide(pendingRide);
            setSearchingDriver(true);
            startStatusCheck(pendingRide.ride_id);
          }
        } catch (error) {
          console.error("Error checking pending rides:", error);
        }
      }
    };

    checkPendingRide();

    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [navigate]);

  // Check ride status periodically
  const startStatusCheck = (rideId) => {
    // Clear any existing interval
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }

    // Start a new interval
    statusCheckInterval.current = setInterval(async () => {
      try {
        const rides = await rideService.getRides();
        const ride = rides.find(r => r.ride_id === rideId);
        
        // If ride status changes to "Ongoing" (driver accepted) or "Cancelled" (driver rejected)
        if (ride) {
          if (ride.status === "Ongoing") {
            // A driver accepted the ride
            clearInterval(statusCheckInterval.current);
            
            // Save ride information to local storage for UI flow
            const rideInfo = {
              ride_id: ride.ride_id,
              pickup: ride.pickup_location,
              dropoff: ride.dropoff_location,
              rideType,
              paymentMethod,
              fare: fareEstimate,
              datetime: new Date().toLocaleString(),
              driver: `Driver #${ride.driver_id}`,
              paid: false,
              feedback: null,
              rating: null,
              userEmail: user.email,
              status: "Ongoing"
            };

            const history = JSON.parse(localStorage.getItem("rideHistory") || "[]");
            history.unshift(rideInfo);
            localStorage.setItem("rideHistory", JSON.stringify(history));
            localStorage.setItem("latestBooking", JSON.stringify(rideInfo));
            localStorage.setItem("trackingStep", 1); // Start at driver on the way
            
            Swal.fire({
              icon: "success",
              title: "Driver Found!",
              text: "A driver has accepted your ride. Redirecting to track your ride...",
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              navigate("/track");
            });
          } else if (ride.status === "Cancelled") {
            // Ride was rejected by all drivers
            clearInterval(statusCheckInterval.current);
            setSearchingDriver(false);
            setPendingRide(null);
            
            Swal.fire({
              icon: "error",
              title: "No Drivers Available",
              text: "Sorry, no drivers are available at the moment. Please try again.",
            });
          }
        }
      } catch (error) {
        console.error("Error checking ride status:", error);
      }
    }, 3000); // Check every 3 seconds
  };

  const handleRideTypeChange = (value) => {
    setRideType(value);
    if (pricing[value]) {
      setFareEstimate(`$${pricing[value].fare.toFixed(2)}`);
      setEtaEstimate(pricing[value].eta);
    } else {
      setFareEstimate("");
      setEtaEstimate("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!rideType || !paymentMethod || !pickup || !dropoff) {
      Swal.fire("Missing Info", "Please fill in all fields.", "warning");
      return;
    }

    if (!pickupCoords || !dropoffCoords) {
      Swal.fire("Location Error", "Please select valid pickup and dropoff locations from the suggestions.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      // First try to get an available driver
      let driverId = null;
      try {
        const availableDrivers = await driverService.getAvailableDrivers();
        if (availableDrivers && availableDrivers.length > 0) {
          driverId = availableDrivers[0].driver_id;
        }
      } catch (error) {
        console.error("Error getting available drivers:", error);
      }

      // If we couldn't get an available driver, set it to the first driver in the system
      if (!driverId) {
        try {
          const drivers = await rideService.getDrivers();
          if (drivers && drivers.length > 0) {
            driverId = drivers[0].driver_id;
          } else {
            // Fallback to driver ID 4 based on the database schema
            driverId = 4;
          }
        } catch (error) {
          console.error("Error getting drivers:", error);
          // Last resort fallback to driver ID 4 based on the database schema
          driverId = 4;
        }
      }

      // Create ride in backend with pending status
      const rideData = {
        customer_id: user.user_id,
        driver_id: driverId, // Using a valid driver ID
        pickup_location: pickup,
        dropoff_location: dropoff
      };

      console.log("Creating new ride with data:", rideData);
      
      const response = await rideService.createRide(rideData);
      
      console.log("Ride created with response:", response);
      
      if (!response || !response.ride_id) {
        throw new Error("Failed to create ride. Please try again.");
      }

      // Save the pending ride and start checking for status updates
      setPendingRide(response);
      setSearchingDriver(true);
      
      // Save ride information to local storage for tracking
      const rideInfo = {
        ride_id: response.ride_id,
        pickup: pickup,
        dropoff: dropoff,
        rideType,
        paymentMethod,
        fare: fareEstimate,
        datetime: new Date().toLocaleString(),
        userEmail: user.email,
        status: "Pending"
      };
      
      console.log("Saving ride info to localStorage:", rideInfo);
      localStorage.setItem("latestBooking", JSON.stringify(rideInfo));
      localStorage.setItem("trackingStep", "0"); // Start at waiting for driver
      
      startStatusCheck(response.ride_id);

      // Add initial GPS tracking
      try {
        await gpsService.updateGPSLocation({
          ride_id: response.ride_id,
          eta: 5,
          gps_image: "initial_location.jpg"
        });
      } catch (error) {
        console.error("Error setting initial GPS data:", error);
      }

      Swal.fire({
        icon: "info",
        title: "Looking for Drivers...",
        text: "We're connecting you with a nearby driver. Please wait.",
        showConfirmButton: false,
        allowOutsideClick: false
      });
    } catch (error) {
      console.error("Ride booking error:", error);
      setSearchingDriver(false);
      Swal.fire({
        icon: "error",
        title: "Booking Failed",
        text: error.detail || error.message || "Could not complete your booking. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSearch = async () => {
    if (pendingRide && pendingRide.ride_id) {
      try {
        // Update ride status to cancelled
        await rideService.updateRideStatus(pendingRide.ride_id, "Cancelled");
        
        // Clear the interval and state
        clearInterval(statusCheckInterval.current);
        setSearchingDriver(false);
        setPendingRide(null);
        
        Swal.fire({
          icon: "info",
          title: "Search Cancelled",
          text: "Your driver search has been cancelled.",
        });
      } catch (error) {
        console.error("Error cancelling ride:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to cancel the ride search. Please try again.",
        });
      }
    }
  };

  const logout = () => {
    Swal.fire({
      title: "Logging out",
      text: "Please wait...",
      showConfirmButton: false,
      timer: 1000,
      willClose: () => {
        localStorage.removeItem("user");
        navigate("/");
      }
    });
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />
      <div
        className="container-fluid text-white py-5 hero-book"
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
        <div
          className="container text-center"
          style={{ position: "relative", zIndex: 2 }}
        >
          <h1 className="display-4 text-white fw-bold">Book Your Ride</h1>
          <p className="lead">
            Fill in the details to get fare & ETA, then confirm your ride
          </p>
        </div>
      </div>

      <div className="container my-5">
        {searchingDriver ? (
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="bg-light p-4 rounded shadow-sm animate__animated animate__fadeInUp text-center">
                <h2 className="mb-4">Finding You a Driver</h2>
                <div className="spinner-border text-primary mb-4" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mb-4">We're connecting you with a nearby driver who can accept your ride.</p>
                <p className="text-muted mb-4">This usually takes less than 2 minutes...</p>
                <button className="btn btn-danger" onClick={cancelSearch}>
                  Cancel Search
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="bg-light p-4 rounded shadow-sm animate__animated animate__fadeInUp">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3" ref={pickupRef}>
                    <label className="form-label">Pickup Location</label>
                    <input
                      type="text"
                      className="form-control"
                      value={pickup}
                      onChange={handlePickupChange}
                      required
                      placeholder="Enter pickup location"
                      disabled={isLoading}
                    />
                    {showPickupSuggestions && pickupSuggestions.length > 0 && (
                      <div className="suggestions-list">
                        {pickupSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="suggestion-item"
                            onClick={() => handleSuggestionSelect(suggestion, true)}
                          >
                            {suggestion.display_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mb-3" ref={dropoffRef}>
                    <label className="form-label">Drop-off Location</label>
                    <input
                      type="text"
                      className="form-control"
                      value={dropoff}
                      onChange={handleDropoffChange}
                      required
                      placeholder="Enter drop-off location"
                      disabled={isLoading}
                    />
                    {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                      <div className="suggestions-list">
                        {dropoffSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="suggestion-item"
                            onClick={() => handleSuggestionSelect(suggestion, false)}
                          >
                            {suggestion.display_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ride Type</label>
                    <select
                      className="form-select"
                      value={rideType}
                      onChange={(e) => handleRideTypeChange(e.target.value)}
                      required
                      disabled={isLoading}
                    >
                      <option value="">-- Select --</option>
                      <option value="bike">Bike</option>
                      <option value="car4">Car (4-Seater)</option>
                      <option value="car7">Car (7-Seater)</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Payment Method</label>
                    <select
                      className="form-select"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      required
                      disabled={isLoading}
                    >
                      <option value="">-- Select Payment Method --</option>
                      <option value="cash">Cash</option>
                      <option value="card">Credit/Debit Card</option>
                      <option value="ewallet">E-Wallet</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Fare Estimate</label>
                    <input
                      type="text"
                      className="form-control"
                      value={fareEstimate}
                      readOnly
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Estimated Time of Arrival (ETA)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={etaEstimate}
                      readOnly
                    />
                  </div>
                  <div className="d-flex justify-content-between">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-45"
                      onClick={() => navigate("/customer-dashboard")}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary w-45"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Processing...
                        </>
                      ) : (
                        "Find Driver"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />

      <style>{`
        .suggestions-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .suggestion-item {
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .suggestion-item:hover {
          background-color: #f8f9fa;
        }
        .mb-3 {
          position: relative;
        }
      `}</style>
    </>
  );
};

export default BookRide;
