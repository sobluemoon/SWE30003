import React from "react";

const Navbar = ({ user, onLogout }) => {
  const isLoggedIn = !!user;
  const role = user?.role;

  let dashboardLink = "/option";
  if (role === "customer") dashboardLink = "/customer-dashboard";
  else if (role === "driver") dashboardLink = "/driver-dashboard";
  else if (role === "admin") dashboardLink = "/admin-dashboard";

  return (
    <div className="container-fluid nav-bar sticky-top px-0 px-lg-4 py-2 py-lg-0 bg-white shadow-sm">
      <div className="container">
        <nav className="navbar navbar-expand-lg navbar-light">
          <a href="/" className="navbar-brand p-0">
            <h1 className="display-6 text-primary">
              <i className="fas fa-car-alt me-3"></i>SmartRide
            </h1>
          </a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse">
            <span className="fa fa-bars"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarCollapse">
            <div className="navbar-nav mx-auto py-0">
              <a href="/" className="nav-item nav-link">Home</a>
              <a href={isLoggedIn ? "/book" : "/option"} className="nav-item nav-link">Book a Ride</a>
              <a href={dashboardLink} className="nav-item nav-link">Dashboard</a>
              <a href={isLoggedIn ? "/track" : "/option"} className="nav-item nav-link">Track Ride</a>
              <a href={isLoggedIn ? "/feedback" : "/option"} className="nav-item nav-link">Feedback</a>
              <a href={isLoggedIn ? "/history" : "/option"} className="nav-item nav-link">History</a>
            </div>
            <div className="d-flex align-items-center">
              {isLoggedIn ? (
                <>
                  <span className="me-2 fw-bold text-dark">{user.fullname || user.email}</span>
                  <button
                    onClick={onLogout}
                    className="btn btn-outline-danger btn-sm rounded-circle"
                    title="Logout"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                  </button>
                </>
              ) : (
                <a href="/option" className="btn btn-primary rounded-pill py-2 px-4">Get Started</a>
              )}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Navbar;
