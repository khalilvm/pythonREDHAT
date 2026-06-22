"""
Subscribes to ThingSpeak MQTT channel.
Every time the ESP32 publishes, we receive it here,
parse it, save to MongoDB, and trigger AI prediction.
"""
import paho.mqtt.client as mqtt
from datetime import datetime
from app.config import MQTT_BROKER, MQTT_PORT, MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD, THINGSPEAK_CHANNEL_ID
from app.database import sensor_col
import json

SUBSCRIBE_TOPIC = f"channels/{THINGSPEAK_CHANNEL_ID}/subscribe"

def parse_payload(payload: str) -> dict:
    """
    ThingSpeak MQTT payload format:
    {"field1":"1","field2":"0","field3":"1",...}
    """
    try:
        data = json.loads(payload)
        return {
            "spot1":  int(data.get("field1", 0)),
            "spot2":  int(data.get("field2", 0)),
            "spot3":  int(data.get("field3", 0)),
            "spot4":  int(data.get("field4", 0)),
            "spot5":  int(data.get("field5", 0)),
            "spot6":  int(data.get("field6", 0)),
            "motion": int(data.get("field7", 0)),
            "light":  int(data.get("field8", 0)),
        }
    except Exception as e:
        print(f"[MQTT] Parse error: {e} | raw: {payload}")
        return {}

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[MQTT] Connected — subscribing to {SUBSCRIBE_TOPIC}")
        client.subscribe(SUBSCRIBE_TOPIC)
    else:
        print(f"[MQTT] Connection failed rc={rc}")

def on_message(client, userdata, msg):
    payload = msg.payload.decode()
    print(f"[MQTT] Received: {payload}")

    parsed = parse_payload(payload)
    if not parsed:
        return

    # Calculate free spots
    spots = [parsed[f"spot{i}"] for i in range(1, 7)]
    free  = spots.count(0)

    doc = {
        **parsed,
        "free_spots":   free,
        "occupancy_pct": round((6 - free) / 6 * 100, 1),
        "timestamp":    datetime.utcnow()
    }

    sensor_col.insert_one(doc)
    print(f"[DB] Saved reading — free: {free}/6, occupancy: {doc['occupancy_pct']}%")

def start_mqtt_listener():
    client = mqtt.Client(client_id=MQTT_CLIENT_ID, protocol=mqtt.MQTTv311)
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.on_connect = on_connect
    client.on_message = on_message

    print(f"[MQTT] Connecting to {MQTT_BROKER}:{MQTT_PORT}")
    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_forever()
