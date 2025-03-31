import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AdminNavbar from "../components/AdminNavbar";
import Footer from "../components/Footer";

const API_BASE_URL = "http://localhost:8000";

const AdminDelete = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [columns, setColumns] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch available tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/tables`);
        if (!response.ok) throw new Error("Failed to fetch tables");
        const data = await response.json();
        setTables(data.tables);
      } catch (error) {
        console.error("Error fetching tables:", error);
        setError("Failed to load tables. Please check your API.");
      }
    };

    fetchTables();
  }, []);

  // Fetch columns and records when table is selected
  useEffect(() => {
    if (!selectedTable) return;

    const fetchColumnsAndRecords = async () => {
      setLoading(true);
      try {
        // Fetch table columns
        const colResponse = await fetch(`${API_BASE_URL}/table-columns/${selectedTable}`);
        if (!colResponse.ok) throw new Error("Failed to fetch columns");
        const colData = await colResponse.json();
        setColumns(colData.columns);

        // Fetch table records
        const recResponse = await fetch(`${API_BASE_URL}/${selectedTable}`);
        if (!recResponse.ok) throw new Error("Failed to fetch records");
        const recData = await recResponse.json();
        setRecords(recData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load table data. Please check your API.");
      }
      setLoading(false);
    };

    fetchColumnsAndRecords();
  }, [selectedTable]);

  // Handle record selection
  const handleRecordSelect = (record) => {
    setSelectedRecord(record);
  };

  // Handle record deletion
  const handleDelete = async () => {
    if (!selectedRecord) {
      Swal.fire("Error", "Please select a record to delete.", "error");
      return;
    }

    // Use the column name (from columns[0].name) as the primary key.
    const primaryKey = columns[0].name; // Correctly extract the column name
    const primaryValue = selectedRecord[primaryKey];

    Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to delete this record from ${selectedTable}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}/delete-record/${selectedTable}/${primaryKey}/${primaryValue}`,
            { method: "DELETE" }
          );

          if (!response.ok) throw new Error("Failed to delete record");

          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: `Record has been deleted from ${selectedTable}.`,
            timer: 2000,
            showConfirmButton: false,
          });

          // Remove deleted record from state
          setRecords(records.filter((rec) => rec[primaryKey] !== primaryValue));
          setSelectedRecord(null);
        } catch (error) {
          console.error("Error deleting record:", error);
          setError("Failed to delete record. Please try again.");
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to delete record.",
          });
        }
        setLoading(false);
      }
    });
  };

  return (
    <>
      <AdminNavbar />

      <div className="container my-5">
        <h3 className="text-center mb-4">Delete Data</h3>

        {error && <p className="text-danger text-center">{error}</p>}

        {/* Select Table */}
        <div className="mb-3">
          <label className="form-label fw-bold">Select Table:</label>
          <select
            className="form-select"
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
          >
            <option value="">-- Select a Table --</option>
            {tables.map((table) => (
              <option key={table} value={table}>
                {table.charAt(0).toUpperCase() + table.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Select Record */}
        {records.length > 0 && (
          <div className="mb-3">
            <label className="form-label fw-bold">Select Record:</label>
            <select
              className="form-select"
              onChange={(e) => handleRecordSelect(JSON.parse(e.target.value))}
            >
              <option value="">-- Select a Record --</option>
              {records.map((record, index) => (
                <option key={index} value={JSON.stringify(record)}>
                  {Object.values(record).join(" | ")}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Delete Button */}
        {selectedRecord && (
          <div className="text-center mt-4">
            <button className="btn btn-danger w-100" onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete Record"}
            </button>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
};

export default AdminDelete;
