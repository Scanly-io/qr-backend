# Phase 1 Docker Testing Guide

Complete guide for testing the MVP stack locally and with mobile devices.

## 🚀 Quick Start

### 1. Prerequisites

- Docker Desktop installed and running
- 4GB+ available RAM
- (Optional) Ngrok for mobile testing
- (Optional) Stripe test account

### 2. First-Time Setup

```bash
# 1. Copy environment template
cp .env.phase1.example .env.phase1

# 2. Edit configuration
nano .env.phase1

# Required values:
# - POSTGRES_PASSWORD (any secure password)
# - JWT_SECRET (min 32 random characters)
# - STRIPE_SECRET_KEY (from Stripe dashboard, test mode)
# - STRIPE_PUBLISHABLE_KEY (from Stripe dashboard, test mode)
# - CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET (free tier)

# 3. Make scripts executable
chmod +x start-phase1.sh
chmod +x scripts/start-ngrok.sh

# 4. Start the stack
./start-phase1.sh
```

### 3. Access the Application

- **Frontend**: http://localhost:8080
- **API Gateway**: http://localhost
- **Health Check**: http://localhost/health

## 🧪 Testing Checklist

### Local Testing (Desktop)

#### ✅ Test 1: User Registration & Authentication

```bash
# Register new user
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'

# Expected: 201 Created, returns { token, user }

# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'

# Expected: 200 OK, returns { token, user }
```

#### ✅ Test 2: Create Microsite

```bash
# Get token from login response
TOKEN="your-jwt-token-here"

# Create microsite
curl -X POST http://localhost/api/microsites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "My Test Microsite",
    "description": "Testing Phase 1 MVP",
    "slug": "test-site",
    "blocks": [
      {
        "type": "header",
        "content": {
          "title": "Welcome to My Microsite",
          "subtitle": "Built with Scanly"
        },
        "order": 0
      },
      {
        "type": "link",
        "content": {
          "url": "https://example.com",
          "title": "Visit Example"
        },
        "order": 1
      }
    ]
  }'

# Expected: 201 Created, returns microsite object with ID
```

#### ✅ Test 3: Generate QR Code

```bash
MICROSITE_ID="microsite-id-from-above"

# Create QR code
curl -X POST http://localhost/api/qr \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "micrositeId": "'$MICROSITE_ID'",
    "name": "My First QR Code",
    "type": "dynamic"
  }'

# Expected: 201 Created, returns QR code with shortCode
```

#### ✅ Test 4: QR Redirect

```bash
SHORT_CODE="abc123"  # from QR response

# Test redirect (follow redirects disabled to see 302)
curl -I http://localhost/r/$SHORT_CODE

# Expected: 302 Found, Location header points to microsite
# Should also increment analytics
```

#### ✅ Test 5: View Microsite

```bash
# Visit in browser
open http://localhost/microsites/test-site

# Or via API
curl http://localhost/api/microsites/test-site

# Expected: Returns microsite with all blocks rendered
```

#### ✅ Test 6: Analytics Tracking

```bash
# Get analytics for QR code
curl -X GET http://localhost/api/analytics/qr/$QR_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: Returns scan count, unique visitors, recent scans

# Get microsite analytics
curl -X GET http://localhost/api/analytics/microsite/$MICROSITE_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: Returns visit count, referrers, devices
```

### Mobile Testing (with Ngrok)

#### ✅ Test 7: Setup Ngrok Tunnel

```bash
# 1. Start ngrok
./scripts/start-ngrok.sh

# 2. Copy the https://xxx.ngrok-free.app URL

# 3. Update .env.phase1
APP_URL=https://xxx.ngrok-free.app
VITE_API_URL=https://xxx.ngrok-free.app/api
FRONTEND_URL=https://xxx.ngrok-free.app
QR_BASE_URL=https://xxx.ngrok-free.app/r
CORS_ORIGIN=https://xxx.ngrok-free.app

# 4. Rebuild frontend with new URLs
docker-compose -f docker-compose.phase1.yml up -d --build frontend

# 5. Test in browser
open https://xxx.ngrok-free.app
```

