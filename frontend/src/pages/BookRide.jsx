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
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);
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
  }, [navigate]);

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
      // Get available drivers
      const availableDrivers = await driverService.getAvailableDrivers();
      if (!availableDrivers || availableDrivers.length === 0) {
        throw new Error("No available drivers at the moment. Please try again later.");
      }

      // Select the first available driver
      const selectedDriver = availableDrivers[0];

      // Create ride in backend
      const rideData = {
        customer_id: user.user_id,
        driver_id: selectedDriver.driver_id,
        pickup_location: pickup,
        dropoff_location: dropoff
      };

      const response = await rideService.createRide(rideData);
      
      if (!response || !response.ride_id) {
        throw new Error("Failed to create ride. Please try again.");
      }

      // Save ride information to local storage for UI flow
      const ride = {
        ride_id: response.ride_id,
        pickup,
        dropoff,
        rideType,
        paymentMethod,
        fare: `$${pricing[rideType].fare.toFixed(2)}`,
        datetime: new Date().toLocaleString(),
        driver: selectedDriver.email,
        paid: false,
        feedback: null,
        rating: null,
        userEmail: user.email,
      };

      const history = JSON.parse(localStorage.getItem("rideHistory") || "[]");
      history.unshift(ride);
      localStorage.setItem("rideHistory", JSON.stringify(history));
      localStorage.setItem("latestBooking", JSON.stringify(ride));
      localStorage.setItem("trackingStep", 0);

      // Add initial GPS tracking
      try {
        await gpsService.updateGPSLocation({
          ride_id: response.ride_id,
          eta: 5,
          gps_image: "initial_location.jpg"
        });
      } catch (error) {
        console.error("Error setting initial GPS data:", error);
        // Don't throw here, as the ride was created successfully
      }

      Swal.fire({
        icon: "success",
        title: "Booking Confirmed!",
        text: "Redirecting to track your ride...",
        confirmButtonText: "OK",
      }).then(() => {
        navigate("/track", { state: { ride } });
      });
    } catch (error) {
      console.error("Ride booking error:", error);
      Swal.fire({
        icon: "error",
        title: "Booking Failed",
        text: error.detail || error.message || "Could not complete your booking. Please try again.",
      });
    } finally {
      setIsLoading(false);
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
                      "Confirm Booking"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
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
