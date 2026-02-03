#!/bin/bash

# Multi-Tenancy Setup Script
# Run this to configure and test the tenant gateway

set -e

echo "🚀 Multi-Tenancy Setup Script"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install tenant-gateway dependencies
echo -e "${YELLOW}Step 1: Installing tenant-gateway dependencies...${NC}"
cd services/tenant-gateway
npm install
cd ../..
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Create .env for tenant-gateway
echo -e "${YELLOW}Step 2: Creating .env file for tenant-gateway...${NC}"
if [ ! -f services/tenant-gateway/.env ]; then
  cp services/tenant-gateway/.env.example services/tenant-gateway/.env
  echo -e "${GREEN}✓ .env file created${NC}"
else
  echo -e "${GREEN}✓ .env file already exists${NC}"
fi
echo ""

# Step 3: Add tenant-gateway to docker-compose
echo -e "${YELLOW}Step 3: Updating docker-compose.yml...${NC}"
echo "Please manually add the tenant-gateway service to docker-compose.yml"
echo "See: MULTI_TENANCY_IMPLEMENTATION_COMPLETE.md for the full configuration"
echo ""

# Step 4: Update Nginx configuration
echo -e "${YELLOW}Step 4: Updating nginx configuration...${NC}"
echo "Please update nginx/nginx.conf to route through tenant-gateway"
echo "See: MULTI_TENANCY_IMPLEMENTATION_COMPLETE.md for nginx config"
echo ""

# Step 5: Register middleware in microsite service
echo -e "${YELLOW}Step 5: Checking microsite service setup...${NC}"
if grep -q "addTenantContext" services/microsite-service/src/index.ts; then
  echo -e "${GREEN}✓ Tenant middleware already registered${NC}"
else
  echo "Please add to services/microsite-service/src/index.ts:"
  echo ""
  echo "import { addTenantContext } from './middleware/tenant.js';"
  echo "import tenantMicrositeRoutes from './routes/tenant-microsites.js';"
  echo ""
  echo "server.addHook('onRequest', addTenantContext);"
  echo "await server.register(tenantMicrositeRoutes, { prefix: '/api' });"
fi
echo ""

# Summary
echo -e "${GREEN}=============================="
echo "Setup Progress:"
echo "=============================="
echo "✓ Tenant Gateway service created"
echo "✓ Tenant query helpers created"
echo "✓ Tenant middleware created"
echo "✓ Tenant-scoped routes created"
echo "✓ Documentation written"
echo ""
echo "Next Steps:"
echo "=============================="
echo "1. Update docker-compose.yml (add tenant-gateway service)"
echo "2. Update nginx/nginx.conf (route through tenant-gateway)"
echo "3. Register middleware in microsite-service/src/index.ts"
echo "4. Run: docker-compose up --build"
echo "5. Test multi-tenancy isolation"
echo ""
echo "📖 See MULTI_TENANCY_IMPLEMENTATION_COMPLETE.md for complete instructions"
echo -e "${NC}"
