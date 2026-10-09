import {
  useEffect,
  useState,
} from "react";

import Navbar from "../components/Navbar";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import useDebounce from "../hooks/useDebounce";
import useForm from "../hooks/useForm";
import useToast from "../hooks/useToast";
import ToastContainer from "../components/ToastContainer";
import Pagination from "../components/Pagination";


function DataManagement() {

  const { user } = useAuth();


  // =====================================================
  // CSV UPLOAD STATE
  // =====================================================

  const [file, setFile] = useState(null);

  const [uploading, setUploading] =
    useState(false);

  const { toasts, showToast, dismissToast } = useToast();


  // =====================================================
  // ADD METRIC STATE
  // =====================================================

  const {
    values: metricForm,
    handleChange: handleMetricChange,
    resetForm: resetMetricForm,
  } = useForm({
    department: "Sales",
    metric_name: "",
    metric_value: "",
    recorded_on: "",
  });

  const [addingMetric, setAddingMetric] =
    useState(false);




  // =====================================================
  // METRICS TABLE STATE
  // =====================================================

  const [metrics, setMetrics] =
    useState([]);

  const [
    loadingMetrics,
    setLoadingMetrics,
  ] = useState(true);

  const [search, setSearch] =
    useState("");

  // Wait 350ms after the user stops typing before calling the API.
  const debouncedSearch = useDebounce(search, 350);

  const [department, setDepartment] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [totalPages, setTotalPages] =
    useState(1);

  const [totalRecords, setTotalRecords] =
    useState(0);


  // =====================================================
  // LOAD METRICS
  // =====================================================

  const loadMetrics = async () => {

    try {

      setLoadingMetrics(true);

      const params = {
        page,
        per_page: 10,
      };


      if (debouncedSearch.trim()) {

        params.search =
          debouncedSearch.trim();

      }


      if (department) {

        params.department =
          department;

      }


      const response =
        await api.get(
          "/metrics",
          {
            params,
          }
        );


      console.log(
        "Metrics Response:",
        response.data
      );


      setMetrics(
        response.data.metrics || []
      );


      setTotalPages(
        response.data.total_pages ||
        response.data.pages ||
        response.data.pagination
          ?.total_pages ||
        1
      );


      setTotalRecords(
        response.data.pagination
          ?.total_records ??
        response.data.total_records ??
        response.data.total ??
        0
      );

    } catch (err) {

      console.error(
        "Metrics Loading Error:",
        err.response?.data ||
          err
      );

      setMetrics([]);

    } finally {

      setLoadingMetrics(false);

    }

  };


  // =====================================================
  // AUTO LOAD METRICS
  // =====================================================

  useEffect(() => {

    loadMetrics();

  }, [
    page,
    debouncedSearch,
    department,
  ]);


  // =====================================================
  // CSV FILE CHANGE
  // =====================================================

  const handleFileChange = (e) => {

    const selectedFile =
      e.target.files[0];


    setFile(selectedFile);

    

    

  };


  // =====================================================
  // CSV UPLOAD
  // =====================================================

  const handleUpload = async (e) => {

    e.preventDefault();


    if (!file) {

      showToast(
        "Please select a CSV file."
      , "error");

      return;

    }


    if (
      !file.name
        .toLowerCase()
        .endsWith(".csv")
    ) {

      showToast(
        "Only CSV files are allowed."
      , "error");

      return;

    }


    try {

      setUploading(true);

      

      


      const formData =
        new FormData();


      formData.append(
        "file",
        file
      );


      const response =
        await api.post(
          "/metrics/upload",
          formData
        );


      console.log(
        "CSV Upload Response:",
        response.data
      );


      const inserted =
        response.data
          .inserted_count ?? 0;


      const errors =
        response.data
          .error_count ?? 0;


      showToast(
        `Upload completed. ${inserted} rows inserted. ${errors} errors.`,
        errors > 0 ? "warning" : "success"
      );


      setFile(null);


      const input =
        document.getElementById(
          "csvFile"
        );


      if (input) {

        input.value = "";

      }


      setPage(1);

      await loadMetrics();


    } catch (err) {

      console.error(
        "CSV Upload Error:",
        err
      );


      showToast(
        err.response?.data?.message ||
        "CSV upload failed."
      , "error");


    } finally {

      setUploading(false);

    }

  };


  // =====================================================
  // ADD METRIC
  // =====================================================

  const handleAddMetric =
    async (e) => {

      e.preventDefault();


      if (
        !metricForm.department ||
        !metricForm.metric_name.trim() ||
        metricForm.metric_value === "" ||
        !metricForm.recorded_on
      ) {

        showToast(
          "Please complete all metric fields."
        , "error");

        return;

      }


      if (
        Number.isNaN(
          Number(
            metricForm.metric_value
          )
        )
      ) {

        showToast(
          "Metric value must be a valid number."
        , "error");

        return;

      }


      try {

        setAddingMetric(true);

        

        


        const response =
          await api.post(
            "/metrics",
            {
              department:
                metricForm.department,

              metric_name:
                metricForm.metric_name.trim(),

              metric_value:
                Number(
                  metricForm.metric_value
                ),

              recorded_on:
                metricForm.recorded_on,
            }
          );


        console.log(
          "Add Metric Response:",
          response.data
        );


        showToast(
          response.data.message ||
          "Metric added successfully."
        , "success");


        resetMetricForm();


        // Clear table filters so
        // new metric is easy to see

        setSearch("");

        setDepartment("");

        setPage(1);


        await loadMetrics();


      } catch (err) {

        console.error(
          "Add Metric Error:",
          err.response?.data ||
            err
        );


        showToast(
          err.response?.data?.message ||
          "Unable to add metric."
        , "error");


      } finally {

        setAddingMetric(false);

      }

    };


  // =====================================================
  // DELETE METRIC
  // =====================================================

  const handleDeleteMetric =
    async (metric) => {

      const confirmed =
        window.confirm(
          `Are you sure you want to delete "${metric.metric_name}"?`
        );


      if (!confirmed) {

        return;

      }


      try {

        

        


        const response =
          await api.delete(
            `/metrics/${metric.id}`
          );


        console.log(
          "Delete Metric Response:",
          response.data
        );


        showToast(
          response.data.message ||
          "Metric deleted successfully."
        , "success");


        /*
          If last item on a page
          is deleted, move backward.
        */

        if (
          metrics.length === 1 &&
          page > 1
        ) {

          setPage(
            (current) =>
              current - 1
          );

        } else {

          await loadMetrics();

        }


      } catch (err) {

        console.error(
          "Delete Metric Error:",
          err.response?.data ||
            err
        );


        showToast(
          err.response?.data?.message ||
          "Unable to delete metric."
        , "error");

      }

    };


  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearchChange =
    (e) => {

      setSearch(
        e.target.value
      );

      setPage(1);

    };


  // =====================================================
  // DEPARTMENT FILTER
  // =====================================================

  const handleDepartmentChange =
    (e) => {

      setDepartment(
        e.target.value
      );

      setPage(1);

    };


  // =====================================================
  // CLEAR FILTERS
  // =====================================================

  const clearFilters = () => {

    setSearch("");

    setDepartment("");

    setPage(1);

  };



  // Export all matching records (not only the visible page).
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (department) params.department = department;

      const response = await api.get("/metrics/export", {
        params,
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const today = new Date().toLocaleDateString("en-CA");
      link.download = `EDABIP_Metrics_${today}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast("Filtered metrics exported successfully.", "success");
    } catch (err) {
      console.error("CSV Export Error:", err);
      showToast("Unable to export metrics. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  };

  // =====================================================
  // FORMAT VALUE
  // =====================================================

  const formatValue = (value) => {

    const number =
      Number(value);


    if (
      Number.isNaN(number)
    ) {

      return value;

    }


    return number.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      }
    );

  };


  // =====================================================
  // UI
  // =====================================================

  return (

    <>

      <Navbar />


      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <main className="dashboard-container">


        {/* ==========================================
            PAGE HEADER
        ========================================== */}

        <section className="welcome-section">

          <div>

            <p className="eyebrow">
              Enterprise Analytics
            </p>


            <h1>
              Data Management
            </h1>


            <p>
              Manage enterprise metrics
              and upload CSV data.
            </p>

          </div>


          <span className="role-badge">

            {user?.role || "user"}

          </span>

        </section>


        {/* ==========================================
            CSV UPLOAD
        ========================================== */}

        <section className="dashboard-card wide-card">

          <div className="card-header">

            <div>

              <h3>
                CSV Metric Upload
              </h3>


              <p>
                Upload new metric
                records to the
                analytics database.
              </p>

            </div>

          </div>


          <form
            className="csv-upload-form"
            onSubmit={
              handleUpload
            }
          >

            <div className="upload-box">

              <label
                htmlFor="csvFile"
              >

                Select CSV File

              </label>


              <input
                id="csvFile"
                type="file"
                accept=".csv,text/csv"
                onChange={
                  handleFileChange
                }
              />


              {file && (

                <p className="selected-file">

                  Selected:{" "}
                  {file.name}

                </p>

              )}

            </div>


            <button
              type="submit"
              disabled={
                uploading
              }
              className="upload-btn"
            >

              {uploading
                ? "Uploading..."
                : "Upload CSV"}

            </button>

          </form>


          


          


          <div className="csv-format-info">

            <h4>
              Required CSV Format
            </h4>


            <p>
              Your CSV file must
              contain these columns:
            </p>


            <code>

              department,metric_name,metric_value,recorded_on

            </code>


            <p>
              Example:
            </p>


            <pre>
{`department,metric_name,metric_value,recorded_on
Sales,Revenue,125000,2026-10-01
Marketing,Leads Generated,850,2026-10-02
HR,Employee Count,120,2026-10-03`}
            </pre>

          </div>

        </section>


        {/* ==========================================
            ADD METRIC
        ========================================== */}

        <section className="dashboard-card wide-card add-metric-card">

          <div className="card-header">

            <div>

              <h3>
                Add Metric
              </h3>


              <p>
                Add an individual
                enterprise metric
                manually.
              </p>

            </div>

          </div>


          <form
            className="add-metric-form"
            onSubmit={
              handleAddMetric
            }
          >


            {/* DEPARTMENT */}

            <div className="metric-form-field">

              <label>
                Department
              </label>


              <select
                name="department"
                value={
                  metricForm.department
                }
                onChange={(e) => {
                  handleMetricChange(e);
                  
                  
                }}
              >

                <option value="Sales">
                  Sales
                </option>

                <option value="Marketing">
                  Marketing
                </option>

                <option value="HR">
                  HR
                </option>

                <option value="Finance">
                  Finance
                </option>

                <option value="Operations">
                  Operations
                </option>

              </select>

            </div>


            {/* METRIC NAME */}

            <div className="metric-form-field">

              <label>
                Metric Name
              </label>


              <input
                type="text"
                name="metric_name"
                value={
                  metricForm.metric_name
                }
                onChange={(e) => {
                  handleMetricChange(e);
                  
                  
                }}
                placeholder="Example: Revenue"
              />

            </div>


            {/* VALUE */}

            <div className="metric-form-field">

              <label>
                Metric Value
              </label>


              <input
                type="number"
                step="any"
                name="metric_value"
                value={
                  metricForm.metric_value
                }
                onChange={(e) => {
                  handleMetricChange(e);
                  
                  
                }}
                placeholder="Example: 125000"
              />

            </div>


            {/* DATE */}

            <div className="metric-form-field">

              <label>
                Recorded Date
              </label>


              <input
                type="date"
                name="recorded_on"
                value={
                  metricForm.recorded_on
                }
                onChange={(e) => {
                  handleMetricChange(e);
                  
                  
                }}
              />

            </div>


            <button
              type="submit"
              className="add-metric-btn"
              disabled={
                addingMetric
              }
            >

              {addingMetric
                ? "Adding..."
                : "+ Add Metric"}

            </button>

          </form>


          


          

        </section>


        {/* ==========================================
            METRICS TABLE
        ========================================== */}

        <section className="dashboard-card wide-card data-table-card">

          <div className="card-header">

            <div>

              <h3>
                Metric Records
              </h3>


              <p>
                Search and browse
                enterprise metric data.
              </p>

            </div>


            <div className="record-count">

              {totalRecords} records

            </div>

          </div>


          {/* FILTER TOOLBAR */}

          <div className="data-toolbar">

            <input
              type="text"
              value={search}
              onChange={
                handleSearchChange
              }
              placeholder="Search metric name..."
              className="metric-search"
            />


            <select
              value={department}
              onChange={
                handleDepartmentChange
              }
              className="metric-department-filter"
            >

              <option value="">
                All Departments
              </option>

              <option value="Sales">
                Sales
              </option>

              <option value="Marketing">
                Marketing
              </option>

              <option value="HR">
                HR
              </option>

              <option value="Finance">
                Finance
              </option>

              <option value="Operations">
                Operations
              </option>

            </select>


            <button
              type="button"
              className="clear-filter-btn"
              onClick={
                clearFilters
              }
            >

              Clear

            </button>

            <button
              type="button"
              className="upload-btn"
              onClick={handleExportCSV}
              disabled={exporting || loadingMetrics}
              title="Export all matching records across every page"
            >
              {exporting ? "Exporting..." : "⬇ Export CSV"}
            </button>

          </div>


          {/* TABLE */}

          <div className="metrics-table-wrapper">


            {loadingMetrics ? (

              <div className="table-status">

                Loading metrics...

              </div>


            ) : metrics.length === 0 ? (

              <div className="table-status">

                No metrics found.

              </div>


            ) : (

              <table className="metrics-table">


                <thead>

                  <tr>

                    <th>
                      ID
                    </th>

                    <th>
                      Department
                    </th>

                    <th>
                      Metric
                    </th>

                    <th>
                      Value
                    </th>

                    <th>
                      Recorded On
                    </th>


                    {/* ADMIN ONLY */}

                    {user?.role ===
                      "admin" && (

                      <th>
                        Action
                      </th>

                    )}

                  </tr>

                </thead>


                <tbody>

                  {metrics.map(
                    (metric) => (

                      <tr
                        key={
                          metric.id
                        }
                      >


                        {/* ID */}

                        <td>

                          #{metric.id}

                        </td>


                        {/* DEPARTMENT */}

                        <td>

                          <span className="department-badge">

                            {metric.department ||
                              metric.department_name ||
                              "-"}

                          </span>

                        </td>


                        {/* NAME */}

                        <td>

                          <strong>

                            {
                              metric.metric_name
                            }

                          </strong>

                        </td>


                        {/* VALUE */}

                        <td>

                          {formatValue(
                            metric.metric_value
                          )}

                        </td>


                        {/* DATE */}

                        <td>

                          {metric.recorded_on
                            ? new Date(
                                metric.recorded_on
                              ).toLocaleDateString()
                            : "-"}

                        </td>


                        {/* ADMIN DELETE */}

                        {user?.role ===
                          "admin" && (

                          <td>

                            <button
                              type="button"
                              className="delete-metric-btn"
                              onClick={() =>
                                handleDeleteMetric(
                                  metric
                                )
                              }
                            >

                              Delete

                            </button>

                          </td>

                        )}

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            )}

          </div>


          <Pagination
            page={page}
            totalPages={totalPages}
            loadingMetrics={loadingMetrics}
            setPage={setPage}
          />

        </section>

      </main>

    </>

  );

}


export default DataManagement;