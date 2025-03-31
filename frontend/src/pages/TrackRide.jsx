import React, { useEffect, useState, useRef } from "react";
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
  const [error, setError] = useState(null);
  const [notifiedPickup, setNotifiedPickup] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);
  const statusCheckInterval = useRef(null);
  const pickupCheckInterval = useRef(null);
  const navigate = useNavigate();

  const steps = [
    { id: "step1", label: "Driver assigned to your ride", icon: "fas fa-user-check" },
    { id: "step2", label: "Driver on the way (ETA: 5 mins)", icon: "fas fa-car-side" },
    { id: "step3", label: "Passenger picked up", icon: "fas fa-user-check" },
    { id: "step4", label: "On the way to destination...", icon: "fas fa-route" },
    { id: "step5", label: "Drop-off complete", icon: "fas fa-flag-checkered" },
  ];

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
      setStep(1);
      setCompletedSteps([0]); // Mark step 0 (driver assigned) as completed
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
      
    } else if (status === "Completed" && step < 4) {
      console.log("Ride now COMPLETED");
      setStep(4);
      setCompletedSteps([0, 1, 2, 3]); // Mark all previous steps as completed
      localStorage.setItem("trackingStep", "4");
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

  // Function to check for driver pickup confirmation
  const startPickupCheck = (rideId) => {
    if (pickupCheckInterval.current) {
      clearInterval(pickupCheckInterval.current);
    }
    
    console.log(`Starting pickup check for ride ID: ${rideId}`);
    
    // Ensure rideId is a number
    const parsedRideId = parseInt(rideId, 10);
    
    if (isNaN(parsedRideId)) {
      console.error(`Invalid ride ID: ${rideId}`);
      return;
    }
    
    // Function to check pickup status
    const checkPickup = () => {
      if (step >= 3) {
        // If we're already at or past the pickup step, no need to keep checking
        clearInterval(pickupCheckInterval.current);
        pickupCheckInterval.current = null;
        return;
      }
      
      const pickupStatus = localStorage.getItem(`ride_${parsedRideId}_pickup_status`);
      console.log(`Checking pickup status for ride ${parsedRideId}:`, pickupStatus);
      
      if (pickupStatus === 'true' && !notifiedPickup) {
        console.log(`Pickup confirmed for ride ${parsedRideId}!`);
        
        // Clear all intervals to prevent race conditions
        if (pickupCheckInterval.current) {
          clearInterval(pickupCheckInterval.current);
          pickupCheckInterval.current = null;
        }
        
        // Immediately make a visual change by first updating to step 2 (passenger picked up)
        // Mark steps 0 and 1 as completed
        setCompletedSteps([0, 1]);
        setStep(2);
        
        // Show notification to customer
        Swal.fire({
          icon: 'success',
          title: 'Driver Has Arrived!',
          text: 'Your driver has confirmed pickup and is taking you to your destination.',
          timer: 4000,
          showConfirmButton: false,
          position: 'top-end',
          toast: true
        });
        
        // Immediately after (without delay), move to step 3 (on the way to destination)
        // This allows the user to see step 2 highlighted briefly for visual feedback
        setTimeout(() => {
          // Force update all previous steps as completed
          setCompletedSteps([0, 1, 2]); // "Driver assigned", "Driver on the way", and "Passenger picked up"
          // Set the step to "On the way to destination"
          setStep(3);
          localStorage.setItem("trackingStep", "3");
          setNotifiedPickup(true);
        }, 300); // Just enough delay for visual feedback, but practically immediate
      }
    };
    
    // Run check immediately
    checkPickup();
    
    // Then set up interval - check MUCH more frequently (100ms) to ensure we catch the change immediately
    pickupCheckInterval.current = setInterval(checkPickup, 100); // Check 10 times per second
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

  // Enhanced validation when component loads
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedBooking = JSON.parse(localStorage.getItem("latestBooking"));
    const storedStep = parseInt(localStorage.getItem("trackingStep") || "0");

    if (!storedUser || storedUser.role !== "customer") {
      navigate("/login");
      return;
    }

    setUser(storedUser);
    console.log("TrackRide - Retrieved stored booking:", storedBooking);

    // Fast polling for pickup status regardless of other checks
    let pickupFastPoll = null;
    
    if (storedBooking && storedBooking.ride_id) {
      // Setup immediate polling for pickup status (this is redundant but ensures maximum responsiveness)
      const rideId = storedBooking.ride_id;
      console.log(`Setting up fast poll for pickup status on ride ${rideId}`);
      
      const checkPickupFast = () => {
        const pickupStatus = localStorage.getItem(`ride_${rideId}_pickup_status`);
        if (pickupStatus === 'true') {
          console.log(`FAST POLL: Detected pickup confirmation for ride ${rideId}`);
          // Force pickup notification on next render cycle
          localStorage.setItem("trackingStep", "2");
          // Force page refresh to ensure all state is updated
          window.location.reload();
        }
      };
      
      // Check 10 times per second
      pickupFastPoll = setInterval(checkPickupFast, 100);
    }

    // First set what we have from local storage
    if (storedBooking && storedBooking.ride_id) {
      setBooking(storedBooking);
      
      // Check if pickup was already confirmed
      const pickupStatus = localStorage.getItem(`ride_${storedBooking.ride_id}_pickup_status`);
      console.log(`Initial check - Pickup status for ride ${storedBooking.ride_id}:`, pickupStatus);
      
      // If pickup was confirmed, immediately set to step 3 and mark previous steps as completed
      if (pickupStatus === 'true') {
        console.log("Pickup was already confirmed. Updating UI accordingly.");
        // Mark all previous steps as completed
        setCompletedSteps([0, 1, 2]);
        setStep(3); // Set to "On the way to destination"
        localStorage.setItem("trackingStep", "3");
        setNotifiedPickup(true);
      } else {
        // Otherwise, use the stored step
        setStep(storedStep);
        
        // Initialize completedSteps based on the current step
        const completed = [];
        for (let i = 0; i < storedStep; i++) {
          completed.push(i);
        }
        setCompletedSteps(completed);
      }

      // If the booking has a driver ID and the status is "Ongoing", set driverAccepted to true
      if (storedBooking.status === "Ongoing" || (storedBooking.driver && storedBooking.driver !== "Assigned")) {
        setDriverAccepted(true);
      }
      
      // Start status check with what we have
      console.log(`TrackRide - Starting status check for ride: ${storedBooking.ride_id}, current step: ${storedStep}, status: ${storedBooking.status}`);
      startStatusCheck(storedBooking.ride_id);
      
      // If the ride is ongoing and we're not yet at step 3, start checking for pickup confirmation
      if (storedBooking.status === "Ongoing" && !pickupStatus) {
        startPickupCheck(storedBooking.ride_id);
      }
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
          if (pickupStatus === 'true') {
            // If pickup already confirmed, go straight to step 3
            setStep(3);
            setCompletedSteps([0, 1, 2]);
            localStorage.setItem("trackingStep", "3");
            setNotifiedPickup(true);
          } else if (activeRide.status === "Ongoing") {
            // If ride is ongoing but pickup not confirmed, go to step 1
            setStep(1);
            setCompletedSteps([0]);
            localStorage.setItem("trackingStep", "1");
          } else {
            // Otherwise, start at step 0
            setStep(0);
            setCompletedSteps([]);
            localStorage.setItem("trackingStep", "0");
          }
          
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

    return () => {
      // Clear intervals when component unmounts
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      if (pickupCheckInterval.current) {
        clearInterval(pickupCheckInterval.current);
      }
      if (pickupFastPoll) {
        clearInterval(pickupFastPoll);
      }
    };
  }, [navigate]);

  useEffect(() => {
    let timeout;
    if (booking && driverAccepted && step < steps.length - 1 && step > 0) {
      // Skip the automatic progression to step 3 since we now
      // wait for the driver to confirm pickup
      if (step === 1) {
        console.log(`TrackRide - Waiting for driver to confirm pickup`);
        // No automatic progression for step 1 -> 3, it's controlled by driver
      } else if (step === 2) {
        // Step 2 is the pickup confirmation, which quickly transitions to step 3
        // This is handled in the startPickupCheck function
        console.log(`TrackRide - Passenger picked up, transitioning to destination soon`);
      } else {
        // For other steps, continue with the automatic progression
        console.log(`TrackRide - Starting timeout for step transition: ${step} -> ${step + 1}`);
        const delay = step === 3 ? 12000 : 10000;
        timeout = setTimeout(() => {
          const nextStep = step + 1;
          console.log(`TrackRide - Transitioning from step ${step} to ${nextStep}`);
          
          // Update completedSteps - mark all previous steps as completed
          const newCompletedSteps = [...completedSteps];
          if (!newCompletedSteps.includes(step)) {
            newCompletedSteps.push(step);
          }
          setCompletedSteps(newCompletedSteps);
          
          setStep(nextStep);
          localStorage.setItem("trackingStep", nextStep.toString());
          
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
  }, [booking, driverAccepted, step, steps.length, completedSteps]);

  useEffect(() => {
    if (booking && coordinates && (step === 1 || step === 3)) {
      // Clean up existing map and markers
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }

      // Initialize new map
      const mapInstance = L.map('map').setView(coordinates.pickup, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance);
      mapRef.current = mapInstance;

      // Create markers with tooltips
      const pickupMarker = L.marker(coordinates.pickup, {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #4CAF50; width: 12px; height: 12px; border-radius: 50%;"></div>`,
          iconSize: [12, 12]
        })
      }).addTo(mapInstance);
      pickupMarker.bindTooltip(`Pickup: ${booking.pickup}`, {
        permanent: true,
        direction: 'top',
        className: 'custom-tooltip'
      });
      markersRef.current.push(pickupMarker);

      const dropoffMarker = L.marker(coordinates.dropoff, {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #f44336; width: 12px; height: 12px; border-radius: 50%;"></div>`,
          iconSize: [12, 12]
        })
      }).addTo(mapInstance);
      dropoffMarker.bindTooltip(`Dropoff: ${booking.dropoff}`, {
        permanent: true,
        direction: 'top',
        className: 'custom-tooltip'
      });
      markersRef.current.push(dropoffMarker);

      const driverMarkerInstance = L.marker(coordinates.pickup, {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #2196F3; width: 12px; height: 12px; border-radius: 50%;"></div>`,
          iconSize: [12, 12]
        })
      }).addTo(mapInstance);
      driverMarkerInstance.bindTooltip('Driver', {
        permanent: true,
        direction: 'top',
        className: 'custom-tooltip'
      });
      markersRef.current.push(driverMarkerInstance);

      // Get and draw real route
      getRoute(coordinates.pickup, coordinates.dropoff).then(routeCoordinates => {
        if (routeCoordinates) {
          const routeLineInstance = L.polyline(routeCoordinates, {
            color: '#FF4B2B',
            weight: 4
          }).addTo(mapInstance);
          routeLineRef.current = routeLineInstance;

          // Fit bounds to show all markers and route
          const bounds = L.latLngBounds(routeCoordinates);
          mapInstance.fitBounds(bounds);
        } else {
          // Fallback to straight line if route fetch fails
          const routeLineInstance = L.polyline([coordinates.pickup, coordinates.dropoff], {
            color: '#FF4B2B',
            weight: 4
          }).addTo(mapInstance);
          routeLineRef.current = routeLineInstance;

          const bounds = L.latLngBounds([coordinates.pickup, coordinates.dropoff]);
          mapInstance.fitBounds(bounds);
        }
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
    };
  }, [booking, step, coordinates]);

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

  // Add a storage event listener to immediately detect localStorage changes
  useEffect(() => {
    if (!booking || !booking.ride_id || step >= 3 || notifiedPickup) return;
    
    // Function to handle localStorage changes from other tabs/windows
    const handleStorageChange = (event) => {
      // Check if the changed key matches our ride's pickup status
      if (booking && booking.ride_id && event.key === `ride_${booking.ride_id}_pickup_status` && event.newValue === 'true') {
        console.log("STORAGE EVENT: Pickup confirmation detected from driver!");
        
        // Immediately update UI to reflect pickup
        setCompletedSteps([0, 1]);
        setStep(2);
        
        // Show notification to customer
        Swal.fire({
          icon: 'success',
          title: 'Driver Has Arrived!',
          text: 'Your driver has confirmed pickup and is taking you to your destination.',
          timer: 3000,
          showConfirmButton: false,
          position: 'top-end',
          toast: true
        });
        
        // Quickly transition to next step
        setTimeout(() => {
          setCompletedSteps([0, 1, 2]);
          setStep(3);
          localStorage.setItem("trackingStep", "3");
          setNotifiedPickup(true);
        }, 300);
      }
    };
    
    // Add the event listener
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [booking, step, notifiedPickup]);

  // Direct check for pickup status (additional check beyond the interval in startPickupCheck)
  useEffect(() => {
    // Skip if no booking or we're already past step 3
    if (!booking || !booking.ride_id || step >= 3 || notifiedPickup) return;
    
    console.log("Setting up additional direct check for pickup status");
    
    // Function to check pickup status directly
    const checkDirectPickupStatus = () => {
      const pickupStatus = localStorage.getItem(`ride_${booking.ride_id}_pickup_status`);
      
      if (pickupStatus === 'true') {
        console.log("DIRECT CHECK: Pickup confirmation detected!");
        
        // Clear the interval
        clearInterval(checkInterval);
        
        // Immediately update UI to reflect pickup
        setCompletedSteps([0, 1]);
        setStep(2);
        
        // Show notification to customer
        Swal.fire({
          icon: 'success',
          title: 'Driver Has Arrived!',
          text: 'Your driver has confirmed pickup and is taking you to your destination.',
          timer: 3000,
          showConfirmButton: false,
          position: 'top-end',
          toast: true
        });
        
        // Quickly transition to next step
        setTimeout(() => {
          setCompletedSteps([0, 1, 2]);
          setStep(3);
          localStorage.setItem("trackingStep", "3");
          setNotifiedPickup(true);
        }, 300);
      }
    };
    
    // Run once immediately
    checkDirectPickupStatus();
    
    // Set up more frequent check (every 50ms = 20 checks per second)
    const checkInterval = setInterval(checkDirectPickupStatus, 50);
    
    // Clean up
    return () => {
      clearInterval(checkInterval);
    };
  }, [booking, step, notifiedPickup]);

  // Listen for custom pickup confirmation event
  useEffect(() => {
    if (!booking || !booking.ride_id || step >= 3 || notifiedPickup) return;
    
    console.log("Setting up custom event listener for pickup confirmation");
    
    // Handler for custom pickup event
    const handlePickupEvent = (event) => {
      // Check if this event is for our ride
      if (booking && booking.ride_id && event.detail.rideId === parseInt(booking.ride_id, 10)) {
        console.log("CUSTOM EVENT: Pickup confirmation detected!");
        
        // Immediately update UI to reflect pickup
        setCompletedSteps([0, 1]);
        setStep(2);
        
        // Show notification to customer
        Swal.fire({
          icon: 'success',
          title: 'Driver Has Arrived!',
          text: 'Your driver has confirmed pickup and is taking you to your destination.',
          timer: 3000,
          showConfirmButton: false,
          position: 'top-end',
          toast: true
        });
        
        // Quickly transition to next step
        setTimeout(() => {
          setCompletedSteps([0, 1, 2]);
          setStep(3);
          localStorage.setItem("trackingStep", "3");
          setNotifiedPickup(true);
        }, 300);
      }
    };
    
    // Add the event listener
    document.addEventListener('ridePickupConfirmed', handlePickupEvent);
    
    // Clean up
    return () => {
      document.removeEventListener('ridePickupConfirmed', handlePickupEvent);
    };
  }, [booking, step, notifiedPickup]);

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
                  <div id="map" style={{ height: "350px", width: "100%", borderRadius: "8px" }}></div>
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
