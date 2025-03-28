import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "animate.css";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const TrackRide = () => {
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState(0);
  const [driverAccepted, setDriverAccepted] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);
  const navigate = useNavigate();

  const steps = [
    { id: "step1", label: "Connecting to nearby driver...", icon: "fas fa-location-arrow" },
    { id: "step2", label: "Driver on the way (ETA: 3 mins)", icon: "fas fa-car-side" },
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

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedBooking = JSON.parse(localStorage.getItem("latestBooking"));
    const storedStep = parseInt(localStorage.getItem("trackingStep") || "0");

    if (!storedUser || storedUser.role !== "customer") {
      navigate("/login");
      return;
    }

    if (!storedBooking || storedBooking.paid || storedBooking.userEmail !== storedUser.email) {
      Swal.fire({
        icon: "info",
        title: "No Ride In Progress",
        text: "Please book a ride first.",
        confirmButtonText: "Go to Booking",
      }).then(() => {
        navigate("/book");
      });
      return;
    }

    setUser(storedUser);
    setBooking(storedBooking);
    setStep(storedStep);

    setTimeout(() => {
      if (!document.getElementById("acceptRide") && !document.getElementById("simulate-popup")) {
        const simulate = document.createElement("div");
        simulate.id = "simulate-popup";
        simulate.style.position = "fixed";
        simulate.style.top = "20px";
        simulate.style.right = "20px";
        simulate.style.zIndex = "9999";
        simulate.style.background = "#fff";
        simulate.style.padding = "12px";
        simulate.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
        simulate.innerHTML = `
          <strong>Simulate Driver:</strong><br/>
          <button id="acceptRide" style="margin-top: 5px; margin-right: 8px;">Accept</button>
          <button id="cancelRide">Reject</button>
        `;
        document.body.appendChild(simulate);

        document.getElementById("acceptRide").addEventListener("click", () => {
          const updatedBooking = { ...storedBooking, driver: "Driver Lee" };
          localStorage.setItem("latestBooking", JSON.stringify(updatedBooking));
          setBooking(updatedBooking);
          setDriverAccepted(true);
          setStep(1);
          localStorage.setItem("trackingStep", "1");
          simulate.remove();
        });

        document.getElementById("cancelRide").addEventListener("click", () => {
          setStep(0);
          localStorage.setItem("trackingStep", "0");
          simulate.remove();

          setTimeout(() => {
            const newDriver = ["Oppa", "Daniel", "Dongik"][Math.floor(Math.random() * 3)];
            const updatedBooking = { ...storedBooking, driver: `Driver ${newDriver}` };
            localStorage.setItem("latestBooking", JSON.stringify(updatedBooking));
            setBooking(updatedBooking);
            setDriverAccepted(true);
            setStep(1);
            localStorage.setItem("trackingStep", "1");
          }, 4000);
        });
      }
    }, 1000);
  }, [navigate]);

  useEffect(() => {
    let timeout;
    if (booking && driverAccepted && step < steps.length) {
      const delay = step === 3 ? 6000 : 3000;
      timeout = setTimeout(() => {
        const nextStep = step + 1;
        setStep(nextStep);
        localStorage.setItem("trackingStep", nextStep);
      }, delay);
    }
    return () => clearTimeout(timeout);
  }, [booking, driverAccepted, step, steps.length]);

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
                <h6 className="mb-0">Driver: {booking.driver || "Pending"}</h6>
              </div>
            )}

            {error && (
              <div className="alert alert-warning animate__animated animate__fadeIn">
                {error}
              </div>
            )}

            <div className="animate__animated animate__fadeInUp">
              {steps.map((s, index) => {
                const status = index < step ? "completed" : index === step ? "current" : "";
                return (
                  <div className={`ride-step ${status} mb-3`} key={s.id}>
                    <div className="icon me-3">
                      <i className={s.icon}></i>
                    </div>
                    <div>{s.label}</div>
                  </div>
                );
              })}

              {step === 0 && (
                <div className="mt-4 text-center animate__animated animate__fadeIn">
                  <img src="/img/driver-nearby.gif" alt="Connecting to driver..." className="img-fluid rounded shadow-sm" style={{ maxHeight: "350px" }} />
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
                </div>
              )}
            </div>

            {step >= steps.length && (
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
        }
        .ride-step .icon {
          width: 30px;
          height: 30px;
          background-color: #ccc;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ride-step.completed .icon {
          background-color: #28a745;
        }
        .ride-step.current .icon {
          background-color: #ffc107;
        }
        #map {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          position: relative;
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
