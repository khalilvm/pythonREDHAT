export default function OccupancyGauge({ pct }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct > 75 ? "#f87171" : pct > 40 ? "#fb923c" : "#4ade80";

  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 200 }}>
      <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 12px" }}>Occupancy Rate</p>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle cx="80" cy="80" r={radius} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 80 80)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        <text x="80" y="80" textAnchor="middle" dy="8" fill="white" fontSize="28" fontWeight="bold">{pct}%</text>
      </svg>
      <p style={{ color, fontSize: 13, margin: "8px 0 0", fontWeight: 600 }}>
        {pct > 75 ? "Almost Full" : pct > 40 ? "Filling Up" : "Available"}
      </p>
    </div>
  );
}