#!/bin/bash
# Start all QR Backend services locally

set -e

echo "Stopping any running services..."
pkill -f "auth-service" 2>/dev/null || true
pkill -f "qr-service" 2>/dev/null || true
pkill -f "analytics-service" 2>/dev/null || true
pkill -f "microsite-service" 2>/dev/null || true
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:3002 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:3004 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:3005 2>/dev/null | xargs kill -9 2>/dev/null || true

echo ""
echo "Starting Docker services (PostgreSQL, Redis, Kafka, Nginx)..."
if docker compose up -d postgres redis redpanda nginx 2>/dev/null; then
  echo "Waiting for Docker services to be ready..."
  sleep 5
else
  echo "WARNING: Docker not running. Skipping Docker services."
  echo "         Services will need local PostgreSQL/Redis/Kafka or will use stubs."
  sleep 1
fi

echo ""
echo "Starting Node.js services..."
echo ""

# Auth Service
<<<<<<< HEAD
echo "Auth Service (port 3001)..."
=======
echo "  > Auth Service (port 3001)..."
>>>>>>> 1ebe25d (Clean shell scripts: Remove emojis for professional terminal output)
nohup npm run dev --workspace=@qr/auth-service > /tmp/auth.log 2>&1 &
sleep 2

# QR Service
<<<<<<< HEAD
echo "QR Service (port 3002)..."
=======
echo "  > QR Service (port 3002)..."
>>>>>>> 1ebe25d (Clean shell scripts: Remove emojis for professional terminal output)
nohup npm run dev --workspace=@qr/qr-service > /tmp/qr.log 2>&1 &
sleep 2

# Analytics Service
<<<<<<< HEAD
echo "Analytics Service (port 3004)..."
=======
echo "  > Analytics Service (port 3004)..."
>>>>>>> 1ebe25d (Clean shell scripts: Remove emojis for professional terminal output)
nohup npm run dev --workspace=@qr/analytics-service > /tmp/analytics.log 2>&1 &
sleep 2

# Microsite Service
<<<<<<< HEAD
echo "Microsite Service (port 3005)..."
=======
echo "  > Microsite Service (port 3005)..."
>>>>>>> 1ebe25d (Clean shell scripts: Remove emojis for professional terminal output)
nohup npm run dev --workspace=@qr/microsite-service > /tmp/microsite.log 2>&1 &
sleep 3

echo ""
echo "All services started!"
echo ""
echo "Service Status:"
<<<<<<< HEAD
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker compose ps
echo ""
lsof -i :3001,:3002,:3004,:3005 | grep LISTEN || echo "  No Node services listening"
=======
echo "----------------------------------------------"
docker compose ps
echo ""
lsof -i :3001,:3002,:3004,:3005 | grep LISTEN || echo "WARNING: No Node services listening"
>>>>>>> 1ebe25d (Clean shell scripts: Remove emojis for professional terminal output)
echo ""
echo "URLs:"
echo "  Gateway:    http://localhost"
echo "  Auth:       http://localhost:3001"
echo "  QR:         http://localhost:3002"
echo "  Analytics:  http://localhost:3004"
echo "  Microsite:  http://localhost:3005"
echo ""
echo "Logs:"
echo "  tail -f /tmp/auth.log"
echo "  tail -f /tmp/qr.log"
echo "  tail -f /tmp/analytics.log"
echo "  tail -f /tmp/microsite.log"
echo ""
echo "Quick Test:"
echo "  curl http://localhost/health"
echo ""
