function KPICards({ kpis, loading }) {
  return (
    <>
        <section className="kpi-grid">

          <div className="kpi-card">

            <span>
              Total Metric Value
            </span>

            <h2>
              {loading
                ? "Loading..."
                : Number(
                    kpis?.total_metric_value || 0
                  ).toLocaleString()}
            </h2>

          </div>

          <div className="kpi-card">

            <span>
              This Month
            </span>

            <h2>
              {loading
                ? "Loading..."
                : Number(
                    kpis?.this_month_value || 0
                  ).toLocaleString()}
            </h2>

          </div>

          <div className="kpi-card">

            <span>
              Most Active Department
            </span>

            <h2>
              {loading
                ? "Loading..."
                : kpis?.most_active_department ||
                  "N/A"}
            </h2>

          </div>

          <div className="kpi-card">

            <span>
              Monthly Change
            </span>

            <h2
              className={
                Number(
                  kpis?.month_change_percent
                ) >= 0
                  ? "positive-value"
                  : "negative-value"
              }
            >
              {loading
                ? "Loading..."
                : `${Number(
                    kpis?.month_change_percent ||
                      0
                  ).toFixed(2)}%`}
            </h2>

          </div>

        </section>
    </>
  );
}

export default KPICards;
