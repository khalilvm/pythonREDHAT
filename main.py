"""
Smart Parking — FastAPI Backend
Endpoints:
  GET  /                   → health check
  GET  /api/status         → current parking status (live from DB)
  GET  /api/history        → last N sensor readings
  GET  /api/predict        → AI occupancy prediction + traffic level
  GET  /api/stats          → aggregated daily stats
  POST /api/train          → trigger AI model training
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import threading

from app.database import sensor_col, prediction_col
from app.ai_engine import predict_next_occupancy, classify_traffic, train_lstm, train_rf_classifier
from app.mqtt_listener import start_mqtt_listener

app = FastAPI(title="Smart Parking API", version="1.0.0")

# Allow React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Start MQTT listener in background thread on startup ──
@app.on_event("startup")
def startup_event():
    thread = threading.Thread(target=start_mqtt_listener, daemon=True)
    thread.start()
    print("[APP] MQTT listener started in background")

# ── Routes ───────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "ok", "service": "Smart Parking API", "time": datetime.utcnow()}

@app.get("/api/status")
def get_status():
    """Returns the most recent sensor reading."""
    doc = sensor_col.find_one(sort=[("timestamp", -1)])
    if not doc:
        raise HTTPException(status_code=404, detail="No data yet — is the ESP32 running?")
    doc.pop("_id", None)
    return doc

@app.get("/api/history")
def get_history(limit: int = 50):
    """Returns last N sensor readings."""
    docs = list(sensor_col.find(sort=[("timestamp", -1)], limit=limit))
    for d in docs:
        d.pop("_id", None)
        d["timestamp"] = d["timestamp"].isoformat()
    return {"count": len(docs), "readings": docs}

@app.get("/api/predict")
def get_prediction():
    """Run AI prediction on recent data."""
    recent = list(sensor_col.find(sort=[("timestamp", -1)], limit=20))
    recent.reverse()

    if not recent:
        raise HTTPException(status_code=404, detail="No data available for prediction")

    latest      = recent[-1]
    occupancy   = latest.get("occupancy_pct", 0)
    motion      = latest.get("motion", 0)
    hour        = datetime.utcnow().hour
    free_spots  = latest.get("free_spots", 6)

    predicted_occ  = predict_next_occupancy(recent)
    traffic_level  = classify_traffic(occupancy, motion, hour)

    result = {
        "current_occupancy_pct": occupancy,
        "predicted_occupancy_pct": predicted_occ,
        "traffic_level": traffic_level,
        "free_spots": free_spots,
        "recommendation": _get_recommendation(predicted_occ, traffic_level),
        "timestamp": datetime.utcnow().isoformat()
    }

    # Save prediction to DB
    prediction_col.insert_one({**result, "timestamp": datetime.utcnow()})
    return result

@app.get("/api/stats")
def get_stats():
    """Aggregated stats for the last 24 hours."""
    since = datetime.utcnow() - timedelta(hours=24)
    docs  = list(sensor_col.find({"timestamp": {"$gte": since}}))

    if not docs:
        return {"message": "No data in last 24 hours"}

    occupancies = [d.get("occupancy_pct", 0) for d in docs]
    return {
        "total_readings":    len(docs),
        "avg_occupancy_pct": round(sum(occupancies) / len(occupancies), 1),
        "max_occupancy_pct": max(occupancies),
        "min_occupancy_pct": min(occupancies),
        "period_hours":      24
    }

@app.post("/api/train")
def trigger_training():
    """Manually trigger AI model training."""
    readings = list(sensor_col.find(sort=[("timestamp", 1)]))
    for r in readings:
        r.pop("_id", None)

    rf_result   = train_rf_classifier(readings)
    lstm_result = train_lstm(readings)

    return {
        "rf_trained":   rf_result is not None,
        "lstm_trained": lstm_result is not None,
        "samples_used": len(readings)
    }

def _get_recommendation(predicted_occ: float, traffic: str) -> str:
    if predicted_occ >= 90:
        return "Parking will be FULL soon — consider alternative locations"
    elif predicted_occ >= 60:
        return "Parking filling up — arrive early"
    elif traffic == "HIGH":
        return "High traffic detected — expect delays"
    else:
        return "Parking available — good time to arrive"