#### ✅ Test 8: QR Code Scanning on Phone

1. **Generate QR Code** (via ngrok URL in browser)
   - Login at https://xxx.ngrok-free.app
   - Create microsite
   - Generate QR code
   - Download/display QR image

2. **Scan with Phone**
   - Open phone camera app
   - Point at QR code
   - Tap notification to open link
   - **Expected**: Phone opens https://xxx.ngrok-free.app/r/abc123
   - **Expected**: Redirects to microsite
   - **Expected**: Analytics increment

3. **Verify Mobile Rendering**
   - Check microsite renders correctly on mobile
   - Test block interactions (links, videos, forms)
   - Verify responsive design

### Stripe Integration Testing

#### ✅ Test 9: Stripe Webhook Setup

```bash
# 1. Configure webhook in Stripe Dashboard
# URL: https://xxx.ngrok-free.app/api/webhooks/stripe
# Events: checkout.session.completed, payment_intent.succeeded

# 2. Or use Stripe CLI for local testing
stripe listen --forward-to localhost/api/webhooks/stripe

# 3. Test payment flow
# - Upgrade to Pro plan in UI
# - Use test card: 4242 4242 4242 4242
# - Verify webhook received
# - Check subscription activated
```

#### ✅ Test 10: Payment Block on Microsite

```bash
# 1. Add payment block to microsite
curl -X POST http://localhost/api/microsites/$MICROSITE_ID/blocks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "payment",
    "content": {
      "title": "Buy My Product",
      "price": 2999,
      "currency": "usd"
    },
    "order": 2
  }'

# 2. Visit microsite, click payment block
# 3. Complete checkout with test card
# 4. Verify webhook processing
# 5. Check order created in database
```

## 🐛 Troubleshooting

### Services Not Starting

```bash
# Check service logs
docker-compose -f docker-compose.phase1.yml logs [service-name]

# Common issues:
# - PostgreSQL: Check password in .env.phase1
# - Redis: Check port 6379 not in use
# - Nginx: Check port 80 not in use (stop local nginx/apache)
# - Frontend: Check build logs for errors
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.phase1.yml exec postgres pg_isready

# Check databases exist
docker-compose -f docker-compose.phase1.yml exec postgres psql -U postgres -c "\l"

# Expected: auth_db, qr_db, microsite_db, analytics_db, routing_db

# Recreate databases if missing
docker-compose -f docker-compose.phase1.yml down -v
./start-phase1.sh
```

### CORS Errors

```bash
# 1. Check CORS_ORIGIN in .env.phase1 matches frontend URL
# 2. For local: http://localhost:8080
# 3. For ngrok: https://xxx.ngrok-free.app
# 4. Restart nginx after changes
docker-compose -f docker-compose.phase1.yml restart nginx
```

### QR Code Not Redirecting

```bash
# 1. Check routing service logs
docker-compose -f docker-compose.phase1.yml logs routing-service

# 2. Verify short code exists in database
docker-compose -f docker-compose.phase1.yml exec postgres \
  psql -U postgres -d routing_db -c "SELECT * FROM qr_codes LIMIT 5;"

# 3. Test direct API call
curl http://localhost/r/abc123

# 4. Check nginx routing
curl -I http://localhost/r/test
```

### Stripe Webhooks Not Working

```bash
# 1. Check webhook secret in .env.phase1 matches Stripe dashboard
# 2. Verify ngrok URL is accessible: curl https://xxx.ngrok-free.app/health
# 3. Check microsite service logs
docker-compose -f docker-compose.phase1.yml logs microsite-service

# 4. Test webhook manually
curl -X POST https://xxx.ngrok-free.app/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type": "checkout.session.completed"}'
```

