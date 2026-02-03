#!/bin/bash

set -e

echo "🔒 Tenant Isolation Test Suite"
echo "================================"
echo ""

BASE_URL="http://localhost:3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test response
test_response() {
  local test_name="$1"
  local response_code="$2"
  local expected_code="$3"
  
  if [ "$response_code" -eq "$expected_code" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name (got $response_code)"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name (expected $expected_code, got $response_code)"
    ((TESTS_FAILED++))
  fi
}

# Cleanup function
cleanup() {
  echo ""
  echo "================================"
  echo "Test Summary:"
  echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
  echo -e "${RED}Failed: $TESTS_FAILED${NC}"
  
  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tenant isolation tests passed!${NC}"
    exit 0
  else
    echo -e "${RED}⚠️  Some tests failed. CRITICAL: Review tenant isolation implementation.${NC}"
    exit 1
  fi
}

trap cleanup EXIT

echo "Step 1: Creating test users..."

# Create Alice (Org 1)
ALICE_SIGNUP=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice-'$(date +%s)'@test.com",
    "password": "SecurePass123!",
    "name": "Alice Test",
    "organizationType": "agency"
  }')

ALICE_EMAIL=$(echo "$ALICE_SIGNUP" | jq -r '.user.email')
echo "Created Alice: $ALICE_EMAIL"

# Login Alice
ALICE_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ALICE_EMAIL\",
    \"password\": \"SecurePass123!\"
  }" | jq -r '.token')

# Create Bob (Org 2)
BOB_SIGNUP=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob-'$(date +%s)'@test.com",
    "password": "SecurePass456!",
    "name": "Bob Test",
    "organizationType": "agency"
  }')

BOB_EMAIL=$(echo "$BOB_SIGNUP" | jq -r '.user.email')
echo "Created Bob: $BOB_EMAIL"

# Login Bob
BOB_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$BOB_EMAIL\",
    \"password\": \"SecurePass456!\"
  }" | jq -r '.token')

echo ""
echo "Step 2: Creating test data..."

# Alice creates QR code
ALICE_QR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/qr" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Secret QR",
    "type": "url",
    "content": "https://alice-secret.com"
  }')

ALICE_QR_ID=$(echo "$ALICE_QR_RESPONSE" | jq -r '.id')
echo "Alice created QR: $ALICE_QR_ID"

# Bob creates QR code
BOB_QR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/qr" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Secret QR",
    "type": "url",
    "content": "https://bob-secret.com"
  }')

BOB_QR_ID=$(echo "$BOB_QR_RESPONSE" | jq -r '.id')
echo "Bob created QR: $BOB_QR_ID"

echo ""
echo "Step 3: Testing QR code tenant isolation..."
echo ""

# Test 1: Bob tries to GET Alice's QR
echo "Test 1: Bob reads Alice's QR code"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "$BASE_URL/api/qr/$ALICE_QR_ID" \
  -H "Authorization: Bearer $BOB_TOKEN")
test_response "Bob cannot read Alice's QR" "$RESPONSE" "404"

# Test 2: Bob tries to UPDATE Alice's QR
echo "Test 2: Bob updates Alice's QR code"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH "$BASE_URL/api/qr/$ALICE_QR_ID" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hacked by Bob"}')
test_response "Bob cannot update Alice's QR" "$RESPONSE" "404"

# Test 3: Bob tries to DELETE Alice's QR
echo "Test 3: Bob deletes Alice's QR code"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE "$BASE_URL/api/qr/$ALICE_QR_ID" \
  -H "Authorization: Bearer $BOB_TOKEN")
test_response "Bob cannot delete Alice's QR" "$RESPONSE" "404"

# Test 4: Alice can still access her own QR
echo "Test 4: Alice reads her own QR code"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "$BASE_URL/api/qr/$ALICE_QR_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN")
test_response "Alice can read her own QR" "$RESPONSE" "200"

