import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const BookRide = () => {
  const [user, setUser] = useState(null);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [rideType, setRideType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [fareEstimate, setFareEstimate] = useState("");
  const [etaEstimate, setEtaEstimate] = useState("");

  const pricing = {
    bike: { fare: 5, eta: "5-10 mins" },
    car4: { fare: 10, eta: "8-15 mins" },
    car7: { fare: 15, eta: "10-20 mins" },
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const existingBooking = JSON.parse(localStorage.getItem("latestBooking"));

    if (!storedUser || storedUser.role !== "customer") {
      window.location.href = "/login";
    } else {
      setUser(storedUser);
    }

    if (existingBooking && !existingBooking.paid && existingBooking.userEmail === storedUser?.email) {
      Swal.fire({
        icon: "info",
        title: "Ride Already In Progress",
        text: "You already have a ride in progress.",
        confirmButtonText: "Track Ride",
        confirmButtonColor: "#3085d6",
      }).then(() => {
        window.location.href = "/customer-dashboard";
      });
    }
  }, []);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rideType || !paymentMethod || !pickup || !dropoff) {
      Swal.fire("Missing Info", "Please fill in all fields.", "warning");
      return;
    }

    const ride = {
      pickup,
      dropoff,
      rideType,
      paymentMethod,
      fare: `$${pricing[rideType].fare.toFixed(2)}`,
      datetime: new Date().toLocaleString(),
      driver: "Assigned Soon",
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

    Swal.fire({
      icon: "success",
      title: "Booking Confirmed!",
      text: "Redirecting to track your ride...",
    }).then(() => {
      window.location.href = "/customer-dashboard";
    });
  };

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
        <div className="container text-center" style={{ position: "relative", zIndex: 2 }}>
          <h1 className="display-4 text-white fw-bold">Book Your Ride</h1>
          <p className="lead">Fill in the details to get fare & ETA, then confirm your ride</p>
        </div>
      </div>

      {/* Booking Form */}
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="bg-light p-4 rounded shadow-sm animate__animated animate__fadeInUp">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Pickup Location</label>
                  <input type="text" className="form-control" value={pickup} onChange={(e) => setPickup(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Drop-off Location</label>
                  <input type="text" className="form-control" value={dropoff} onChange={(e) => setDropoff(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Ride Type</label>
                  <select className="form-select" value={rideType} onChange={(e) => handleRideTypeChange(e.target.value)} required>
                    <option value="">-- Select --</option>
                    <option value="bike">Bike</option>
                    <option value="car4">Car (4-Seater)</option>
                    <option value="car7">Car (7-Seater)</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required>
                    <option value="">-- Select Payment Method --</option>
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="ewallet">E-Wallet</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Fare Estimate</label>
                  <input type="text" className="form-control" value={fareEstimate} readOnly />
                </div>
                <div className="mb-3">
                  <label className="form-label">Estimated Time of Arrival (ETA)</label>
                  <input type="text" className="form-control" value={etaEstimate} readOnly />
                </div>
                <div className="d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-secondary w-45" onClick={() => (window.location.href = "/customer-dashboard")}>Cancel</button>
                  <button type="submit" className="btn btn-primary w-45">Confirm Booking</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default BookRide;
