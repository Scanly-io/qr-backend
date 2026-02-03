# Tenant Isolation Testing Guide

## 🔒 Multi-Tenant Security Testing

This guide tests that User A cannot access User B's data across all services.

---

## What is Tenant Isolation?

**Tenant isolation** ensures that each organization's data is completely separate:
- ✅ User A (Org 1) can ONLY see Org 1's QR codes
- ✅ User B (Org 2) can ONLY see Org 2's QR codes
- ❌ User A cannot access/modify User B's data
- ❌ SQL injection cannot bypass organization filters

---

## Current Tenant Architecture

### How Tenancy Works

**1. Organization ID in JWT Token:**
```typescript
// auth-service creates JWT with organizationId
const token = jwt.sign({
  userId: user.id,
  email: user.email,
  organizationId: user.organizationId, // 🔑 KEY FIELD
  role: user.role,
}, JWT_SECRET);
```

**2. Gateway Extracts Organization:**
```typescript
// tenant-gateway/src/middleware/tenant.ts
export function addTenantHeaders(request: FastifyRequest) {
  const user = (request as any).user;
  
  if (user?.organizationId) {
    request.headers['x-organization-id'] = user.organizationId;
    request.headers['x-user-id'] = user.userId;
  }
}
```

**3. Services Filter by Organization:**
```typescript
// Example: QR service queries
const qrCodes = await db.query.qrCodes.findMany({
  where: eq(qrCodes.organizationId, request.headers['x-organization-id'])
});
```

### Risks to Test

1. **Missing WHERE clause** - Service forgets to filter by organizationId
2. **JWT manipulation** - Attacker changes organizationId in token
3. **Header injection** - Attacker sends fake x-organization-id header
4. **SQL injection** - Attacker bypasses organization filter
5. **API parameter tampering** - User A sends User B's resource ID

---

## Test Scenarios

### Scenario 1: QR Code Isolation ✅ CRITICAL

**Test:** User A cannot view/edit User B's QR codes

**Setup:**
```bash
# Create two test organizations and users
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@org1.com",
    "password": "SecurePass123!",
    "name": "Alice",
    "organizationType": "agency"
  }'

curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@org2.com",
    "password": "SecurePass456!",
    "name": "Bob",
    "organizationType": "agency"
  }'
```

**Test Steps:**

1. **Alice creates a QR code:**
```bash
# Login as Alice
ALICE_TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@org1.com","password":"SecurePass123!"}' \
  | jq -r '.token')

echo "Alice token: $ALICE_TOKEN"

# Create QR code as Alice
ALICE_QR=$(curl -X POST http://localhost:3000/api/qr \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alices Secret QR",
    "type": "url",
    "content": "https://alice-secret.com"
  }' | jq -r '.id')

echo "Alice QR ID: $ALICE_QR"
```

2. **Bob tries to access Alice's QR code:**
```bash
# Login as Bob
BOB_TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@org2.com","password":"SecurePass456!"}' \
  | jq -r '.token')

echo "Bob token: $BOB_TOKEN"

# Bob tries to GET Alice's QR code
curl -X GET "http://localhost:3000/api/qr/$ALICE_QR" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -v

# Expected: 404 Not Found or 403 Forbidden
# Actual: ___________ (FILL IN)
```

3. **Bob tries to UPDATE Alice's QR code:**
```bash
curl -X PATCH "http://localhost:3000/api/qr/$ALICE_QR" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob hacked this!",
    "content": "https://bob-evil.com"
  }' \
  -v

# Expected: 404 Not Found or 403 Forbidden
# Actual: ___________ (FILL IN)
```

4. **Bob tries to DELETE Alice's QR code:**
```bash
curl -X DELETE "http://localhost:3000/api/qr/$ALICE_QR" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -v

# Expected: 404 Not Found or 403 Forbidden
# Actual: ___________ (FILL IN)
```

**✅ PASS Criteria:**
- Bob gets 404 or 403 on all requests
- Alice can still access her QR code
- No data leakage in error messages

---

### Scenario 2: Microsite Isolation ✅ CRITICAL

**Test:** User A cannot view/edit User B's microsites