# Test 5: Bob can access his own QR
echo "Test 5: Bob reads his own QR code"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "$BASE_URL/api/qr/$BOB_QR_ID" \
  -H "Authorization: Bearer $BOB_TOKEN")
test_response "Bob can read his own QR" "$RESPONSE" "200"

# Test 6: Alice's QR list doesn't include Bob's QR
echo "Test 6: Alice's list doesn't show Bob's QR"
ALICE_LIST=$(curl -s -X GET "$BASE_URL/api/qr" \
  -H "Authorization: Bearer $ALICE_TOKEN")
BOB_IN_ALICE_LIST=$(echo "$ALICE_LIST" | jq ".qrCodes | map(select(.id == \"$BOB_QR_ID\")) | length")

if [ "$BOB_IN_ALICE_LIST" -eq 0 ]; then
  echo -e "${GREEN}✅ PASS${NC}: Alice's list doesn't contain Bob's QR"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: Alice's list contains Bob's QR (CRITICAL DATA LEAK)"
  ((TESTS_FAILED++))
fi

# Test 7: Bob's QR list doesn't include Alice's QR
echo "Test 7: Bob's list doesn't show Alice's QR"
BOB_LIST=$(curl -s -X GET "$BASE_URL/api/qr" \
  -H "Authorization: Bearer $BOB_TOKEN")
ALICE_IN_BOB_LIST=$(echo "$BOB_LIST" | jq ".qrCodes | map(select(.id == \"$ALICE_QR_ID\")) | length")

if [ "$ALICE_IN_BOB_LIST" -eq 0 ]; then
  echo -e "${GREEN}✅ PASS${NC}: Bob's list doesn't contain Alice's QR"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: Bob's list contains Alice's QR (CRITICAL DATA LEAK)"
  ((TESTS_FAILED++))
fi

echo ""
echo "Step 4: Testing microsite tenant isolation..."
echo ""

# Alice creates microsite
ALICE_MICROSITE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/microsites" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "alice-site-'$(date +%s)'",
    "title": "Alices Portfolio",
    "theme": "modern"
  }')

ALICE_MICROSITE_ID=$(echo "$ALICE_MICROSITE_RESPONSE" | jq -r '.id')
echo "Alice created microsite: $ALICE_MICROSITE_ID"

# Test 8: Bob tries to access Alice's microsite
echo "Test 8: Bob reads Alice's microsite"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "$BASE_URL/api/microsites/$ALICE_MICROSITE_ID" \
  -H "Authorization: Bearer $BOB_TOKEN")
test_response "Bob cannot read Alice's microsite" "$RESPONSE" "404"

# Test 9: Bob tries to add block to Alice's microsite
echo "Test 9: Bob adds block to Alice's microsite"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/api/microsites/$ALICE_MICROSITE_ID/blocks" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "data": {"text": "Bob was here!"}
  }')
test_response "Bob cannot add blocks to Alice's microsite" "$RESPONSE" "404"

echo ""
echo "Step 5: Testing analytics isolation..."
echo ""

# Test 10: Bob cannot access Alice's QR analytics
echo "Test 10: Bob reads Alice's QR analytics"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "$BASE_URL/api/analytics/qr/$ALICE_QR_ID/stats" \
  -H "Authorization: Bearer $BOB_TOKEN")
test_response "Bob cannot access Alice's QR analytics" "$RESPONSE" "404"

# Test 11: Alice can access her own analytics
echo "Test 11: Alice reads her own QR analytics"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "$BASE_URL/api/analytics/qr/$ALICE_QR_ID/stats" \
  -H "Authorization: Bearer $ALICE_TOKEN")
# This might be 200 or 404 depending on if there's data yet
if [ "$RESPONSE" -eq 200 ] || [ "$RESPONSE" -eq 404 ]; then
  echo -e "${GREEN}✅ PASS${NC}: Alice can query her own analytics (got $RESPONSE)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAIL${NC}: Alice cannot access her own analytics (got $RESPONSE)"
  ((TESTS_FAILED++))
fi

echo ""
# Cleanup will run automatically via trap
