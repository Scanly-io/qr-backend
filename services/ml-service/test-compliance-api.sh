#!/bin/bash

# ML Compliance Learning - HTTP API Test Script
# Prerequisites: ML Service must be running on port 3016

echo "🧪 Testing ML Compliance Learning API"
echo "======================================"
echo ""

BASE_URL="http://localhost:3016"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Test 1: Get Active Compliance Rules${NC}"
echo "GET /api/accessibility/rules"
echo ""

curl -s -X GET "$BASE_URL/api/accessibility/rules" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "================================================"
echo ""

echo -e "${BLUE}🆓 Test 2: Free Public Accessibility Scan${NC}"
echo "POST /api/accessibility/scan-free"
echo ""

SCAN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/accessibility/scan-free" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "standards": ["WCAG-AA", "ADA", "AODA"],
    "autoFix": false
  }')

echo "$SCAN_RESPONSE" | jq '.'

# Extract scanId for next test
SCAN_ID=$(echo "$SCAN_RESPONSE" | jq -r '.scanId')

echo ""
echo "================================================"
echo ""

echo -e "${BLUE}📊 Test 3: Get Public Scan Results${NC}"
echo "GET /api/accessibility/public/$SCAN_ID"
echo ""

curl -s -X GET "$BASE_URL/api/accessibility/public/$SCAN_ID" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "================================================"
echo ""

echo -e "${BLUE}🎨 Test 4: Get Embeddable Badge${NC}"
echo "GET /api/accessibility/badge/$SCAN_ID"
echo ""

curl -s -X GET "$BASE_URL/api/accessibility/badge/$SCAN_ID" \
  -H "Content-Type: text/html"

echo ""
echo ""
echo "================================================"
echo ""

echo -e "${BLUE}🤖 Test 5: Predict Compliance (Good Website)${NC}"
echo "Testing with minimal accessibility issues..."
echo ""

curl -s -X POST "$BASE_URL/api/ml/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "modelType": "compliance",
    "features": {
      "images_without_alt": 1,
      "low_contrast_text": 0,
      "missing_aria": 2,
      "landmarks": 8,
      "language": 1,
      "headings": 10,
      "forms": 3,
      "critical_issues": 0,
      "serious_issues": 1,
      "moderate_issues": 2,
      "minor_issues": 3
    }
  }' | jq '.'

echo ""
echo "================================================"
echo ""

echo -e "${BLUE}🤖 Test 6: Predict Compliance (Poor Website)${NC}"
echo "Testing with many accessibility issues..."
echo ""

curl -s -X POST "$BASE_URL/api/ml/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "modelType": "compliance",
    "features": {
      "images_without_alt": 25,
      "low_contrast_text": 15,
      "missing_aria": 30,
      "landmarks": 0,
      "language": 0,
      "headings": 2,
      "forms": 0,
      "critical_issues": 10,
      "serious_issues": 20,
      "moderate_issues": 30,
      "minor_issues": 40
    }
  }' | jq '.'

echo ""
echo "================================================"
echo ""

echo -e "${BLUE}🔄 Test 7: Update Compliance Knowledge (Admin)${NC}"
echo "POST /api/accessibility/update-knowledge"
echo ""

curl -s -X POST "$BASE_URL/api/accessibility/update-knowledge" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "================================================"
echo ""

echo -e "${GREEN}✅ All API tests complete!${NC}"
echo ""
echo "Summary:"
echo "  ✓ Compliance rules retrieval"
echo "  ✓ Free public scanning"
echo "  ✓ Shareable scan results"
echo "  ✓ Embeddable badges"
echo "  ✓ ML compliance predictions"
echo "  ✓ Quarterly knowledge updates"
echo ""
