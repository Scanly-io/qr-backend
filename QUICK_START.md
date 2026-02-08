# 🚀 Quick Start - Phase 1 MVP

## ⏱️ Time Required: 15 minutes

---

## ✅ Prerequisites Check

```bash
# Verify Docker is installed
docker --version
# Expected: Docker version 20.10.0 or higher

docker-compose --version
# Expected: Docker Compose version 2.0.0 or higher
```

**Don't have Docker?** Install Docker Desktop:
- **macOS**: https://docs.docker.com/desktop/install/mac-install/
- **Windows**: https://docs.docker.com/desktop/install/windows-install/

---

## 🔑 Step 1: Get API Keys (5 minutes)

### Stripe (Test Mode) - **REQUIRED**
1. Sign up: https://dashboard.stripe.com/register
2. Navigate to: https://dashboard.stripe.com/test/apikeys
3. Copy both keys:
   - **Secret key**: `sk_test_...` (Publishable later)
   - **Publishable key**: `pk_test_...`

### Cloudinary (Free Tier) - **REQUIRED**
1. Sign up: https://cloudinary.com/users/register/free
2. Navigate to: https://console.cloudinary.com/settings/api-keys
3. Copy credentials:
   - **Cloud Name**: e.g., `dxyz123`
   - **API Key**: e.g., `123456789012345`
   - **API Secret**: e.g., `abcdef...`

### Ngrok (Optional - for mobile testing)
1. Sign up: https://dashboard.ngrok.com/signup
2. Get token: https://dashboard.ngrok.com/get-started/your-authtoken
3. Copy authtoken: `2abc...`

---

## 🛠️ Step 2: Configure Environment (3 minutes)

```bash
# Navigate to backend
cd /Users/saurabhbansal/qr-backend

# Copy template
cp .env.phase1.example .env.phase1

# Edit with your values
nano .env.phase1
# OR
code .env.phase1
# OR
vim .env.phase1
```

### Required Variables (UPDATE THESE!)

```bash
# Database (CHANGE THIS!)
POSTGRES_PASSWORD=yourSecurePassword123!

# Redis (CHANGE THIS!)
REDIS_PASSWORD=yourRedisPassword456!

# JWT Secret (RUN THIS COMMAND!)
# Generate: openssl rand -base64 32
JWT_SECRET=your-generated-jwt-secret-here

# Stripe (FROM STEP 1!)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_local_test_secret

# Cloudinary (FROM STEP 1!)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URLs (KEEP AS-IS FOR NOW)
FRONTEND_URL=http://localhost:8080
VITE_API_URL=http://localhost

# Ngrok (OPTIONAL - for mobile testing)
NGROK_AUTHTOKEN=your-ngrok-token-if-needed
```

### Generate JWT Secret
```bash
# Run this command and copy the output
openssl rand -base64 32

# Paste into .env.phase1 as JWT_SECRET
```

---

## 🚀 Step 3: Start Services (5 minutes)

```bash
# Make script executable
chmod +x start-phase1.sh

# Start everything (first time: 5-10 min build)
./start-phase1.sh

# You'll see:
# ✅ Environment validation
# ✅ Docker images building
# ✅ Services starting
# ✅ Health checks (wait 2-5 minutes)
```

### Expected Output:
```
🔍 Validating environment...
✅ Found .env.phase1
✅ All required variables set

🚀 Starting Phase 1 services...
✅ postgres is healthy
✅ redis is healthy
✅ auth-service is healthy
✅ microsite-service is healthy
✅ qr-service is healthy
✅ analytics-service is healthy
✅ stripe-service is healthy
✅ nginx is healthy
✅ frontend is healthy

🎉 All services are running!

📍 Access Points:
Frontend:    http://localhost:8080
API Health:  http://localhost/health
Auth API:    http://localhost/api/auth
```

---

## ✅ Step 4: Verify Everything Works (2 minutes)

### Test 1: Check Services
```bash
# View running containers
docker-compose -f docker-compose.phase1.yml ps

# All should show "Up" status
```

### Test 2: Test API
```bash
# Health check
curl http://localhost/health

# Expected: 200 OK

# Test auth endpoint
curl http://localhost/api/auth/health

# Expected: {"status":"healthy","service":"auth"}
```

### Test 3: Open Frontend
```bash
# Open in browser
open http://localhost:8080

# OR manually navigate to: http://localhost:8080
```

You should see the QR Platform login page!

---

## 🧪 Step 5: Create Test User & Microsite (3 minutes)

### Via Frontend (Recommended)
1. Open http://localhost:8080
2. Click "Sign Up"
3. Enter:
   - Email: `test@example.com`
   - Password: `Test123!`
   - Name: `Test User`