```bash
# Alice creates microsite
ALICE_MICROSITE=$(curl -X POST http://localhost:3000/api/microsites \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "alice-site",
    "title": "Alices Portfolio",
    "theme": "modern"
  }' | jq -r '.id')

# Bob tries to access Alice's microsite (authenticated endpoint)
curl -X GET "http://localhost:3000/api/microsites/$ALICE_MICROSITE" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -v

# Expected: 404 Not Found or 403 Forbidden
# Actual: ___________

# Bob tries to add a block to Alice's microsite
curl -X POST "http://localhost:3000/api/microsites/$ALICE_MICROSITE/blocks" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "data": {"text": "Bob was here!"}
  }' \
  -v

# Expected: 404 Not Found or 403 Forbidden
# Actual: ___________
```

**✅ PASS Criteria:**
- Bob cannot read Alice's microsite
- Bob cannot modify Alice's microsite
- Public microsite view (unauthenticated) still works

---

### Scenario 3: Analytics Data Isolation ✅ HIGH

**Test:** User A cannot see User B's analytics

```bash
# Alice gets her analytics
curl -X GET "http://localhost:3000/api/analytics/qr/$ALICE_QR/stats" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -v

# Expected: Alice's QR stats
# Actual: ___________

# Bob tries to get Alice's QR analytics
curl -X GET "http://localhost:3000/api/analytics/qr/$ALICE_QR/stats" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -v

# Expected: 404 Not Found or 403 Forbidden
# Actual: ___________
```

---

### Scenario 4: JWT Token Manipulation ⚠️ CRITICAL

**Test:** Attacker cannot change organizationId in JWT

```bash
# Get Alice's token
echo $ALICE_TOKEN

# Decode JWT (won't work - needs secret)
# Try to decode at https://jwt.io
# Attempt to change organizationId
# Re-encode with different secret

# Send modified token
curl -X GET http://localhost:3000/api/qr \
  -H "Authorization: Bearer <MODIFIED_TOKEN>" \
  -v

# Expected: 401 Unauthorized (invalid signature)
# Actual: ___________
```

**✅ PASS Criteria:**
- Modified JWT rejected
- No access granted
- Error message doesn't leak JWT_SECRET

---

### Scenario 5: Header Injection Attack ⚠️ CRITICAL

**Test:** Attacker cannot inject fake x-organization-id header

```bash
# Bob tries to inject Alice's organization ID via header
curl -X GET http://localhost:3000/api/qr \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "x-organization-id: <ALICE_ORG_ID>" \
  -v

# Expected: Bob only sees his own QR codes (header ignored)
# Actual: ___________
```

**Implementation Fix (if vulnerable):**
```typescript
// services/tenant-gateway/src/middleware/tenant.ts
export function addTenantHeaders(request: FastifyRequest) {
  // ALWAYS extract from JWT, NEVER from user-provided headers
  const user = (request as any).user;
  
  // 🚨 SECURITY: Delete any user-provided organization headers
  delete request.headers['x-organization-id'];
  delete request.headers['x-user-id'];
  
  // Only set from JWT
  if (user?.organizationId) {
    request.headers['x-organization-id'] = user.organizationId;
    request.headers['x-user-id'] = user.userId;
  }
}
```

---

### Scenario 6: SQL Injection Bypass ⚠️ CRITICAL

**Test:** SQL injection cannot bypass organization filter

```bash
# Attempt SQL injection in QR code name
curl -X POST http://localhost:3000/api/qr \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test OR 1=1; DROP TABLE qr_codes; --",
    "type": "url",
    "content": "https://evil.com"
  }' \
  -v

# Expected: 400 Validation Error (input validation blocks it)
# Actual: ___________

# Try to bypass organization filter
curl -X GET "http://localhost:3000/api/qr?organizationId=<ALICE_ORG_ID>" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -v

# Expected: Query parameter ignored, only Bob's QR codes shown
# Actual: ___________
```

---

### Scenario 7: Cross-Organization Bulk Operations ⚠️ MEDIUM

**Test:** Bulk operations don't leak cross-tenant data

```bash
# Bob tries to bulk delete with Alice's QR IDs mixed in
curl -X POST http://localhost:3000/api/qr/bulk-delete \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ids\": [\"$ALICE_QR\", \"$BOB_QR_1\", \"$BOB_QR_2\"]
  }" \
  -v

# Expected: Only Bob's QR codes deleted, Alice's ignored/404
# Actual: ___________
```

---

## Automated Test Script

Create: `scripts/test-tenant-isolation.sh`

