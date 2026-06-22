#!/bin/bash
# Start the Smart Parking backend
cd /opt/smartparking
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
