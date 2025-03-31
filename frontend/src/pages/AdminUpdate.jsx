import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AdminNavbar from "../components/AdminNavbar";
import Footer from "../components/Footer";

const API_BASE_URL = "http://localhost:8000";

// Helper to convert a MySQL timestamp (e.g., "2023-03-22 14:45:00")
// to a value for datetime-local input (e.g., "2023-03-22T14:45")
const toDatetimeLocal = (timestamp) => {
  if (!timestamp) return "";
  const t = timestamp.replace(" ", "T");
  return t.substring(0, 16);
};

// Helper to convert a datetime-local value back to MySQL timestamp format
const fromDatetimeLocal = (datetimeLocal) => {
  if (!datetimeLocal) return "";
  return datetimeLocal.replace("T", " ") + ":00";
};

const AdminUpdate = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  // columns: array of objects: { name, type, null, key, default, extra }
  const [columns, setColumns] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // List of sensitive tables that require confirmation
  const sensitiveTables = ["administrators", "customers", "drivers", "gps_tracking"];
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
  // Force is_read to be a checkbox.
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

  // Helper: For enum types, parse allowed options from the type string
  const getEnumOptions = (colType) => {
    const match = colType.match(/^enum\((.*)\)$/i);
    if (!match) return [];
    return match[1]
      .split(",")
      .map((opt) => opt.trim().replace(/^'(.*)'$/, "$1"));
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

  // Handle table selection with immediate confirmation for sensitive tables
  const handleTableSelect = (e) => {
    const table = e.target.value;
    if (sensitiveTables.includes(table)) {
      Swal.fire({
        title: "Warning",
        text: `You are about to edit a sensitive table: ${table}. Are you sure you want to proceed?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, proceed",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          setSelectedTable(table);
        } else {
          setSelectedTable("");
        }
      });
    } else {
      setSelectedTable(table);
    }
  };

  // Fetch columns (with metadata) and records when table is selected
  useEffect(() => {
    if (!selectedTable) return;

    const fetchColumnsAndRecords = async () => {
      setLoading(true);
      try {
        const colResponse = await fetch(
          `${API_BASE_URL}/table-columns/${selectedTable}`
        );
        if (!colResponse.ok) throw new Error("Failed to fetch columns");
        const colData = await colResponse.json();
        setColumns(colData.columns);

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
    const newFormData = { ...record };
    columns.forEach((col) => {
      if (timestampFields.includes(col.name) && record[col.name]) {
        newFormData[col.name] = toDatetimeLocal(record[col.name]);
      }
    });
    setFormData(newFormData);
  };

  // Handle form input change
  const handleChange = (e, column) => {
    let value;
    const colMeta = columns.find((col) => col.name === column);
    const inputType = getInputType(colMeta);

    if (inputType === "checkbox") {
      value = e.target.checked;
    } else {
      value = e.target.value;
      const lowerType = colMeta.type.toLowerCase();
      if (
        lowerType.includes("int") ||
        lowerType.includes("float") ||
        lowerType.includes("double") ||
        lowerType.includes("decimal")
      ) {
        value = value === "" ? null : Number(value);
      }
    }
    setFormData({ ...formData, [column]: value });
  };

  // Function to perform the update
  const performUpdate = async () => {
    const primaryKey = columns[0].name;
    let primaryValue = selectedRecord[primaryKey];

    primaryValue = primaryValue.toString();

    const updateData = {};
    columns.forEach((col) => {
      if (col.name === primaryKey) return;
      // Exclude auto-generated fields (except our editable timestamp fields)
      if (
        col.name !== "created_at" &&
        !timestampFields.includes(col.name) &&
        (col.extra.includes("auto_increment") ||
          (col.default &&
            String(col.default).toUpperCase().includes("CURRENT_TIMESTAMP")))
      ) {
        return;
      }
      let val = formData[col.name];
      if (timestampFields.includes(col.name) && val) {
        val = fromDatetimeLocal(val);
      } else if (getInputType(col) === "checkbox") {
        // Force boolean value to "1" or "0"
        val = val ? "1" : "0";
      } else {
        if (val === undefined || val === null) {
          val = "";
        } else {
          val = val.toString();
        }
      }
      updateData[col.name] = val;
    });

    const requestBody = {
      table_name: selectedTable,
      primary_key: primaryKey,
      primary_value: primaryValue,
      update_data: updateData,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/update-record`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error("Failed to update record");

      Swal.fire({
        icon: "success",
        title: "Success",
        text: `Record updated successfully in ${selectedTable}`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error updating record:", error);
      setError("Failed to update data. Please check your input.");
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to update data.",
      });
    }
    setLoading(false);
  };

  // Handle form submission
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!selectedTable || !selectedRecord) {
      Swal.fire("Error", "Please select a table and a record to update.", "error");
      setLoading(false);
      return;
    }

    performUpdate();
  };

  return (
    <>
      <AdminNavbar />

      <div className="container my-5">
        <h3 className="text-center mb-4">Update Existing Data</h3>

        {error && <p className="text-danger text-center">{error}</p>}

        {/* Select Table */}
        <div className="mb-3">
          <label className="form-label fw-bold">Select Table:</label>
          <select className="form-select" value={selectedTable} onChange={handleTableSelect}>
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
            <select className="form-select" onChange={(e) => handleRecordSelect(JSON.parse(e.target.value))}>
              <option value="">-- Select a Record --</option>
              {records.map((record, index) => (
                <option key={index} value={JSON.stringify(record)}>
                  {Object.values(record).join(" | ")}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Update Form */}
        {selectedRecord && (
          <form onSubmit={handleUpdate} className="mt-3">
            {columns.map((col) => {
              // Determine if field should be disabled: disable primary key and auto_increment/default CURRENT_TIMESTAMP fields (unless editable timestamp fields)
              const isDisabled =
                col.name === columns[0].name ||
                (col.name !== "created_at" &&
                  !timestampFields.includes(col.name) &&
                  (col.extra.includes("auto_increment") ||
                    (col.default &&
                      String(col.default).toUpperCase().includes("CURRENT_TIMESTAMP"))));
              const inputType = getInputType(col);
              return (
                <div className="mb-3" key={col.name}>
                  <label className="form-label fw-bold">{col.name}</label>
                  {inputType === "select" ? (
                    <select
                      className="form-select"
                      value={formData[col.name] ?? ""}
                      onChange={(e) => handleChange(e, col.name)}
                      disabled={isDisabled}
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
                        type="checkbox"
                        className="form-check-input"
                        checked={formData[col.name] ?? false}
                        onChange={(e) => handleChange(e, col.name)}
                        disabled={isDisabled}
                      />
                    </div>
                  ) : (
                    <input
                      type={inputType}
                      className="form-control"
                      value={formData[col.name] ?? ""}
                      onChange={(e) => handleChange(e, col.name)}
                      required
                      disabled={isDisabled}
                    />
                  )}
                </div>
              );
            })}

            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Updating..." : "Update Record"}
            </button>
          </form>
        )}
      </div>

      <Footer />
    </>
  );
};

export default AdminUpdate;
