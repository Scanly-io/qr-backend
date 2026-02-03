#!/bin/bash

echo "🚀 Starting QR Backend - Local Development"
echo "=========================================="
echo ""

# Start Docker services
echo "📦 Starting Docker services (PostgreSQL, Redis, Kafka)..."
docker compose up -d postgres redis redpanda nginx

# Wait for databases
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 3

# Start all services in background
echo ""
echo "🔥 Starting application services..."
echo "  - Auth Service (3001)"
npm run dev --workspace=@qr/auth-service > /tmp/auth.log 2>&1 &

echo "  - QR Service (3002)"  
npm run dev --workspace=@qr/qr-service > /tmp/qr.log 2>&1 &

echo "  - Analytics Service (3004)"
npm run dev --workspace=@qr/analytics-service > /tmp/analytics.log 2>&1 &

echo "  - Microsite Service (3005)"
npm run dev --workspace=@qr/microsite-service > /tmp/microsite.log 2>&1 &

# Wait for services to start
sleep 5

echo ""
echo "✅ All services started!"
echo ""
echo "📋 Service URLs:"
echo "  Gateway:    http://localhost (Nginx)"
echo "  Auth:       http://localhost/auth (→ 3001)"
echo "  QR:         http://localhost/qr (→ 3002)"
echo "  Analytics:  http://localhost/analytics (→ 3004)"
echo "  Microsite:  http://localhost/microsite (→ 3005)"
echo ""
echo "📊 Swagger Docs:"
echo "  Analytics: http://localhost:3004/docs"
echo "  Microsite: http://localhost:3005/docs"
echo ""
echo "📝 Logs:"
echo "  tail -f /tmp/auth.log"
echo "  tail -f /tmp/qr.log"
echo "  tail -f /tmp/analytics.log"
echo "  tail -f /tmp/microsite.log"
echo ""
echo "🛑 To stop: ./stop-local.sh"
