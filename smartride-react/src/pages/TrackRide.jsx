import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const TrackRide = () => {
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState(0);

  const steps = [
    { id: "step1", label: "Connecting to nearby driver...", icon: "fas fa-location-arrow" },
    { id: "step2", label: "Driver on the way (ETA: 3 mins)", icon: "fas fa-car-side" },
    { id: "step3", label: "Passenger picked up", icon: "fas fa-user-check" },
    { id: "step4", label: "Drop-off complete", icon: "fas fa-flag-checkered" },
  ];

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedBooking = JSON.parse(localStorage.getItem("latestBooking"));
    const storedStep = parseInt(localStorage.getItem("trackingStep") || "0");

    if (!storedUser || storedUser.role !== "customer") {
      window.location.href = "/login";
      return;
    }

    if (!storedBooking || storedBooking.paid || storedBooking.userEmail !== storedUser.email) {
      Swal.fire({
        icon: "warning",
        title: "No Ride In Progress",
        text: "You currently don’t have any ride to track. Please book a ride first.",
        confirmButtonText: "Book a Ride",
        confirmButtonColor: "#3085d6",
      }).then(() => {
        window.location.href = "/book";
      });
      return;
    }

    setUser(storedUser);
    setBooking(storedBooking);
    setStep(storedStep);
  }, []);

  useEffect(() => {
    if (booking && step < steps.length) {
      const interval = setInterval(() => {
        setStep((prevStep) => {
          const nextStep = prevStep + 1;
          localStorage.setItem("trackingStep", nextStep);
          if (nextStep >= steps.length) clearInterval(interval);
          return nextStep;
        });
      }, 3000);
  
      return () => clearInterval(interval);
    }
  }, [booking, step, steps.length]);  

  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      {/* Hero */}
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

      {/* Ride Details */}
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            {booking && (
              <div className="bg-light p-4 rounded shadow-sm mb-4 animate__animated animate__fadeIn">
                <h5 className="mb-2">Pickup: <strong>{booking.pickup}</strong></h5>
                <h5 className="mb-2">Dropoff: <strong>{booking.dropoff}</strong></h5>
                <h6 className="mb-1">Ride Type: {booking.rideType}</h6>
                <h6 className="mb-1">Fare Estimate: {booking.fare || booking.cost}</h6>
                <h6 className="mb-0">Status: In Progress...</h6>
              </div>
            )}

            <div className="animate__animated animate__fadeInUp">
              {steps.map((s, index) => {
                const status =
                  index < step ? "completed" : index === step ? "current" : "";
                return (
                  <div className={`ride-step ${status} mb-3`} key={s.id}>
                    <div className="icon me-3">
                      <i className={s.icon}></i>
                    </div>
                    <div>{s.label}</div>
                  </div>
                );
              })}
            </div>

            {step >= steps.length && (
              <div className="text-center mt-4">
                <a href="/payment" className="btn btn-primary px-4 rounded-pill">
                  Proceed to Payment
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Tracking CSS */}
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
      `}</style>
    </>
  );
};

export default TrackRide;
