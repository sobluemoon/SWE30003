import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_BASE_URL = "http://localhost:8000";

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [tables, setTables] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser || storedUser.role !== "admin") {
      if (!storedUser) window.location.href = "/login";
      else if (storedUser.role === "customer") window.location.href = "/customer-dashboard";
      else window.location.href = "/driver-dashboard";
      return;
    }

    setUser(storedUser);

    const tableNames = [
      "users",
      "vehicles",
      "rides",
      "payments",
      "feedbacks",
      "notifications",
      "gps",
    ];

    const fetchData = async () => {
      try {
        const responses = await Promise.all(
          tableNames.map((table) =>
            fetch(`${API_BASE_URL}/${table}/`)
              .then((res) => res.ok ? res.json() : Promise.reject(`Error fetching ${table}`))
          )
        );

        const newTables = {};
        tableNames.forEach((table, index) => {
          newTables[table] = responses[index];
        });

        setTables(newTables);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Please check your API.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const logout = () => {
    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been successfully logged out.",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      localStorage.removeItem("user");
      window.location.href = "/";
    });
  };

  return (
    <>
      <Topbar />
      <Navbar user={user} onLogout={logout} />

      {/* Dashboard Hero */}
      <div className="container-fluid text-white py-5 dashboard-hero"
        style={{
          background: "url('img/admin-bg.jpg') center center/cover no-repeat",
          position: "relative",
        }}>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
        }}></div>
        <div className="container text-center" style={{ position: "relative", zIndex: 2 }}>
          <h1 className="display-4 text-white fw-bold">Admin Dashboard</h1>
          <p className="lead">Manage the entire ride-sharing system.</p>
        </div>
      </div>

      {/* Tables Section */}
      <div className="container my-5">
        <h3 className="text-center mb-4">Database Overview</h3>

        {loading ? (
          <p className="text-center">Loading data...</p>
        ) : error ? (
          <p className="text-danger text-center">{error}</p>
        ) : (
          <div className="accordion" id="adminTablesAccordion">
            {Object.keys(tables).map((table, index) => (
              <div className="accordion-item" key={table}>
                <h2 className="accordion-header">
                  <button
                    className="accordion-button"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#collapse-${table}`}
                    aria-expanded={index === 0 ? "true" : "false"}
                    aria-controls={`collapse-${table}`}
                  >
                    {table.charAt(0).toUpperCase() + table.slice(1)}
                  </button>
                </h2>
                <div
                  id={`collapse-${table}`}
                  className={`accordion-collapse collapse ${index === 0 ? "show" : ""}`}
                  data-bs-parent="#adminTablesAccordion"
                >
                  <div className="accordion-body">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          {tables[table].length > 0 &&
                            Object.keys(tables[table][0]).map((col) => (
                              <th key={col}>{col}</th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tables[table].length > 0 ? (
                          tables[table].map((row, idx) => (
                            <tr key={idx}>
                              {Object.values(row).map((val, i) => (
                                <td key={i}>{val}</td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="100%">No data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
};

export default AdminDashboard;
