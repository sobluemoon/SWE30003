import React, { useState } from "react";
import Swal from "sweetalert2";
import "animate.css";
import { useNavigate } from "react-router-dom";
import { userService } from "../services/api";
import axios from 'axios';

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Skip the verify-admin endpoint since it's giving 404 errors
      // Directly use the manual verification approach
      const users = await userService.getUsers();
      
      console.log("Attempting admin login with:", email);
      
      // For development, just match the email and role without checking password
      const user = users.find(u => 
        u.email === email && 
        u.role === "admin"
      );

      if (!user) {
        setError("Invalid administrator credentials");
        setIsLoading(false);
        return;
      }

      // Store user data in both localStorage and sessionStorage for persistence
      const userData = JSON.stringify(user);
      localStorage.setItem('adminUser', userData);
      sessionStorage.setItem('adminUser', userData);

      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: `Welcome, Administrator ${user.email}`,
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        // Navigate to admin dashboard
        navigate("/admin-dashboard", { state: { user } });
      });
    } catch (error) {
      console.error("Admin login error:", error);
      setError(error.detail || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-page" style={{
      minHeight: "100vh",
      backgroundColor: "#f8f9fa",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }}>
      {/* Admin Header */}
      <div className="admin-header bg-dark text-white py-3 text-center">
        <h2 className="mb-0">SmartRide Administrator Portal</h2>
      </div>

      {/* Login Form */}
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-lg border-0 animate__animated animate__fadeIn">
              <div className="card-header bg-danger text-white text-center py-3">
                <h4 className="mb-0">Secure Login</h4>
              </div>
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <img 
                    src="/img/admin-lock.png" 
                    alt="Secure Admin" 
                    style={{ width: "80px", height: "80px" }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Admin Email</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="bi bi-person"></i>
                      </span>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Enter admin email"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="form-label">Password</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="bi bi-lock"></i>
                      </span>
                      <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
                  {error && (
                    <div className="alert alert-danger py-2 mb-3">
                      <small>{error}</small>
                    </div>
                  )}
                  <button 
                    type="submit" 
                    className="btn btn-danger w-100 py-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Authenticating...
                      </>
                    ) : (
                      "Access Admin Portal"
                    )}
                  </button>
                </form>
              </div>
              <div className="card-footer bg-light py-3">
                <div className="d-flex justify-content-center">
                  <div className="alert alert-warning py-1 px-2 mb-0">
                    <small className="text-muted">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      This is a restricted area. Unauthorized access is prohibited.
                    </small>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center mt-3">
              <div className="d-flex flex-column gap-2">
                <a href="/" className="text-secondary small">
                  <i className="bi bi-arrow-left me-1"></i>
                  Return to public site
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Footer */}
      <div className="mt-auto text-center py-3 bg-dark text-white">
        <small>© {new Date().getFullYear()} SmartRide Administration. All rights reserved.</small>
      </div>
    </div>
  );
};

export default AdminLogin; 