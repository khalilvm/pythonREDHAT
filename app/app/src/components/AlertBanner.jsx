export default function AlertBanner({ occupancy_pct, free_spots }) {
  if (occupancy_pct < 80) return null;

  const full = free_spots === 0;

  return (
    <div style={{
      background: full ? "#7f1d1d" : "#78350f",
      border: `1px solid ${full ? "#ef4444" : "#f59e0b"}`,
      borderRadius: 12,
      padding: "14px 20px",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      gap: 12,
      animation: "pulse 1.5s infinite"
    }}>
      <span style={{ fontSize: 28 }}>{full ? "🚨" : "⚠️"}</span>
      <div>
        <p style={{ color: full ? "#fca5a5" : "#fcd34d", fontWeight: 700, margin: 0, fontSize: 15 }}>
          {full ? "PARKING FULL — No spots available!" : `WARNING — Only ${free_spots} spot(s) left!`}
        </p>
        <p style={{ color: "#94a3b8", margin: "2px 0 0", fontSize: 12 }}>
          {full ? "Please find an alternative parking location." : "Parking is almost full, act quickly."}
        </p>
      </div>
    </div>
  );
}