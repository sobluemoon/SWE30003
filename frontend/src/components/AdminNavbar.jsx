import React from "react";

const AdminNavbar = ({ user, onLogout }) => {
  return (
    <div className="container-fluid nav-bar sticky-top px-0 px-lg-4 py-2 py-lg-0 bg-white shadow-sm">
      <div className="container">
        <nav className="navbar navbar-expand-lg navbar-light">
          <a href="/admin-dashboard" className="navbar-brand p-0">
            <h1 className="display-6 text-primary">
              <i className="fas fa-cogs me-3"></i>Admin Panel
            </h1>
          </a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#adminNavbarCollapse">
            <span className="fa fa-bars"></span>
          </button>
          <div className="collapse navbar-collapse" id="adminNavbarCollapse">
            <div className="navbar-nav mx-auto py-0">
              <a href="/admin-dashboard" className="nav-item nav-link">Dashboard</a>
              <a href="/admin-register" className="nav-item nav-link">Register New Admin</a>
              <a href="/admin-insert" className="nav-item nav-link">Insert Into Database</a>
              <a href="/admin-update" className="nav-item nav-link">Update Existing Data</a>
              <a href="/admin-delete" className="nav-item nav-link">Delete Data</a>
            </div>
            <div className="d-flex align-items-center">
              {user && (
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
              )}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default AdminNavbar;
