# 🚀 Phase 1 MVP - Docker Setup & Architecture

## 📋 Overview

**Goal**: Launch MVP at minimal cost with core QR & Microsite functionality

**Strategy**: 
- ✅ 5 Core Services (Auth, Microsite, QR, Analytics, Stripe)
- ✅ External CDN (Cloudinary - Free Tier)
- ✅ No Kafka/Prometheus (add later)
- ✅ No Domain Service (use subdomains)
- ✅ Nginx for routing (no separate routing service needed)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────▼─────┐
                    │  Ngrok   │ (Mobile Testing Only)
                    │ Tunnel   │
                    └────┬─────┘
                         │
         ┌───────────────▼────────────────┐
         │         Nginx (Port 80)         │
         │      API Gateway + Routing      │
         └───────────────┬────────────────┘
                         │
         ┌───────────────┼────────────────┐
         │               │                │
    ┌────▼────┐    ┌────▼─────┐    ┌────▼────┐
    │Frontend │    │  Backend  │    │  CDN    │
    │  React  │    │ Services  │    │Cloudinary│
    │  (SPA)  │    │           │    │(External)│
    └─────────┘    └────┬──────┘    └─────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐    ┌───▼───┐    ┌────▼────┐
    │  Auth   │    │  QR   │    │ Stripe  │
    │ Service │    │Service│    │ Service │
    └────┬────┘    └───┬───┘    └────┬────┘
         │             │              │
    ┌────▼────┐    ┌───▼───┐         │
    │Microsite│    │Analyt-│         │
    │ Service │    │ ics   │         │
    └────┬────┘    └───┬───┘         │
         │             │              │
         └─────────────┼──────────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
    ┌────▼────────┐          ┌───────▼────┐
    │ PostgreSQL  │          │   Redis    │
    │  Database   │          │   Cache    │
    └─────────────┘          └────────────┘
```

---

## 🎯 Services Breakdown

### **Core Backend Services (5)**

| Service | Port | Purpose | Database | External APIs |
|---------|------|---------|----------|---------------|
| **Auth** | 3001 | User auth, JWT tokens | PostgreSQL | - |
| **Microsite** | 3002 | Create/edit microsites | PostgreSQL | Cloudinary |
| **QR** | 3003 | Generate QR codes | PostgreSQL | Cloudinary |
| **Analytics** | 3004 | Track scans, visits | PostgreSQL | IP Geolocation |
| **Stripe** | 3005 | Payment processing | PostgreSQL | Stripe API |

### **Infrastructure (3)**

| Component | Port | Purpose | Persistent |
|-----------|------|---------|-----------|
| **PostgreSQL** | 5432 | Primary database | ✅ Volume |
| **Redis** | 6379 | Cache, sessions | ✅ Volume |
| **Nginx** | 80, 443 | Reverse proxy, routing | - |

### **Frontend (1)**

| Component | Port | Purpose | Build |
|-----------|------|---------|-------|
| **React App** | 8080 | User interface | Production build |

### **External Services (2)**

| Service | Purpose | Cost | Tier |
|---------|---------|------|------|
| **Cloudinary** | Image hosting, QR codes | Free | 25GB storage, 25GB bandwidth |
| **Ngrok** | Mobile testing | Free | 1 tunnel, 40 requests/min |

---

## ✅ What's INCLUDED in Phase 1

### Core Features
- ✅ User registration & authentication
- ✅ Microsite creation & editing
- ✅ QR code generation (dynamic + offline)
- ✅ Analytics tracking (scans, visits, geo-location)
- ✅ Stripe payment integration
- ✅ Image uploads to Cloudinary CDN

### Infrastructure
- ✅ PostgreSQL database
- ✅ Redis caching
- ✅ Nginx reverse proxy
- ✅ Docker containerization
- ✅ Health checks & auto-restart

### Testing
- ✅ Ngrok tunnel for mobile QR scanning
- ✅ Local development on port 8080

---

## ❌ What's EXCLUDED from Phase 1 (Add Later)

### Non-Critical Services
- ❌ Kafka/Redpanda (use direct HTTP)
- ❌ Prometheus + Grafana (monitoring)
- ❌ Domain Service (use subdomains initially)
- ❌ Routing Service (Nginx handles it)
- ❌ Email Service (defer to post-launch)
- ❌ AI Services (OpenAI - costs money)

### Why Excluded?
- **Kafka**: Adds complexity, not needed for MVP (< 1000 users)
- **Monitoring**: Nice-to-have, add after launch
- **Domain Service**: Users can use `username.qrplatform.com` initially
- **AI Services**: Costs ~$0.002-0.06 per request, defer until revenue

---

## 💰 Cost Breakdown (Monthly)

### Free Tier (MVP)
| Service | Tier | Limits | Cost |
|---------|------|--------|------|
| Cloudinary | Free | 25GB storage, 25GB bandwidth | $0 |
| Ngrok | Free | 1 tunnel, 40 req/min | $0 |
| **Total Free** | | | **$0** |

### Paid Infrastructure (Production)
| Service | Provider | Specs | Monthly Cost |
|---------|----------|-------|--------------|
| **Server** | DigitalOcean | 4GB RAM, 2 vCPU, 80GB SSD | $24 |
| **Database** | DigitalOcean Managed PostgreSQL | 1GB RAM | $15 |
| **Redis** | DigitalOcean Managed Redis | 1GB RAM | $15 |
| **Domain** | Namecheap | .com domain | $1 |
| **SSL** | Let's Encrypt | Free SSL certificate | $0 |
| **Total MVP** | | | **$55/month** |

### When to Upgrade
- **100+ users**: Add Redis caching ($15/mo)
- **500+ users**: Upgrade server to 8GB ($48/mo)
- **1000+ users**: Add Kafka ($15/mo), monitoring ($0 - self-hosted)
- **5000+ users**: Add dedicated PostgreSQL ($50/mo)

---

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Install Docker Desktop
# macOS: https://docs.docker.com/desktop/install/mac-install/
# Windows: https://docs.docker.com/desktop/install/windows-install/

# Verify installation
docker --version
docker-compose --version
```

