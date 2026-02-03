# API Gateway Implementation Summary

## Overview

Added **Nginx reverse proxy** as an API gateway to provide a unified entry point for all microservices.

**Date**: December 2, 2025
**Status**: ✅ Complete and ready for testing

---

## What Was Added

### 1. Nginx Configuration Files

**Location**: `/nginx/`

```
nginx/
├── nginx.conf              # Main gateway configuration (500+ lines)
├── Dockerfile              # Nginx container build
├── .dockerignore          # Build optimization
├── generate-ssl-certs.sh  # SSL certificate generator
├── ssl/                   # SSL certificates directory
│   └── .gitignore         # Prevent committing certificates
└── README.md              # Comprehensive documentation (300+ lines)
```

### 2. Docker Compose Integration

**Updated**: `docker-compose.yml`

Added nginx service with:
- Port bindings: `80:80` (HTTP), `443:443` (HTTPS)
- Dependencies on all backend services
- Volume mounts for config and cache
- Health check endpoint

### 3. Testing & Documentation

**New Files**:
- `test-gateway.sh` - Automated gateway testing script
- `GATEWAY_QUICK_START.md` - Quick start guide for developers
- `nginx/README.md` - Detailed nginx configuration documentation

---

## Features Implemented

### ✅ Path-Based Routing

All services accessible through single endpoint:

| Path | Backend | Description |
|------|---------|-------------|
| `/auth/*` | auth-service:3001 | Authentication (signup, login, refresh) |
| `/generate` | qr-service:3002 | QR code generation |
| `/qr/*` | qr-service:3002 | QR metadata and images |
| `/public/*` | microsite-service:3005 | Public microsite viewer |
| `/microsite/*` | microsite-service:3005 | Microsite management |
| `/analytics/*` | analytics-service:3004 | Analytics and reporting |
| `/health` | nginx | Gateway health check |

### ✅ Rate Limiting

Protects against abuse with per-IP limits:

- **Auth endpoints**: 20 requests/min (burst: 10) - Prevents brute force
- **Public microsites**: 300 requests/min (burst: 50) - Allows QR scan bursts
- **API endpoints**: 100 requests/min (burst: 20) - General protection

Rate-limited requests return `429 Too Many Requests` with JSON error.

### ✅ Response Caching

Improves performance for static/semi-static content:

**QR Images** (`/qr/:id/image`):
- Cache duration: 24 hours
- Max size: 500MB
- Strategy: Serve stale on error, background updates
- Header: `X-Cache-Status: HIT|MISS|STALE`

**Microsite HTML** (`/public/:qrId`):
- Cache duration: 5 minutes
- Max size: 100MB
- Strategy: Serve stale on error, background updates
- Header: `X-Cache-Status: HIT|MISS|STALE`

### ✅ SSL/TLS Support

