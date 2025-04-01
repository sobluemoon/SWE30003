import React, { useEffect, useState, useRef, useReducer, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "animate.css";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { rideService } from "../services/api";

const TrackRide = () => {
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState(0);
  const [driverAccepted, setDriverAccepted] = useState(false);
  const [driverInfo, setDriverInfo] = useState(null);
  const [coordinates, setCoordinates] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifiedPickup, setNotifiedPickup] = useState(false);
  const [notifiedArrival, setNotifiedArrival] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  // Add state to track if step transitions are in progress
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Add initialized state to prevent race conditions during mount
  const [initialized, setInitialized] = useState(false);
  
  // Add a useReducer to force rerenders when needed
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  // Track the last update time to prevent too frequent updates
  const lastUpdateTime = useRef(0);
  // Track current step in a ref for access in callbacks
  const currentStepRef = useRef(0);
  
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);
  const statusCheckInterval = useRef(null);
  const pickupCheckInterval = useRef(null);
  const navigate = useNavigate();

  // Add last timestamp check ref to detect changes between polling intervals
  const lastTimestampCheck = useRef(0);

  const steps = [
    { id: "step1", label: "Driver accepted your ride", icon: "fas fa-user-check" },
    { id: "step2", label: "Driver on the way to pickup", icon: "fas fa-car-side" },
    { id: "step3", label: "Driver arrived at pickup", icon: "fas fa-map-marker-alt" },
    { id: "step4", label: "Passenger picked up", icon: "fas fa-user-check" },
    { id: "step5", label: "On the way to destination", icon: "fas fa-route" },
    { id: "step6", label: "Drop-off complete", icon: "fas fa-flag-checkered" },
  ];

  // Function to update step with forced re-render (wrapped in useCallback)
  const updateStep = useCallback((newStep, newCompletedSteps) => {
    // Perform sanity checks on the new step value
    if (newStep < 0 || newStep >= steps.length) {
      console.error(`Invalid step value: ${newStep}. Must be between 0 and ${steps.length - 1}`);
      return;
    }
    
    // Check if we're already transitioning or if this update is too soon after the last one
    const now = Date.now();
    if (isTransitioning || (now - lastUpdateTime.current < 500)) {
      console.log(`Skipping update to step ${newStep} - already transitioning or too soon`);
      return;
    }
    
    // If step hasn't changed, just ensure completedSteps is updated
    if (currentStepRef.current === newStep) {
      if (newCompletedSteps) {
        setCompletedSteps(prev => {
          // Create new array only if changes are needed
          if (newCompletedSteps.length === prev.length && 
              newCompletedSteps.every(step => prev.includes(step))) {
            return prev;
          }
          return [...newCompletedSteps];
        });
      }
      return;
    }
    
    console.log(`Updating step from ${currentStepRef.current} to ${newStep} with force update`);
    setIsTransitioning(true);
    lastUpdateTime.current = now;
    
    // Update both state and ref
    setStep(newStep);
    currentStepRef.current = newStep;
    
    if (newCompletedSteps) {
      setCompletedSteps([...newCompletedSteps]);
    }
    localStorage.setItem("trackingStep", newStep.toString());
    
    // Force a UI update
    forceUpdate();
    
    // Reset transitioning flag after a short delay
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500); // Increased delay for better protection
  }, [isTransitioning, steps.length]); // Removed step dependency to avoid stale closures

  // Synchronize step state with ref
  useEffect(() => {
    currentStepRef.current = step;
  }, [step]);

  // Function to check and fix step mismatch with localStorage
  const checkAndFixStepMismatch = useCallback(() => {
    const storedStepStr = localStorage.getItem("trackingStep");
    if (!storedStepStr) return;
    
    const storedStep = parseInt(storedStepStr, 10);
    if (isNaN(storedStep)) return;
    
    // If there's a mismatch between state and localStorage, fix it
    if (storedStep !== currentStepRef.current) {
      console.log(`Step mismatch detected: state=${currentStepRef.current}, localStorage=${storedStep}`);
      
      // If localStorage is ahead, update the state to match
      if (storedStep > currentStepRef.current) {
        console.log(`Fixing mismatch: Updating state to match localStorage (${storedStep})`);
        
        // Build completed steps array
        const newCompletedSteps = [];
        for (let i = 0; i < storedStep; i++) {
          newCompletedSteps.push(i);
        }
        
        // Direct state update to avoid animation
        setStep(storedStep);
        currentStepRef.current = storedStep;
        setCompletedSteps(newCompletedSteps);
      } 
      // If state is ahead, update localStorage to match
      else {
        console.log(`Fixing mismatch: Updating localStorage to match state (${currentStepRef.current})`);
        localStorage.setItem("trackingStep", currentStepRef.current.toString());
      }
    }
  }, []);

  // Function to geocode address to coordinates
  const geocodeAddress = async (address) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=vn`
      );
      const data = await response.json();
      if (data && data[0]) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      throw new Error('Location not found');
    } catch (error) {
      console.error('Error geocoding address:', error);
      setError(`Could not find location: ${address}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get route between two points
  const getRoute = async (start, end) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `http://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.code === 'Ok') {
        return data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      }
      throw new Error('Could not calculate route');
    } catch (error) {
      console.error('Error fetching route:', error);
      setError('Could not calculate route. Using straight line instead.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize coordinates when booking is loaded
  useEffect(() => {
    const initializeCoordinates = async () => {
      if (booking) {
        setIsLoading(true);
        setError(null);
        try {
          const pickupCoords = await geocodeAddress(booking.pickup);
          const dropoffCoords = await geocodeAddress(booking.dropoff);
          
          if (pickupCoords && dropoffCoords) {
            setCoordinates({
              pickup: pickupCoords,
              dropoff: dropoffCoords
            });
          } else {
            throw new Error('Could not find locations');
          }
        } catch (error) {
          setError('Using default coordinates for demonstration');
          setCoordinates({
            pickup: [10.8231, 106.6297],
            dropoff: [10.7831, 106.6997]
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeCoordinates();
  }, [booking]);

  // Check ride status periodically
  const startStatusCheck = (rideId) => {
    // Clear any existing interval
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }

    console.log(`Starting status check for ride ID: ${rideId}`);
    
    // Ensure rideId is a number
    const parsedRideId = parseInt(rideId, 10);
    
    if (isNaN(parsedRideId)) {
      console.error(`Invalid ride ID: ${rideId}`);
      return;
    }

    // Start a new interval
    statusCheckInterval.current = setInterval(async () => {
      try {
        console.log(`Checking status for ride ID: ${parsedRideId}`);
        
        // Get the ride status directly using the dedicated endpoint
        try {
          const rideDetails = await rideService.getRideStatus(parsedRideId);
          console.log(`Direct status check result:`, rideDetails);
          
          if (rideDetails) {
            // If we have a valid response, update driver info if available
            if (rideDetails.driver_id && !driverInfo) {
              setDriverInfo({
                driver_id: rideDetails.driver_id,
                email: rideDetails.driver_email || `Driver #${rideDetails.driver_id}`
              });
            }
            
            // Update UI based on ride status
            handleRideStatusUpdate(parsedRideId, rideDetails.status, rideDetails.driver_id);
            return;
          }
        } catch (statusError) {
          console.error("Error with direct status check:", statusError);
        }
        
        // Fallback: get all rides and find the one with matching ID
        console.log("Falling back to getting all rides");
        const rides = await rideService.getRides();
        console.log(`Got ${rides.length} rides, looking for ID: ${parsedRideId}`);
        
        const ride = rides.find(r => r.ride_id === parsedRideId);
        
        if (ride) {
          console.log(`Found ride with ID ${parsedRideId}, status: ${ride.status}`);
          handleRideStatusUpdate(parsedRideId, ride.status, ride.driver_id);
        } else {
          console.error(`Ride with ID ${parsedRideId} not found`);
        }
      } catch (error) {
        console.error("Error checking ride status:", error);
      }
    }, 3000); // Check every 3 seconds
  };
  
  // Function to handle ride status updates
  const handleRideStatusUpdate = async (rideId, status, driverId) => {
    // Get driver info if not already loaded
    if (driverId && !driverInfo) {
      try {
        const drivers = await rideService.getDrivers();
        const driver = drivers.find(d => d.driver_id === driverId);
        if (driver) {
          setDriverInfo(driver);
        }
      } catch (err) {
        console.error("Error fetching driver info:", err);
      }
    }

    // Update UI based on ride status
    if (status === "Ongoing" && !driverAccepted) {
      console.log("Ride now ONGOING - driver has accepted");
      setDriverAccepted(true);
      updateStep(1, [0]); // Driver accepted your ride
      localStorage.setItem("trackingStep", "1");
      
      // Update the booking information with the driver details
      if (booking) {
        const updatedBooking = { 
          ...booking, 
          driver: `Driver #${driverId || 'Unknown'}`,
          status: "Ongoing"
        };
        localStorage.setItem("latestBooking", JSON.stringify(updatedBooking));
        setBooking(updatedBooking);
      }
      
      // Start checking for driver pickup confirmation
      startPickupCheck(rideId);
      
    } else if (status === "Completed" && step < 6) {
      console.log("Ride now COMPLETED");
      updateStep(6, [0, 1, 2, 3, 4, 5]); // Drop-off complete
    } else if (status === "Cancelled") {
      console.log("Ride CANCELLED");
      // Clear interval since ride is cancelled
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      if (pickupCheckInterval.current) {
        clearInterval(pickupCheckInterval.current);
      }
      
      Swal.fire({
        icon: "error", 
        title: "Ride Cancelled",
        text: "This ride has been cancelled.",
        confirmButtonText: "Return to Dashboard",
      }).then(() => {
        navigate("/customer-dashboard");
      });
    }
  };

  // Function to start checking for pickup confirmation
  const startPickupCheck = (rideId) => {
    // Clear any existing interval
    if (pickupCheckInterval.current) {
      clearInterval(pickupCheckInterval.current);
    }
    
    console.log(`Starting pickup check for ride ID: ${rideId}`);
    
    // Check immediately on start
    checkServerStatus();
    
    // Start a new interval
    pickupCheckInterval.current = setInterval(checkServerStatus, 2000); // Check every 2 seconds
    
    // New function to check status directly from the server (works across browsers)
    async function checkServerStatus() {
      try {
        // Get detailed status from server
        const detailedStatus = await rideService.getDetailedRideStatus(rideId);
        console.log("Detailed status from server:", detailedStatus);
        
        // Extract the relevant status information
        const driverArrived = detailedStatus.driver_arrived;
        const passengerPickedUp = detailedStatus.passenger_picked_up;
        const rideStatus = detailedStatus.status;
        
        console.log(`SERVER STATUS: driverArrived=${driverArrived}, passengerPickedUp=${passengerPickedUp}, rideStatus=${rideStatus}, currentStep=${step}`);
        
        // Process driver arrival status
        if (driverArrived && step < 3) {
          console.log("SERVER UPDATE: Driver has arrived at pickup location");
          updateStep(3, [0, 1, 2]);
          
          // Show notification if not previously shown
          if (!notifiedArrival) {
            Swal.fire({
              icon: "info",
              title: "Driver Has Arrived",
              text: "Your driver has arrived at the pickup location.",
              timer: 4000,
              timerProgressBar: true,
              showConfirmButton: false,
            });
            setNotifiedArrival(true);
          }
        }
        
        // Process passenger pickup status
        if (passengerPickedUp && step < 4) {
          console.log("SERVER UPDATE: Passenger has been picked up");
          updateStep(4, [0, 1, 2, 3]);
          
          // Show notification if not previously shown
          if (!notifiedPickup) {
            Swal.fire({
              icon: "success",
              title: "Pickup Confirmed",
              text: "The driver has confirmed your pickup. You're on your way to your destination!",
              timer: 4000,
              timerProgressBar: true,
              showConfirmButton: false,
            });
            setNotifiedPickup(true);
          }
          
          // After a short delay, move to step 5 (On the way to destination)
          setTimeout(() => {
            console.log("Moving to step 5 - On the way to destination");
            updateStep(5, [0, 1, 2, 3, 4]);
          }, 3000);
        }
        
        // Process ride completion
        if (rideStatus === "Completed" && step < 6) {
          console.log("SERVER UPDATE: Ride has been completed");
          updateStep(6, [0, 1, 2, 3, 4, 5]);
          
          // Clear interval since we're done
          if (pickupCheckInterval.current) {
            clearInterval(pickupCheckInterval.current);
            pickupCheckInterval.current = null;
          }
          
          // Show completion notification
          setTimeout(() => {
            Swal.fire({
              icon: "success",
              title: "Ride Completed",
              text: "Your ride has been completed. Thank you for riding with us!",
              confirmButtonText: "Rate Your Trip",
              showCancelButton: true,
              cancelButtonText: "Later"
            }).then((result) => {
              if (result.isConfirmed) {
                // Navigate to feedback page
                navigate("/feedback", { state: { ride: booking } });
              }
            });
          }, 1000);
        }
        
        // Also update local storage with server status for local UI consistency
        if (driverArrived) {
          localStorage.setItem(`ride_${rideId}_driver_arrived_status`, 'true');
          localStorage.setItem(`driver_arrived_${rideId}`, 'true');
        }
        
        if (passengerPickedUp) {
          localStorage.setItem(`ride_${rideId}_pickup_status`, 'true');
          localStorage.setItem(`passenger_pickup_${rideId}`, 'true');
        }
        
      } catch (error) {
        console.error("Error checking server status:", error);
      }
    }
  };

  // Check if the user has an active ride
  const checkForActiveRide = async (userId) => {
    try {
      if (!userId) {
        console.error("Cannot check for active rides: No user ID provided");
        return null;
      }
      
      console.log(`Checking for active rides for user ID: ${userId}`);
      const userRides = await rideService.getUserRides(userId, "customer");
      console.log("User rides:", userRides);
      
      // Find rides with status "Ongoing" or "Pending"
      const activeRide = userRides.find(ride => ride.status === "Ongoing");
      const pendingRide = userRides.find(ride => ride.status === "Pending");
      
      if (activeRide) {
        console.log("Found active ride:", activeRide);
        return activeRide;
      } else if (pendingRide) {
        console.log("Found pending ride:", pendingRide);
        return pendingRide;
      }
      
      console.log("No active or pending rides found");
      return null;
    } catch (error) {
      console.error("Error checking for active rides:", error);
      return null;
    }
  };

  // Enhanced validation when component loads - MAIN INIT FUNCTION
  useEffect(() => {
    // Skip if already initialized
    if (initialized) return;
    
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedBooking = JSON.parse(localStorage.getItem("latestBooking"));
    const storedStep = parseInt(localStorage.getItem("trackingStep") || "0");

    if (!storedUser || storedUser.role !== "customer") {
      navigate("/login");
      return;
    }

    setUser(storedUser);
    console.log("TrackRide - Retrieved stored booking:", storedBooking);

    // Initialize with stored data
    if (storedBooking && storedBooking.ride_id) {
      setBooking(storedBooking);
      
      // Check for all statuses immediately
      const pickupStatus = localStorage.getItem(`ride_${storedBooking.ride_id}_pickup_status`);
      const driverArrivedStatus = localStorage.getItem(`ride_${storedBooking.ride_id}_driver_arrived_status`);
      console.log(`Initial status check - Pickup: ${pickupStatus}, Driver arrived: ${driverArrivedStatus}, Stored step: ${storedStep}`);
      
      // Determine the current step based on all available information
      let currentStep = storedStep;
      let currentCompletedSteps = [];
      
      // Driver has arrived at pickup
      if (driverArrivedStatus === 'true' && currentStep < 3) {
        console.log("Init: Driver has arrived, setting to step 3");
        currentStep = 3;
        currentCompletedSteps = [0, 1, 2];
        localStorage.setItem("trackingStep", "3");
        // Mark that we've already notified about driver arrival
        setNotifiedArrival(true);
      }
      
      // Passenger has been picked up
      if (pickupStatus === 'true') {
        console.log("Init: Pickup confirmed, setting to step 4/5");
        if (currentStep < 5) {
          currentStep = 5; // Jump straight to "On the way to destination"
          currentCompletedSteps = [0, 1, 2, 3, 4];
          localStorage.setItem("trackingStep", "5");
          setNotifiedPickup(true);
        }
      } else {
        // If no status was detected, use the stored step
        for (let i = 0; i < currentStep; i++) {
          currentCompletedSteps.push(i);
        }
      }
      
      // Apply the determined step - directly set state to avoid race conditions during init
      setStep(currentStep);
      currentStepRef.current = currentStep;
      setCompletedSteps(currentCompletedSteps);
      lastUpdateTime.current = Date.now();

      // If the booking has a driver ID and the status is "Ongoing", set driverAccepted to true
      if (storedBooking.status === "Ongoing" || (storedBooking.driver && storedBooking.driver !== "Assigned")) {
        setDriverAccepted(true);
      }
      
      // Start status check with what we have
      console.log(`TrackRide - Starting status check for ride: ${storedBooking.ride_id}, current step: ${currentStep}, status: ${storedBooking.status}`);
      startStatusCheck(storedBooking.ride_id);
      
      // Start checking for pickup confirmation if needed
      if (storedBooking.status === "Ongoing" && !pickupStatus) {
        startPickupCheck(storedBooking.ride_id);
      }
      
      // Mark as initialized to prevent duplicate initialization
      setInitialized(true);
    } else {
      // If no valid booking in local storage, check if user has an active ride
      const checkForRide = async () => {
        const activeRide = await checkForActiveRide(storedUser.user_id);
        
        if (activeRide) {
          // We found an active ride, construct booking info and start tracking
          const rideInfo = {
            ride_id: activeRide.ride_id,
            pickup: activeRide.pickup_location,
            dropoff: activeRide.dropoff_location,
            status: activeRide.status,
            driver: activeRide.driver_id ? `Driver #${activeRide.driver_id}` : "Assigned",
            userEmail: storedUser.email,
            datetime: new Date(activeRide.start_time || Date.now()).toLocaleString()
          };
          
          // Check if pickup was already confirmed
          const pickupStatus = localStorage.getItem(`ride_${activeRide.ride_id}_pickup_status`);
          
          // Initialize state based on pickup status
          let initialStep = 0;
          let initialCompletedSteps = [];
          
          if (pickupStatus === 'true') {
            // If pickup already confirmed, go straight to step 3
            initialStep = 3;
            initialCompletedSteps = [0, 1, 2];
            localStorage.setItem("trackingStep", "3");
            setNotifiedPickup(true);
          } else if (activeRide.status === "Ongoing") {
            // If ride is ongoing but pickup not confirmed, go to step 1
            initialStep = 1;
            initialCompletedSteps = [0];
            localStorage.setItem("trackingStep", "1");
          }
          
          // Apply initial state
          setStep(initialStep);
          currentStepRef.current = initialStep;
          setCompletedSteps(initialCompletedSteps);
          
          // Save booking info and set driver accepted if ride is ongoing
          localStorage.setItem("latestBooking", JSON.stringify(rideInfo));
          setBooking(rideInfo);
          setDriverAccepted(activeRide.status === "Ongoing");
          
          // Start status check
          console.log(`TrackRide - Starting status check for found ride: ${activeRide.ride_id}`);
          startStatusCheck(activeRide.ride_id);
          
          // If the ride is ongoing and pickup not confirmed, start checking for pickup confirmation
          if (activeRide.status === "Ongoing" && !pickupStatus) {
            startPickupCheck(activeRide.ride_id);
          }
          
          // Mark as initialized
          setInitialized(true);
        } else {
          // No active ride found
          Swal.fire({
            icon: "info",
            title: "No Ride In Progress",
            text: "No active ride found. Please book a ride first.",
            confirmButtonText: "Go to Booking",
          }).then(() => {
            navigate("/book");
          });
        }
      };
      
      checkForRide();
    }

    // Clean up function
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      if (pickupCheckInterval.current) {
        clearInterval(pickupCheckInterval.current);
      }
    };
  }, [navigate, initialized]);

  // Setup a periodic check for status after initialization
  useEffect(() => {
    if (!initialized || !booking || !booking.ride_id) return;
    
    console.log("Setting up status monitoring");
    
    // Check for status mismatch on interval
    const statusMonitorInterval = setInterval(() => {
      // Skip if transitioning
      if (isTransitioning) return;
      
      // Check for step mismatch with localStorage
      checkAndFixStepMismatch();
      
      // Check ride statuses
      const rideId = booking.ride_id;
      
      // Check for currentStep in localStorage (set by DriverRoutes)
      const currentStepStr = localStorage.getItem(`ride_${rideId}_currentStep`);
      if (currentStepStr) {
        const storedStep = parseInt(currentStepStr, 10);
        if (!isNaN(storedStep) && storedStep > currentStepRef.current) {
          console.log(`Status monitor: Found higher step in localStorage: ${storedStep}`);
          
          // Create completed steps array for all previous steps
          const newCompletedSteps = [];
          for (let i = 0; i < storedStep; i++) {
            newCompletedSteps.push(i);
          }
          
          // Update to the stored step if it's higher than current
          updateStep(storedStep, newCompletedSteps);
          return; // Skip other checks since we've already updated
        }
      }
      
      // Continue with traditional status checks
      const driverArrivedStatus = localStorage.getItem(`ride_${rideId}_driver_arrived_status`);
      const pickupStatus = localStorage.getItem(`ride_${rideId}_pickup_status`);
      const enrouteStatus = localStorage.getItem(`ride_${rideId}_enroute_status`);
      const completedStatus = localStorage.getItem(`ride_${rideId}_completed_status`);
      const driverHasArrived = driverArrivedStatus === 'true' || localStorage.getItem(`driver_arrived_${rideId}`) === 'true';
      const passengerPickedUp = pickupStatus === 'true' || localStorage.getItem(`passenger_pickup_${rideId}`) === 'true';
      
      console.log(`Status monitor: step=${currentStepRef.current}, driverArrived=${driverHasArrived}, pickup=${passengerPickedUp}, enroute=${enrouteStatus === 'true'}, transitioning=${isTransitioning}`);
      
      // Process events in sequence to ensure proper step progression
      if (completedStatus === 'true' && currentStepRef.current < 6) {
        console.log("Status monitor: Ride has been completed");
        updateStep(6, [0, 1, 2, 3, 4, 5]);
      }
      else if (enrouteStatus === 'true' && currentStepRef.current < 5) {
        console.log("Status monitor: On the way to destination");
        updateStep(5, [0, 1, 2, 3, 4]);
      }
      else if (passengerPickedUp && currentStepRef.current < 4) {
        console.log("Status monitor: Passenger has been picked up");
        updateStep(4, [0, 1, 2, 3]);
        setNotifiedPickup(true);
      }
      else if (driverHasArrived && currentStepRef.current < 3) {
        console.log("Status monitor: Driver has arrived at pickup");
        updateStep(3, [0, 1, 2]);
        
        // Show notification if not already shown
        if (!notifiedArrival) {
          Swal.fire({
            icon: "info",
            title: "Driver Has Arrived",
            text: "Your driver has arrived at the pickup location.",
            timer: 4000,
            timerProgressBar: true,
            showConfirmButton: false,
          });
          setNotifiedArrival(true);
        }
      }
    }, 1000);
    
    // Listen for custom events from DriverRoutes
    const handleDriverArrival = (event) => {
      if (booking && event.detail && event.detail.rideId === parseInt(booking.ride_id, 10)) {
        console.log("Event received: Driver arrival confirmed");
        if (currentStepRef.current < 3 && !isTransitioning) {
          updateStep(3, [0, 1, 2]);
          
          // Show notification if not already shown
          if (!notifiedArrival) {
            Swal.fire({
              icon: "info",
              title: "Driver Has Arrived",
              text: "Your driver has arrived at the pickup location.",
              timer: 4000,
              timerProgressBar: true,
              showConfirmButton: false,
            });
            setNotifiedArrival(true);
          }
        }
      }
    };
    
    const handlePickupConfirmed = (event) => {
      if (booking && event.detail && event.detail.rideId === parseInt(booking.ride_id, 10)) {
        console.log("Event received: Pickup confirmed");
        if (currentStepRef.current < 4 && !isTransitioning) {
          updateStep(4, [0, 1, 2, 3]);
          setNotifiedPickup(true);
          
          // After a short delay, show "On the way to destination"
          setTimeout(() => {
            if (currentStepRef.current < 5 && !isTransitioning) {
              updateStep(5, [0, 1, 2, 3, 4]);
            }
          }, 2000);
        }
      }
    };
    
    const handleRideCompleted = (event) => {
      if (booking && event.detail && event.detail.rideId === parseInt(booking.ride_id, 10)) {
        console.log("Event received: Ride completed");
        if (currentStepRef.current < 6 && !isTransitioning) {
          updateStep(6, [0, 1, 2, 3, 4, 5]);
          
          // Show completion notification 
          setTimeout(() => {
            Swal.fire({
              icon: "success",
              title: "Ride Completed",
              text: "Your ride has been completed. Thank you for riding with us!",
              confirmButtonText: "Rate Your Trip",
              showCancelButton: true,
              cancelButtonText: "Later"
            }).then((result) => {
              if (result.isConfirmed) {
                // Navigate to feedback page
                navigate("/feedback", { state: { ride: booking } });
              }
            });
          }, 1000);
        }
      }
    };
    
    // Add event listeners
    document.addEventListener('driverArrivalConfirmed', handleDriverArrival);
    document.addEventListener('ridePickupConfirmed', handlePickupConfirmed);
    document.addEventListener('rideCompleted', handleRideCompleted);
    
    return () => {
      clearInterval(statusMonitorInterval);
      document.removeEventListener('driverArrivalConfirmed', handleDriverArrival);
      document.removeEventListener('ridePickupConfirmed', handlePickupConfirmed);
      document.removeEventListener('rideCompleted', handleRideCompleted);
    };
  }, [initialized, booking, isTransitioning, notifiedArrival, notifiedPickup, updateStep, checkAndFixStepMismatch, navigate]);

  // Handle automatic step progression
  useEffect(() => {
    // Skip if not initialized or no booking
    if (!initialized || !booking) return;
    
    let timeout;
    if (driverAccepted && currentStepRef.current < steps.length - 1 && currentStepRef.current > 0) {
      // Skip automatic progression for steps that require driver confirmation
      if (currentStepRef.current === 1) {
        console.log(`TrackRide - Waiting for driver to confirm pickup`);
        // No automatic progression for step 1 -> 3, it's controlled by driver
      } else if (currentStepRef.current === 2) {
        // Step 2 is the pickup confirmation, which quickly transitions to step 3
        console.log(`TrackRide - Passenger picked up, transitioning to destination soon`);
      } else {
        // For other steps, continue with the automatic progression
        console.log(`TrackRide - Starting timeout for step transition: ${currentStepRef.current} -> ${currentStepRef.current + 1}`);
        const delay = currentStepRef.current === 3 ? 12000 : 10000;
        timeout = setTimeout(() => {
          // Skip progression if we're already transitioning
          if (isTransitioning) {
            console.log(`TrackRide - Skipping auto-progression because a transition is in progress`);
            return;
          }
          
          const nextStep = currentStepRef.current + 1;
          console.log(`TrackRide - Transitioning from step ${currentStepRef.current} to ${nextStep}`);
          
          // Update completedSteps - mark all previous steps as completed
          const newCompletedSteps = [...completedSteps];
          if (!newCompletedSteps.includes(currentStepRef.current)) {
            newCompletedSteps.push(currentStepRef.current);
          }
          updateStep(nextStep, newCompletedSteps);
          
          // If this is the final step, update the ride status to completed
          if (nextStep === steps.length - 1 && booking && booking.ride_id) {
            console.log(`TrackRide - Final step reached, updating ride ${booking.ride_id} status to Completed`);
            try {
              // Ensure ride_id is valid
              const parsedRideId = parseInt(booking.ride_id, 10);
              if (!isNaN(parsedRideId)) {
                // Use the fixed update method with query parameters
                rideService.updateRideStatus(parsedRideId, "Completed")
                  .then(() => console.log(`Ride ${parsedRideId} successfully marked as completed`))
                  .catch(error => console.error(`Error updating ride ${parsedRideId} status:`, error));
              } else {
                console.error(`Invalid ride ID: ${booking.ride_id}`);
              }
            } catch (error) {
              console.error("Error updating ride status:", error);
            }
          }
        }, delay);
      }
    }
    return () => clearTimeout(timeout);
  }, [booking, driverAccepted, step, steps.length, completedSteps, isTransitioning, updateStep, initialized]);

  useEffect(() => {
    if (booking && coordinates && (step === 1 || step === 3)) {
      // Wait for DOM to be ready
      const initializeMap = () => {
        // Set map loading state
        setIsMapLoading(true);
        
        // Clean up existing map and markers
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        
        if (markersRef.current && markersRef.current.length) {
          markersRef.current.forEach(marker => {
            if (marker && typeof marker.remove === 'function') {
              marker.remove();
            }
          });
          markersRef.current = [];
        }
        
        if (routeLineRef.current) {
          routeLineRef.current.remove();
          routeLineRef.current = null;
        }

        // Check if the map container element exists before initializing
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
          console.error('Map container element not found! Retrying in 500ms...');
          // Retry after a short delay
          setTimeout(initializeMap, 500);
          return;
        }

        // Ensure the map container is visible and has dimensions
        if (mapContainer.clientWidth === 0 || mapContainer.clientHeight === 0) {
          console.error('Map container has zero dimensions! Retrying in 500ms...');
          setTimeout(initializeMap, 500);
          return;
        }

        // Initialize new map with a try-catch block
        try {
          const mapInstance = L.map('map', {
            attributionControl: false, // Hide attribution to reduce clutter
            zoomControl: true,
            doubleClickZoom: false // Prevent accidental zooming
          }).setView(coordinates.pickup, 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
          }).addTo(mapInstance);
          
          mapRef.current = mapInstance;

          // Create markers with tooltips
          const pickupMarker = L.marker(coordinates.pickup, {
            icon: L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="background-color: #4CAF50; width: 12px; height: 12px; border-radius: 50%;"></div>`,
              iconSize: [12, 12]
            })
          });
          
          // Add marker to map only if map exists
          if (mapInstance && !mapInstance._isDestroyed) {
            pickupMarker.addTo(mapInstance);
            pickupMarker.bindTooltip("Pickup Location", { className: 'custom-tooltip' });
            markersRef.current.push(pickupMarker);
          }

          const dropoffMarker = L.marker(coordinates.dropoff, {
            icon: L.divIcon({
              className: 'custom-div-icon',
              html: `<div style="background-color: #F44336; width: 12px; height: 12px; border-radius: 50%;"></div>`,
              iconSize: [12, 12]
            })
          });
          
          // Add marker to map only if map exists
          if (mapInstance && !mapInstance._isDestroyed) {
            dropoffMarker.addTo(mapInstance);
            dropoffMarker.bindTooltip("Dropoff Location", { className: 'custom-tooltip' });
            markersRef.current.push(dropoffMarker);
          }

          // Set loading to false when map is ready
          setIsMapLoading(false);

          // Fit map bounds to include both markers with padding
          try {
            const bounds = L.latLngBounds([coordinates.pickup, coordinates.dropoff]);
            mapInstance.fitBounds(bounds, { padding: [30, 30] });
          } catch (err) {
            console.error('Error setting map bounds:', err);
            // Fallback to a simple view if fitting bounds fails
            mapInstance.setView(coordinates.pickup, 13);
          }

          // Draw route if available
          getRoute(coordinates.pickup, coordinates.dropoff).then(routeCoords => {
            if (routeCoords && mapInstance && !mapInstance._isDestroyed) {
              try {
                const routeLine = L.polyline(routeCoords, { 
                  color: '#3388ff', 
                  weight: 4, 
                  opacity: 0.7 
                });
                routeLine.addTo(mapInstance);
                routeLineRef.current = routeLine;
              } catch (err) {
                console.error('Error adding route line:', err);
              }
            } else {
              // Fallback: draw straight line
              try {
                const straightLine = L.polyline([coordinates.pickup, coordinates.dropoff], { 
                  color: '#3388ff', 
                  weight: 4, 
                  opacity: 0.7, 
                  dashArray: '10, 10' 
                });
                if (mapInstance && !mapInstance._isDestroyed) {
                  straightLine.addTo(mapInstance);
                  routeLineRef.current = straightLine;
                }
              } catch (err) {
                console.error('Error adding fallback line:', err);
              }
            }
          }).catch(err => {
            console.error('Error getting route:', err);
          });
        } catch (error) {
          console.error('Error initializing map:', error);
          setIsMapLoading(false);
        }
      };

      // Start the initialization process
      initializeMap();
    }

    return () => {
      // Clean up map when component unmounts or when this effect is re-run
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
        } catch (error) {
          console.error('Error cleaning up map:', error);
        }
      }
      // Reset loading state
      setIsMapLoading(false);
    };
  }, [booking, coordinates, step]);

  // Simulate driver movement along the real route with smoother animation
  useEffect(() => {
    let interval;
    if (mapRef.current && markersRef.current[2] && routeLineRef.current && (step === 1 || step === 3)) {
      const routeCoordinates = routeLineRef.current.getLatLngs();
      let currentIndex = 0;
      const totalPoints = routeCoordinates.length;
      const duration = 30000; // 30 seconds for the entire route
      const intervalTime = duration / totalPoints;

      interval = setInterval(() => {
        if (currentIndex < totalPoints) {
          markersRef.current[2].setLatLng(routeCoordinates[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, intervalTime);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Direct check for pickup and arrival status
  useEffect(() => {
    if (!booking || !booking.ride_id) return;
    
    console.log("Setting up direct check for status changes");
    
    const directCheckInterval = setInterval(() => {
      // Skip checks if we're currently transitioning
      if (isTransitioning) {
        console.log("Direct check: Skipping because transition is in progress");
        return;
      }
      
      const rideId = booking.ride_id;
      const driverArrivedStatus = localStorage.getItem(`ride_${rideId}_driver_arrived_status`);
      const pickupStatus = localStorage.getItem(`ride_${rideId}_pickup_status`);
      const completedStatus = localStorage.getItem(`ride_${rideId}_completed_status`);
      
      console.log(`Direct check: driver arrived=${driverArrivedStatus}, pickup=${pickupStatus}, completed=${completedStatus}, step=${step}, transitioning=${isTransitioning}`);
      
      // Force step updates based on localStorage values
      if (driverArrivedStatus === 'true' && step < 3) {
        console.log("Direct check update: Moving to step 3 (Driver arrived)");
        updateStep(3, [0, 1, 2]);
        
        // Only show notification if not previously shown
        if (!notifiedArrival) {
          Swal.fire({
            icon: "info",
            title: "Driver Has Arrived",
            text: "Your driver has arrived at the pickup location.",
            timer: 4000,
            timerProgressBar: true,
            showConfirmButton: false,
          });
          setNotifiedArrival(true);
        }
      }
      
      // Only check pickup if we're not already past it
      else if (pickupStatus === 'true' && step < 4) {
        console.log("Direct check update: Moving to step 4/5 (Pickup/En route)");
        updateStep(4, [0, 1, 2, 3]);
        setNotifiedPickup(true);
        
        // After confirmation, we should quickly move to step 5
        setTimeout(() => {
          // Only proceed if we're not already past step 5 and not transitioning
          if (step < 5 && !isTransitioning) {
            updateStep(5, [0, 1, 2, 3, 4]);
          }
        }, 2000);
      }
      
      // Only check completion if we're not already at the final step
      else if (completedStatus === 'true' && step < 6) {
        console.log("Direct check update: Moving to step 6 (Completed)");
        updateStep(6, [0, 1, 2, 3, 4, 5]);
      }
    }, 1000);
    
    // Clean up
    return () => {
      clearInterval(directCheckInterval);
    };
  }, [booking, step, notifiedArrival, notifiedPickup, isTransitioning, updateStep]);

  // Add a special function to forcibly check for updates from another browser
  const forceCheckForUpdates = useCallback(async (rideId) => {
    if (!rideId) return;
    
    console.log(`Force checking for updates on ride ${rideId}`);
    
    try {
      // Get detailed status from server first
      const detailedStatus = await rideService.getDetailedRideStatus(rideId);
      console.log(`Server status for ride ${rideId}:`, detailedStatus);
      
      // First check if there are server-side status changes
      if (detailedStatus) {
        // Process driver arrival
        if (detailedStatus.driver_arrived && currentStepRef.current < 3) {
          console.log(`Force update: Driver has arrived (from server)`);
          updateStep(3, [0, 1, 2]);
          setNotifiedArrival(true);
          return true;
        }
        
        // Process passenger pickup
        if (detailedStatus.passenger_picked_up && currentStepRef.current < 4) {
          console.log(`Force update: Passenger has been picked up (from server)`);
          updateStep(4, [0, 1, 2, 3]);
          setNotifiedPickup(true);
          
          // Schedule transition to en route
          setTimeout(() => {
            if (currentStepRef.current < 5 && !isTransitioning) {
              updateStep(5, [0, 1, 2, 3, 4]);
            }
          }, 2000);
          return true;
        }
        
        // Process completion
        if (detailedStatus.status === 'Completed' && currentStepRef.current < 6) {
          console.log(`Force update: Ride has been completed (from server)`);
          updateStep(6, [0, 1, 2, 3, 4, 5]);
          return true;
        }
      }
      
      // Next, check localStorage for any updates with timestamp
      const updateTimestamp = localStorage.getItem(`ride_${rideId}_update_timestamp`);
      if (updateTimestamp && parseInt(updateTimestamp, 10) > lastTimestampCheck.current) {
        console.log(`Detected newer update timestamp: ${updateTimestamp}`);
        lastTimestampCheck.current = parseInt(updateTimestamp, 10);
        
        // Check for all statuses to find the highest valid step
        const currentStepStr = localStorage.getItem(`ride_${rideId}_currentStep`);
        const driverArrivedStatus = localStorage.getItem(`ride_${rideId}_driver_arrived_status`);
        const pickupStatus = localStorage.getItem(`ride_${rideId}_pickup_status`);
        const enrouteStatus = localStorage.getItem(`ride_${rideId}_enroute_status`);
        const completedStatus = localStorage.getItem(`ride_${rideId}_completed_status`);
        
        let targetStep = currentStepRef.current;
        
        // Find the highest valid step based on statuses
        if (completedStatus === 'true') targetStep = Math.max(targetStep, 6);
        else if (enrouteStatus === 'true') targetStep = Math.max(targetStep, 5);
        else if (pickupStatus === 'true') targetStep = Math.max(targetStep, 4);
        else if (driverArrivedStatus === 'true') targetStep = Math.max(targetStep, 3);
        
        // Also check explicitly stored step
        if (currentStepStr) {
          const explicitStep = parseInt(currentStepStr, 10);
          if (!isNaN(explicitStep)) {
            targetStep = Math.max(targetStep, explicitStep);
          }
        }
        
        // Update to the target step if it's higher than current
        if (targetStep > currentStepRef.current) {
          console.log(`Force update: Updating to step ${targetStep} based on localStorage`);
          
          // Create completed steps array
          const newCompletedSteps = [];
          for (let i = 0; i < targetStep; i++) {
            newCompletedSteps.push(i);
          }
          
          // Update step
          updateStep(targetStep, newCompletedSteps);
          
          // Set notification flags as needed
          if (targetStep >= 3) setNotifiedArrival(true);
          if (targetStep >= 4) setNotifiedPickup(true);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error during force check:", error);
      return false;
    }
  }, [updateStep, isTransitioning]);

  // Add a continuous polling check specifically for cross-browser updates
  useEffect(() => {
    if (!initialized || !booking || !booking.ride_id) return;
    
    console.log("Setting up cross-browser update polling");
    
    // Initialize the timestamp ref to current time
    lastTimestampCheck.current = Date.now();
    
    // Set up a frequent polling interval for cross-browser updates
    const updatePollInterval = setInterval(() => {
      if (isTransitioning) return;
      
      // Force check for updates
      forceCheckForUpdates(booking.ride_id);
    }, 1500); // Check every 1.5 seconds
    
    return () => {
      clearInterval(updatePollInterval);
    };
  }, [initialized, booking, isTransitioning, forceCheckForUpdates]);

  // Add a reload button in the debug panel
  const forceRefresh = useCallback(() => {
    if (booking && booking.ride_id) {
      forceCheckForUpdates(booking.ride_id).then(updated => {
        if (!updated) {
          // If no updates from server, try one last desperate approach - reload the page
          console.log("No updates found, forcing page reload");
          window.location.reload();
        }
      });
    }
  }, [booking, forceCheckForUpdates]);

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      <div
        className="container-fluid text-white py-5 hero-track"
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
          <h1 className="display-4 text-white fw-bold">Tracking Your Ride</h1>
          <p className="lead">Live progress from pickup to drop-off</p>
        </div>
      </div>

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            {booking && (
              <div className="bg-light p-4 rounded shadow-sm mb-4 animate__animated animate__fadeIn">
                <h5 className="mb-2">Pickup: <strong>{booking.pickup}</strong></h5>
                <h5 className="mb-2">Dropoff: <strong>{booking.dropoff}</strong></h5>
                <h6 className="mb-1">Ride Type: {booking.rideType}</h6>
                <h6 className="mb-1">Fare Estimate: {booking.fare || booking.cost}</h6>
                <h6 className="mb-0">Driver: {driverInfo ? driverInfo.email : booking.driver || "Assigned"}</h6>
                
                {/* Enhanced debug info and force update button */}
                <div className="mt-3 p-2 bg-light border rounded">
                  <small className="d-block text-muted mb-1">Debug Info - Current Step: {step}</small>
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-sm btn-outline-secondary" 
                      onClick={() => {
                        const driverArrivedStatus = localStorage.getItem(`ride_${booking.ride_id}_driver_arrived_status`);
                        const pickupStatus = localStorage.getItem(`ride_${booking.ride_id}_pickup_status`);
                        const enrouteStatus = localStorage.getItem(`ride_${booking.ride_id}_enroute_status`);
                        const completedStatus = localStorage.getItem(`ride_${booking.ride_id}_completed_status`);
                        const currentStepStr = localStorage.getItem(`ride_${booking.ride_id}_currentStep`);
                        alert(`Current Status:\nStep: ${step}\nStored Step: ${currentStepStr || 'Not set'}\nDriver Arrived: ${driverArrivedStatus}\nPickup Status: ${pickupStatus}\nEnroute Status: ${enrouteStatus}\nCompleted Status: ${completedStatus}`);
                      }}
                    >
                      Show Status
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-primary" 
                      onClick={() => {
                        localStorage.setItem(`ride_${booking.ride_id}_driver_arrived_status`, 'true');
                        localStorage.setItem(`ride_${booking.ride_id}_currentStep`, '3');
                        localStorage.setItem(`ride_${booking.ride_id}_update_timestamp`, Date.now().toString());
                        updateStep(3, [0, 1, 2]);
                        forceUpdate();
                      }}
                    >
                      Force Driver Arrived
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-success" 
                      onClick={() => {
                        localStorage.setItem(`ride_${booking.ride_id}_pickup_status`, 'true');
                        localStorage.setItem(`ride_${booking.ride_id}_currentStep`, '4');
                        localStorage.setItem(`ride_${booking.ride_id}_update_timestamp`, Date.now().toString());
                        updateStep(4, [0, 1, 2, 3]);
                        forceUpdate();
                      }}
                    >
                      Force Pickup
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-info" 
                      onClick={forceRefresh}
                    >
                      Refresh Status
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-warning animate__animated animate__fadeIn">
                {error}
              </div>
            )}

            <div className="animate__animated animate__fadeInUp">
              {steps.map((s, index) => {
                // Determine the status class for this step
                let status = "";
                
                // Check if this step is in the completedSteps array
                if (completedSteps.includes(index)) {
                  status = "completed";
                } 
                // Current step
                else if (index === step) {
                  status = "current";
                }
                
                // Determine if we need to add an animation
                let animationClass = "";
                if (index === step) {
                  animationClass = "animate__animated animate__pulse";
                } else if (completedSteps.includes(index)) {
                  // Add a brief animation to newly completed steps
                  animationClass = "animate__animated animate__fadeIn";
                }
                
                return (
                  <div className={`ride-step ${status} mb-3 ${animationClass}`} key={s.id}>
                    <div className="icon me-3">
                      <i className={s.icon}></i>
                    </div>
                    <div className="step-label">
                      {s.label}
                      {status === "completed" && (
                        <span className="ms-2 text-success animate__animated animate__bounceIn">
                          <i className="fas fa-check-circle"></i>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {step === 0 && (
                <div className="mt-4 text-center animate__animated animate__fadeIn">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h4>Waiting for driver to accept your ride...</h4>
                  <p className="text-muted">This may take a few moments</p>
                </div>
              )}

              {(step === 1 || step === 3) && (
                <div className="mt-4 animate__animated animate__fadeIn">
                  <div 
                    id="map" 
                    key={`map-${step}-${booking?.ride_id || 'default'}`} 
                    style={{ 
                      height: "350px", 
                      width: "100%", 
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      position: "relative",
                      border: "1px solid #eee"
                    }}
                  ></div>
                  {isLoading && (
                    <div className="loading-overlay">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="mt-4 text-center animate__animated animate__fadeIn">
                  <img src="/img/pickup-dropoff.gif" alt="Passenger picked up" className="img-fluid rounded shadow-sm" style={{ maxHeight: "350px" }} />
                  <div className="alert alert-success mt-3 animate__animated animate__fadeIn">
                    <i className="fas fa-user-check me-2"></i>
                    Your driver has confirmed pickup! You'll be on your way to the destination shortly.
                  </div>
                </div>
              )}
            </div>

            {/* Map container with a key to force re-render and specific styling */}
            {booking && coordinates && (step === 1 || step === 3) && (
              <div className="mapContainer relative mt-4 mb-6">
                <div 
                  id="map" 
                  key={`map-${step}-${booking?.ride_id}`}
                  style={{ 
                    height: "350px", 
                    width: "100%", 
                    borderRadius: "8px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                    position: "relative",
                    border: "1px solid #e0e0e0"
                  }}
                ></div>
                {isMapLoading && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70"
                    style={{ borderRadius: "8px" }}
                  >
                    <div className="spinner"></div>
                  </div>
                )}
              </div>
            )}

            {step >= steps.length - 1 && (
              <div className="text-center mt-4">
                <img
                  src="/img/done.gif"
                  alt="Ride Completed"
                  className="img-fluid rounded shadow-sm mb-3"
                  style={{ maxHeight: "75px" }}
                />
                <div>
                  <button
                    className="btn btn-primary px-4 rounded-pill"
                    onClick={() => navigate("/payment")}
                  >
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      <style>{`
        .ride-step {
          display: flex;
          align-items: center;
          font-size: 16px;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
        }
        .ride-step:hover {
          background-color: rgba(0,0,0,0.03);
        }
        .ride-step .icon {
          width: 36px;
          height: 36px;
          background-color: #ccc;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .ride-step.completed {
          background-color: rgba(40, 167, 69, 0.15);
          border-left: 3px solid #28a745;
          border-right: 3px solid #28a745;
        }
        .ride-step.completed .icon {
          background-color: #28a745;
          box-shadow: 0 0 10px rgba(40, 167, 69, 0.5);
          transform: scale(1.05);
        }
        .ride-step.completed .step-label {
          color: #28a745;
          font-weight: 600;
        }
        .ride-step.current .icon {
          background-color: #ffc107;
          box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
          animation: pulse 2s infinite;
        }
        .ride-step.current {
          border-left: 3px solid #ffc107;
          background-color: rgba(255, 193, 7, 0.1);
        }
        .ride-step .step-label {
          font-weight: 500;
        }
        .ride-step.completed .fa-check-circle {
          font-size: 18px;
          filter: drop-shadow(0 0 2px rgba(40, 167, 69, 0.5));
        }
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
        #map {
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          position: relative;
          border-radius: 12px;
          border: 1px solid #eee;
        }
        .custom-div-icon {
          background: transparent;
          border: none;
        }
        .custom-tooltip {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          z-index: 1000;
        }
      `}</style>
    </>
  );
};

export default TrackRide;
