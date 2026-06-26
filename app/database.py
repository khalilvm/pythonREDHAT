from pymongo import MongoClient
from app.config import MONGO_URI, MONGO_DB

client = MongoClient(MONGO_URI)
db     = client[MONGO_DB]

# Collections
sensor_col     = db["sensor_readings"]
prediction_col = db["ai_predictions"]
session_col    = db["rfid_sessions"]
