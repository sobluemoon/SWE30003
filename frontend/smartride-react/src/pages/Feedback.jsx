import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Feedback = () => {
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedBooking = JSON.parse(localStorage.getItem("latestBooking"));

    if (!storedUser || storedUser.role !== "customer" || !storedBooking || !storedBooking.paid) {
      navigate("/customer-dashboard");
      return;
    }

    setUser(storedUser);
    setBooking(storedBooking);
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleSubmit = () => {
    if (rating === 0) {
      Swal.fire("Oops", "Please select a star rating.", "warning");
      return;
    }

    const updatedBooking = {
      ...booking,
      rating,
      feedback: feedbackText,
    };

    // Update ride history
    const rideHistory = JSON.parse(localStorage.getItem("rideHistory") || "[]");
    const updatedHistory = rideHistory.map((ride) => {
      if (
        ride.userEmail === user.email &&
        ride.datetime === booking.datetime
      ) {
        return updatedBooking;
      }
      return ride;
    });

    localStorage.setItem("rideHistory", JSON.stringify(updatedHistory));
    localStorage.removeItem("latestBooking");

    Swal.fire({
      icon: "success",
      title: "Thank you!",
      text: "Your feedback has been submitted.",
      confirmButtonText: "Go to Dashboard",
    }).then(() => {
      navigate("/customer-dashboard");
    });
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      {/* Hero */}
      <div
        className="container-fluid text-white py-5 hero-feedback"
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
          <h1 className="display-4 fw-bold text-white">Rate Your Driver</h1>
          <p className="lead">🌟 You’ve reached the end of your ride. How did we do?</p>
        </div>
      </div>

      {/* Feedback Form */}
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="bg-light p-4 rounded shadow-sm animate__animated animate__fadeInUp">
              <div className="text-center mb-3">
                <span className="emoji">😊</span>
                <h5 className="d-inline ms-2">Tell us about your experience</h5>
              </div>

              {/* Star Rating */}
              <div
                className="star-rating mb-3 text-center"
                style={{ fontSize: "2rem" }}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <i
                    key={star}
                    className={`fas fa-star star ${
                      star <= (hovered || rating) ? "selected" : ""
                    }`}
                    style={{
                      color: star <= (hovered || rating) ? "gold" : "#ccc",
                      cursor: "pointer",
                    }}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                  ></i>
                ))}
              </div>

              {/* Feedback Text */}
              <textarea
                className="form-control mb-3"
                rows="4"
                placeholder="Write your feedback here..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              ></textarea>

              <button className="btn btn-primary w-100" onClick={handleSubmit}>
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Feedback;
