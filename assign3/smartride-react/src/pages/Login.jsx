import React, { useState } from "react";
import Swal from "sweetalert2";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const matchedUser = users.find(
      (user) =>
        user.email.toLowerCase() === email.toLowerCase() &&
        user.password === password &&
        user.role === role
    );

    if (!matchedUser) {
      setError("Invalid email, password, or role.");
      return;
    }

    localStorage.setItem("user", JSON.stringify(matchedUser));

    Swal.fire({
      icon: "success",
      title: "Login Successful",
      text: `Welcome back, ${matchedUser.fullname || matchedUser.email}`,
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      if (role === "admin") window.location.href = "/admin-dashboard";
      else if (role === "driver") window.location.href = "/driver-dashboard";
      else window.location.href = "/customer-dashboard";
    });
  };

  return (
    <>
      <Topbar />
      <Navbar user={null} />

      {/* Hero */}
      <div className="container-fluid text-white py-5 hero-login" style={{
        background: "url('img/taxi.jpg') center center/cover no-repeat",
        position: "relative"
      }}>
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)"
        }}></div>
        <div className="container text-center" style={{ position: "relative", zIndex: 2 }}>
          <h1 className="display-4 text-white fw-bold">Welcome Back to SmartRide</h1>
          <p className="lead">Login below to continue your journey</p>
        </div>
      </div>

      {/* Login Form */}
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="bg-light rounded p-4 shadow animate__animated animate__fadeInUp">
              <h2 className="text-center mb-4 text-primary">Login to Your Account</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Login as</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  >
                    <option value="customer">Customer</option>
                    <option value="driver">Driver</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {error && <div className="text-danger mb-3">{error}</div>}
                <button type="submit" className="btn btn-primary w-100">Login</button>
              </form>
              <p className="mt-3 text-center">
                Don't have an account? <a href="/register">Register here</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Login;
