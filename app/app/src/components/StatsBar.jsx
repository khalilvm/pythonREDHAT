export default function StatsBar({ data }) {
  const stats = [
    { label: "Total Spots", value: 6, icon: "🅿️", color: "#60a5fa" },
    { label: "Free", value: data.free_spots, icon: "✅", color: "#4ade80" },
    { label: "Occupied", value: 6 - data.free_spots, icon: "🚗", color: "#f87171" },
    { label: "Occupancy", value: `${data.occupancy_pct}%`, icon: "📊", color: "#fb923c" },
    { label: "Motion", value: data.motion ? "Detected" : "None", icon: "🔍", color: "#a78bfa" },
	{ label: "Barrier", value: data.barrier ? "OPEN 🟢" : "CLOSED 🔴", icon: "🚧", color: data.barrier ? "#4ade80" : "#f87171" },
{ label: "Last RFID", value: data.rfid_access ? "✅ Authorized" : "❌ Denied", icon: "💳", color: data.rfid_access ? "#4ade80" : "#f87171" },
  ];

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
      {stats.map((s) => (
        <div key={s.label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "14px 20px", flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 22 }}>{s.icon}</div>
          <div style={{ color: s.color, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}