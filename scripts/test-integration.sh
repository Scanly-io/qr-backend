#!/bin/bash

echo "🧪 Rate Limiting Integration Test"
echo "======================================"
echo ""

# Check if Redis is running
echo "1️⃣  Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis is running"
else
  echo "❌ Redis is NOT running"
  echo "   Start it with: redis-server --daemonize yes"
  exit 1
fi

echo ""

# Start gateway in background
echo "2️⃣  Starting Gateway..."
cd /Users/saurabhbansal/qr-backend/services/tenant-gateway

# Kill any existing gateway
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start gateway in background
npx tsx src/index.ts > /tmp/gateway.log 2>&1 &
GATEWAY_PID=$!

echo "   Gateway PID: $GATEWAY_PID"
echo "   Waiting for startup..."
sleep 3

# Check if it's running
if ! kill -0 $GATEWAY_PID 2>/dev/null; then
  echo "❌ Gateway failed to start"
  echo "   Check logs: cat /tmp/gateway.log"
  cat /tmp/gateway.log
  exit 1
fi

echo "✅ Gateway started successfully"
echo ""

# Test the gateway
echo "3️⃣  Testing Gateway..."
response=$(curl -s http://localhost:3000/health)

if [ $? -eq 0 ]; then
  echo "✅ Gateway responding: $response"
else
  echo "❌ Gateway not responding"
  kill $GATEWAY_PID
  exit 1
fi

echo ""

# Test rate limiting
echo "4️⃣  Testing Rate Limiting..."
echo "   Sending 10 requests to check headers..."

for i in {1..10}; do
  headers=$(curl -si http://localhost:3000/health 2>&1 | grep -i "x-ratelimit")
  
  if [ ! -z "$headers" ]; then
    echo "✅ Rate limit headers present:"
    echo "$headers" | sed 's/^/   /'
    break
  fi
done

echo ""

# Cleanup
echo "5️⃣  Cleanup..."
echo "   Stopping gateway (PID: $GATEWAY_PID)..."
kill $GATEWAY_PID 2>/dev/null

echo ""
echo "======================================"
echo "✅ Test Complete!"
echo ""
echo "Next steps:"
echo "  1. Start gateway: ./scripts/start-gateway.sh"
echo "  2. Run full test: ./scripts/test-rate-limit-simple.sh"
