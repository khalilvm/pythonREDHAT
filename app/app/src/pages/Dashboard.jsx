import { useEffect, useState } from "react";
import { socketService } from "../services/socket";
import ParkingHeatmap from "../components/ParkingHeatmap";
import OccupancyGauge from "../components/OccupancyGauge";
import StatsBar from "../components/StatsBar";
import HistoryChart from "../components/HistoryChart";
import AiPanel from "../components/AiPanel";

import AlertBanner from "../components/AlertBanner";
import SmartInsights from "../components/SmartInsights";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [spots, setSpots] = useState([]);
  const [history, setHistory] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);

  useEffect(() => {
    socketService.connect();

    const handleMessage = (msg) => {
      setData(msg);
      setSpots(generateSpots(msg));
      setLastUpdate(new Date().toLocaleTimeString());
      setHistory((prev) => {
        const next = [...prev, { time: new Date().toLocaleTimeString(), occupancy: msg.occupancy_pct }];
        return next.slice(-10);
      });
    };

    socketService.subscribe(handleMessage);
    return () => socketService.unsubscribe(handleMessage);
  }, []);

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={{ fontSize: 40 }}>🅿️</span>
          <div>
            <h1 style={styles.title}>Smart Parking Live</h1>
            <p style={styles.subtitle}>Real-time IoT Monitoring System</p>
          </div>
        </div>
        <div style={styles.liveIndicator}>
          <span style={styles.pulseDot} />
          <span style={{ color: "#4ade80", fontSize: 13 }}>LIVE</span>
          {lastUpdate && <span style={{ color: "#475569", fontSize: 12 }}>Last update: {lastUpdate}</span>}
        </div>
      </div>

      
	{data && <StatsBar data={data} />}

	{/* ALERTS */}
	{data && <AlertBanner occupancy_pct={data.occupancy_pct} free_spots={data.free_spots} />}

	{/* SMART INSIGHTS */}
	<SmartInsights history={history} data={data} />



    	 	

      {/* GAUGE + GRID */}
      <div style={styles.row}>
        {data && <OccupancyGauge pct={data.occupancy_pct} />}
        <div style={{ flex: 1 }}>
          <ParkingHeatmap spots={spots} onSpotClick={setSelectedSpot} />
        </div>
      </div>

      
      {/* AI PANEL */}
      <AiPanel />

      {/* HISTORY CHART */}
      {history.length > 1 && <HistoryChart history={history} />}
    </div>
  );
}

function generateSpots(data) {
  return Array.from({ length: 6 }).map((_, i) => {
    const key = `spot${i + 1}`;
    const val = data[key];
    return { id: i, label: `P${i + 1}`, status: val === 0 ? "free" : "occupied" };
  });
}

const styles = {
  page: { background: "#05070d", minHeight: "100vh", padding: "24px", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  title: { color: "white", margin: 0, fontSize: 24, fontWeight: 700 },
  subtitle: { color: "#64748b", margin: 0, fontSize: 13 },
  liveIndicator: { display: "flex", alignItems: "center", gap: 8, background: "#0f172a", padding: "8px 16px", borderRadius: 20, border: "1px solid #1e293b" },
  pulseDot: { width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse 1.5s infinite" },
  row: { display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 20 },
  spotCard: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "16px 20px", marginBottom: 20, position: "relative", maxWidth: 300 },
  closeBtn: { position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16 },
};