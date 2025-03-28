import React, { useState } from "react";
import Swal from "sweetalert2";
import "animate.css";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { userService } from "../services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Get all users to find matching credentials
      const users = await userService.getUsers();
      const hashedPassword = await hashPassword(password);
      const user = users.find(u => 
        u.email === email && 
        u.password_hash === hashedPassword && 
        u.role === role
      );

      if (!user) {
        setError("Invalid credentials or role mismatch");
        setIsLoading(false);
        return;
      }

      // Store user data in both localStorage and sessionStorage for persistence
      const userData = JSON.stringify(user);
      localStorage.setItem('user', userData);
      sessionStorage.setItem('user', userData);

      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: `Welcome back, ${user.email}`,
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        // Pass user data through navigation state
        if (role === "driver") {
          navigate("/driver-dashboard", { state: { user }, replace: true });
        } else {
          navigate("/customer-dashboard", { state: { user }, replace: true });
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      setError(error.detail || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Login as</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    disabled={isLoading}
                  >
                    <option value="customer">Customer</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>
                {error && <div className="text-danger mb-3">{error}</div>}
                <button 
                  type="submit" 
                  className="btn btn-primary w-100"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </button>
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