4. Click "Create Account"
5. Login with same credentials
6. Click "Create Microsite"
7. Add blocks (Header, Links, etc.)
8. Click "Generate QR Code"
9. Download QR code (stored in Cloudinary)

### Via API (Alternative)
```bash
# Register user
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'

# Expected: {"token":"eyJhbGci...","user":{...}}

# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'

# Save the token for next requests
```

---

## 📱 Optional: Mobile QR Testing (5 minutes)

### Start Ngrok Tunnel
```bash
# Run Ngrok helper
./scripts/start-ngrok.sh

# Copy the HTTPS URL displayed (e.g., https://abc123.ngrok.io)
```

### Update Frontend API URL
```bash
# Edit .env.phase1
nano .env.phase1

# Change this line:
VITE_API_URL=https://your-ngrok-url-here.ngrok.io

# Save and rebuild frontend
docker-compose -f docker-compose.phase1.yml up --build frontend -d
```

### Test on Mobile
1. Generate QR code in frontend
2. Download QR image to your phone
3. Open phone camera
4. Point at QR code
5. Tap notification to open link
6. Should redirect to microsite!

---

## 🔧 Troubleshooting

### Services Won't Start
```bash
# View logs for all services
docker-compose -f docker-compose.phase1.yml logs

# View specific service
docker-compose -f docker-compose.phase1.yml logs auth-service

# Rebuild from scratch
docker-compose -f docker-compose.phase1.yml down -v
docker-compose -f docker-compose.phase1.yml up --build
```

### Database Connection Errors
```bash
# Wait for PostgreSQL (takes 30-60 seconds)
docker-compose -f docker-compose.phase1.yml logs postgres | grep "ready to accept"

# Test connection
docker exec -it qr_postgres_phase1 psql -U postgres -d qr_platform -c "SELECT 1;"
```

### Frontend Shows 404
```bash
# Check Nginx logs
docker-compose -f docker-compose.phase1.yml logs nginx

# Check frontend build
docker-compose -f docker-compose.phase1.yml logs frontend

# Rebuild frontend
docker-compose -f docker-compose.phase1.yml up --build frontend -d
```

### "Port already in use" Error
```bash
# Find what's using port 80
sudo lsof -i :80

# Kill the process (replace PID)
sudo kill -9 <PID>

# OR change Nginx port in docker-compose.phase1.yml
# ports:
#   - "8000:80"  # Change 80 to 8000
```

---

## 🎯 What's Running?

After successful start, you have:

| Service | Port | URL | Status |
|---------|------|-----|--------|
| **Frontend** | 8080 | http://localhost:8080 | React SPA |
| **Nginx** | 80 | http://localhost | API Gateway |
| **Auth** | 3001 | http://localhost/api/auth | ✅ Ready |
| **Microsite** | 3002 | http://localhost/api/microsite | ✅ Ready |
| **QR** | 3003 | http://localhost/api/qr-code | ✅ Ready |
| **Analytics** | 3004 | http://localhost/api/analytics | ✅ Ready |
| **Stripe** | 3005 | http://localhost/api/stripe | ✅ Ready |
| **PostgreSQL** | 5432 | Internal only | ✅ Ready |
| **Redis** | 6379 | Internal only | ✅ Ready |

---

## 📊 Monitoring Commands

```bash
# Real-time logs (all services)
docker-compose -f docker-compose.phase1.yml logs -f

# Service status
docker-compose -f docker-compose.phase1.yml ps

# Resource usage
docker stats

# Database size
docker exec qr_postgres_phase1 psql -U postgres -c "
  SELECT pg_size_pretty(pg_database_size('qr_platform'));"
```

---

## 🛑 Stop Services

```bash
# Stop all (keeps data)
docker-compose -f docker-compose.phase1.yml down

# Stop + remove data
docker-compose -f docker-compose.phase1.yml down -v

# Restart single service
docker-compose -f docker-compose.phase1.yml restart auth-service
```

---

## 🎉 Success!

You now have:
- ✅ Full QR platform running locally
- ✅ User authentication working
- ✅ Microsite creation enabled
- ✅ QR code generation functional
- ✅ Analytics tracking active
- ✅ Stripe payments ready

**Next Steps:**
1. Test all features end-to-end
2. Review `PHASE1_DOCKER_ARCHITECTURE.md` for architecture details
3. See `PHASE1_TESTING_GUIDE.md` for comprehensive testing
4. Check `PRODUCTION_DEPLOYMENT.md` when ready to launch

---

**Need Help?**
- Architecture: `PHASE1_DOCKER_ARCHITECTURE.md`
- Testing Guide: `PHASE1_TESTING_GUIDE.md`
- Logs: `docker-compose -f docker-compose.phase1.yml logs`