### 2. Get API Keys (Free)

**Stripe (Test Mode)**
1. Sign up: https://dashboard.stripe.com/register
2. Get keys: https://dashboard.stripe.com/test/apikeys
3. Copy `sk_test_xxx` and `pk_test_xxx`

**Cloudinary (Free Tier)**
1. Sign up: https://cloudinary.com/users/register/free
2. Get credentials: https://console.cloudinary.com/settings/api-keys
3. Copy Cloud Name, API Key, API Secret

**Ngrok (Optional, for mobile testing)**
1. Sign up: https://dashboard.ngrok.com/signup
2. Get token: https://dashboard.ngrok.com/get-started/your-authtoken

### 3. Configure Environment
```bash
# Copy template
cp .env.phase1.example .env.phase1

# Edit with your values
nano .env.phase1

# Required:
# - POSTGRES_PASSWORD (e.g., mySecurePass123!)
# - JWT_SECRET (run: openssl rand -base64 32)
# - STRIPE_SECRET_KEY (sk_test_xxx)
# - STRIPE_PUBLISHABLE_KEY (pk_test_xxx)
# - CLOUDINARY_CLOUD_NAME
# - CLOUDINARY_API_KEY
# - CLOUDINARY_API_SECRET
```

### 4. Start Services
```bash
# Make script executable
chmod +x start-phase1.sh

# Start everything
./start-phase1.sh

# Wait 5-10 minutes for first build
# Services will auto-restart on failure
```

### 5. Verify
```bash
# Check all services are healthy
docker-compose -f docker-compose.phase1.yml ps

# Test API
curl http://localhost/health

# Access frontend
open http://localhost:8080
```

---

## 🧪 Testing Workflow

### Local Testing (Desktop)
1. **Register User**
   ```bash
   curl -X POST http://localhost/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test123!",
       "name": "Test User"
     }'
   ```

2. **Create Microsite**
   - Open http://localhost:8080
   - Login with test credentials
   - Click "Create Microsite"
   - Add blocks (Header, Links, etc.)

3. **Generate QR Code**
   - Click "Generate QR"
   - Download QR image
   - QR code stored in Cloudinary

4. **View Analytics**
   - Navigate to Analytics tab
   - See scan counts, locations

### Mobile Testing (with Ngrok)
1. **Start Ngrok Tunnel**
   ```bash
   ./scripts/start-ngrok.sh
   
   # Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
   ```

