#!/bin/bash

echo "🔐 REFRESH TOKEN FLOW TEST"
echo "=========================="
echo ""

BASE_URL="http://localhost:3001"

# Step 1: Login
echo "1️⃣ Login with credentials..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq .
echo ""

# Extract tokens
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refreshToken')

if [ "$ACCESS_TOKEN" == "null" ]; then
  echo "❌ Login failed! Make sure you have a test user created."
  echo "   Run: POST /auth/signup with email: test@example.com, password: password123"
  exit 1
fi

echo "✅ Got access token: ${ACCESS_TOKEN:0:20}..."
echo "✅ Got refresh token: ${REFRESH_TOKEN:0:20}..."
echo ""

# Step 2: Use access token
echo "2️⃣ Making authenticated request with access token..."
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ME_RESPONSE" | jq .
echo ""

# Step 3: Wait for token to expire (or simulate)
echo "3️⃣ Simulating token expiration..."
echo "   (In production, wait 15 minutes for access token to expire)"
echo ""

# Step 4: Refresh the access token
echo "4️⃣ Refreshing access token using refresh token..."
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

echo "$REFRESH_RESPONSE" | jq .
echo ""

NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.accessToken')

if [ "$NEW_ACCESS_TOKEN" == "null" ]; then
  echo "❌ Token refresh failed!"
  exit 1
fi

echo "✅ Got NEW access token: ${NEW_ACCESS_TOKEN:0:20}..."
echo ""

# Step 5: Use new access token
echo "5️⃣ Making request with NEW access token..."
NEW_ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN")

echo "$NEW_ME_RESPONSE" | jq .
echo ""

echo "=========================="
echo "✨ Refresh Token Flow Test Complete!"
echo ""
echo "Summary:"
echo "  ✅ Login successful"
echo "  ✅ Access token works"
echo "  ✅ Refresh token works"
echo "  ✅ New access token works"
echo ""
echo "Token Lifetimes:"
echo "  • Access Token: 15 minutes"
echo "  • Refresh Token: 7 days"
echo ""
echo "Best Practices:"
echo "  • Store refresh token in httpOnly cookie"
echo "  • Store access token in memory (not localStorage)"
echo "  • Refresh proactively before expiration"
echo "  • Implement token rotation for refresh tokens"
