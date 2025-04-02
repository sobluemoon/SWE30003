import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Payment = () => {
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const storedBooking = JSON.parse(localStorage.getItem("latestBooking"));

    if (!storedUser || storedUser.role !== "customer") {
      window.location.href = "/login";
      return;
    }

    if (!storedBooking || storedBooking.paid || storedBooking.userEmail !== storedUser.email) {
      Swal.fire({
        icon: "warning",
        title: "No Active Payment",
        text: "Redirecting to dashboard...",
      }).then(() => {
        window.location.href = "/customer-dashboard";
      });
      return;
    }

    setUser(storedUser);
    setBooking(storedBooking);

    if (storedBooking.paymentMethod === "cash") {
      setNote("This is a cash ride. Payment is marked complete for demo purposes.");
    } else if (storedBooking.paymentMethod === "card") {
      setNote("Your card will be charged securely.");
    } else if (storedBooking.paymentMethod === "ewallet") {
      setNote("Redirecting to your e-wallet provider... (simulated)");
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case "cash": return "Cash";
      case "card": return "Credit/Debit Card";
      case "ewallet": return "E-Wallet";
      default: return method;
    }
  };

  const confirmPayment = () => {
    if (!user || !booking) return;

    const rideHistory = JSON.parse(localStorage.getItem("rideHistory") || "[]");

    if (rideHistory.length > 0 && rideHistory[0].userEmail === user.email) {
      rideHistory[0].paid = true;
      localStorage.setItem("rideHistory", JSON.stringify(rideHistory));
    }

    booking.paid = true;
    localStorage.setItem("latestBooking", JSON.stringify(booking));

    const method = booking.paymentMethod;
    const delay = method === "cash" ? 100 : 1000;

    setTimeout(() => {
      Swal.fire({
        icon: "success",
        title: "Payment Successful!",
        text: "Your ride is now complete.",
        confirmButtonText: "Continue",
      }).then(() => {
        Swal.fire({
          title: "Rate your ride?",
          text: "Would you like to rate your driver now?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Yes, rate now",
          cancelButtonText: "Maybe later",
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/feedback";
          } else {
            // Keep ride in localStorage for later feedback
            window.location.href = "/customer-dashboard";
          }
        });        
      });
    }, delay);
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      {/* Hero */}
      <div className="container-fluid text-white py-5 hero-payment" style={{
        background: "url('img/taxi.jpg') center center/cover no-repeat",
        position: "relative"
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)"
        }}></div>
        <div className="container text-center" style={{ position: "relative", zIndex: 2 }}>
          <h1 className="display-4 fw-bold text-white">Payment Summary</h1>
          <p className="lead">Review and confirm your payment</p>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            {booking && (
              <div className="bg-light p-4 rounded shadow-sm mb-4 animate__animated animate__fadeInUp">
                <h5 className="mb-3 text-primary">Ride Receipt</h5>
                <p><strong>Pickup:</strong> {booking.pickup}</p>
                <p><strong>Dropoff:</strong> {booking.dropoff}</p>
                <p><strong>Date & Time:</strong> {booking.datetime}</p>
                <p><strong>Driver:</strong> {booking.driver || "Assigned Soon"}</p>
                <p><strong>Ride Type:</strong> {booking.rideType}</p>
                <p><strong>Fare:</strong> {booking.fare || booking.cost || "$0.00"}</p>
                <p><strong>Payment Method:</strong> {getPaymentMethodLabel(booking.paymentMethod)}</p>
              </div>
            )}
            <div className="text-center">
              <button className="btn btn-success px-4 rounded-pill" onClick={confirmPayment}>Confirm Payment</button>
            </div>
            <p className="text-muted text-center mt-3">{note}</p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Payment;
