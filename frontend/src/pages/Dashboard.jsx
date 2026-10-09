import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../api";

import TrendChart from "../components/TrendChart";
import DeptBarChart from "../components/DeptBarChart";
import DeptPieChart from "../components/DeptPieChart";
import TopMetricsTable from "../components/TopMetricsTable";
import ActivityFeed from "../components/ActivityFeed";
import KPICards from "../components/KPICards";
import FilterBar from "../components/FilterBar";

function Dashboard() {
  const { user } = useAuth();

  // ==============================
  // DASHBOARD STATES
  // ==============================

  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [trendData, setTrendData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [topMetrics, setTopMetrics] = useState([]);

  // ==============================
  // FILTER STATES
  // ==============================

  const [department, setDepartment] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ==============================
  // LOAD DASHBOARD DATA
  // ==============================

  const loadDashboardData = async (filters = {}) => {
    try {
      setLoading(true);
      setError("");

      // ------------------------------
      // KPI PARAMETERS
      // ------------------------------

      const kpiParams = {};

      if (filters.department) {
        kpiParams.department = filters.department;
      }

      if (filters.fromDate) {
        kpiParams.from = filters.fromDate;
      }

      if (filters.toDate) {
        kpiParams.to = filters.toDate;
      }

      // ------------------------------
      // DEPARTMENT CHART PARAMETERS
      // ------------------------------

      const departmentParams = {};

      if (filters.fromDate) {
        departmentParams.from = filters.fromDate;
      }

      if (filters.toDate) {
        departmentParams.to = filters.toDate;
      }

      // ------------------------------
      // TREND PARAMETERS
      // ------------------------------

      const trendParams = {};

      if (filters.department) {
        trendParams.department = filters.department;
      }

      // ------------------------------
      // CALL APIs
      // ------------------------------

      const [
        kpiResponse,
        trendResponse,
        departmentResponse,
        topMetricsResponse,
      ] = await Promise.all([
        api.get("/kpis", {
          params: kpiParams,
        }),

        api.get("/metrics/trend", {
          params: trendParams,
        }),

        api.get("/metrics/by-department", {
          params: departmentParams,
        }),

        api.get("/metrics/top"),
      ]);

      // ------------------------------
      // KPI DATA
      // ------------------------------

      console.log(
        "Filtered KPI Response:",
        kpiResponse.data
      );

      setKpis(kpiResponse.data.kpis || null);

      // ------------------------------
      // TREND DATA
      // ------------------------------

      console.log(
        "Filtered Trend Response:",
        trendResponse.data
      );

      setTrendData(
        trendResponse.data.trend ||
          trendResponse.data.data ||
          trendResponse.data.metrics ||
          []
      );

      // ------------------------------
      // DEPARTMENT DATA
      // ------------------------------

      console.log(
        "Filtered Department Response:",
        departmentResponse.data
      );

      setDepartmentData(
        departmentResponse.data.departments ||
          departmentResponse.data.data ||
          departmentResponse.data.metrics ||
          []
      );

      // ------------------------------
      // TOP METRICS
      // ------------------------------

      setTopMetrics(
        topMetricsResponse.data.top_metrics ||
          topMetricsResponse.data.metrics ||
          topMetricsResponse.data.data ||
          []
      );
    } catch (err) {
      console.error(
        "Dashboard API Error:",
        err
      );

      if (err.response?.status === 401) {
        setError(
          "Your login session has expired. Please login again."
        );
      } else {
        setError(
          "Unable to load dashboard data."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // INITIAL LOAD
  // ==============================

  useEffect(() => {
    loadDashboardData();
  }, []);

  // ==============================
  // APPLY FILTERS
  // ==============================

  const handleApplyFilters = () => {
    setError("");

    if (
      fromDate &&
      toDate &&
      fromDate > toDate
    ) {
      setError(
        "From Date cannot be later than To Date."
      );

      return;
    }

    loadDashboardData({
      department,
      fromDate,
      toDate,
    });
  };

  // ==============================
  // CLEAR FILTERS
  // ==============================

  const handleClearFilters = () => {
    setDepartment("");
    setFromDate("");
    setToDate("");
    setError("");

    loadDashboardData();
  };

  // ==============================
  // UI
  // ==============================

  return (
    <>
      <Navbar />

      <main className="dashboard-container">

        {/* WELCOME */}
        <section className="welcome-section">

          <div>
            <p className="eyebrow">
              Enterprise Analytics
            </p>

            <h1>
              Dashboard Overview
            </h1>

            <p>
              Welcome back,{" "}
              <strong>
                {user?.name}
              </strong>
            </p>
          </div>

          <span className="role-badge">
            {user?.role}
          </span>

        </section>

        {/* ERROR */}
        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <FilterBar
          department={department}
          setDepartment={setDepartment}
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          loading={loading}
        />

        <KPICards kpis={kpis} loading={loading} />

        {/* ==============================
            DASHBOARD CONTENT
        ============================== */}

        <section className="dashboard-grid">

          {/* TREND CHART */}
          <div className="dashboard-card wide-card">

            <div className="card-header">
              <div>
                <h3>
                  Metric Trend
                </h3>

                <p>
                  {department
                    ? `${department} performance over time`
                    : "Performance over time"}
                </p>
              </div>
            </div>

            <TrendChart
              data={trendData}
            />

          </div>

          {/* DEPARTMENT BAR CHART */}
          <div className="dashboard-card">

            <div className="card-header">
              <div>
                <h3>
                  Department Performance
                </h3>

                <p>
                  Total metric value by department
                </p>
              </div>
            </div>

            <DeptBarChart
              data={departmentData}
            />

          </div>

          {/* DEPARTMENT PIE CHART */}
          <div className="dashboard-card">

            <div className="card-header">
              <div>
                <h3>
                  Department Distribution
                </h3>

                <p>
                  Metric value distribution
                </p>
              </div>
            </div>

            <DeptPieChart
              data={departmentData}
            />

          </div>

          {/* TOP METRICS */}
          <div className="dashboard-card wide-card">

            <div className="card-header">
              <div>
                <h3>
                  Top Metrics
                </h3>

                <p>
                  Highest performing enterprise
                  metrics
                </p>
              </div>
            </div>

            <TopMetricsTable
              data={topMetrics}
            />

          </div>

          {/* ==============================
              RECENT ACTIVITY
          ============================== */}

          <div className="dashboard-card wide-card">

            <div className="card-header">
              <div>
                <h3>
                  Recent Activity
                </h3>

                <p>
                  Latest system activity
                </p>
              </div>
            </div>

            <ActivityFeed />

          </div>

        </section>

      </main>
    </>
  );
}

export default Dashboard;