```bash
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
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
  else
    echo -e "${RED}⚠️  Some tests failed. Review security implementation.${NC}"
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
echo "Step 3: Testing tenant isolation..."
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
  echo -e "${RED}❌ FAIL${NC}: Alice's list contains Bob's QR (CRITICAL LEAK)"
  ((TESTS_FAILED++))
fi

# Test 7: Header injection attack
echo "Test 7: Header injection protection"
# This would need Alice's org ID - skipping for now
# Would test: Bob sends x-organization-id header with Alice's org ID

echo ""
echo "Step 4: Testing analytics isolation..."

# Test 8: Bob cannot access Alice's analytics
echo "Test 8: Bob reads Alice's analytics"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "$BASE_URL/api/analytics/qr/$ALICE_QR_ID/stats" \
  -H "Authorization: Bearer $BOB_TOKEN")
test_response "Bob cannot access Alice's analytics" "$RESPONSE" "404"

echo ""
# Cleanup will run automatically
```

Make executable:
```bash
chmod +x scripts/test-tenant-isolation.sh
```

---

## Code Review Checklist

### ✅ Items to Verify in Code

**1. All database queries include organization filter:**
```typescript
// ✅ GOOD
const qrCodes = await db.query.qrCodes.findMany({
  where: eq(qrCodes.organizationId, request.headers['x-organization-id'])
});

// ❌ BAD (missing organizationId filter)
const qrCodes = await db.query.qrCodes.findMany();
```

**2. Gateway always extracts org from JWT (never from user headers):**
```typescript
// ✅ GOOD
const organizationId = user.organizationId; // from JWT

// ❌ BAD (trusts user input)
const organizationId = request.headers['x-organization-id'];
```

**3. Update/Delete operations verify ownership:**
```typescript
// ✅ GOOD
const qr = await db.query.qrCodes.findFirst({
  where: and(
    eq(qrCodes.id, qrId),
    eq(qrCodes.organizationId, orgId) // 🔑 Ownership check
  )
});

if (!qr) {
  return reply.status(404).send({ error: 'Not found' });
}

// Proceed with update/delete

// ❌ BAD (no ownership check)
await db.delete(qrCodes).where(eq(qrCodes.id, qrId));
```

**4. List endpoints filter by organization:**
```typescript
// ✅ GOOD
const qrCodes = await db.query.qrCodes.findMany({
  where: eq(qrCodes.organizationId, orgId)
});

// ❌ BAD (returns all QR codes from all orgs)
const qrCodes = await db.query.qrCodes.findMany();
```

**5. Error messages don't leak data:**
```typescript
// ✅ GOOD
return reply.status(404).send({ error: 'Not found' });

// ❌ BAD (leaks existence of resource)
return reply.status(403).send({ 
  error: 'You do not have access to QR code ABC123 owned by Organization XYZ' 
});
```

---

## Remediation Steps

### If Tests Fail

**Missing organizationId filters:**
1. Find all database queries in affected service
2. Add `eq(table.organizationId, orgId)` to WHERE clause
3. Re-run tests

**Header injection vulnerability:**
1. Update `tenant.ts` middleware to delete user-provided org headers
2. Only set headers from JWT payload
3. Re-run tests

**JWT manipulation:**
1. Ensure JWT_SECRET is strong (not the hardcoded one we just fixed!)
2. Verify JWT verification happens in gateway
3. Check that modified tokens are rejected

---

## Monitoring in Production

### Set up alerts for:

1. **404 spike** - Could indicate cross-tenant access attempts
2. **403 spike** - Explicit permission denials
3. **Multiple org IDs per user** - Token manipulation attempt
4. **Mismatched x-organization-id headers** - Header injection attempt

### Log these events:
```typescript
logger.warn({
  event: 'tenant_isolation_violation',
  userId: user.userId,
  attemptedOrgId: request.headers['x-organization-id'],
  actualOrgId: user.organizationId,
  resource: request.url,
});
```

---

## Success Criteria

✅ **All tests pass:**
- Bob cannot access Alice's QR codes (404)
- Bob cannot access Alice's microsites (404)
- Bob cannot access Alice's analytics (404)
- Alice can access her own resources (200)
- Bob can access his own resources (200)
- Header injection blocked
- JWT manipulation rejected

🎯 **Security score: 10/10** when all tests pass!
