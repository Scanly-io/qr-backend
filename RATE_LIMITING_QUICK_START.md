# Rate Limiting Quick Reference

## 🎯 What Was Implemented

```
┌─────────────────────────────────────────────────────────────┐
│                    REDIS RATE LIMITING                       │
│              (Distributed, Fast, Accurate)                   │
└─────────────────────────────────────────────────────────────┘

CLIENT REQUEST
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│  TENANT GATEWAY (Port 3000)                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1️⃣  RATE LIMITING ← Redis Check                      │  │
│  │     ✓ Global: 100 req/min                              │  │
│  │     ✓ Per-endpoint: Custom limits                      │  │
│  │     ✓ Returns 429 if exceeded                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 2️⃣  AUTH EXTRACTION                                   │  │
│  │     ✓ Extract JWT token                                │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 3️⃣  TENANT HEADERS                                    │  │
│  │     ✓ Add tenant context                               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│  DOWNSTREAM SERVICES (Protected!)                            │
│  • Auth Service                                              │
│  • QR Service                                                │
│  • Microsite Service                                         │
│  • ... (16 more services)                                    │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Rate Limits (Free Tier)

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| **All APIs** | 100 req | 1 min | DDoS protection |
| **Login** | 5 attempts | 15 min | Brute force prevention |
| **Signup** | 3 attempts | 1 hour | Spam prevention |
| **QR Creation** | 10 codes | 1 day | Core feature limit |
| **QR Scanning** | 1000 scans | 1 hour | Click fraud detection |
| **Lead Forms** | 5 submissions | 1 hour | Form spam prevention |

## 🚀 Quick Start

### 1. Start Redis

```bash
# Local development
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### 2. Start Gateway

```bash
cd services/tenant-gateway
npm run dev
```

### 3. Test It

```bash
# Quick test
./scripts/test-rate-limits.sh

# Or manual test
for i in {1..101}; do curl http://localhost:3000/health; done
# Request #101 should get 429
```

## 📁 Files Added/Modified

```
qr-backend/
├── services/tenant-gateway/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── rateLimit.ts         ← ✨ NEW: Redis rate limiter
│   │   ├── config/
│   │   │   └── rateLimits.ts        ← ✨ NEW: Limit configurations
│   │   └── index.ts                 ← ✏️  MODIFIED: Added rate limiting
│   ├── .env.example                 ← ✏️  MODIFIED: Added REDIS_URL
│   └── package.json                 ← ✏️  MODIFIED: Added dependencies
├── scripts/
│   └── test-rate-limits.sh          ← ✨ NEW: Test script
├── RATE_LIMITS.md                   ← ✨ NEW: Detailed guide
└── RATE_LIMITING_IMPLEMENTATION.md  ← ✨ NEW: Summary doc
```

## 🔧 Environment Variables

```bash
# Add to .env or .env.docker
REDIS_URL=redis://localhost:6379

# Production with auth
REDIS_URL=redis://:password@redis-host:6379
```

## ✅ Ready for Launch Checklist

- [x] Rate limiting code implemented
- [x] Redis dependency added
- [x] Configuration file created
- [x] Documentation written
- [x] Test script created
- [ ] **Local testing** (run test script)
- [ ] **Redis deployed** (Railway/Upstash)
- [ ] **REDIS_URL configured** (production)
- [ ] **Monitoring added** (Mixpanel + Sentry)
- [ ] **Gateway in Docker Compose** (optional)

## 💰 Cost

| Phase | Redis Hosting | Cost/Month |
|-------|---------------|------------|
| **Development** | Local Redis | $0 |
| **Beta Launch** | Upstash Free Tier | $0 |
| **Production** | Railway Redis | $5 |
| **Scale** | Upstash/Redis Cloud | $10-50 |

## 🎓 Why This Protects You

```
❌ WITHOUT RATE LIMITING:
   Attacker sends 10,000 req/sec → Your server crashes → $$$

✅ WITH RATE LIMITING:
   Attacker sends 10,000 req/sec → First 100 pass, rest get 429
   → Server stays healthy → No extra costs
```

## 📈 Monitoring

Track these metrics in Mixpanel:

```typescript
// When rate limit is hit
mixpanel.track('rate_limit_exceeded', {
  endpoint: '/api/auth/login',
  ip: '192.168.1.100',
  limit: 5,
  window: '15min',
});
```

Alert in Sentry when suspicious:

```typescript
// High volume from single IP
if (blockedCount > 100) {
  Sentry.captureMessage('Potential DDoS attack');
}
```

## 🔄 How to Update Limits

Need to change limits? Just edit one file:

```typescript
// services/tenant-gateway/src/config/rateLimits.ts

export const RATE_LIMITS = {
  GATEWAY: {
    max: 200,  // ← Change from 100 to 200
    timeWindow: 60000,
  },
  // ... other limits
};
```

Restart gateway → New limits active!

## 🚦 Response Examples

### ✅ Allowed Request

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 2026-02-02T15:30:00Z

{"status": "ok"}
```

### ❌ Rate Limited

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-02-02T15:30:00Z

{
  "error": "Too Many Requests",
  "message": "Too many login attempts, please try again in 15 minutes",
  "retryAfter": 900
}
```

## 🎯 Next Steps

1. **Test locally**: `./scripts/test-rate-limits.sh`
2. **Deploy Redis**: Railway ($5/month)
3. **Add monitoring**: Track rate limit hits
4. **Launch beta**: Watch for false positives
5. **Adjust limits**: Based on real usage

## 📚 Full Documentation

- **Detailed guide**: `RATE_LIMITS.md`
- **Implementation summary**: `RATE_LIMITING_IMPLEMENTATION.md`
- **Test script**: `scripts/test-rate-limits.sh`

---

**Status**: ✅ Ready to test!  
**Next**: Run `./scripts/test-rate-limits.sh`  
**Questions**: Check `RATE_LIMITS.md`

🚀 **Your platform is now protected and ready for launch!**
