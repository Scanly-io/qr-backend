#!/bin/bash

# ========================================
# Phase 1 MVP - Startup Script
# ========================================
# Starts minimal services for local testing
# ========================================

set -e

echo "============================================"
echo "🚀 Starting Phase 1 MVP Stack"
echo "============================================"

# Check if .env.phase1 exists
if [ ! -f .env.phase1 ]; then
    echo "❌ Error: .env.phase1 not found"
    echo "📝 Creating from template..."
    cp .env.phase1.example .env.phase1
    echo "⚠️  Please edit .env.phase1 with your configuration"
    echo "   Required: POSTGRES_PASSWORD, JWT_SECRET, STRIPE keys, CLOUDINARY keys"
    exit 1
fi

# Load environment variables
export $(cat .env.phase1 | grep -v '^#' | xargs)

# Check required variables
REQUIRED_VARS=("POSTGRES_PASSWORD" "JWT_SECRET" "STRIPE_SECRET_KEY" "CLOUDINARY_CLOUD_NAME")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please edit .env.phase1 and set these values"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.phase1.yml --env-file .env.phase1 down 2>/dev/null || true
echo ""

# Build and start services
echo "🔨 Building and starting services..."
echo "   This may take 5-10 minutes on first run..."
echo ""

docker-compose -f docker-compose.phase1.yml --env-file .env.phase1 up --build -d

echo ""
echo "⏳ Waiting for services to be healthy..."
echo ""

# Wait for services to be healthy
TIMEOUT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $TIMEOUT ]; do
    UNHEALTHY=$(docker ps --filter "name=qr_*_phase1" --format "table {{.Names}}\t{{.Status}}" | grep -v "healthy" | grep -v "NAMES" | wc -l)
    
    if [ "$UNHEALTHY" -eq "0" ]; then
        echo "✅ All services are healthy!"
        break
    fi
    
    echo "   Waiting... ($ELAPSED/$TIMEOUT seconds)"
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "⚠️  Timeout waiting for services. Checking status..."
    docker-compose -f docker-compose.phase1.yml ps
    echo ""
    echo "Run 'docker-compose -f docker-compose.phase1.yml logs' to see errors"
    exit 1
fi

echo ""
echo "============================================"
echo "✅ Phase 1 MVP Stack is Running!"
echo "============================================"
echo ""
echo "📱 Access URLs:"
echo "   Frontend:      http://localhost:8080"
echo "   API Gateway:   http://localhost"
echo "   Health Check:  http://localhost/health"
echo ""
echo "🔧 Service Endpoints:"
echo "   Auth:       http://localhost/api/auth"
echo "   Microsite:  http://localhost/api/microsite"
echo "   QR:         http://localhost/api/qr-code"
echo "   Analytics:  http://localhost/api/analytics"
echo "   Stripe:     http://localhost/api/stripe"
echo ""
echo "🗄️  Infrastructure:"
echo "   PostgreSQL: localhost:5432"
echo "   Redis:      localhost:6379"
echo ""
echo "📊 Monitoring:"
echo "   Container Status: docker-compose -f docker-compose.phase1.yml ps"
echo "   Service Logs:     docker-compose -f docker-compose.phase1.yml logs -f [service]"
echo "   Stop All:         docker-compose -f docker-compose.phase1.yml down"
echo ""
echo "🧪 Next Steps:"
echo "   1. Register a user: curl -X POST http://localhost/api/auth/register"
echo "   2. Create a microsite"
echo "   3. Generate a QR code"
echo "   4. Test on mobile with Ngrok (see PHASE1_TESTING_GUIDE.md)"
echo ""
echo "============================================"
