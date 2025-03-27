// src/utils/bookingGuards.js
export const checkRideRestriction = (navigate) => {
  const booking = JSON.parse(localStorage.getItem("latestBooking"));
  const step = parseInt(localStorage.getItem("trackingStep") || "0");

  if (booking && !booking.paid) {
    if (step < 4) {
      alert("Ride in progress. Please finish this ride before continuing.");
      navigate("/track");
      return false;
    }
    if (step === 4) {
      alert("You haven’t completed payment for your last ride.");
      navigate("/payment");
      return false;
    }
  }
  return true;
};
