"""
AI Engine — two models:
1. TensorFlow LSTM  → predicts occupancy % for next 30 minutes
2. Scikit-learn RF  → classifies traffic level (LOW / MEDIUM / HIGH)
"""
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import pickle
import os

# TensorFlow import (graceful fallback if not installed yet)
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential, load_model
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    print("[AI] TensorFlow not available — occupancy prediction disabled")

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
LSTM_PATH = os.path.join(MODEL_DIR, "lstm_occupancy.h5")
RF_PATH   = os.path.join(MODEL_DIR, "rf_traffic.pkl")

# ── Helpers ──────────────────────────────────────────────
def readings_to_dataframe(readings: list) -> pd.DataFrame:
    """Convert MongoDB sensor readings to a Pandas DataFrame."""
    df = pd.DataFrame(readings)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    df["hour"]       = df["timestamp"].dt.hour
    df["minute"]     = df["timestamp"].dt.minute
    df["dayofweek"]  = df["timestamp"].dt.dayofweek
    return df

# ── Traffic classification (Scikit-learn) ────────────────
def classify_traffic(occupancy_pct: float, motion: int, hour: int) -> str:
    """
    Simple rule-based classifier (used before enough data for ML training).
    Once 100+ readings are collected, switches to trained RandomForest.
    """
    if os.path.exists(RF_PATH):
        try:
            with open(RF_PATH, "rb") as f:
                clf = pickle.load(f)
            features = np.array([[occupancy_pct, motion, hour]])
            return clf.predict(features)[0]
        except Exception as e:
            print(f"[AI] RF model load error: {e}")

    # Rule-based fallback
    if occupancy_pct >= 80:
        return "HIGH"
    elif occupancy_pct >= 40:
        return "MEDIUM"
    else:
        return "LOW"

def train_rf_classifier(readings: list):
    """Train RandomForest on collected data. Call once you have 100+ readings."""
    if len(readings) < 50:
        print(f"[AI] Not enough data to train RF ({len(readings)} readings, need 50+)")
        return None

    df = readings_to_dataframe(readings)
    df["traffic_label"] = df["occupancy_pct"].apply(
        lambda x: "HIGH" if x >= 80 else ("MEDIUM" if x >= 40 else "LOW")
    )

    X = df[["occupancy_pct", "motion", "hour", "dayofweek"]].values
    y = df["traffic_label"].values

    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)

    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(RF_PATH, "wb") as f:
        pickle.dump(clf, f)

    print(f"[AI] RandomForest trained on {len(df)} samples — saved to {RF_PATH}")
    return clf

# ── Occupancy prediction (TensorFlow LSTM) ───────────────
def build_lstm_model(seq_len: int = 10) -> "tf.keras.Model":
    model = Sequential([
        LSTM(64, input_shape=(seq_len, 1), return_sequences=True),
        Dropout(0.2),
        LSTM(32),
        Dropout(0.2),
        Dense(1, activation="sigmoid")  # outputs 0-1 (multiply by 100 for %)
    ])
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    return model

def train_lstm(readings: list, seq_len: int = 10):
    """Train LSTM on occupancy time series. Needs 50+ readings."""
    if not TF_AVAILABLE:
        print("[AI] TensorFlow not available")
        return None
    if len(readings) < seq_len + 5:
        print(f"[AI] Not enough data for LSTM ({len(readings)} readings)")
        return None

    df = readings_to_dataframe(readings)
    values = (df["occupancy_pct"].values / 100.0).astype(np.float32)

    # Build sequences
    X, y = [], []
    for i in range(len(values) - seq_len):
        X.append(values[i:i+seq_len].reshape(-1, 1))
        y.append(values[i+seq_len])

    X = np.array(X)
    y = np.array(y)

    model = build_lstm_model(seq_len)
    model.fit(X, y, epochs=20, batch_size=8, verbose=0)

    os.makedirs(MODEL_DIR, exist_ok=True)
    model.save(LSTM_PATH)
    print(f"[AI] LSTM trained — saved to {LSTM_PATH}")
    return model

def predict_next_occupancy(recent_readings: list, seq_len: int = 10) -> float:
    """Predict next occupancy % from last seq_len readings."""
    if not TF_AVAILABLE:
        # Fallback: simple average trend
        if len(recent_readings) == 0:
            return 0.0
        return recent_readings[-1].get("occupancy_pct", 0.0)

    if len(recent_readings) < seq_len:
        return recent_readings[-1].get("occupancy_pct", 0.0) if recent_readings else 0.0

    try:
        model = load_model(LSTM_PATH)
        values = np.array([r["occupancy_pct"] / 100.0 for r in recent_readings[-seq_len:]], dtype=np.float32)
        X = values.reshape(1, seq_len, 1)
        pred = model.predict(X, verbose=0)[0][0]
        return round(float(pred) * 100, 1)
    except Exception as e:
        print(f"[AI] LSTM predict error: {e}")
        return recent_readings[-1].get("occupancy_pct", 0.0)
