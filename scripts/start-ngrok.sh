#!/bin/bash
# =============================================================================
# Ngrok Tunnel Setup for Mobile QR Testing
# =============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "📱 Starting Ngrok Tunnel for Mobile Testing"
echo "==========================================="

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo -e "${RED}❌ Ngrok is not installed${NC}"
    echo ""
    echo "Install Ngrok:"
    echo "  brew install ngrok"
    echo "  or download from https://ngrok.com/download"
    echo ""
    echo "Then sign up and authenticate:"
    echo "  ngrok authtoken YOUR_TOKEN"
    exit 1
fi

# Check if stack is running
if ! docker-compose -f docker-compose.phase1.yml ps | grep -q "Up"; then
    echo -e "${RED}❌ Phase 1 stack is not running${NC}"
    echo "Please start it first:"
    echo "  ./start-phase1.sh"
    exit 1
fi

echo -e "${YELLOW}🌐 Starting Ngrok tunnel on port 80...${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: After Ngrok starts, you need to:${NC}"
echo "  1. Copy the https://xxx.ngrok-free.app URL"
echo "  2. Update .env.phase1 with:"
echo "     APP_URL=https://xxx.ngrok-free.app"
echo "     VITE_API_URL=https://xxx.ngrok-free.app/api"
echo "     FRONTEND_URL=https://xxx.ngrok-free.app"
echo "     QR_BASE_URL=https://xxx.ngrok-free.app/r"
echo "  3. Rebuild frontend:"
echo "     docker-compose -f docker-compose.phase1.yml up -d --build frontend"
echo "  4. Configure Stripe webhook:"
echo "     https://xxx.ngrok-free.app/api/webhooks/stripe"
echo ""
echo -e "${GREEN}🚀 Starting tunnel...${NC}"
echo ""

# Start ngrok
ngrok http 80 --region=us
