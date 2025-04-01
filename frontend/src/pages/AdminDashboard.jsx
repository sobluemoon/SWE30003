import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import "animate.css";
import Topbar from "../components/Topbar";
import Navbar from "../components/AdminNavbar";
import Footer from "../components/Footer";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE_URL = "http://localhost:8000";

// Styles for the accordion
const accordionStyles = {
  accordion: {
    borderRadius: '0.25rem',
    overflow: 'hidden',
  },
  accordionItem: {
    borderBottom: '1px solid rgba(0,0,0,.125)',
  },
  accordionButton: {
    display: 'block',
    padding: '1rem 1.25rem',
    fontSize: '1rem',
    color: '#212529',
    textAlign: 'left',
    backgroundColor: '#f8f9fa',
    border: 'none',
    borderRadius: '0',
    width: '100%',
    position: 'relative',
    cursor: 'pointer',
  },
  accordionCollapse: {
    height: 'auto',
    transition: 'height 0.35s ease',
  },
  accordionBody: {
    padding: '1rem 1.25rem',
    backgroundColor: '#fff',
  },
  tableContainer: {
    overflowX: 'auto',
    width: '100%',
  },
  table: {
    width: '100%',
    marginBottom: '1rem',
    color: '#212529',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    padding: '0.75rem',
    textAlign: 'left',
  },
  tableCell: {
    padding: '0.75rem',
    borderTop: '1px solid #dee2e6',
    verticalAlign: 'top',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    listStyle: 'none',
    padding: '0',
    marginTop: '1rem',
  },
  pageItem: {
    margin: '0 0.25rem',
  },
  pageLink: {
    position: 'relative',
    display: 'block',
    padding: '0.5rem 0.75rem',
    marginLeft: '-1px',
    lineHeight: '1.25',
    color: '#007bff',
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    cursor: 'pointer',
  },
  pageItemDisabled: {
    margin: '0 0.25rem',
    opacity: '0.5',
  },
  pageLinkDisabled: {
    position: 'relative',
    display: 'block',
    padding: '0.5rem 0.75rem',
    marginLeft: '-1px',
    lineHeight: '1.25',
    color: '#6c757d',
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    cursor: 'not-allowed',
  }
};

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [tables, setTables] = useState({});
  const [searchQueries, setSearchQueries] = useState({});
  const [currentPages, setCurrentPages] = useState({});
  const rowsPerPage = 2; // Adjust number of rows per page
  const [activeTable, setActiveTable] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Toggle accordion function
  const toggleAccordion = (tableId) => {
    setActiveTable(activeTable === tableId ? null : tableId);
  };

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
          <div style={accordionStyles.accordion}>
            {Object.keys(tables).map((table, index) => {
              const searchQuery = searchQueries[table] || "";
              const tableData = tables[table] || [];
              const isActive = activeTable === table || (activeTable === null && index === 0);
              
              // Check if tableData is an array and has items
              if (!Array.isArray(tableData) || tableData.length === 0) {
                return (
                  <div style={accordionStyles.accordionItem} key={table}>
                    <h2>
                      <button
                        style={accordionStyles.accordionButton}
                        onClick={() => toggleAccordion(table)}
                        aria-expanded={isActive ? "true" : "false"}
                        aria-controls={`collapse-${table}`}
                      >
                        {table.charAt(0).toUpperCase() + table.slice(1)}
                      </button>
                    </h2>
                    {isActive && (
                      <div style={accordionStyles.accordionBody}>
                        <p>No data available for this table.</p>
                      </div>
                    )}
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
                <div style={accordionStyles.accordionItem} key={table}>
                  <h2>
                    <button
                      style={accordionStyles.accordionButton}
                      onClick={() => toggleAccordion(table)}
                      aria-expanded={isActive ? "true" : "false"}
                      aria-controls={`collapse-${table}`}
                    >
                      {table.charAt(0).toUpperCase() + table.slice(1)}
                    </button>
                  </h2>
                  {isActive && (
                    <div style={accordionStyles.accordionBody}>
                      {/* Search Input */}
                      <input
                        type="text"
                        className="form-control mb-3"
                        placeholder={`Search in ${table}...`}
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(table, e.target.value)}
                      />

                      <div style={accordionStyles.tableContainer}>
                        <table style={accordionStyles.table}>
                          <thead>
                            <tr>
                              {tableData.length > 0 &&
                                Object.keys(tableData[0]).map((col) => (
                                  <th style={accordionStyles.tableHeader} key={col}>{col}</th>
                                ))}
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedData.length > 0 ? (
                              paginatedData.map((row, idx) => (
                                <tr key={idx}>
                                  {Object.values(row).map((val, i) => (
                                    <td style={accordionStyles.tableCell} key={i}>{val !== null ? val.toString() : 'null'}</td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr><td style={accordionStyles.tableCell} colSpan="100%">No data available</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <nav>
                          <ul style={accordionStyles.pagination}>
                            <li style={currentPage === 1 ? accordionStyles.pageItemDisabled : accordionStyles.pageItem}>
                              <button 
                                style={currentPage === 1 ? accordionStyles.pageLinkDisabled : accordionStyles.pageLink} 
                                onClick={() => currentPage !== 1 && handlePageChange(table, currentPage - 1)}
                                disabled={currentPage === 1}
                              >
                                Previous
                              </button>
                            </li>
                            <li style={accordionStyles.pageItem}>
                              <span style={accordionStyles.pageLink}>Page {currentPage} of {totalPages}</span>
                            </li>
                            <li style={currentPage === totalPages ? accordionStyles.pageItemDisabled : accordionStyles.pageItem}>
                              <button 
                                style={currentPage === totalPages ? accordionStyles.pageLinkDisabled : accordionStyles.pageLink} 
                                onClick={() => currentPage !== totalPages && handlePageChange(table, currentPage + 1)}
                                disabled={currentPage === totalPages}
                              >
                                Next
                              </button>
                            </li>
                          </ul>
                        </nav>
                      )}
                    </div>
                  )}
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