## 📊 Monitoring

### View All Logs

```bash
# All services
docker-compose -f docker-compose.phase1.yml logs -f

# Specific service
docker-compose -f docker-compose.phase1.yml logs -f auth-service

# Last 100 lines
docker-compose -f docker-compose.phase1.yml logs --tail=100
```

### Check Resource Usage

```bash
# CPU and memory usage
docker stats

# Container status
docker-compose -f docker-compose.phase1.yml ps

# Disk usage
docker system df
```

### Database Queries

```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.phase1.yml exec postgres psql -U postgres

# Check user count
\c auth_db
SELECT COUNT(*) FROM users;

# Check QR codes
\c qr_db
SELECT id, name, short_code, created_at FROM qr_codes ORDER BY created_at DESC LIMIT 10;

# Check analytics
\c analytics_db
SELECT COUNT(*) FROM scans;
SELECT COUNT(*) FROM page_views;
```

### Redis Inspection

```bash
# Connect to Redis
docker-compose -f docker-compose.phase1.yml exec redis redis-cli

# Check keys
KEYS *

# Check memory usage
INFO memory

# Monitor commands
MONITOR
```

## 🔄 Restart Services

```bash
# Restart single service
docker-compose -f docker-compose.phase1.yml restart auth-service

# Restart all services
docker-compose -f docker-compose.phase1.yml restart

# Rebuild and restart (after code changes)
docker-compose -f docker-compose.phase1.yml up -d --build auth-service

# Full rebuild
docker-compose -f docker-compose.phase1.yml down
docker-compose -f docker-compose.phase1.yml build --no-cache
./start-phase1.sh
```

## 🛑 Stop Services

```bash
# Stop all services (keep data)
docker-compose -f docker-compose.phase1.yml down

# Stop and remove volumes (delete all data)
docker-compose -f docker-compose.phase1.yml down -v

# Stop and remove images
docker-compose -f docker-compose.phase1.yml down --rmi all
```

## ✅ Success Criteria

### MVP Ready When:

- [ ] User can register/login successfully
- [ ] User can create microsite with 5+ block types
- [ ] User can generate QR code for microsite
- [ ] QR code redirects correctly on desktop
- [ ] QR code scans and redirects on mobile (via Ngrok)
- [ ] Analytics track scans and visits accurately
- [ ] Stripe payment flow works end-to-end
- [ ] Payment block processes transactions
- [ ] Webhook events processed correctly
- [ ] No console errors in frontend
- [ ] All services healthy (docker-compose ps)
- [ ] Response times < 500ms for API calls
- [ ] Frontend loads in < 2s

## 🚀 Next Steps After Testing

1. **Deploy to VPS**
   - Provision Hetzner/DigitalOcean server ($12/month)
   - Install Docker + Docker Compose
   - Clone repo, configure production .env
   - Run docker-compose up -d

2. **Configure DNS**
   - Point domain to VPS IP
   - Set up Cloudflare for CDN + SSL
   - Configure SSL certificates (Let's Encrypt)

3. **Production Monitoring**
   - Set up log aggregation (Papertrail/Logtail)
   - Configure uptime monitoring (UptimeRobot)
   - Set up error tracking (Sentry)

4. **Performance Testing**
   - Load test with 100 concurrent users
   - Test QR redirect with 1000 scans/min
   - Verify CDN caching working

5. **Security Hardening**
   - Enable firewall (ufw)
   - Configure fail2ban
   - Set up automated backups
   - Rotate secrets/keys

## 📖 Additional Resources

- **Docker Compose Reference**: `docker-compose.phase1.yml`
- **Environment Variables**: `.env.phase1.example`
- **Nginx Configuration**: `nginx/nginx.phase1.conf`
- **Architecture Decisions**: `docs/PHASE1_DOCKER_STRATEGY.md`
- **Service Documentation**: Individual service README files
