import { useState } from "react";
import "./parkingHeatmap.css";

const STATUS_CONFIG = {
  free:     { color: "#16a34a", glow: "#16a34a55", label: "FREE" },
  occupied: { color: "#dc2626", glow: "#dc262655", label: "OCCUPIED" },
  reserved: { color: "#7c3aed", glow: "#7c3aed55", label: "RESERVED" },
};

export default function ParkingHeatmap({ spots = [], onSpotClick }) {
  const [reserved, setReserved] = useState([]);
  const [animating, setAnimating] = useState([]);

  const getStatus = (spot) => {
    if (reserved.includes(spot.id)) return "reserved";
    return spot.status;
  };

  const handleClick = (spot) => {
    const status = getStatus(spot);
    if (status === "occupied") {
      onSpotClick && onSpotClick(spot);
      return;
    }
    if (status === "free") {
      setAnimating((prev) => [...prev, spot.id]);
      setTimeout(() => {
        setReserved((prev) => [...prev, spot.id]);
        setAnimating((prev) => prev.filter((id) => id !== spot.id));
      }, 800);
    }
    if (status === "reserved") {
      setReserved((prev) => prev.filter((id) => id !== spot.id));
    }
    onSpotClick && onSpotClick({ ...spot, status });
  };

  const leftSpots  = spots.slice(0, 3);
  const rightSpots = spots.slice(3, 6);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <p style={styles.title}>🗺️ Parking Lot — Top View</p>
        <div style={styles.legend}>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <div key={key} style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: val.color }} />
              <span style={{ color: "#64748b", fontSize: 11 }}>{val.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PARKING LOT */}
      <div style={styles.lot}>

        {/* ENTRANCE */}
        <div style={styles.entrance}>
          <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>▼ ENTRANCE</span>
        </div>

        {/* MAIN AREA */}
        <div style={styles.mainArea}>

          {/* LEFT ROW */}
          <div style={styles.spotsColumn}>
            <div style={styles.rowLabel}>ROW A</div>
            {leftSpots.map((spot) => {
              const status = getStatus(spot);
              const cfg = STATUS_CONFIG[status];
              const isAnimating = animating.includes(spot.id);
              return (
                <div key={spot.id} style={{ position: "relative" }}>
                  <div
                    onClick={() => handleClick(spot)}
                    style={{
                      ...styles.spot,
                      background: cfg.color + "22",
                      border: `2px solid ${cfg.color}`,
                      boxShadow: `0 0 12px ${cfg.glow}`,
                      cursor: status === "occupied" ? "default" : "pointer",
                    }}
                  >
                    {/* CAR ICON */}
                    {status === "occupied" && (
                      <span style={styles.carIcon}>🚗</span>
                    )}
                    {status === "reserved" && (
                      <span style={styles.carIcon}>🔒</span>
                    )}
                    {isAnimating && (
                      <span style={{ ...styles.carIcon, animation: "driveIn 0.8s ease forwards" }}>🚗</span>
                    )}
                    <span style={{ ...styles.spotLabel, color: cfg.color }}>{spot.label}</span>
                    <span style={{ color: cfg.color, fontSize: 9, marginTop: 2 }}>{cfg.label}</span>
                    {status === "free" && (
                      <span style={styles.reserveHint}>tap to reserve</span>
                    )}
                    {status === "reserved" && (
                      <span style={styles.reserveHint}>tap to cancel</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* LANE */}
          <div style={styles.lane}>
            <div style={styles.laneLine} />
            <span style={styles.laneLabel}>🚦 LANE</span>
            <div style={styles.laneLine} />
          </div>

          {/* RIGHT ROW */}
          <div style={styles.spotsColumn}>
            <div style={styles.rowLabel}>ROW B</div>
            {rightSpots.map((spot) => {
              const status = getStatus(spot);
              const cfg = STATUS_CONFIG[status];
              const isAnimating = animating.includes(spot.id);
              return (
                <div key={spot.id} style={{ position: "relative" }}>
                  <div
                    onClick={() => handleClick(spot)}
                    style={{
                      ...styles.spot,
                      background: cfg.color + "22",
                      border: `2px solid ${cfg.color}`,
                      boxShadow: `0 0 12px ${cfg.glow}`,
                      cursor: status === "occupied" ? "default" : "pointer",
                    }}
                  >
                    {status === "occupied" && (
                      <span style={styles.carIcon}>🚗</span>
                    )}
                    {status === "reserved" && (
                      <span style={styles.carIcon}>🔒</span>
                    )}
                    {isAnimating && (
                      <span style={{ ...styles.carIcon, animation: "driveIn 0.8s ease forwards" }}>🚗</span>
                    )}
                    <span style={{ ...styles.spotLabel, color: cfg.color }}>{spot.label}</span>
                    <span style={{ color: cfg.color, fontSize: 9, marginTop: 2 }}>{cfg.label}</span>
                    {status === "free" && (
                      <span style={styles.reserveHint}>tap to reserve</span>
                    )}
                    {status === "reserved" && (
                      <span style={styles.reserveHint}>tap to cancel</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* EXIT */}
        <div style={styles.exit}>
          <span style={{ color: "#f87171", fontSize: 11, fontWeight: 700 }}>▲ EXIT</span>
        </div>

      </div>

      {/* RESERVATION COUNT */}
      {reserved.length > 0 && (
        <div style={styles.reservedBadge}>
          🔒 {reserved.length} spot(s) reserved by you
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 20, marginBottom: 20 },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { color: "#94a3b8", fontSize: 13, margin: 0, fontWeight: 600 },
  legend: { display: "flex", gap: 12 },
  legendItem: { display: "flex", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: "50%" },
  lot: { background: "#080d18", borderRadius: 12, padding: 16, border: "1px solid #1e293b" },
  entrance: { textAlign: "center", padding: "6px 0", borderBottom: "2px dashed #1e293b", marginBottom: 12 },
  exit: { textAlign: "center", padding: "6px 0", borderTop: "2px dashed #1e293b", marginTop: 12 },
  mainArea: { display: "flex", gap: 8, justifyContent: "center", alignItems: "stretch" },
  spotsColumn: { display: "flex", flexDirection: "column", gap: 10, flex: 1 },
  rowLabel: { color: "#334155", fontSize: 11, textAlign: "center", fontWeight: 700, letterSpacing: 2, marginBottom: 4 },
  spot: { borderRadius: 10, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 90, transition: "all 0.3s ease", position: "relative" },
  spotLabel: { fontSize: 14, fontWeight: 700, marginTop: 4 },
  carIcon: { fontSize: 24 },
  reserveHint: { color: "#334155", fontSize: 9, marginTop: 3 },
  lane: { width: 60, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "20px 0" },
  laneLine: { flex: 1, width: 2, background: "#1e3a5f", borderRadius: 2 },
  laneLabel: { color: "#1e3a5f", fontSize: 10, writingMode: "vertical-rl", letterSpacing: 2 },
reservedBadge: { marginTop: 12, color: "#a78bfa", fontSize: 13, textAlign: "center", background: "#1e1b4b", borderRadius: 8, padding: "8px 16px" },
 }