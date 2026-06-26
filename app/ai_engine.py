import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestClassifier  # 👈 Make sure this line is present!
import pickle
import os

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential, load_model
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    print("[AI] TensorFlow not available — using trend analysis fallback")

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
os.makedirs(MODEL_DIR, exist_ok=True)
LSTM_PATH = os.path.join(MODEL_DIR, "lstm_occupancy.h5")
RF_PATH   = os.path.join(MODEL_DIR, "rf_traffic.pkl")

def readings_to_dataframe(readings: list) -> pd.DataFrame:
    df = pd.DataFrame(readings)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    df["hour"]      = df["timestamp"].dt.hour
    df["minute"]    = df["timestamp"].dt.minute
    df["dayofweek"] = df["timestamp"].dt.dayofweek
    return df

def classify_traffic(occupancy_pct: float, motion: int, hour: int) -> str:
    if os.path.exists(RF_PATH):
        try:
            with open(RF_PATH, "rb") as f:
                clf = pickle.load(f)
            # ✅ Fix: Add dayofweek to match the 4 features used during training
            dayofweek = datetime.now(timezone.utc).weekday()
            features = np.array([[occupancy_pct, motion, hour, dayofweek]])
            return clf.predict(features)[0]
        except Exception as e:
            print(f"[AI] RF load error: {e}")
    if occupancy_pct >= 80:
        return "high"
    elif occupancy_pct >= 40:
        return "medium"
    else:
        return "low"

def train_rf_classifier(readings: list):
    if len(readings) < 20:
        print(f"[AI] Not enough data ({len(readings)} readings, need 20+)")
        return None
    df = readings_to_dataframe(readings)
    df["traffic_label"] = df["occupancy_pct"].apply(
        lambda x: "high" if x >= 80 else ("medium" if x >= 40 else "low")
    )
    X = df[["occupancy_pct", "motion", "hour", "dayofweek"]].values
    y = df["traffic_label"].values
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(RF_PATH, "wb") as f:
        pickle.dump(clf, f)
    print(f"[AI] RF trained on {len(df)} samples")
    return clf



def get_peak_hours(readings: list) -> list:
    """Return top 3 busiest hours from historical data."""
    if len(readings) < 10:
        return [{"hour": 8, "avg": 70}, {"hour": 12, "avg": 85}, {"hour": 18, "avg": 75}]
    df = readings_to_dataframe(readings)
    peak = df.groupby("hour")["occupancy_pct"].mean().sort_values(ascending=False).head(3)
    # ✅ Fix: Force hour and avg into native Python int and float types
    return [{"hour": int(h), "avg": round(float(v), 1)} for h, v in peak.items()]

def get_daily_stats(readings: list) -> dict:
    """Return daily occupancy stats."""
    if not readings:
        return {"avg": 0, "max": 0, "min": 0, "total_readings": 0}
    df = readings_to_dataframe(readings)
    
    today = df[df["timestamp"].dt.date == datetime.now(timezone.utc).date()]
    if today.empty:
        today = df
        
    # ✅ Fix: Cast all values using float() and int() to avoid NumPy types
    return {
        "avg": round(float(today["occupancy_pct"].mean()), 1),
        "max": round(float(today["occupancy_pct"].max()), 1),
        "min": round(float(today["occupancy_pct"].min()), 1),
        "total_readings": int(len(today))
    }
def train_lstm(readings: list, seq_len: int = 10):
    """Trains an LSTM model on occupancy sequences and saves the weights."""
    if not TF_AVAILABLE:
        print("[AI] TensorFlow missing. Cannot train LSTM.")
        return None
        
    if len(readings) < (seq_len + 5):
        print(f"[AI] Not enough data to train LSTM. Need at least {seq_len + 5} rows.")
        return None

    try:
        df = readings_to_dataframe(readings)
        # Normalize percentages between 0.0 and 1.0 for the neural network
        values = (df["occupancy_pct"].values / 100.0).astype(np.float32)
        
        X, y = [], []
        for i in range(len(values) - seq_len):
            X.append(values[i : i + seq_len])
            y.append(values[i + seq_len])
            
        X = np.array(X)
        y = np.array(y)
        
        # Reshape to [samples, time_steps, features] for LSTM layer
        X = np.reshape(X, (X.shape[0], X.shape[1], 1))
        
        # Define Recurrent Architecture
        model = Sequential([
            LSTM(32, activation='relu', input_shape=(seq_len, 1), return_sequences=False),
            Dropout(0.1),
            Dense(16, activation='relu'),
            Dense(1, activation='linear') # Linear output to predict continuous percentage
        ])
        
        model.compile(optimizer='adam', loss='mse')
        
        # Train model quickly over historical sequence frames
        model.fit(X, y, epochs=15, batch_size=16, verbose=0)
        
        # Save model weights to disk
        model.save(LSTM_PATH)
        print(f"[AI] LSTM model trained successfully and saved to {LSTM_PATH}")
        return model
    except Exception as e:
        print(f"[AI] Error training LSTM: {e}")
        return None
def predict_next_occupancy(recent_readings: list, seq_len: int = 10) -> float:
    """Predicts the next occupancy step using the trained LSTM model."""
    # Fallback to simple rolling average if model isn't built or TF is missing
    fallback_val = round(float(np.mean([r.get("occupancy_pct", 0) for r in recent_readings])) if recent_readings else 0.0, 1)

    if not TF_AVAILABLE or not os.path.exists(LSTM_PATH):
        return fallback_val

    try:
        if len(recent_readings) < seq_len:
            return fallback_val
            
        # Extract the last N elements to build the sequence window
        df = readings_to_dataframe(recent_readings)
        last_sequence = (df["occupancy_pct"].values[-seq_len:] / 100.0).astype(np.float32)
        
        # Shape input matrix to match expected [1, seq_len, 1] tensor shape
        input_tensor = last_sequence.reshape(1, seq_len, 1)
        
        model = load_model(LSTM_PATH, compile=False)
        prediction = model.predict(input_tensor, verbose=0)
        
        # Rescale the normalized output float back into a percentage scale (0-100)
        predicted_pct = float(prediction[0][0]) * 100.0
        return round(max(0.0, min(100.0, predicted_pct)), 1)
    except Exception as e:
        print(f"[AI] LSTM Prediction failed, using fallback: {e}")
        return fallback_val

