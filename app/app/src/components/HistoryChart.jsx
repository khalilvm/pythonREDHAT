import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function HistoryChart({ history }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px", fontWeight: 600 }}>📈 Occupancy History</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" stroke="#334155" tick={{ fill: "#475569", fontSize: 11 }} />
          <YAxis domain={[0, 100]} stroke="#334155" tick={{ fill: "#475569", fontSize: 11 }} unit="%" />
          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} labelStyle={{ color: "#94a3b8" }} itemStyle={{ color: "#60a5fa" }} />
          <Line type="monotone" dataKey="occupancy" stroke="#60a5fa" strokeWidth={2} dot={{ fill: "#60a5fa", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}