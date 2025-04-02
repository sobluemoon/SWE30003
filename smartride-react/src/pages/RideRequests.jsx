import React, { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import NavbarDriver from "../components/NavbarDriver";
import Footer from "../components/Footer";
import Swal from "sweetalert2";

const RideRequests = () => {
  const [user, setUser] = useState(null);
  const [rideRequests, setRideRequests] = useState([]);
  const [currentTrip, setCurrentTrip] = useState(null);

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

      // Fetch ride requests (mocked)
      setRideRequests([
        { id: 101, passenger: "Michael Brown", pickup: "Location A", dropoff: "Location B", fare: "$25" },
        { id: 102, passenger: "Sarah Connor", pickup: "Location C", dropoff: "Location D", fare: "$30" },
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

  const acceptRideRequest = (request) => {
    setCurrentTrip(request);
    setRideRequests((prev) => prev.filter((ride) => ride.id !== request.id));
    Swal.fire({
      icon: "success",
      title: "Ride Accepted",
      text: `You have accepted the ride for ${request.passenger}.`,
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const rejectRideRequest = (request) => {
    setRideRequests((prev) => prev.filter((ride) => ride.id !== request.id));
    Swal.fire({
      icon: "info",
      title: "Ride Rejected",
      text: `You have rejected the ride for ${request.passenger}.`,
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const completeTrip = () => {
    setCurrentTrip(null);
    Swal.fire({
      icon: "success",
      title: "Trip Completed",
      text: "You have successfully completed the trip.",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  return (
    <>
      <Topbar />
      <NavbarDriver user={user} onLogout={logout} />

      <div className="container my-5">
        <h3 className="text-center mb-4">Ride Requests</h3>
        <div className="row g-4">
          {rideRequests.length === 0 ? (
            <p className="text-center">No ride requests at the moment.</p>
          ) : (
            rideRequests.map((request) => (
              <div className="col-md-6" key={request.id}>
                <div className="bg-light p-4 rounded shadow-sm">
                  <p>
                    <strong>Passenger:</strong> {request.passenger} <br />
                    <strong>Pickup:</strong> {request.pickup} <br />
                    <strong>Dropoff:</strong> {request.dropoff} <br />
                    <strong>Fare:</strong> {request.fare}
                  </p>
                  <div className="d-flex justify-content-between">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => acceptRideRequest(request)}
                    >
                      Accept Ride
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => rejectRideRequest(request)}
                    >
                      Reject Ride
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {currentTrip && (
        <div className="container my-5">
          <h3 className="text-center mb-4">Current Trip</h3>
          <div className="bg-light p-4 rounded shadow-sm text-center">
            <p>
              <strong>Passenger:</strong> {currentTrip.passenger} <br />
              <strong>Pickup:</strong> {currentTrip.pickup} <br />
              <strong>Dropoff:</strong> {currentTrip.dropoff} <br />
              <strong>Fare:</strong> {currentTrip.fare}
            </p>
            <button className="btn btn-success btn-sm" onClick={completeTrip}>
              Complete Trip
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
};

export default RideRequests;