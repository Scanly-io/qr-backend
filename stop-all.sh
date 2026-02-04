#!/bin/bash
# Stop all QR Backend services

echo "Stopping Node.js services..."
pkill -f "auth-service" 2>/dev/null || true
pkill -f "qr-service" 2>/dev/null || true
pkill -f "analytics-service" 2>/dev/null || true
pkill -f "microsite-service" 2>/dev/null || true
lsof -ti:3001,3002,3004,3005 2>/dev/null | xargs kill -9 2>/dev/null || true

echo "Stopping Docker services..."
docker compose down

echo "All services stopped"
