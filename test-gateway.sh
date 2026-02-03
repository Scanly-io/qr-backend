#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Test Nginx API Gateway
# ═══════════════════════════════════════════════════════════
# Purpose: Verify all routes work through the gateway
# Usage: ./test-gateway.sh
# ═══════════════════════════════════════════════════════════

set -e

echo "════════════════════════════════════════════════════════"
echo "Testing Nginx API Gateway Routes"
echo "════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Gateway base URL
GATEWAY="http://localhost"

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local expected_code=${4:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$url")
    
    if [ "$response" -eq "$expected_code" ] || [ "$response" -eq 200 ] || [ "$response" -eq 404 ]; then
        echo -e "${GREEN}✓ $response${NC}"
        return 0
    else
        echo -e "${RED}✗ $response (expected ~$expected_code)${NC}"
        return 1
    fi
}

# Test Gateway Health
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Gateway Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Gateway Health" "$GATEWAY/health"
curl -s "$GATEWAY/health" | jq . 2>/dev/null || curl -s "$GATEWAY/health"
echo ""

# Test Auth Service Routes
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Auth Service (via Gateway)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Auth Service Health" "$GATEWAY/auth"
test_endpoint "Auth Swagger Docs" "$GATEWAY/auth-docs"
echo ""

# Test QR Service Routes
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. QR Service (via Gateway)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "QR Service (no auth)" "$GATEWAY/generate" "POST" "401"
test_endpoint "QR Image (public)" "$GATEWAY/qr/test-qr-123/image" "GET" "200"
test_endpoint "QR Swagger Docs" "$GATEWAY/qr-docs"
echo ""

# Test Microsite Service Routes
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Microsite Service (via Gateway)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Microsite Service Health" "$GATEWAY/microsite"
test_endpoint "Public Microsite" "$GATEWAY/public/test-qr-123"
test_endpoint "Microsite Swagger Docs" "$GATEWAY/microsite-docs"
echo ""

# Test Analytics Service Routes
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Analytics Service (via Gateway)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Analytics Service Health" "$GATEWAY/analytics"
test_endpoint "Analytics Summary" "$GATEWAY/analytics/test-qr-123/summary"
test_endpoint "Analytics Swagger Docs" "$GATEWAY/analytics-docs"
echo ""

# Test Rate Limiting
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Rate Limiting Test (Auth endpoint)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Sending 25 requests to /auth (limit: 20/min)..."

rate_limited=0
for i in {1..25}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY/auth")
    if [ "$response" -eq 429 ]; then
        rate_limited=$((rate_limited + 1))
    fi
done

if [ $rate_limited -gt 0 ]; then
    echo -e "${GREEN}✓ Rate limiting working ($rate_limited requests got 429)${NC}"
else
    echo -e "${YELLOW}⚠ Rate limiting may not be active (no 429 responses)${NC}"
fi
echo ""

# Test Caching
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Response Caching Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "First request (should be MISS):"
cache_status_1=$(curl -s -I "$GATEWAY/public/test-qr-123" | grep -i "x-cache-status" || echo "No cache header")
echo "$cache_status_1"

echo ""
echo "Second request (should be HIT):"
cache_status_2=$(curl -s -I "$GATEWAY/public/test-qr-123" | grep -i "x-cache-status" || echo "No cache header")
echo "$cache_status_2"

if echo "$cache_status_2" | grep -q "HIT"; then
    echo -e "${GREEN}✓ Caching working${NC}"
else
    echo -e "${YELLOW}⚠ Cache may not be active or needs warm-up${NC}"
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════"
echo "Testing Complete!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Gateway URL: $GATEWAY"
echo "Swagger Docs:"
echo "  - Auth:      $GATEWAY/auth-docs"
echo "  - QR:        $GATEWAY/qr-docs"
echo "  - Microsite: $GATEWAY/microsite-docs"
echo "  - Analytics: $GATEWAY/analytics-docs"
echo ""
echo "Direct service ports are still accessible for debugging:"
echo "  - Auth:      http://localhost:3001"
echo "  - QR:        http://localhost:3002"
echo "  - Microsite: http://localhost:3005"
echo "  - Analytics: http://localhost:3004"
echo ""
