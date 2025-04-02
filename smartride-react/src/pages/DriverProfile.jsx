import React, { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import NavbarDriver from "../components/NavbarDriver";
import Footer from "../components/Footer";
import Swal from "sweetalert2";

const DriverProfile = () => {
  const [user, setUser] = useState(null);
  const [vehicle, setVehicle] = useState({
    type: "Car",
    licensePlate: "",
    model: "",
    seats: 4,
  });

  const vehicleTypes = [
    { label: "Motorbike", value: "Motorbike", seats: 1 },
    { label: "4-Seater Car", value: "Car4", seats: 4 },
    { label: "7-Seater Car", value: "Car7", seats: 7 },
  ];

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      window.location.href = "/login";
    } else if (storedUser.role !== "driver") {
      window.location.href = `/${storedUser.role}-dashboard`;
    } else {
      setUser(storedUser);

      // Load vehicle info from localStorage (if exists)
      const storedVehicle = JSON.parse(localStorage.getItem("vehicle"));
      if (storedVehicle) {
        setVehicle(storedVehicle);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "type") {
      const selected = vehicleTypes.find((v) => v.value === value);
      setVehicle((prev) => ({
        ...prev,
        type: value,
        seats: selected.seats,
      }));
    } else {
      setVehicle((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSave = () => {
    localStorage.setItem("vehicle", JSON.stringify(vehicle));
    Swal.fire({
      icon: "success",
      title: "Saved!",
      text: "Your vehicle information has been updated.",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  return (
    <>
      <Topbar />
      <NavbarDriver user={user} onLogout={() => {
        localStorage.removeItem("user");
        localStorage.removeItem("vehicle");
        window.location.href = "/";
      }} />

      <div className="container-fluid bg-dark text-white py-5">
        <div className="container text-center">
          <h1 className="display-4 fw-bold">Driver Profile</h1>
          <p className="lead">Update your personal and vehicle information</p>
        </div>
      </div>

      <div className="container my-5">
        <div className="row justify-content-center">
          {/* Personal Info */}
          <div className="col-md-6 mb-4">
            <div className="bg-light p-4 rounded shadow-sm h-100">
              <h5 className="mb-3">
                <i className="fas fa-user text-primary me-2"></i>Personal Information
              </h5>
              <p>
                <strong>Name:</strong> {user?.fullname || "N/A"} <br />
                <strong>Email:</strong> {user?.email || "N/A"} <br />
                <strong>Role:</strong> Driver <br />
                {vehicle && (
                    <>
                    <strong>Vehicle:</strong> {vehicle.model || "N/A"} <br />
                    <strong>Plate:</strong> {vehicle.licensePlate || "N/A"} <br />
                    <strong>Type:</strong> {
                        vehicleTypes.find(v => v.value === vehicle.type)?.label || vehicle.type
                    }
                    </>
                )}
                </p>
            </div>
          </div>

          {/* Vehicle Info Form */}
          <div className="col-md-6 mb-4">
            <div className="bg-light p-4 rounded shadow-sm h-100">
              <h5 className="mb-3">
                <i className="fas fa-car text-success me-2"></i>Vehicle Information
              </h5>
              <form>
                <div className="mb-3">
                  <label className="form-label">Vehicle Type</label>
                  <select
                    className="form-select"
                    name="type"
                    value={vehicle.type}
                    onChange={handleChange}
                  >
                    {vehicleTypes.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">License Plate</label>
                  <input
                    type="text"
                    className="form-control"
                    name="licensePlate"
                    value={vehicle.licensePlate}
                    onChange={handleChange}
                    placeholder="e.g. 29A-123.45"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Vehicle Model</label>
                  <input
                    type="text"
                    className="form-control"
                    name="model"
                    value={vehicle.model}
                    onChange={handleChange}
                    placeholder="e.g. Toyota Vios 2020"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Number of Seats</label>
                  <input
                    type="number"
                    className="form-control"
                    name="seats"
                    value={vehicle.seats}
                    readOnly
                  />
                </div>

                <button type="button" className="btn btn-primary" onClick={handleSave}>
                  Save Vehicle Info
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default DriverProfile;
