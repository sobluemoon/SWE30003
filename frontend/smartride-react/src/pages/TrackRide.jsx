import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const TrackRide = () => {
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [step, setStep] = useState(0);
  const [driverAccepted, setDriverAccepted] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { id: "step1", label: "Connecting to nearby driver...", icon: "fas fa-location-arrow" },
    { id: "step2", label: "Driver on the way (ETA: 3 mins)", icon: "fas fa-car-side" },
    { id: "step3", label: "Passenger picked up", icon: "fas fa-user-check" },
    { id: "step4", label: "On the way to destination...", icon: "fas fa-route" },
    { id: "step5", label: "Drop-off complete", icon: "fas fa-flag-checkered" },
  ];

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
          const updatedBooking = { ...storedBooking, driver: "Driver Lee", };
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
                <div className="mt-4 text-center animate__animated animate__fadeIn">
                  <img src="/img/pickup-dropoff.gif" alt="Driver in transit" className="img-fluid rounded shadow-sm" style={{ maxHeight: "350px" }} />
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
      `}</style>
    </>
  );
};

export default TrackRide;
