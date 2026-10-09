import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="placeholder">
        No trend data available
      </div>
    );
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="month_label"
            tick={{ fontSize: 12 }}
          />

          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) =>
              Number(value).toLocaleString()
            }
          />

          <Tooltip
            formatter={(value, name) => {
              if (name === "total_value") {
                return [
                  Number(value).toLocaleString(),
                  "Total Value",
                ];
              }

              return [value, name];
            }}
            labelFormatter={(label) => `Month: ${label}`}
          />

          <Line
            type="monotone"
            dataKey="total_value"
            name="Total Value"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TrendChart;