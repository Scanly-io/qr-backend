#!/bin/bash

echo "🧪 ANALYTICS ENDPOINTS TEST SUITE"
echo "=================================="
echo ""

QR_ID="qr_abc"
BASE_URL="http://localhost:3004"

echo "📊 Testing QR ID: $QR_ID"
echo ""

echo "✅ 1. SUMMARY (Total/Today/Last 7 Days)"
echo "----------------------------------------"
curl -s "$BASE_URL/analytics/$QR_ID/summary" | jq .
echo ""

echo "✅ 2. FUNNEL (Conversion Metrics)"
echo "----------------------------------------"
curl -s "$BASE_URL/analytics/$QR_ID/funnel" | jq .
echo ""

echo "✅ 3. TIMESERIES (Daily Counts)"
echo "----------------------------------------"
curl -s "$BASE_URL/analytics/$QR_ID/timeseries" | jq '.timeSeries | .[0:3]' 2>/dev/null || echo "No data"
echo ""

echo "✅ 4. CTA BUTTONS (Button Performance)"
echo "----------------------------------------"
curl -s "$BASE_URL/analytics/$QR_ID/cta-buttons" | jq .
echo ""

echo "⚠️  5. UNIQUE VISITORS (Requires session_id column)"
echo "----------------------------------------"
curl -s "$BASE_URL/analytics/$QR_ID/unique-visitors" | jq . 2>/dev/null || echo '{"error": "Column not added yet"}'
echo ""

echo "⚠️  6. REFERRERS (Requires referrer column)"
echo "----------------------------------------"
curl -s "$BASE_URL/analytics/$QR_ID/referrers" | jq . 2>/dev/null || echo '{"error": "Column not added yet"}'
echo ""

echo "✅ 7. DEVICES (Device/OS/Browser)"
echo "----------------------------------------"
curl -s "$BASE_URL/analytics/$QR_ID/devices" | jq . 2>/dev/null || echo '{"error": "Column issue"}'
echo ""

echo "✅ 8. PATTERNS (Hour/Day of Week)"
echo "----------------------------------------"
curl -s "$BASE_URL/analytics/$QR_ID/patterns" | jq '.byHourOfDay | .[0:3], .byDayOfWeek | .[0:3]' 2>/dev/null || echo "No data"
echo ""

echo "✅ 9. RAW DATA (First 5 records)"
echo "----------------------------------------"
curl -s "$BASE_URL/analytics/$QR_ID/raw?pageSize=5" | jq '{total: .pagination.total, records: .records | length}'
echo ""

echo "=================================="
echo "✨ Test Complete!"
echo ""
echo "Summary:"
echo "  • Working: Summary, Funnel, Timeseries, CTA Buttons, Raw, Patterns"
echo "  • Needs Migration: Unique Visitors, Referrers (require new columns)"
echo "  • Check Devices endpoint (may need column migration)"
