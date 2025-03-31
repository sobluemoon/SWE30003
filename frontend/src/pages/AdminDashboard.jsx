import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/AdminNavbar";
import Footer from "../components/Footer";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE_URL = "http://localhost:8000";

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [tables, setTables] = useState({});
  const [searchQueries, setSearchQueries] = useState({});
  const [currentPages, setCurrentPages] = useState({});
  const rowsPerPage = 2; // Adjust number of rows per page

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Try to get user from location state first (from login redirect)
    const userFromLocation = location.state?.user;
    
    // If not available, check localStorage
    const storedUser = userFromLocation || JSON.parse(localStorage.getItem("adminUser"));

    if (!storedUser || storedUser.role !== "admin") {
      // Redirect to admin login page if no admin user found
      navigate("/admin");
      return;
    }

    setUser(storedUser);

    // Updated tableNames array to include Administrators, Drivers, and Customers
    const tableNames = [
      "users",
      "administrators",
      "customers",
      "drivers",
      "vehicles",
      "rides",
      "payments",
      "feedbacks",
      "notifications",
      "gps", // or "gps_tracking" if preferred
    ];

    const fetchData = async () => {
      try {
        const responses = await Promise.all(
          tableNames.map((table) =>
            fetch(`${API_BASE_URL}/${table}/`)
              .then((res) => res.ok ? res.json() : Promise.reject(`Error fetching ${table}`))
              .catch(err => {
                console.error(`Error fetching ${table}:`, err);
                return []; // Return empty array for failed tables
              })
          )
        );

        const newTables = {};
        tableNames.forEach((table, index) => {
          newTables[table] = responses[index] || [];
        });

        setTables(newTables);
        setCurrentPages(tableNames.reduce((acc, table) => ({ ...acc, [table]: 1 }), {}));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Please check your API.");
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, location]);

  const handleSearchChange = (table, query) => {
    setSearchQueries((prev) => ({ ...prev, [table]: query }));
    setCurrentPages((prev) => ({ ...prev, [table]: 1 })); // Reset to page 1 when searching
  };

  const handlePageChange = (table, newPage) => {
    setCurrentPages((prev) => ({ ...prev, [table]: newPage }));
  };

  const logout = () => {
    Swal.fire({
      icon: "success",
      title: "Logged Out",
      text: "You have been successfully logged out.",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      localStorage.removeItem("adminUser");
      sessionStorage.removeItem("adminUser");
      navigate("/admin");
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
            {Object.keys(tables).map((table, index) => {
              const searchQuery = searchQueries[table] || "";
              const tableData = tables[table] || [];
              
              // Check if tableData is an array and has items
              if (!Array.isArray(tableData) || tableData.length === 0) {
                return (
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
                        <p>No data available for this table.</p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              const filteredData = tableData.filter((row) =>
                Object.values(row).some((val) =>
                  val && val.toString().toLowerCase().includes(searchQuery.toLowerCase())
                )
              );

              const totalPages = Math.ceil(filteredData.length / rowsPerPage);
              const currentPage = currentPages[table] || 1;
              const paginatedData = filteredData.slice(
                (currentPage - 1) * rowsPerPage,
                currentPage * rowsPerPage
              );

              return (
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
                      {/* Search Input */}
                      <input
                        type="text"
                        className="form-control mb-3"
                        placeholder={`Search in ${table}...`}
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(table, e.target.value)}
                      />

                      <table className="table table-striped">
                        <thead>
                          <tr>
                            {tableData.length > 0 &&
                              Object.keys(tableData[0]).map((col) => (
                                <th key={col}>{col}</th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedData.length > 0 ? (
                            paginatedData.map((row, idx) => (
                              <tr key={idx}>
                                {Object.values(row).map((val, i) => (
                                  <td key={i}>{val !== null ? val.toString() : 'null'}</td>
                                ))}
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="100%">No data available</td></tr>
                          )}
                        </tbody>
                      </table>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <nav>
                          <ul className="pagination justify-content-center">
                            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                              <button className="page-link" onClick={() => handlePageChange(table, currentPage - 1)}>
                                Previous
                              </button>
                            </li>
                            <li className="page-item disabled">
                              <span className="page-link">Page {currentPage} of {totalPages}</span>
                            </li>
                            <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                              <button className="page-link" onClick={() => handlePageChange(table, currentPage + 1)}>
                                Next
                              </button>
                            </li>
                          </ul>
                        </nav>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
};

export default AdminDashboard;
