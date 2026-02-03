#!/bin/bash

echo "🛑 Stopping QR Backend Services..."

# Kill all service processes
pkill -f "auth-service"
pkill -f "qr-service"
pkill -f "analytics-service"
pkill -f "microsite-service"

# Stop Docker services
docker compose down

echo "✅ All services stopped"
