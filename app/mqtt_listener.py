import time
import requests
from datetime import datetime
from app.database import sensor_col
from app.ws_manager import manager
import asyncio

CHANNEL_ID = "3413559"
READ_API_KEY = "HN33ICFQTTRD8BS3"
THINGSPEAK_URL = f"https://api.thingspeak.com/channels/{CHANNEL_ID}/feeds/last.json?api_key={READ_API_KEY}"

def start_mqtt_listener():
    def on_new_sensor_data(data: dict):
        sensor_col.insert_one(data)
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.broadcast(data))
        except RuntimeError:
            asyncio.run(manager.broadcast(data))

    while True:
        try:
            response = requests.get(THINGSPEAK_URL, timeout=5)
            feed = response.json()

            spot1 = int(float(feed.get("field1") or 0))
            spot2 = int(float(feed.get("field2") or 0))
            spot3 = int(float(feed.get("field3") or 0))
            spot4 = int(float(feed.get("field4") or 0))
            spot5 = int(float(feed.get("field5") or 0))
            spot6 = int(float(feed.get("field6") or 0))
            rfid_access = int(float(feed.get("field7") or 0))
            barrier = int(float(feed.get("field8") or 0))

            spots = [spot1, spot2, spot3, spot4, spot5, spot6]
            free_spots = spots.count(0)
            occupied = spots.count(1)
            occupancy_pct = round((occupied / 6) * 100)

            data = {
                "spot1": spot1,
                "spot2": spot2,
                "spot3": spot3,
                "spot4": spot4,
                "spot5": spot5,
                "spot6": spot6,
                "free_spots": free_spots,
                "occupancy_pct": occupancy_pct,
                "motion": 0,
                "rfid_access": rfid_access,
                "barrier": barrier,
                "timestamp": datetime.utcnow()
            }

            on_new_sensor_data(data)
            print(f"[ThingSpeak] fetched: {data}")

        except Exception as e:
            print(f"[ThingSpeak] error: {e}")

        time.sleep(3)