import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import "animate.css";
import { useNavigate } from "react-router-dom";
import axios from 'axios';

const AdminRegister = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in as admin
  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser') || sessionStorage.getItem('adminUser');
    if (!adminUser) {
      // Redirect to admin login if not logged in as admin
      navigate("/admin");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      // Call the create-admin endpoint
      const response = await axios.post(
        `http://localhost:8000/create-admin/?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
      );

      Swal.fire({
        icon: "success",
        title: "Admin Registration Successful!",
        text: `New admin user ${email} has been created.`,
        confirmButtonText: "Return to Dashboard",
      }).then(() => {
        navigate("/admin-dashboard");
      });
    } catch (error) {
      console.error("Admin registration error:", error);
      setError(
        error.response?.data?.detail || 
        "Registration failed. This email may already be registered."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-register-page" style={{
      minHeight: "100vh",
      backgroundColor: "#f8f9fa",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }}>
      {/* Admin Header */}
      <div className="admin-header bg-dark text-white py-3 text-center">
        <h2 className="mb-0">SmartRide Administrator Portal</h2>
        <p className="small mb-0">Create New Administrator Account</p>
      </div>

      {/* Register Form */}
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-lg border-0 animate__animated animate__fadeIn">
              <div className="card-header bg-danger text-white text-center py-3">
                <h4 className="mb-0">New Admin Registration</h4>
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
                        placeholder="Enter new admin email"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
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
                  <div className="mb-4">
                    <label className="form-label">Confirm Password</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="bi bi-lock-fill"></i>
                      </span>
                      <input
                        type="password"
                        className="form-control"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        placeholder="Confirm password"
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
                        Creating Admin...
                      </>
                    ) : (
                      "Register New Admin"
                    )}
                  </button>
                  <div className="mt-3 text-center">
                    <a href="/admin-dashboard" className="text-secondary small">
                      <i className="bi bi-arrow-left me-1"></i>
                      Return to Admin Dashboard
                    </a>
                  </div>
                </form>
              </div>
              <div className="card-footer bg-light py-3">
                <div className="d-flex justify-content-center">
                  <div className="alert alert-warning py-1 px-2 mb-0">
                    <small className="text-muted">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Only authorized administrators can create new admin accounts.
                    </small>
                  </div>
                </div>
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

export default AdminRegister; 