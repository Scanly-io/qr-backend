#!/bin/bash

# Test Input Validation Security
# Tests protection against JSONB injection, XSS, and malformed data

GATEWAY="http://localhost:3000"
TENANT_ID="test-tenant-123"

echo "🧪 Testing Input Validation Security"
echo "======================================"
echo ""

# Test 1: Script injection in name field
echo "Test 1: XSS in name field (should REJECT)"
curl -s -X POST "$GATEWAY/api/auth/signup" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "<script>alert(\"xss\")</script>"
  }' | jq '.'
echo ""

# Test 2: SQL injection attempt in email
echo "Test 2: SQL injection in email (should REJECT)"
curl -s -X POST "$GATEWAY/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "email": "admin@example.com OR 1=1--",
    "password": "password"
  }' | jq '.'
echo ""

# Test 3: Weak password (should REJECT)
echo "Test 3: Weak password (should REJECT)"
curl -s -X POST "$GATEWAY/api/auth/signup" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "email": "test@example.com",
    "password": "weak",
    "name": "Test User"
  }' | jq '.'
echo ""

# Test 4: Invalid hex color in white-label
echo "Test 4: Invalid hex color (should REJECT)"
curl -s -X PATCH "$GATEWAY/api/auth/agencies/test-agency/white-label" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "primaryColor": "red",
    "logo": "https://example.com/logo.png"
  }' | jq '.'
echo ""

# Test 5: Deeply nested metadata (DoS attempt - should REJECT)
echo "Test 5: Deeply nested metadata - DoS attempt (should REJECT)"
curl -s -X POST "$GATEWAY/api/qr" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "name": "Test QR",
    "type": "url",
    "data": "https://example.com",
    "metadata": {
      "level1": {
        "level2": {
          "level3": {
            "level4": {
              "level5": {
                "level6": {
                  "level7": "too deep"
                }
              }
            }
          }
        }
      }
    }
  }' | jq '.'
echo ""

# Test 6: Script injection in JSONB metadata
echo "Test 6: Script injection in metadata (should REJECT)"
curl -s -X POST "$GATEWAY/api/microsites/test-microsite/leads" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "micrositeId": "550e8400-e29b-41d4-a716-446655440000",
    "blockId": "550e8400-e29b-41d4-a716-446655440001",
    "data": {
      "name": "Test",
      "email": "test@example.com",
      "message": "Click here: <script>alert(\"gotcha\")</script>"
    }
  }' | jq '.'
echo ""

# Test 7: Prototype pollution attempt (should REJECT)
echo "Test 7: Prototype pollution (should be sanitized)"
curl -s -X POST "$GATEWAY/api/qr" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "name": "Test QR",
    "type": "url",
    "data": "https://example.com",
    "metadata": {
      "__proto__": {
        "admin": true
      }
    }
  }' | jq '.'
echo ""

# Test 8: Too many custom fields (should REJECT)
echo "Test 8: Too many custom fields - DoS attempt (should REJECT)"
curl -s -X POST "$GATEWAY/api/microsites/test-microsite/blocks" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "type": "custom",
    "order": 1,
    "data": {
      "customFields": {
        "f1": "v1", "f2": "v2", "f3": "v3", "f4": "v4", "f5": "v5",
        "f6": "v6", "f7": "v7", "f8": "v8", "f9": "v9", "f10": "v10",
        "f11": "v11", "f12": "v12", "f13": "v13", "f14": "v14", "f15": "v15",
        "f16": "v16", "f17": "v17", "f18": "v18", "f19": "v19", "f20": "v20",
        "f21": "v21"
      }
    }
  }' | jq '.'
echo ""

# Test 9: Invalid UUID format
echo "Test 9: Invalid UUID format (should REJECT)"
curl -s -X GET "$GATEWAY/api/qr/not-a-uuid" \
  -H "X-Tenant-ID: $TENANT_ID" | jq '.'
echo ""

# Test 10: Malicious CSS injection in white-label
echo "Test 10: Malicious CSS (should REJECT)"
curl -s -X PATCH "$GATEWAY/api/auth/agencies/test-agency/white-label" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -d '{
    "customCss": "body { background: red; } <script>alert(\"xss\")</script>",
    "primaryColor": "#FF0000"
  }' | jq '.'
echo ""

# Test 11: Valid input (should ACCEPT)
echo "Test 11: Valid input (should ACCEPT)"
curl -s -X POST "$GATEWAY/api/qr" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Authorization: Bearer fake-token-for-testing" \
  -d '{
    "name": "My QR Code",
    "type": "url",
    "data": "https://example.com",
    "tags": ["marketing", "campaign-2024"],
    "metadata": {
      "campaign": "summer-sale",
      "source": "instagram"
    }
  }' | jq '.'
echo ""

echo "✅ Validation tests complete!"
echo ""
echo "Expected results:"
echo "- Tests 1-10 should show validation errors (400 Bad Request)"
echo "- Test 11 should succeed (or fail with auth error, not validation error)"
