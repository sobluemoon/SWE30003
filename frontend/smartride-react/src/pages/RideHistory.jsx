import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const RideHistory = () => {
  const [user, setUser] = useState(null);
  const [paidRides, setPaidRides] = useState([]);
  const [unpaidRides, setUnpaidRides] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser || storedUser.role !== "customer") {
      navigate("/login");
      return;
    }

    setUser(storedUser);

    const history = JSON.parse(localStorage.getItem("rideHistory") || "[]");
    const userRides = history.filter((r) => r.userEmail === storedUser.email);

    setPaidRides(userRides.filter((r) => r.paid));
    setUnpaidRides(userRides.filter((r) => !r.paid));
  }, [navigate]);

  const logout = () => {
    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been successfully logged out.",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      localStorage.removeItem("user");
      navigate("/");
    });
  };

  const generateStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <i
        key={i}
        className={`fa-star ${i < rating ? "fas text-warning" : "far text-warning"}`}
      ></i>
    ));
  };

  const handlePayNow = (ride) => {
    localStorage.setItem("latestBooking", JSON.stringify(ride));
    Swal.fire({
      icon: "info",
      title: "Redirecting to payment...",
      showConfirmButton: false,
      timer: 1200,
    }).then(() => {
      navigate("/payment");
    });
  };

  const handleEditFeedback = (ride) => {
    localStorage.setItem("latestBooking", JSON.stringify(ride));
    Swal.fire({
      icon: "info",
      title: "Redirecting to feedback page...",
      timer: 1000,
      showConfirmButton: false,
    }).then(() => {
      navigate("/feedback");
    });
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      {/* Hero Section */}
      <div
        className="container-fluid text-white py-5 hero-history"
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
          <h1 className="display-4 fw-bold text-white">Your Ride History</h1>
          <p className="lead">View your completed rides and pay pending ones</p>
        </div>
      </div>

      {/* Ride Tables */}
      <div className="container py-5">
        <h3 className="text-center mb-3 text-success">Completed Rides</h3>
        {paidRides.length > 0 ? (
          <div className="table-responsive mb-5">
            <table className="table table-bordered text-center align-middle">
              <thead className="table-success">
                <tr>
                  <th>#</th>
                  <th>Pickup</th>
                  <th>Drop-off</th>
                  <th>Date & Time</th>
                  <th>Driver</th>
                  <th>Fare</th>
                  <th>Rating</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {paidRides.map((ride, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{ride.pickup}</td>
                    <td>{ride.dropoff}</td>
                    <td>{ride.datetime}</td>
                    <td>{ride.driver}</td>
                    <td>{ride.fare}</td>
                    <td>
                      {ride.rating ? generateStars(ride.rating) : (
                        <span className="text-muted">No rating</span>
                      )}
                    </td>
                    <td>
                      {ride.feedback ? (
                        <>
                          {ride.feedback}
                          <br />
                          <button
                            onClick={() => handleEditFeedback(ride)}
                            className="btn btn-sm btn-link text-primary"
                          >
                            Edit Feedback
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEditFeedback(ride)}
                          className="btn btn-sm btn-link text-primary"
                        >
                          Leave Feedback
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-muted mb-5">
            <i className="fas fa-clock fa-2x mb-2 text-secondary"></i>
            <p>No completed rides yet.</p>
          </div>
        )}

        <h3 className="text-center mb-3 text-danger">Pending Payment</h3>
        {unpaidRides.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered text-center align-middle">
              <thead className="table-danger">
                <tr>
                  <th>#</th>
                  <th>Pickup</th>
                  <th>Drop-off</th>
                  <th>Date & Time</th>
                  <th>Driver</th>
                  <th>Fare</th>
                  <th>Method</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {unpaidRides.map((ride, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{ride.pickup}</td>
                    <td>{ride.dropoff}</td>
                    <td>{ride.datetime}</td>
                    <td>{ride.driver}</td>
                    <td>{ride.fare}</td>
                    <td>{ride.paymentMethod || "N/A"}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handlePayNow(ride)}
                      >
                        Pay Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted">No pending rides found.</p>
        )}
      </div>

      <Footer />
    </>
  );
};

export default RideHistory;