2. **Update Frontend URL**
   ```bash
   # Edit .env.phase1
   VITE_API_URL=https://abc123.ngrok.io
   
   # Rebuild frontend
   docker-compose -f docker-compose.phase1.yml up --build frontend
   ```

3. **Scan QR Code**
   - Open QR code on phone camera
   - Should redirect to microsite
   - Analytics should track the scan

---

## 🔧 Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose -f docker-compose.phase1.yml logs

# Rebuild from scratch
docker-compose -f docker-compose.phase1.yml down -v
docker-compose -f docker-compose.phase1.yml up --build
```

### Database Connection Errors
```bash
# Wait for PostgreSQL to be ready
docker-compose -f docker-compose.phase1.yml logs postgres

# Manual connection test
docker exec -it qr_postgres_phase1 psql -U postgres -d qr_platform
```

### Frontend Not Loading
```bash
# Check Nginx routing
docker-compose -f docker-compose.phase1.yml logs nginx

# Verify frontend build
docker-compose -f docker-compose.phase1.yml logs frontend
```

### Ngrok Tunnel Issues
```bash
# Verify authtoken
cat .env.phase1 | grep NGROK_AUTHTOKEN

# Run manually
ngrok http 80

# Check firewall (allow port 80)
```

---

## 📊 Monitoring Commands

```bash
# Real-time logs (all services)
docker-compose -f docker-compose.phase1.yml logs -f

# Specific service logs
docker-compose -f docker-compose.phase1.yml logs -f auth-service

# Service health status
docker-compose -f docker-compose.phase1.yml ps

# Resource usage
docker stats

# Database size
docker exec qr_postgres_phase1 psql -U postgres -c "
  SELECT pg_database.datname, 
         pg_size_pretty(pg_database_size(pg_database.datname)) AS size
  FROM pg_database;"

# Redis memory usage
docker exec qr_redis_phase1 redis-cli INFO memory
```

---

## 🎯 Post-Launch Roadmap

### Week 1-2: Stabilization
- [ ] Monitor error logs
- [ ] Fix critical bugs
- [ ] Optimize database queries
- [ ] Add basic metrics

### Week 3-4: Growth Features
- [ ] Add Kafka for async processing
- [ ] Implement email notifications
- [ ] Add Prometheus + Grafana monitoring
- [ ] Optimize image delivery (CDN)

### Month 2: Scaling
- [ ] Add custom domains
- [ ] Implement AI features (OpenAI)
- [ ] Add team collaboration
- [ ] Upgrade to managed PostgreSQL

---

## 📝 File Structure

```
qr-backend/
├── docker-compose.phase1.yml    # Phase 1 services
├── .env.phase1.example          # Environment template
├── .env.phase1                  # Your config (gitignored)
├── start-phase1.sh              # Startup script
├── nginx/
│   └── nginx.phase1.conf        # Nginx routing config
├── scripts/
│   ├── init-db.sh               # PostgreSQL init
│   └── start-ngrok.sh           # Ngrok helper
└── services/
    ├── auth/Dockerfile          # Auth service
    ├── microsite/Dockerfile     # Microsite service
    ├── qr/Dockerfile            # QR service
    ├── analytics/Dockerfile     # Analytics service
    └── stripe/Dockerfile        # Stripe service

qr-frontend/
├── Dockerfile.prod              # Production frontend build
├── nginx.conf                   # Frontend nginx config
└── dist/                        # Built files (created on build)
```

---

## ✅ Success Criteria

Phase 1 is successful when:
- ✅ User can register and login
- ✅ User can create a microsite with 5+ blocks
- ✅ User can generate a QR code
- ✅ QR code scans redirect correctly
- ✅ Analytics track scans with geo-location
- ✅ Payment flow works end-to-end
- ✅ Mobile QR scanning works via Ngrok
- ✅ All services stay healthy for 24 hours

---

## 🚀 Next: Production Deployment

See `PRODUCTION_DEPLOYMENT.md` for:
- DigitalOcean setup
- Domain configuration
- SSL certificates
- Automated backups
- Scaling strategies

---

**Last Updated**: February 6, 2026  
**Status**: Ready for Testing  
**Estimated Setup Time**: 15-20 minutes