Ready for HTTPS:
- Self-signed certificate generator for development
- Configuration for production SSL (Let's Encrypt)
- TLS 1.2 and 1.3 support
- HTTP/2 ready

### ✅ CORS Handling

Centralized CORS configuration:
- Allow all origins (development mode)
- Support for preflight OPTIONS requests
- Configurable for production restrictions

### ✅ Health Checks

Nginx includes health check:
- Endpoint: `/health`
- Returns gateway status and timestamp
- Docker healthcheck configured
- Can be used by load balancers

### ✅ Performance Optimizations

- Gzip compression for text/JSON responses
- HTTP keepalive connections to backends
- Connection pooling (32-64 connections)
- Configurable timeouts
- Fail-over on backend errors

### ✅ Swagger Documentation Routing

All Swagger UIs accessible through gateway:
- `/auth-docs` → auth-service docs
- `/qr-docs` → qr-service docs
- `/microsite-docs` → microsite-service docs
- `/analytics-docs` → analytics-service docs

---

## Architecture Change

### Before (Direct Service Access)

```
Client → auth-service:3001
Client → qr-service:3002
Client → microsite-service:3005
Client → analytics-service:3004
```

**Issues**:
- 4 different endpoints to manage
- No unified rate limiting
- No centralized caching
- No SSL termination
- CORS configured per-service

### After (Gateway Pattern)

```
Client → nginx:80/443
          ├─→ auth-service:3001
          ├─→ qr-service:3002
          ├─→ microsite-service:3005
          └─→ analytics-service:3004
```

**Benefits**:
- Single endpoint (`http://localhost`)
- Unified rate limiting across all services
- Centralized caching layer
- SSL termination at gateway
- CORS handled in one place
- Production-ready architecture

---

## How to Use

### Quick Start

```bash
# Start all services with gateway
docker-compose up -d

# Test the gateway
./test-gateway.sh

# Access services through gateway
curl http://localhost/health
curl http://localhost/auth
curl http://localhost/qr-docs
```

### Example Workflow

```bash
# 1. Signup (via gateway)
curl -X POST http://localhost/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 2. Login (via gateway)
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 3. Generate QR (via gateway)
curl -X POST http://localhost/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://example.com"}'

# 4. View public microsite (via gateway)
curl http://localhost/public/my-qr-123
```

### Direct Service Access (Still Available)

For debugging, direct ports are still accessible:
- `http://localhost:3001` - Auth service
- `http://localhost:3002` - QR service
- `http://localhost:3005` - Microsite service
- `http://localhost:3004` - Analytics service

**Production Note**: Only port 80/443 should be exposed publicly.

---

## Configuration Files

### nginx.conf Highlights

**Upstream Definitions**:
```nginx
upstream auth_service {
    server auth-service:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

**Rate Limiting Zones**:
```nginx
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=20r/m;
limit_req_zone $binary_remote_addr zone=public_limit:10m rate=300r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
```

**Caching**:
```nginx
proxy_cache_path /var/cache/nginx/microsite 
                 levels=1:2 
                 keys_zone=microsite_cache:10m 
                 max_size=100m 
                 inactive=1h;
```

**Location Block Example**:
```nginx
location /auth {
    limit_req zone=auth_limit burst=10 nodelay;
    proxy_pass http://auth_service;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

---

## Testing

### Automated Testing

```bash
# Run comprehensive gateway tests
./test-gateway.sh
```

Tests include:
- Gateway health check
- All service route accessibility
- Swagger documentation routes
- Rate limiting verification
- Cache hit/miss validation

### Manual Testing

```bash
# Test rate limiting
for i in {1..25}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost/auth
done
# Should see 429 after ~20 requests

# Test caching
curl -I http://localhost/public/test | grep X-Cache-Status
# First: X-Cache-Status: MISS
# Second: X-Cache-Status: HIT
```

---

## Monitoring

### View Logs

```bash
# Gateway access logs (all requests)
docker logs qr_nginx_gateway

# Gateway error logs
docker exec qr_nginx_gateway tail -f /var/log/nginx/error.log

# Check cache size
docker exec qr_nginx_gateway du -sh /var/cache/nginx/*
```

### Metrics in Logs

Nginx logs include performance metrics:
- `rt` - Request time (total)
- `uct` - Upstream connect time
- `uht` - Upstream header time
- `urt` - Upstream response time

---

## Production Deployment

### Checklist

- [ ] Generate real SSL certificates (Let's Encrypt)
- [ ] Update nginx.conf with production domain
- [ ] Enable HTTPS server block in nginx.conf
- [ ] Configure HTTP → HTTPS redirect
- [ ] Close direct service ports (firewall rules)
- [ ] Tune rate limits based on traffic patterns
- [ ] Set up monitoring (Prometheus nginx-exporter)
- [ ] Configure log aggregation (Datadog, Loki)
- [ ] Add health check to load balancer
- [ ] Test failover scenarios

### SSL Certificates (Production)

```bash
# Using certbot
certbot certonly --standalone -d api.scanly.io

# Update docker-compose.yml
volumes:
  - /etc/letsencrypt/live/api.scanly.io:/etc/nginx/ssl:ro
```

### Domain Configuration

Update `nginx.conf`:
```nginx
server_name api.scanly.io;
```

DNS A record:
```
api.scanly.io → <your-server-ip>
```

---

## Troubleshooting

### Gateway returns 502 Bad Gateway

**Cause**: Backend service down or unreachable

**Fix**:
```bash
docker-compose ps              # Check service status
docker logs qr_auth_service    # Check service logs
docker-compose restart auth-service
```

### Gateway returns 429 Too Many Requests

**Cause**: Rate limit exceeded

**Fix**: Wait 60 seconds or adjust limits in `nginx.conf`:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/m;
```

### Cache not working

**Cause**: Volume issues or cache key mismatch

**Fix**:
```bash
# Clear cache
docker exec qr_nginx_gateway rm -rf /var/cache/nginx/*

# Restart nginx
docker-compose restart nginx
```

---

## Performance Impact

### Expected Improvements

**With Caching**:
- QR image requests: ~1-2ms (vs ~50ms without cache)
- Microsite HTML: ~2-5ms (vs ~100-200ms without cache)
- 90%+ cache hit rate for public content

**With Connection Pooling**:
- Reduced connection overhead to backends
- Faster response times for API requests

**With Gzip Compression**:
- 60-80% reduction in response size for JSON/HTML
- Faster transfer times, especially on mobile

---

## Files Modified/Created

### New Files
- `nginx/nginx.conf` (500+ lines)
- `nginx/Dockerfile`
- `nginx/.dockerignore`
- `nginx/generate-ssl-certs.sh`
- `nginx/ssl/.gitignore`
- `nginx/README.md` (300+ lines)
- `test-gateway.sh`
- `GATEWAY_QUICK_START.md`
- `GATEWAY_IMPLEMENTATION_SUMMARY.md` (this file)

### Modified Files
- `docker-compose.yml` - Added nginx service and nginx_cache volume

---

## Next Steps

1. **Test the gateway**:
   ```bash
   docker-compose up -d
   ./test-gateway.sh
   ```

2. **Update client applications** to use `http://localhost` instead of individual ports

3. **Review nginx logs** to ensure routing works correctly

4. **Optional: Generate SSL certificates** for HTTPS testing:
   ```bash
   cd nginx
   ./generate-ssl-certs.sh
   ```

5. **Production**: Follow the production deployment checklist above

---

## Documentation

- **Quick Start**: [GATEWAY_QUICK_START.md](GATEWAY_QUICK_START.md)
- **Detailed Config**: [nginx/README.md](nginx/README.md)
- **Production Guide**: [PRODUCTION_README.md](PRODUCTION_README.md)
- **API Docs**: [SWAGGER_DOCS.md](SWAGGER_DOCS.md)

---

## Questions or Issues?

- Check nginx logs: `docker logs qr_nginx_gateway`
- Review configuration: `nginx/nginx.conf`
- Test connectivity: `./test-gateway.sh`
- Verify services: `docker-compose ps`

**Status**: ✅ Ready for testing and integration
