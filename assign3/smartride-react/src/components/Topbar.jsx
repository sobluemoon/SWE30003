import React from "react";

const Topbar = () => {
  return (
    <div className="container-fluid topbar bg-secondary d-none d-xl-block w-100">
      <div className="container">
        <div className="row gx-0 align-items-center" style={{ height: "45px" }}>
          <div className="col-lg-6 text-center text-lg-start mb-lg-0">
            <div className="d-flex flex-wrap">
              <a href="/" className="text-muted me-4">
                <i className="fas fa-map-marker-alt text-primary me-2"></i>Find Us
              </a>
              <a href="tel:+01234567890" className="text-muted me-4">
                <i className="fas fa-phone-alt text-primary me-2"></i>+01234567890
              </a>
              <a href="mailto:info@smartride.com" className="text-muted">
                <i className="fas fa-envelope text-primary me-2"></i>info@smartride.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
