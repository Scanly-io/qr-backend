#!/bin/bash

# Simple Rate Limit Test
# Tests ONLY the gateway's rate limiting on the /health endpoint

GATEWAY_URL="http://localhost:3000"

echo "🧪 Testing Rate Limiting on Gateway"
echo "======================================"
echo ""
echo "Gateway URL: $GATEWAY_URL"
echo "Testing /health endpoint (no backend services needed)"
echo ""

# Test 1: Check if gateway is running
echo "1️⃣  Checking if gateway is running..."
if curl -s "$GATEWAY_URL/health" > /dev/null 2>&1; then
  echo "✅ Gateway is running!"
else
  echo "❌ Gateway is NOT running on port 3000"
  echo "   Start it with: cd services/tenant-gateway && npx tsx src/index.ts"
  exit 1
fi

echo ""

# Test 2: Check rate limit headers
echo "2️⃣  Checking rate limit headers..."
response=$(curl -si "$GATEWAY_URL/health" 2>&1)

if echo "$response" | grep -q "x-ratelimit-limit"; then
  limit=$(echo "$response" | grep -i "x-ratelimit-limit" | cut -d' ' -f2 | tr -d '\r')
  remaining=$(echo "$response" | grep -i "x-ratelimit-remaining" | cut -d' ' -f2 | tr -d '\r')
  echo "✅ Rate limit headers present:"
  echo "   Limit: $limit requests"
  echo "   Remaining: $remaining requests"
else
  echo "❌ Rate limit headers NOT found"
  echo "   This might mean rate limiting isn't working"
fi

echo ""

# Test 3: Send 105 requests to trigger rate limit
echo "3️⃣  Sending 105 requests to test rate limiting..."
echo "   (Limit is 100/min, so #101-105 should get 429)"
echo ""

success=0
limited=0
first_429=0

for i in {1..105}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/health" 2>&1)
  
  if [ "$status" == "200" ]; then
    ((success++))
  elif [ "$status" == "429" ]; then
    ((limited++))
    if [ $limited -eq 1 ]; then
      first_429=$i
      echo "   ⚠️  First 429 at request #$i"
      
      # Show the 429 response
      response_429=$(curl -s "$GATEWAY_URL/health" 2>&1)
      echo "   Response: $response_429"
    fi
  fi
  
  # Progress indicator
  if [ $((i % 25)) -eq 0 ]; then
    echo "   Progress: $i/105 (Success: $success, Limited: $limited)"
  fi
done

echo ""
echo "======================================"
echo "📊 Results:"
echo "   ✅ Successful (200): $success"
echo "   ❌ Rate Limited (429): $limited"
echo ""

if [ $limited -gt 0 ]; then
  echo "🎉 SUCCESS! Rate limiting is working!"
  echo "   First 429 appeared at request #$first_429"
  echo "   Expected: ~100, Actual: $first_429"
else
  echo "⚠️  WARNING: No rate limiting detected"
  echo "   All 105 requests succeeded"
  echo "   Check Redis connection and middleware"
fi

echo "======================================"
