"""
Smart Parking — FastAPI Backend
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import threading
import asyncio

from app.database import sensor_col
from app.ws_manager import manager 
from app.mqtt_listener import start_mqtt_listener

from app.ai_engine import (
    predict_next_occupancy,
    classify_traffic,
    train_lstm,
    train_rf_classifier,
    get_peak_hours,
    get_daily_stats
)

app = FastAPI(title="Smart Parking API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────
# STARTUP
# ─────────────────────────────
@app.on_event("startup")
def startup_event():
    thread = threading.Thread(
        target=start_mqtt_listener,
        daemon=True
    )
    thread.start()
    print("[APP] MQTT listener started")

# ─────────────────────────────
# HEALTH
# ─────────────────────────────
@app.get("/")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc)}

# ─────────────────────────────
# STATUS
# ─────────────────────────────
@app.get("/api/status")
def get_status():
    doc = sensor_col.find_one(sort=[("timestamp", -1)])
    if not doc:
        raise HTTPException(404, "No data")
    doc.pop("_id", None)
    return doc

# ─────────────────────────────
# HISTORY
# ─────────────────────────────
@app.get("/api/history")
def get_history(limit: int = 50):
    docs = list(sensor_col.find(sort=[("timestamp", -1)], limit=limit))
    for d in docs:
        d.pop("_id", None)
        d["timestamp"] = d["timestamp"].isoformat()
    return {"count": len(docs), "readings": docs}

# ─────────────────────────────
# PREDICTION (Single Check)
# ─────────────────────────────
@app.get("/api/predict")
def predict():
    recent = list(sensor_col.find(sort=[("timestamp", -1)], limit=20))
    recent.reverse()
    if not recent:
        raise HTTPException(404, "No data")
    
    latest = recent[-1]
    occupancy = latest.get("occupancy_pct", 0)
    motion = latest.get("motion", 0)
    hour = datetime.now(timezone.utc).hour

    predicted = predict_next_occupancy(recent)
    traffic = classify_traffic(occupancy, motion, hour)

    return {
        "current": occupancy,
        "predicted": predicted,
        "traffic": traffic,
        "time": datetime.now(timezone.utc).isoformat()
    }

# ─────────────────────────────
# ANALYTICS (For React AiPanel)
# ─────────────────────────────
@app.get("/api/analytics")
def get_analytics():
    readings = list(sensor_col.find(sort=[("timestamp", -1)], limit=200))
    for r in readings:
        r.pop("_id", None)

    stats = get_daily_stats(readings)
    peaks = get_peak_hours(readings)

    recent = readings[:20]
    recent.reverse()
    predicted = predict_next_occupancy(recent)

    latest = readings[0] if readings else {}
    traffic = classify_traffic(
        latest.get("occupancy_pct", 0),
        latest.get("motion", 0),
        datetime.now(timezone.utc).hour
    )

    return {
        "stats": stats,
        "peak_hours": peaks,
        "predicted": predicted,
        "traffic": traffic,
        "current": latest.get("occupancy_pct", 0),
        "time": datetime.now(timezone.utc).isoformat()
    }

# ─────────────────────────────
# TRAIN (Cleaned Up & Combined)
# ─────────────────────────────
@app.post("/api/train")
def train():
    data = list(sensor_col.find(sort=[("timestamp", 1)]))
    for d in data:
        d.pop("_id", None)
        
    rf_result = train_rf_classifier(data)
    lstm_result = train_lstm(data)
    
    return {
        "rf": rf_result is not None,
        "lstm": lstm_result is not None,
        "samples": len(data)
    }

# ─────────────────────────────
# WEBSOCKET
# ─────────────────────────────
@app.websocket("/ws/status")
async def ws_status(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(1)
            latest = sensor_col.find_one(sort=[("timestamp", -1)])
            if latest:
                latest["_id"] = str(latest["_id"])
                await manager.broadcast(latest)
    except WebSocketDisconnect:
        manager.disconnect(websocket)