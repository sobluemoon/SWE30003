import React, { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import NavbarDriver from "../components/NavbarDriver";
import Footer from "../components/Footer";
import Swal from "sweetalert2";

const DriverDashboard = () => {
  const [user, setUser] = useState(null);
  const [rating, setRating] = useState(0);
  const [rideHistory, setRideHistory] = useState([]);


  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser) {
      window.location.href = "/login";
    } else if (storedUser.role !== "driver") {
      if (storedUser.role === "admin") {
        window.location.href = "/admin-dashboard";
      } else {
        window.location.href = "/customer-dashboard";
      }
    } else {
      setUser(storedUser);

      // Fetch driver rating (mocked for now)
      setRating(4.5);

      // Fetch ride history (mocked for now)
      setRideHistory([
        { id: 1, date: "2025-03-20", passenger: "John Doe", fare: "$25" },
        { id: 2, date: "2025-03-21", passenger: "Jane Smith", fare: "$30" },
        { id: 3, date: "2025-03-22", passenger: "Alice Johnson", fare: "$20" },
      ]);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been logged out successfully.",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      window.location.href = "/";
    });
  };

  return (
    <>
      <Topbar />
      <NavbarDriver user={user} onLogout={logout} />

      {/* Hero Section */}
      <div className="container-fluid bg-dark text-white py-5">
        <div className="container text-center">
          <h1 className="display-4 fw-bold">
            Welcome, {user ? user.fullname || user.email.split("@")[0] : "Driver"}!
          </h1>
          <p className="lead">Manage your SmartRide responsibilities here.</p>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="container my-5">
        <div className="row g-4 justify-content-center">
          {/* Personal Info */}
          <div className="col-md-4">
            <div className="bg-light text-center p-4 rounded shadow-sm h-100">
              <i className="fas fa-user fa-3x text-primary mb-3"></i>
              <h5 className="mb-2">Personal Info</h5>
              <p>
                <strong>Name:</strong> {user?.fullname || "N/A"} <br />
                <strong>Email:</strong> {user?.email || "N/A"}
              </p>
            </div>
          </div>

          {/* Rating */}
          <div className="col-md-4">
            <div className="bg-light text-center p-4 rounded shadow-sm h-100">
              <i className="fas fa-star fa-3x text-warning mb-3"></i>
              <h5 className="mb-2">My Rating</h5>
              <p>
                <strong>Rating:</strong> {rating} / 5
              </p>
            </div>
          </div>

          {/* Ride History */}
          <div className="col-md-4">
            <div className="bg-light text-center p-4 rounded shadow-sm h-100">
              <i className="fas fa-history fa-3x text-success mb-3"></i>
              <h5 className="mb-2">Ride History</h5>
              <ul className="list-unstyled">
                {rideHistory.map((ride) => (
                  <li key={ride.id}>
                    <strong>Date:</strong> {ride.date} <br />
                    <strong>Passenger:</strong> {ride.passenger} <br />
                    <strong>Fare:</strong> {ride.fare}
                    <hr />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default DriverDashboard;