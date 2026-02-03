# 🚀 Quick Start: Using the API Gateway

## What Changed?

Instead of accessing services on different ports:
- ❌ `http://localhost:3001/auth/login`
- ❌ `http://localhost:3002/generate`
- ❌ `http://localhost:3005/public/my-qr`

You now have **one unified endpoint**:
- ✅ `http://localhost/auth/login`
- ✅ `http://localhost/generate`
- ✅ `http://localhost/public/my-qr`

## Getting Started

### 1. Start All Services with Gateway

```bash
# Build and start everything (including nginx gateway)
docker-compose up -d

# Check status
docker-compose ps

# View nginx logs
docker logs qr_nginx_gateway
```

### 2. Test the Gateway

```bash
# Run the test script
./test-gateway.sh

# Or manually test
curl http://localhost/health
```

### 3. Access Swagger Documentation

All Swagger docs are now accessible through the gateway:

- **Auth Service**: http://localhost/auth-docs
- **QR Service**: http://localhost/qr-docs
- **Microsite Service**: http://localhost/microsite-docs
- **Analytics Service**: http://localhost/analytics-docs

## Common Workflows

### Signup and Login

```bash
# Create account (via gateway)
curl -X POST http://localhost/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login (via gateway)
TOKEN=$(curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')

echo "Token: $TOKEN"
```

### Generate QR Code

```bash
# Generate QR (via gateway)
QR_RESPONSE=$(curl -X POST http://localhost/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://example.com"}')

QR_ID=$(echo $QR_RESPONSE | jq -r '.qrId')
echo "QR ID: $QR_ID"

# Get QR image (via gateway)
curl http://localhost/qr/$QR_ID/image -o myqr.png
```

### Publish and View Microsite

```bash
# Publish microsite (via gateway)
curl -X POST http://localhost/microsite/$QR_ID/publish \
  -H "Authorization: Bearer $TOKEN"

# View public microsite (via gateway) - This is what users see when they scan QR
curl http://localhost/public/$QR_ID
```

### Get Analytics

```bash
# Get analytics summary (via gateway)
curl http://localhost/analytics/$QR_ID/summary | jq .
```

## Why Use the Gateway?

### 1. **Production-Ready Architecture**
- Single entry point for all services
- Easier to manage in Kubernetes/Cloud environments
- Standard pattern for microservices

### 2. **Built-in Protection**
- **Rate Limiting**: Prevents abuse
  - Auth: 20 req/min/IP
  - Public: 300 req/min/IP
  - API: 100 req/min/IP
- **Caching**: Faster responses for QR images and microsites
- **CORS**: Centralized configuration

### 3. **Better Performance**
- QR images cached for 24 hours
- Microsite HTML cached for 5 minutes
- Gzip compression enabled
- HTTP/2 support (when using HTTPS)

### 4. **Simplified Client Code**
Frontend only needs to know one URL:

```javascript
// Before (multiple endpoints)
const AUTH_URL = "http://localhost:3001";
const QR_URL = "http://localhost:3002";
const MICROSITE_URL = "http://localhost:3005";

// After (one endpoint)
const API_URL = "http://localhost";
```

## Direct Service Access (Still Available)

For debugging, you can still access services directly:

- Auth: http://localhost:3001
- QR: http://localhost:3002
- Microsite: http://localhost:3005
- Analytics: http://localhost:3004

But in production, **only the gateway should be exposed** (port 80/443).

## Rate Limiting in Action

```bash
# This will get rate limited after ~20 requests
for i in {1..25}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
done

# Output:
# 400
# 400
# ...
# 429  ← Rate limited!
# 429
```

## Cache Headers

Check if your request hit the cache:

```bash
# First request
curl -I http://localhost/public/test-qr-123 | grep X-Cache-Status
# X-Cache-Status: MISS

# Second request (within 5 minutes)
curl -I http://localhost/public/test-qr-123 | grep X-Cache-Status
# X-Cache-Status: HIT
```

## Monitoring

```bash
# Gateway health
curl http://localhost/health

# Service health (through gateway)
curl http://localhost/auth
curl http://localhost/microsite
curl http://localhost/analytics

# Nginx access logs
docker logs qr_nginx_gateway --tail 50

# Nginx error logs
docker exec qr_nginx_gateway tail -f /var/log/nginx/error.log
```

## HTTPS Setup (Optional)

For local HTTPS testing:

```bash
# Generate self-signed certificates
cd nginx
./generate-ssl-certs.sh

# Enable HTTPS in nginx.conf (uncomment server block on port 443)
# Enable SSL volume in docker-compose.yml

# Restart
docker-compose restart nginx

# Test HTTPS
curl -k https://localhost/health
```

## Production Deployment

When deploying to production:

1. **Use real SSL certificates** (Let's Encrypt)
2. **Close direct service ports** (only expose 80/443)
3. **Update DNS** to point to gateway
4. **Enable HTTPS redirect** in nginx.conf
5. **Tune rate limits** based on traffic
6. **Set up monitoring** (Prometheus nginx-exporter)

See [nginx/README.md](nginx/README.md) for detailed production guide.

## Troubleshooting

### "Gateway not responding"
```bash
# Check if nginx is running
docker-compose ps nginx

# Check logs
docker logs qr_nginx_gateway

# Restart gateway
docker-compose restart nginx
```

### "502 Bad Gateway"
```bash
# Backend service is down - check which one
docker-compose ps

# Check service logs
docker logs qr_auth_service
docker logs qr_qr_service

# Restart specific service
docker-compose restart auth-service
```

### "Rate limit errors in development"
Temporarily increase limits in `nginx/nginx.conf`:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=1000r/m;
```

Then restart:
```bash
docker-compose restart nginx
```

## Next Steps

- ✅ Gateway is now running on port 80
- ✅ All services accessible through gateway
- ✅ Rate limiting and caching enabled
- 🔜 Set up HTTPS for production
- 🔜 Configure monitoring and alerts
- 🔜 Deploy to cloud with proper DNS

## Questions?

- Check [nginx/README.md](nginx/README.md) for detailed nginx configuration
- Check [SWAGGER_DOCS.md](SWAGGER_DOCS.md) for API documentation
- Check [PRODUCTION_README.md](PRODUCTION_README.md) for deployment guide
