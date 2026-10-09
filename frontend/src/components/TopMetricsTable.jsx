function TopMetricsTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="placeholder">
        No top metrics available
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Metric Name</th>
            <th>Records</th>
            <th>Total Value</th>
          </tr>
        </thead>

        <tbody>
          {data.map((metric) => (
            <tr key={metric.rank}>
              <td>
                <span className="rank-badge">
                  #{metric.rank}
                </span>
              </td>

              <td>
                <strong>{metric.metric_name}</strong>
              </td>

              <td>{metric.total_records}</td>

              <td>
                {Number(
                  metric.total_value
                ).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TopMetricsTable;