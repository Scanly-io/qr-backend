# Nginx API Gateway

This directory contains the Nginx reverse proxy configuration that serves as the API gateway for all microservices.

## Overview

The Nginx gateway provides:
- **Unified Entry Point**: Single endpoint for all services (`:80` instead of `:3001`, `:3002`, etc.)
- **Path-Based Routing**: Routes requests to appropriate backend services
- **Rate Limiting**: Protects against abuse and DDoS attacks
- **Response Caching**: Caches QR images and microsite HTML for performance
- **SSL/TLS Support**: HTTPS termination (production)
- **CORS Handling**: Centralized CORS configuration
- **Health Checks**: Aggregated health endpoint

## Architecture

```
Client Request
     ↓
┌─────────────────┐
│ Nginx Gateway   │  Port 80/443
│ (This Layer)    │
└────────┬────────┘
         │
    ┌────┴─────────────────────────────┐
    │                                   │
    ↓                                   ↓
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Auth    │  │ QR      │  │ Microsite│ │Analytics │
│ :3001   │  │ :3002   │  │ :3005    │  │ :3004    │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

## Route Mapping

| Gateway Path | Backend Service | Description |
|--------------|----------------|-------------|
| `/auth/*` | auth-service:3001 | User authentication (signup, login, refresh) |
| `/generate` | qr-service:3002 | Generate new QR codes |
| `/qr/*` | qr-service:3002 | QR code metadata and images |
| `/public/*` | microsite-service:3005 | Public microsite viewer (high traffic) |
| `/microsite/*` | microsite-service:3005 | Microsite management (authenticated) |
| `/analytics/*` | analytics-service:3004 | Analytics data and summaries |
| `/health` | nginx (local) | Gateway health check |

### Swagger Documentation

| Gateway Path | Backend Service | Description |
|--------------|----------------|-------------|
| `/auth-docs` | auth-service:3001/docs | Auth API documentation |
| `/qr-docs` | qr-service:3002/docs | QR API documentation |
| `/microsite-docs` | microsite-service:3005/docs | Microsite API documentation |
| `/analytics-docs` | analytics-service:3004/docs | Analytics API documentation |

## Rate Limiting

Rate limits protect against abuse:

| Endpoint Type | Limit | Burst | Purpose |
|--------------|-------|-------|---------|
| `/auth/*` | 20 req/min/IP | 10 | Prevent brute force attacks |
| `/public/*` | 300 req/min/IP | 50 | Allow QR scan bursts |
| `/generate`, `/qr/*`, `/microsite/*`, `/analytics/*` | 100 req/min/IP | 20 | General API protection |

**Rate limit response:**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later."
}
```

## Caching

### QR Images (`/qr/:id/image`)
- **Cache Duration**: 24 hours
- **Storage**: `/var/cache/nginx/qr_images`
- **Max Size**: 500MB
- **Strategy**: Serve stale on error, background updates
- **Header**: `X-Cache-Status: HIT|MISS|STALE`

### Microsite HTML (`/public/:qrId`)
- **Cache Duration**: 5 minutes
- **Storage**: `/var/cache/nginx/microsite`
- **Max Size**: 100MB
- **Strategy**: Serve stale on error, background updates
- **Header**: `X-Cache-Status: HIT|MISS|STALE`

## Usage

### Development (HTTP only)

1. **Build and start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Access via gateway:**
   ```bash
   # Instead of http://localhost:3001/auth/login
   curl -X POST http://localhost/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   
   # Instead of http://localhost:3002/generate
   curl -X POST http://localhost/generate \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"targetUrl":"https://example.com"}'
   
   # Instead of http://localhost:3005/public/my-qr-123
   curl http://localhost/public/my-qr-123
   ```

3. **Check gateway health:**
   ```bash
   curl http://localhost/health
   ```

### Production (HTTPS)

1. **Generate SSL certificates** (for local testing):
   ```bash
   cd nginx
   ./generate-ssl-certs.sh
   ```

2. **Enable HTTPS in nginx.conf:**
   - Uncomment the `server` block listening on port 443
   - Uncomment SSL certificate paths

3. **Enable SSL volume in docker-compose.yml:**
   ```yaml
   nginx:
     volumes:
       - ./nginx/ssl:/etc/nginx/ssl:ro  # Uncomment this line
   ```

4. **Restart:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

5. **Access via HTTPS:**
   ```bash
   curl https://localhost/health
   # (Accept self-signed certificate warning in browser)
   ```

### Production with Real SSL (Let's Encrypt)

For production deployment with real SSL certificates:

1. **Obtain certificates:**
   ```bash
   # Using certbot (outside Docker)
   certbot certonly --standalone -d api.scanly.io
   ```

2. **Update nginx.conf:**
   ```nginx
   ssl_certificate /etc/nginx/ssl/fullchain.pem;
   ssl_certificate_key /etc/nginx/ssl/privkey.pem;
   ```

3. **Mount certificates in docker-compose.yml:**
   ```yaml
   nginx:
     volumes:
       - /etc/letsencrypt/live/api.scanly.io:/etc/nginx/ssl:ro
   ```

4. **Add HTTP to HTTPS redirect:**
   ```nginx
   server {
       listen 80;
       server_name api.scanly.io;
       return 301 https://$server_name$request_uri;
   }
   ```

## Testing

### Test Rate Limiting

```bash
# Send 25 auth requests rapidly (should get rate limited after 20)
for i in {1..25}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
done
# Expected: First 20-30 return 400/200, then 429 (rate limited)
```

### Test Caching

```bash
# First request (MISS)
curl -I http://localhost/public/test-qr-123 | grep X-Cache-Status
# Output: X-Cache-Status: MISS

# Second request (HIT)
curl -I http://localhost/public/test-qr-123 | grep X-Cache-Status
# Output: X-Cache-Status: HIT
```

### Test All Routes

```bash
# Health check
curl http://localhost/health

# Auth endpoints
curl -X POST http://localhost/auth/signup -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

curl -X POST http://localhost/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# QR endpoints (need token from login)
TOKEN="<your-jwt-token>"
curl -X POST http://localhost/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://example.com"}'

curl http://localhost/qr/test-qr-123/image -o qr.png

# Microsite endpoints
curl http://localhost/public/test-qr-123

# Analytics endpoints
curl "http://localhost/analytics/test-qr-123/summary"
```

## Monitoring

### Check Nginx Logs

```bash
# Access logs (all requests)
docker logs qr_nginx_gateway | tail -f

# Error logs
docker exec qr_nginx_gateway tail -f /var/log/nginx/error.log
```

### Check Cache Status

```bash
# Cache hit/miss ratio
docker exec qr_nginx_gateway ls -lh /var/cache/nginx/microsite
docker exec qr_nginx_gateway ls -lh /var/cache/nginx/qr_images
```

### Performance Metrics

Nginx logs include timing information:
- `rt`: Request time (total)
- `uct`: Upstream connect time
- `uht`: Upstream header time
- `urt`: Upstream response time

Example log entry:
```
127.0.0.1 - - [02/Dec/2025:10:30:45 +0000] "GET /public/test-qr HTTP/1.1" 200 1234 
rt=0.045 uct="0.001" uht="0.020" urt="0.043"
```

## Configuration Files

```
nginx/
├── nginx.conf              # Main Nginx configuration
├── Dockerfile              # Nginx container build
├── .dockerignore          # Build context optimization
├── generate-ssl-certs.sh  # Self-signed cert generator
├── ssl/                   # SSL certificates (git-ignored)
│   ├── privkey.pem
│   └── fullchain.pem
└── README.md              # This file
```

## Troubleshooting

### Gateway returns 502 Bad Gateway

**Cause**: Backend service is down or unreachable.

**Fix:**
```bash
# Check service status
docker-compose ps

# Check service logs
docker logs qr_auth_service
docker logs qr_qr_service

# Restart specific service
docker-compose restart auth-service
```

### Gateway returns 429 Too Many Requests

**Cause**: Rate limit exceeded.

**Fix**: Wait 60 seconds or adjust rate limits in `nginx.conf`:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/m;  # Increase from 100
```

### Cache not working (always MISS)

**Cause**: Cache keys not matching or cache volume issues.

**Fix:**
```bash
# Check cache directory
docker exec qr_nginx_gateway ls -la /var/cache/nginx/

# Clear cache
docker exec qr_nginx_gateway rm -rf /var/cache/nginx/microsite/*
docker exec qr_nginx_gateway rm -rf /var/cache/nginx/qr_images/*
```

### HTTPS not working

**Cause**: SSL certificates missing or incorrectly mounted.

**Fix:**
```bash
# Generate self-signed certs
cd nginx
./generate-ssl-certs.sh

# Verify certificates exist
ls -la nginx/ssl/

# Check nginx config
docker exec qr_nginx_gateway nginx -t

# Restart nginx
docker-compose restart nginx
```

## Production Recommendations

1. **Use real SSL certificates** (Let's Encrypt, AWS Certificate Manager)
2. **Enable HTTP to HTTPS redirect**
3. **Configure DNS** to point to gateway IP
4. **Set up CloudFlare** or AWS CloudFront for additional DDoS protection
5. **Monitor with Prometheus** nginx-exporter
6. **Enable access logging** to a centralized service (Datadog, Loki)
7. **Tune rate limits** based on actual traffic patterns
8. **Scale horizontally** with multiple nginx instances behind a load balancer

## See Also

- [docker-compose.yml](../docker-compose.yml) - Service orchestration
- [PRODUCTION_README.md](../PRODUCTION_README.md) - Production deployment guide
- [SWAGGER_DOCS.md](../SWAGGER_DOCS.md) - API documentation
