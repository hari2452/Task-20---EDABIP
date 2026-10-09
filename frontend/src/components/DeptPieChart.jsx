import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#9333ea",
  "#ef4444",
];

function DeptPieChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="placeholder">No department data</div>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total_value"
            nameKey="department"
            outerRadius={90}
            label
          >
            {data.map((item, index) => (
              <Cell
                key={item.department_id}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>

          <Tooltip
            formatter={(value) =>
              Number(value).toLocaleString()
            }
          />

          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DeptPieChart;