import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { rideService } from "../services/api";

const DriverFeedback = () => {
  const [user, setUser] = useState(null);
  const [feedbackRides, setFeedbackRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch driver's rides with feedback
  const fetchFeedbackRides = useCallback(async (driverId) => {
    try {
      setIsLoading(true);
      console.log("Fetching feedback for driver:", driverId);
      
      // Get all rides for this driver
      let rides = [];
      try {
        rides = await rideService.getUserRides(driverId, "driver");
        console.log("Rides received from getUserRides:", rides);
      } catch (error) {
        console.error("Error using getUserRides:", error);
        
        // Fallback: get all rides and filter
        try {
          const allRides = await rideService.getRides();
          rides = allRides.filter(ride => ride.driver_id === driverId);
          console.log("Rides received from fallback method:", rides);
        } catch (fallbackError) {
          console.error("Error with fallback method:", fallbackError);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load your feedback",
          });
          setIsLoading(false);
          return;
        }
      }
      
      // Filter for completed rides with feedback/rating
      const feedbackRides = rides.filter(ride => 
        ride.status === "Completed" && 
        (ride.feedback || ride.rating)
      );
      
      console.log("Rides with feedback:", feedbackRides);
      setFeedbackRides(feedbackRides);
      
      // Calculate average rating
      if (feedbackRides.length > 0) {
        const ratedRides = feedbackRides.filter(ride => ride.rating);
        if (ratedRides.length > 0) {
          const sum = ratedRides.reduce((total, ride) => total + ride.rating, 0);
          setAverageRating((sum / ratedRides.length).toFixed(1));
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load your feedback. Please try again.",
      });
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get user from navigation state or local storage
    const userData = location.state?.user || JSON.parse(localStorage.getItem("user"));
    
    if (!userData || userData.role !== "driver") {
      navigate("/login");
      return;
    }

    setUser(userData);
    fetchFeedbackRides(userData.user_id);
  }, [navigate, location, fetchFeedbackRides]);

  const generateStars = (rating) => {
    if (!rating) return <span className="text-muted">Not rated</span>;
    
    return [...Array(5)].map((_, i) => (
      <i
        key={i}
        className={`fa-star ${i < rating ? "fas text-warning" : "far text-muted"}`}
      ></i>
    ));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return dateString;
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      {/* Hero Section */}
      <div className="container-fluid bg-dark text-white py-5">
        <div className="container">
          <h1 className="fw-bold">My Feedback & Ratings</h1>
          <p className="lead">See what passengers are saying about your service</p>
        </div>
      </div>

      {/* Feedback Summary */}
      <div className="container py-5">
        <div className="row mb-5">
          <div className="col-md-6 mx-auto">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center p-4">
                <i className="fas fa-star fa-3x text-warning mb-3"></i>
                <h3 className="mb-3">Your Average Rating</h3>
                {feedbackRides.length > 0 ? (
                  <>
                    <div className="display-4 fw-bold text-primary mb-2">{averageRating}</div>
                    <div className="mb-3">
                      {generateStars(Math.round(averageRating))}
                    </div>
                    <p className="text-muted">Based on {feedbackRides.length} ride{feedbackRides.length !== 1 ? 's' : ''}</p>
                  </>
                ) : (
                  <p className="text-muted">No ratings yet. Complete more rides to get rated.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <h3 className="mb-4">Feedback from Passengers</h3>
        
        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading your feedback...</p>
          </div>
        ) : feedbackRides.length > 0 ? (
          <div className="row">
            {feedbackRides.map((ride) => (
              <div key={ride.ride_id} className="col-md-6 mb-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="card-title mb-0">Ride #{ride.ride_id}</h5>
                      <span className="badge bg-primary">{formatDate(ride.end_time)}</span>
                    </div>
                    <p className="mb-1"><strong>From:</strong> {ride.pickup_location}</p>
                    <p className="mb-1"><strong>To:</strong> {ride.dropoff_location}</p>
                    <p className="mb-1"><strong>Customer:</strong> Customer #{ride.customer_id}</p>
                    
                    <div className="mt-3 mb-2">
                      <strong>Rating:</strong> <span className="ms-2">{generateStars(ride.rating)}</span>
                    </div>
                    
                    {ride.feedback ? (
                      <div className="mt-3">
                        <strong>Feedback:</strong>
                        <div className="p-3 bg-light rounded mt-2">
                          <i className="fas fa-quote-left text-muted me-2"></i>
                          {ride.feedback}
                          <i className="fas fa-quote-right text-muted ms-2"></i>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted fst-italic mt-3">No written feedback provided</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5">
            <i className="fas fa-comments fa-3x text-muted mb-3"></i>
            <h4>No Feedback Yet</h4>
            <p className="text-muted">
              You haven't received any feedback yet. Complete more rides to get feedback and ratings from passengers.
            </p>
            <button
              className="btn btn-primary mt-3"
              onClick={() => navigate("/driver-dashboard")}
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
};

export default DriverFeedback; 