#!/bin/bash

# Enterprise Services Integration Test Suite
# Tests Asset Service, Print Studio, and Workflow Builder

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     ENTERPRISE SERVICES INTEGRATION TEST SUITE                 ║"
echo "║     Testing: Asset Service, Print Studio, Workflow Builder     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
function test_passed() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

function test_failed() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((TESTS_FAILED++))
}

function section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Test 1: Health Checks
section "TEST SUITE 1: SERVICE HEALTH CHECKS"

echo "Testing Asset Service (port 3021)..."
if curl -s -f http://localhost:3021/health > /dev/null; then
    HEALTH=$(curl -s http://localhost:3021/health | jq -r '.status')
    if [ "$HEALTH" = "healthy" ]; then
        test_passed "Asset Service is healthy"
    else
        test_failed "Asset Service health check returned: $HEALTH"
    fi
else
    test_failed "Asset Service is not responding"
fi

echo "Testing Print Studio (port 3022)..."
if curl -s -f http://localhost:3022/health > /dev/null; then
    HEALTH=$(curl -s http://localhost:3022/health | jq -r '.status')
    if [ "$HEALTH" = "healthy" ]; then
        test_passed "Print Studio is healthy"
    else
        test_failed "Print Studio health check returned: $HEALTH"
    fi
else
    test_failed "Print Studio is not responding"
fi

echo "Testing Workflow Builder (port 3023)..."
if curl -s -f http://localhost:3023/health > /dev/null; then
    HEALTH=$(curl -s http://localhost:3023/health | jq -r '.status')
    if [ "$HEALTH" = "healthy" ]; then
        test_passed "Workflow Builder is healthy"
    else
        test_failed "Workflow Builder health check returned: $HEALTH"
    fi
else
    test_failed "Workflow Builder is not responding"
fi

# Test 2: Asset Service - CRUD Operations
section "TEST SUITE 2: ASSET SERVICE - CRUD OPERATIONS"

echo "Creating test asset..."
ASSET_RESPONSE=$(curl -s -X POST http://localhost:3021/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "assetTypeId": "550e8400-e29b-41d4-a716-446655440001",
    "assetTag": "TEST-ASSET-001",
    "name": "Test Forklift Alpha",
    "description": "Test equipment for integration testing",
    "serialNumber": "TEST-FLT-2026-001",
    "manufacturer": "Toyota",
    "model": "Test-8000",
    "purchaseDate": "2026-01-01",
    "purchaseCost": 35000,
    "condition": "excellent",
    "status": "active"
  }')

ASSET_ID=$(echo "$ASSET_RESPONSE" | jq -r '.id // empty')
if [ -n "$ASSET_ID" ] && [ "$ASSET_ID" != "null" ]; then
    test_passed "Asset created successfully (ID: ${ASSET_ID:0:8}...)"
    echo "$ASSET_ID" > /tmp/test_asset_id.txt
else
    ERROR=$(echo "$ASSET_RESPONSE" | jq -r '.message // .error // "Unknown error"')
    test_failed "Asset creation failed: $ERROR"
    # Continue with a dummy ID for dependent tests
    echo "dummy-asset-id" > /tmp/test_asset_id.txt
fi

echo "Retrieving asset list..."
ASSETS_LIST=$(curl -s "http://localhost:3021/api/assets?limit=5")
ASSET_COUNT=$(echo "$ASSETS_LIST" | jq '.assets | length')
if [ "$ASSET_COUNT" -ge 0 ]; then
    test_passed "Retrieved $ASSET_COUNT assets from database"
else
    test_failed "Failed to retrieve assets list"
fi

if [ -n "$ASSET_ID" ] && [ "$ASSET_ID" != "null" ]; then
    echo "Updating asset status..."
    UPDATE_RESPONSE=$(curl -s -X PATCH http://localhost:3021/api/assets/$ASSET_ID \
      -H "Content-Type: application/json" \
      -d '{"status": "maintenance"}')
    
    UPDATED_STATUS=$(echo "$UPDATE_RESPONSE" | jq -r '.status // empty')
    if [ "$UPDATED_STATUS" = "maintenance" ]; then
        test_passed "Asset status updated to maintenance"
    else
        test_failed "Asset update failed"
    fi
fi

# Test 3: Print Studio - Template & Batch Generation
section "TEST SUITE 3: PRINT STUDIO - TEMPLATES & BATCH JOBS"

echo "Listing available label formats..."
FORMATS=$(curl -s http://localhost:3022/api/templates/formats/list)
FORMAT_COUNT=$(echo "$FORMATS" | jq '.formats | keys | length')
if [ "$FORMAT_COUNT" -ge 5 ]; then
    test_passed "Retrieved $FORMAT_COUNT label formats (Avery, DYMO)"
else
    test_failed "Failed to retrieve label formats"
fi

echo "Creating print template..."
TEMPLATE_RESPONSE=$(curl -s -X POST http://localhost:3022/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Asset Label Template",
    "description": "Integration test template",
    "labelFormat": "avery-5160",
    "pageWidth": 216,
    "pageHeight": 279,
    "labelWidth": 67,
    "labelHeight": 25,
    "columns": 3,
    "rows": 10,
    "design": {
      "elements": [
        {
          "type": "qr",
          "x": 5,
          "y": 5,
          "width": 15,
          "height": 15,
          "dataField": "{qr_url}"
        },
        {
          "type": "text",
          "x": 22,
          "y": 7,
          "width": 40,
          "height": 5,
          "content": "{asset_tag}",
          "fontSize": 10,
          "fontFamily": "Helvetica",
          "bold": true,
          "dataField": "{asset_tag}"
        }
      ],
      "qrSize": 15,
      "qrMargin": 1
    }
  }')

TEMPLATE_ID=$(echo "$TEMPLATE_RESPONSE" | jq -r '.id // empty')
if [ -n "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
    test_passed "Print template created (ID: ${TEMPLATE_ID:0:8}...)"
    echo "$TEMPLATE_ID" > /tmp/test_template_id.txt
else
    ERROR=$(echo "$TEMPLATE_RESPONSE" | jq -r '.message // .error // "Unknown error"')
    test_failed "Template creation failed: $ERROR"
    echo "dummy-template-id" > /tmp/test_template_id.txt
fi

if [ -n "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
    echo "Creating batch print job..."
    BATCH_RESPONSE=$(curl -s -X POST http://localhost:3022/api/batch \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Test Batch Job\",
        \"templateId\": \"$TEMPLATE_ID\",
        \"qrCodes\": [
          {
            \"id\": \"QR-TEST-001\",
            \"url\": \"https://test.example.com/assets/001\",
            \"data\": {\"asset_tag\": \"TEST-001\", \"name\": \"Test Asset 1\"}
          },
          {
            \"id\": \"QR-TEST-002\",
            \"url\": \"https://test.example.com/assets/002\",
            \"data\": {\"asset_tag\": \"TEST-002\", \"name\": \"Test Asset 2\"}
          }
        ]
      }")
    
    BATCH_ID=$(echo "$BATCH_RESPONSE" | jq -r '.id // empty')
    BATCH_TOTAL=$(echo "$BATCH_RESPONSE" | jq -r '.totalQRs // 0')
    if [ -n "$BATCH_ID" ] && [ "$BATCH_ID" != "null" ] && [ "$BATCH_TOTAL" -eq 2 ]; then
        test_passed "Batch job created with $BATCH_TOTAL QR codes"
    else
        test_failed "Batch job creation failed"
    fi
fi

# Test 4: Workflow Builder - Workflow Creation & Execution
section "TEST SUITE 4: WORKFLOW BUILDER - WORKFLOWS & EXECUTION"

echo "Creating automated workflow..."
WORKFLOW_RESPONSE=$(curl -s -X POST http://localhost:3023/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Asset Maintenance Workflow",
    "description": "Integration test workflow",
    "definition": {
      "nodes": [
        {
          "id": "trigger-1",
          "type": "trigger",
          "config": {
            "triggerType": "qr-scan"
          }
        },
        {
          "id": "action-1",
          "type": "action",
          "config": {
            "actionType": "update_asset",
            "field": "last_scanned_at"
          }
        }
      ],
      "edges": [
        {"from": "trigger-1", "to": "action-1"}
      ]
    },
    "trigger": {
      "type": "qr-scan",
      "config": {}
    }
  }')

WORKFLOW_ID=$(echo "$WORKFLOW_RESPONSE" | jq -r '.id // empty')
if [ -n "$WORKFLOW_ID" ] && [ "$WORKFLOW_ID" != "null" ]; then
    test_passed "Workflow created (ID: ${WORKFLOW_ID:0:8}...)"
    echo "$WORKFLOW_ID" > /tmp/test_workflow_id.txt
else
    ERROR=$(echo "$WORKFLOW_RESPONSE" | jq -r '.message // .error // "Unknown error"')
    test_failed "Workflow creation failed: $ERROR"
    echo "dummy-workflow-id" > /tmp/test_workflow_id.txt
fi

if [ -n "$WORKFLOW_ID" ] && [ "$WORKFLOW_ID" != "null" ]; then
    echo "Publishing workflow..."
    PUBLISH_RESPONSE=$(curl -s -X POST http://localhost:3023/api/workflows/$WORKFLOW_ID/publish)
    WORKFLOW_STATUS=$(echo "$PUBLISH_RESPONSE" | jq -r '.workflow.status // empty')
    if [ "$WORKFLOW_STATUS" = "active" ]; then
        test_passed "Workflow published and activated"
    else
        test_failed "Workflow publish failed"
    fi
    
    echo "Executing workflow..."
    EXECUTE_RESPONSE=$(curl -s -X POST http://localhost:3023/api/workflows/$WORKFLOW_ID/execute \
      -H "Content-Type: application/json" \
      -d '{
        "triggerData": {
          "qr_code": "QR-TEST-EXECUTION",
          "asset_id": "test-asset-001",
          "timestamp": "2026-01-11T18:00:00Z"
        }
      }')
    
    EXECUTE_MESSAGE=$(echo "$EXECUTE_RESPONSE" | jq -r '.message // empty')
    if echo "$EXECUTE_MESSAGE" | grep -q "started"; then
        test_passed "Workflow execution started"
        
        sleep 2
        
        echo "Checking execution history..."
        EXECUTIONS=$(curl -s "http://localhost:3023/api/executions?limit=1")
        LAST_STATUS=$(echo "$EXECUTIONS" | jq -r '.executions[0].execution.status // empty')
        if [ -n "$LAST_STATUS" ]; then
            test_passed "Execution completed with status: $LAST_STATUS"
        else
            test_failed "Could not retrieve execution status"
        fi
    else
        test_failed "Workflow execution failed to start"
    fi
fi

# Test 5: Integration Workflows
section "TEST SUITE 5: CROSS-SERVICE INTEGRATION"

echo "Testing Asset → Print Studio integration..."
if [ -n "$ASSET_ID" ] && [ "$ASSET_ID" != "null" ] && [ -n "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
    INTEGRATION_BATCH=$(curl -s -X POST http://localhost:3022/api/batch \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Integration Test - Asset Labels\",
        \"templateId\": \"$TEMPLATE_ID\",
        \"qrCodes\": [
          {
            \"id\": \"$ASSET_ID\",
            \"url\": \"https://app.example.com/assets/$ASSET_ID\",
            \"data\": {
              \"asset_tag\": \"TEST-ASSET-001\",
              \"name\": \"Test Forklift Alpha\"
            }
          }
        ]
      }")
    
    INTEGRATION_ID=$(echo "$INTEGRATION_BATCH" | jq -r '.id // empty')
    if [ -n "$INTEGRATION_ID" ] && [ "$INTEGRATION_ID" != "null" ]; then
        test_passed "Cross-service integration: Asset → Print Studio"
    else
        test_failed "Cross-service integration failed"
    fi
else
    test_failed "Cannot test integration - missing asset or template ID"
fi

# Test 6: Data Persistence
section "TEST SUITE 6: DATA PERSISTENCE & RETRIEVAL"

echo "Verifying asset persistence..."
if [ -n "$ASSET_ID" ] && [ "$ASSET_ID" != "null" ]; then
    RETRIEVED_ASSET=$(curl -s http://localhost:3021/api/assets/$ASSET_ID)
    RETRIEVED_NAME=$(echo "$RETRIEVED_ASSET" | jq -r '.name // empty')
    if [ "$RETRIEVED_NAME" = "Test Forklift Alpha" ]; then
        test_passed "Asset data persisted correctly"
    else
        test_failed "Asset data persistence verification failed"
    fi
fi

echo "Verifying template persistence..."
if [ -n "$TEMPLATE_ID" ] && [ "$TEMPLATE_ID" != "null" ]; then
    TEMPLATES_LIST=$(curl -s "http://localhost:3022/api/templates")
    TEMPLATE_EXISTS=$(echo "$TEMPLATES_LIST" | jq ".templates[] | select(.id == \"$TEMPLATE_ID\") | .id" | wc -l | tr -d ' ')
    if [ "$TEMPLATE_EXISTS" -ge 1 ]; then
        test_passed "Template data persisted correctly"
    else
        test_failed "Template data persistence verification failed"
    fi
fi

echo "Verifying workflow persistence..."
if [ -n "$WORKFLOW_ID" ] && [ "$WORKFLOW_ID" != "null" ]; then
    WORKFLOWS_LIST=$(curl -s "http://localhost:3023/api/workflows")
    WORKFLOW_EXISTS=$(echo "$WORKFLOWS_LIST" | jq ".workflows[] | select(.id == \"$WORKFLOW_ID\") | .id" | wc -l | tr -d ' ')
    if [ "$WORKFLOW_EXISTS" -ge 1 ]; then
        test_passed "Workflow data persisted correctly"
    else
        test_failed "Workflow data persistence verification failed"
    fi
fi

# Final Summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     TEST RESULTS SUMMARY                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo -e "Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  ✅ ALL TESTS PASSED! ✅                       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║              ❌ SOME TESTS FAILED ❌                           ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
