import { useEffect, useState } from "react";

const BEST_HOURS = [
  { hour: 7, label: "7:00 AM", score: 90 },
  { hour: 10, label: "10:00 AM", score: 85 },
  { hour: 13, label: "1:00 PM", score: 60 },
  { hour: 15, label: "3:00 PM", score: 70 },
  { hour: 20, label: "8:00 PM", score: 95 },
];

export default function SmartInsights({ history, data }) {
  const [trend, setTrend] = useState(null);
  const [bestTime, setBestTime] = useState(null);

  useEffect(() => {
    if (history.length >= 2) {
      const last = history[history.length - 1].occupancy;
      const prev = history[history.length - 2].occupancy;
      const diff = last - prev;
      setTrend({ direction: diff > 0 ? "up" : diff < 0 ? "down" : "stable", diff: Math.abs(diff) });
    }

    const currentHour = new Date().getHours();
    const future = BEST_HOURS.filter((h) => h.hour > currentHour);
    setBestTime(future.length > 0 ? future[0] : BEST_HOURS[0]);
  }, [history, data]);

  const trendConfig = {
    up:     { arrow: "↑", color: "#f87171", label: "Occupancy rising" },
    down:   { arrow: "↓", color: "#4ade80", label: "Occupancy falling" },
    stable: { arrow: "→", color: "#fb923c", label: "Occupancy stable" },
  };

  const t = trend ? trendConfig[trend.direction] : null;

  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px", fontWeight: 600 }}>🤖 Smart Insights</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>

        {/* TREND */}
        <div style={card}>
          <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>Live Trend</div>
          {t ? (
            <>
              <div style={{ fontSize: 48, color: t.color, lineHeight: 1 }}>{t.arrow}</div>
              <div style={{ color: t.color, fontWeight: 700, marginTop: 6 }}>{t.label}</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>
                {trend.diff > 0 ? `+${trend.diff}%` : trend.diff === 0 ? "No change" : `-${trend.diff}%`} since last reading
              </div>
            </>
          ) : (
            <div style={{ color: "#475569", fontSize: 13 }}>Collecting data...</div>
          )}
        </div>

        {/* BEST TIME */}
        <div style={card}>
          <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>Best Time to Park Today</div>
          {bestTime ? (
            <>
              <div style={{ color: "#a78bfa", fontSize: 32, fontWeight: 700 }}>{bestTime.label}</div>
              <div style={{ color: "#4ade80", fontSize: 12, marginTop: 6 }}>
                🟢 {bestTime.score}% chance of finding a spot
              </div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
                Based on historical patterns
              </div>
            </>
          ) : (
            <div style={{ color: "#475569" }}>Calculating...</div>
          )}
        </div>

        {/* CURRENT STATUS SUMMARY */}
        <div style={card}>
          <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>Status Summary</div>
          {data && (
            <>
              <div style={{ color: "white", fontSize: 13, lineHeight: 2 }}>
                <span>🟢 Free: <b style={{ color: "#4ade80" }}>{data.free_spots}</b></span><br />
                <span>🔴 Occupied: <b style={{ color: "#f87171" }}>{6 - data.free_spots}</b></span><br />
                <span>📊 Load: <b style={{ color: data.occupancy_pct > 75 ? "#f87171" : "#4ade80" }}>{data.occupancy_pct}%</b></span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

const card = {
  background: "#0b1120",
  border: "1px solid #1e293b",
  borderRadius: 12,
  padding: "16px 18px",
  flex: 1,
  minWidth: 160,
};