import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function DeptBarChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="placeholder">No department data</div>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="department" />

          <YAxis
            tickFormatter={(value) =>
              Number(value).toLocaleString()
            }
          />

          <Tooltip
            formatter={(value) =>
              Number(value).toLocaleString()
            }
          />

          <Bar
            dataKey="total_value"
            name="Total Value"
            fill="#2563eb"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DeptBarChart;