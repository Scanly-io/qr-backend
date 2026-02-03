#!/bin/bash

# Rate Limiting Test Script
# Tests the gateway rate limits to ensure they work correctly

echo "🧪 Rate Limiting Test Suite"
echo "======================================"
echo ""

GATEWAY_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Global Rate Limit (100 req/min)
echo "📊 Test 1: Global Rate Limit (100 requests/min)"
echo "Sending 105 requests rapidly..."
echo ""

success_count=0
rate_limited_count=0

for i in {1..105}; do
  response=$(curl -s -w "\n%{http_code}" -o /dev/null "$GATEWAY_URL/health" 2>&1)
  status_code=$(echo "$response" | tail -n1)
  
  if [ "$status_code" == "200" ]; then
    ((success_count++))
  elif [ "$status_code" == "429" ]; then
    ((rate_limited_count++))
    if [ $rate_limited_count -eq 1 ]; then
      echo -e "${YELLOW}⚠️  First 429 received at request #$i${NC}"
    fi
  fi
  
  # Show progress every 20 requests
  if [ $((i % 20)) -eq 0 ]; then
    echo "Progress: $i/105 requests sent..."
  fi
done

echo ""
echo "Results:"
echo -e "  ✅ Success (200): $success_count"
echo -e "  ❌ Rate Limited (429): $rate_limited_count"

if [ $rate_limited_count -gt 0 ]; then
  echo -e "${GREEN}✅ Test 1 PASSED: Rate limiting is working!${NC}"
else
  echo -e "${RED}❌ Test 1 FAILED: No rate limiting detected${NC}"
fi

echo ""
echo "======================================"
echo ""

# Wait for rate limit window to reset
echo "⏳ Waiting 60 seconds for rate limit to reset..."
sleep 60

# Test 2: Login Rate Limit (5 attempts/15min)
echo "📊 Test 2: Login Rate Limit (5 attempts/15min)"
echo "Sending 6 login attempts with wrong password..."
echo ""

success_count=0
rate_limited_count=0

for i in {1..6}; do
  response=$(curl -s -X POST "$GATEWAY_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}' \
    -w "\n%{http_code}")
  
  status_code=$(echo "$response" | tail -n1)
  
  if [ "$status_code" == "401" ] || [ "$status_code" == "400" ]; then
    ((success_count++))
    echo "  Request #$i: Authentication failed (expected)"
  elif [ "$status_code" == "429" ]; then
    ((rate_limited_count++))
    echo -e "${YELLOW}  Request #$i: Rate limited!${NC}"
    
    # Show the response body
    response_body=$(echo "$response" | head -n-1)
    echo "  Response: $response_body"
  fi
  
  sleep 1
done

echo ""
echo "Results:"
echo -e "  ✅ Auth Failures: $success_count"
echo -e "  ❌ Rate Limited: $rate_limited_count"

if [ $rate_limited_count -gt 0 ]; then
  echo -e "${GREEN}✅ Test 2 PASSED: Login rate limiting is working!${NC}"
else
  echo -e "${RED}❌ Test 2 FAILED: No login rate limiting detected${NC}"
fi

echo ""
echo "======================================"
echo ""

# Test 3: Check Rate Limit Headers
echo "📊 Test 3: Rate Limit Headers"
echo "Checking for proper rate limit headers..."
echo ""

response=$(curl -s -i "$GATEWAY_URL/health" 2>&1)

if echo "$response" | grep -q "X-RateLimit-Limit"; then
  limit=$(echo "$response" | grep "X-RateLimit-Limit" | cut -d' ' -f2 | tr -d '\r')
  remaining=$(echo "$response" | grep "X-RateLimit-Remaining" | cut -d' ' -f2 | tr -d '\r')
  reset=$(echo "$response" | grep "X-RateLimit-Reset" | cut -d' ' -f2 | tr -d '\r')
  
  echo -e "${GREEN}✅ Rate limit headers present:${NC}"
  echo "  X-RateLimit-Limit: $limit"
  echo "  X-RateLimit-Remaining: $remaining"
  echo "  X-RateLimit-Reset: $reset"
else
  echo -e "${RED}❌ Rate limit headers missing${NC}"
fi

echo ""
echo "======================================"
echo ""

# Test 4: Redis Connection
echo "📊 Test 4: Redis Connection"
echo "Checking if Redis is running..."
echo ""

if redis-cli ping > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Redis is running${NC}"
  
  # Check for rate limit keys
  key_count=$(redis-cli keys "rate-limit:*" | wc -l)
  echo "  Rate limit keys in Redis: $key_count"
  
  if [ $key_count -gt 0 ]; then
    echo ""
    echo "Sample rate limit keys:"
    redis-cli keys "rate-limit:*" | head -n 5
  fi
else
  echo -e "${RED}❌ Redis is not running or not accessible${NC}"
  echo "  Start Redis with: redis-server"
fi

echo ""
echo "======================================"
echo "🎉 Test Suite Complete!"
echo "======================================"
