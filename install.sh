#!/bin/bash
# Run this on your RHEL VM as root or with sudo
# Usage: chmod +x install.sh && sudo ./install.sh

echo "=== Installing Smart Parking Backend on RHEL ==="

# 1. Python 3.11
echo "[1/5] Installing Python 3.11..."
sudo dnf install -y python3.11 python3.11-pip python3.11-devel gcc

# 2. MongoDB
echo "[2/5] Installing MongoDB..."
cat > /etc/yum.repos.d/mongodb-org-7.0.repo << 'REPO'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/9/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://pgp.mongodb.com/server-7.0.asc
REPO
sudo dnf install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod

# 3. Python virtual environment
echo "[3/5] Creating Python virtual environment..."
python3.11 -m venv /opt/smartparking/venv
source /opt/smartparking/venv/bin/activate

# 4. Python dependencies
echo "[4/5] Installing Python packages..."
pip install --upgrade pip
pip install fastapi uvicorn pymongo paho-mqtt \
            pandas scikit-learn tensorflow \
            python-dotenv httpx

# 5. Copy app files
echo "[5/5] Setting up app directory..."
mkdir -p /opt/smartparking/app

echo "=== Installation complete ==="
echo "To start: source /opt/smartparking/venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"
