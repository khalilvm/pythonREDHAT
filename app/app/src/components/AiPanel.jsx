import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function AiPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);

  useEffect(() => {
    const fetch_data = () => {
      fetch("http://localhost:8000/api/analytics")
        .then((r) => r.json())
        .then((d) => { setData(d); setError(false); })
        .catch(() => setError(true));
    };
    fetch_data();
    const interval = setInterval(fetch_data, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleTrain = () => {
    setTraining(true);
    fetch("http://localhost:8000/api/train", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { setTrainResult(d); setTraining(false); })
      .catch(() => setTraining(false));
  };

  const trafficColor = { low: "#4ade80", medium: "#fb923c", high: "#f87171" };

  return (
    <div style={container}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: 0, fontWeight: 600 }}>🤖 AI Analytics</p>
        <button onClick={handleTrain} disabled={training} style={trainBtn}>
          {training ? "Training..." : "🔄 Train Model"}
        </button>
      </div>

      {error && <p style={{ color: "#f87171", fontSize: 13 }}>AI service unavailable</p>}

      {trainResult && (
        <div style={{ background: "#0b1120", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#4ade80" }}>
          ✅ Trained on {trainResult.samples} samples — RF: {trainResult.rf ? "✅" : "❌"} LSTM: {trainResult.lstm ? "✅" : "❌"}
        </div>
      )}

      {data && (
        <>
          {/* TOP CARDS */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>

            <div style={card}>
              <div style={{ color: "#64748b", fontSize: 12 }}>Current</div>
              <div style={{ color: "#60a5fa", fontSize: 28, fontWeight: 700 }}>{data.current}%</div>
              <div style={{ color: "#475569", fontSize: 11 }}>occupancy now</div>
            </div>

            <div style={card}>
              <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>Recommendation</div>
              <div style={{ fontSize: 22, marginBottom: 4 }}>
                {data.current < 50 ? "✅" : data.current < 80 ? "⚠️" : "❌"}
              </div>
              <div style={{ color: data.current < 50 ? "#4ade80" : data.current < 80 ? "#fb923c" : "#f87171", fontSize: 14, fontWeight: 700 }}>
                {data.current < 50 ? "Park Now!" : data.current < 80 ? "Park Quickly" : "Avoid — Full Soon"}
              </div>
            </div>

            <div style={card}>
              <div style={{ color: "#64748b", fontSize: 12 }}>Predicted Next</div>
              <div style={{ color: "#a78bfa", fontSize: 28, fontWeight: 700 }}>{data.predicted}%</div>
              <div style={{ color: "#475569", fontSize: 11 }}>trend-based</div>
            </div>

            <div style={card}>
              <div style={{ color: "#64748b", fontSize: 12 }}>Traffic</div>
              <div style={{ color: trafficColor[data.traffic?.toLowerCase()] ?? "#94a3b8", fontSize: 20, fontWeight: 700, textTransform: "uppercase", marginTop: 6 }}>
                {data.traffic}
              </div>
            </div>

          </div>

          {/* DAILY STATS */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { label: "Avg Today", value: `${data.stats.avg}%`, color: "#60a5fa" },
              { label: "Peak Today", value: `${data.stats.max}%`, color: "#f87171" },
              { label: "Min Today", value: `${data.stats.min}%`, color: "#4ade80" },
              { label: "Readings", value: data.stats.total_readings, color: "#fb923c" },
            ].map((s) => (
              <div key={s.label} style={{ ...card, flex: 1, minWidth: 100 }}>
                <div style={{ color: "#64748b", fontSize: 11 }}>{s.label}</div>
                <div style={{ color: s.color, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* PEAK HOURS CHART */}
          <div style={{ background: "#0b1120", borderRadius: 12, padding: 16 }}>
            <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 12px" }}>🕐 Busiest Hours</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={data.peak_hours}>
                <XAxis dataKey="hour" stroke="#334155" tick={{ fill: "#475569", fontSize: 11 }}
                  tickFormatter={(h) => `${h}:00`} />
                <YAxis stroke="#334155" tick={{ fill: "#475569", fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }}
                  labelFormatter={(h) => `${h}:00`}
                  formatter={(v) => [`${v}%`, "Avg Occupancy"]}
                />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {data.peak_hours.map((entry, i) => (
                    <Cell key={i} fill={entry.avg > 75 ? "#f87171" : entry.avg > 40 ? "#fb923c" : "#4ade80"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </>
      )}
    </div>
  );
}

const container = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: 20,
  marginBottom: 20,
};

const card = {
  background: "#0b1120",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: "14px 18px",
  flex: 1,
  minWidth: 120,
};

const trainBtn = {
  background: "#1e293b",
  border: "1px solid #334155",
  color: "#94a3b8",
  borderRadius: 8,
  padding: "6px 14px",
  cursor: "pointer",
  fontSize: 12,
};

