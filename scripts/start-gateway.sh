#!/bin/bash

# Start tenant-gateway for testing
cd /Users/saurabhbansal/qr-backend/services/tenant-gateway

echo "🚀 Starting Tenant Gateway..."
echo ""
echo "Environment:"
echo "  PORT: ${PORT:-3000}"
echo "  REDIS_URL: ${REDIS_URL:-redis://localhost:6379}"
echo ""

npx tsx src/index.ts
