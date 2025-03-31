import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AdminNavbar from "../components/AdminNavbar";
import Footer from "../components/Footer";

const API_BASE_URL = "http://localhost:8000";

// Helper: Convert a MySQL timestamp (e.g., "2023-03-22 14:45:00") 
// to a value for a datetime-local input (e.g., "2023-03-22T14:45")
const toDatetimeLocal = (timestamp) => {
  if (!timestamp) return "";
  const t = timestamp.replace(" ", "T");
  return t.substring(0, 16);
};

// Helper: Convert a datetime-local value back to MySQL timestamp format
const fromDatetimeLocal = (datetimeLocal) => {
  if (!datetimeLocal) return "";
  return datetimeLocal.replace("T", " ") + ":00";
};

const AdminInsert = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  // columns is an array of objects: { name, type, null, key, default, extra }
  const [columns, setColumns] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // List of timestamp fields to handle as datetime-local inputs
  const timestampFields = [
    "created_at",
    "feedback_time",
    "start_time",
    "end_time",
    "payment_time",
    "updated_at",
  ];

  // Helper: Determine input type based on column metadata.
  // Force boolean fields like is_read to be rendered as checkboxes.
  const getInputType = (col) => {
    if (col.name === "is_read") {
      return "checkbox";
    }
    if (timestampFields.includes(col.name)) {
      return "datetime-local";
    }
    const type = col.type.toLowerCase();
    if (type.startsWith("enum")) {
      return "select";
    } else if (
      type.includes("int") ||
      type.includes("float") ||
      type.includes("double") ||
      type.includes("decimal")
    ) {
      return "number";
    } else if (
      type.includes("bool") ||
      (type.includes("tinyint") && type.includes("(1)"))
    ) {
      return "checkbox";
    }
    return "text";
  };

  // Helper: For enum types, parse allowed options from the type string.
  const getEnumOptions = (colType) => {
    const match = colType.match(/^enum\((.*)\)$/i);
    if (!match) return [];
    return match[1].split(",").map((opt) => opt.trim().replace(/^'(.*)'$/, "$1"));
  };

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

  // Fetch columns when table is selected
  useEffect(() => {
    if (!selectedTable) return;

    const fetchColumns = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/table-columns/${selectedTable}`);
        if (!response.ok) throw new Error("Failed to fetch columns");
        const data = await response.json();
        setColumns(data.columns);

        // Initialize formData with default values based on input type
        const initialFormData = {};
        data.columns.forEach((col) => {
          const inputType = getInputType(col);
          if (inputType === "checkbox") {
            initialFormData[col.name] = false;
          } else if (inputType === "datetime-local") {
            // Leave empty or set to current time as desired
            initialFormData[col.name] = "";
          } else {
            initialFormData[col.name] = "";
          }
        });
        setFormData(initialFormData);
      } catch (error) {
        console.error("Error fetching columns:", error);
        setError("Failed to load table columns. Please check your API.");
      }
      setLoading(false);
    };

    fetchColumns();
  }, [selectedTable]);

  // Handle form input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = value;
    if (type === "checkbox") {
      newValue = checked;
    }
    // Convert numeric fields
    const colMeta = columns.find((col) => col.name === name);
    if (colMeta) {
      const lowerType = colMeta.type.toLowerCase();
      if (
        lowerType.includes("int") ||
        lowerType.includes("float") ||
        lowerType.includes("double") ||
        lowerType.includes("decimal")
      ) {
        newValue = value === "" ? null : Number(value);
      }
    }
    setFormData({ ...formData, [name]: newValue });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Prepare payload by converting field values as needed.
    const payload = {};
    columns.forEach((col) => {
      const inputType = getInputType(col);
      let fieldValue = formData[col.name];
      if (timestampFields.includes(col.name) && fieldValue) {
        // Convert datetime-local to MySQL timestamp format
        fieldValue = fromDatetimeLocal(fieldValue);
      } else if (inputType === "checkbox") {
        // Convert boolean to "1" or "0"
        fieldValue = fieldValue ? "1" : "0";
      } else {
        fieldValue =
          fieldValue === undefined || fieldValue === null ? "" : fieldValue.toString();
      }
      payload[col.name] = fieldValue;
    });

    try {
      const response = await fetch(`${API_BASE_URL}/${selectedTable}/insert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Failed to insert into ${selectedTable}`);

      Swal.fire({
        icon: "success",
        title: "Success",
        text: `New record added to ${selectedTable}`,
        timer: 2000,
        showConfirmButton: false,
      });

      // Reset formData to initial defaults
      const resetFormData = {};
      columns.forEach((col) => {
        const inputType = getInputType(col);
        if (inputType === "checkbox") {
          resetFormData[col.name] = false;
        } else {
          resetFormData[col.name] = "";
        }
      });
      setFormData(resetFormData);
    } catch (error) {
      console.error("Error inserting data:", error);
      setError("Failed to insert data. Please check your input.");
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to insert data.",
      });
    }

    setLoading(false);
  };

  return (
    <>
      <AdminNavbar />
      <div className="container my-5">
        <h3 className="text-center mb-4">Insert New Data</h3>
        {error && <p className="text-danger text-center">{error}</p>}
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
        {loading && <p className="text-center">Loading columns...</p>}
        {selectedTable && columns.length > 0 && (
          <form onSubmit={handleSubmit} className="mt-3">
            {columns.map((col) => {
              const inputType = getInputType(col);
              return (
                <div className="mb-3" key={col.name}>
                  <label className="form-label fw-bold">{col.name}</label>
                  {inputType === "select" ? (
                    <select
                      name={col.name}
                      className="form-select"
                      value={formData[col.name] ?? ""}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- Select an Option --</option>
                      {getEnumOptions(col.type).map((opt, idx) => (
                        <option key={idx} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                      ))}
                    </select>
                  ) : inputType === "checkbox" ? (
                    <div className="form-check">
                      <input
                        name={col.name}
                        type="checkbox"
                        className="form-check-input"
                        checked={formData[col.name] ?? false}
                        onChange={handleChange}
                      />
                    </div>
                  ) : (
                    <input
                      name={col.name}
                      type={inputType}
                      className="form-control"
                      value={formData[col.name] ?? ""}
                      onChange={handleChange}
                      required
                    />
                  )}
                </div>
              );
            })}
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Inserting..." : "Insert Data"}
            </button>
          </form>
        )}
      </div>
      <Footer />
    </>
  );
};

export default AdminInsert;
