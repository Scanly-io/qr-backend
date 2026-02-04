#!/bin/bash

# Test ML Service Integration
# Run this after: docker-compose up -d

echo "🧪 Testing ML Service Integration..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Direct health check
echo "1️⃣  Testing ML service health (direct)..."
HEALTH_DIRECT=$(curl -s http://localhost:3016/health)
if [[ $HEALTH_DIRECT == *"healthy"* ]]; then
  echo -e "${GREEN}✅ ML service is healthy (direct)${NC}"
  echo "   Response: $HEALTH_DIRECT"
else
  echo -e "${RED}❌ ML service health check failed${NC}"
  echo "   Is the service running? Try: docker ps | grep ml_service"
fi
echo ""

# Test 2: AI Generation endpoint (through nginx)
echo "2️⃣  Testing AI generation endpoint..."
AI_GEN=$(curl -s -X POST http://localhost/api/ml/ai/generate \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 00000000-0000-0000-0000-000000000001" \
  -d '{
    "prompt": "Create a test landing page",
    "mobileFirst": true
  }' | head -c 200)

if [[ $AI_GEN == *"success"* ]] || [[ $AI_GEN == *"generation"* ]]; then
  echo -e "${GREEN}✅ AI generation endpoint working${NC}"
  echo "   Response: $AI_GEN..."
elif [[ $AI_GEN == *"404"* ]]; then
  echo -e "${RED}❌ AI generation endpoint returned 404${NC}"
  echo "   Nginx routing may be incorrect"
else
  echo -e "${YELLOW}⚠️  AI generation returned unexpected response${NC}"
  echo "   Response: $AI_GEN"
fi
echo ""

# Test 3: Accessibility scanner (public endpoint - no auth)
echo "3️⃣  Testing accessibility scanner..."
ACCESSIBILITY=$(curl -s -X POST http://localhost/api/ml/accessibility/scan-free \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }' | head -c 200)

if [[ $ACCESSIBILITY == *"success"* ]] || [[ $ACCESSIBILITY == *"score"* ]]; then
  echo -e "${GREEN}✅ Accessibility scanner working${NC}"
  echo "   Response: $ACCESSIBILITY..."
elif [[ $ACCESSIBILITY == *"404"* ]]; then
  echo -e "${RED}❌ Accessibility endpoint returned 404${NC}"
  echo "   Nginx routing may be incorrect"
else
  echo -e "${YELLOW}⚠️  Accessibility scanner returned unexpected response${NC}"
  echo "   Response: $ACCESSIBILITY"
fi
echo ""

# Test 4: Check docker containers
echo "4️⃣  Checking docker containers..."
ML_CONTAINER=$(docker ps --filter "name=qr_ml_service" --format "{{.Names}} - {{.Status}}")
if [[ ! -z "$ML_CONTAINER" ]]; then
  echo -e "${GREEN}✅ ML service container running${NC}"
  echo "   $ML_CONTAINER"
else
  echo -e "${RED}❌ ML service container not found${NC}"
  echo "   Run: docker-compose up -d ml-service"
fi
echo ""

NGINX_CONTAINER=$(docker ps --filter "name=qr_nginx" --format "{{.Names}} - {{.Status}}")
if [[ ! -z "$NGINX_CONTAINER" ]]; then
  echo -e "${GREEN}✅ Nginx container running${NC}"
  echo "   $NGINX_CONTAINER"
else
  echo -e "${YELLOW}⚠️  Nginx container not found${NC}"
  echo "   Run: docker-compose up -d nginx"
fi
echo ""

# Test 5: Check ML service logs for errors
echo "5️⃣  Checking ML service logs (last 10 lines)..."
if docker ps --filter "name=qr_ml_service" --format "{{.Names}}" | grep -q qr_ml_service; then
  ML_LOGS=$(docker logs --tail 10 qr_ml_service 2>&1)
  if [[ $ML_LOGS == *"error"* ]] || [[ $ML_LOGS == *"Error"* ]]; then
    echo -e "${YELLOW}⚠️  Found errors in ML service logs:${NC}"
    echo "$ML_LOGS"
  elif [[ $ML_LOGS == *"listening"* ]] || [[ $ML_LOGS == *"ready"* ]]; then
    echo -e "${GREEN}✅ ML service logs look good${NC}"
    echo "$ML_LOGS" | tail -3
  else
    echo -e "${YELLOW}ℹ️  ML service logs:${NC}"
    echo "$ML_LOGS" | tail -3
  fi
else
  echo -e "${YELLOW}⚠️  ML service container not running, skipping log check${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If all tests pass, the ML service is ready! 🎉"
echo ""
echo "Next steps:"
echo "  1. Test from frontend: http://localhost:5173"
echo "  2. Check Settings > ML & AI tab"
echo "  3. Try AI generation in dashboard"
echo ""
echo "Useful commands:"
echo "  - View logs: docker logs -f qr_ml_service"
echo "  - Restart: docker-compose restart ml-service nginx"
echo "  - Rebuild: docker-compose build ml-service && docker-compose up -d ml-service"
echo ""
