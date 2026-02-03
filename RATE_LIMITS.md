# Rate Limiting Configuration

This document describes the rate limiting implementation for protecting the platform from abuse.

## Overview

We use **Redis-based distributed rate limiting** to protect all endpoints. This ensures:
- Protection against DDoS attacks
- Prevention of brute force attempts
- Fair usage enforcement
- Consistent limits across multiple gateway instances

## Architecture

```
Client Request
     ↓
Gateway (Check Redis for rate limit)
     ↓
[ALLOWED] → Forward to Service
[BLOCKED] → Return 429 Too Many Requests
```

## Rate Limits (Free Tier)

### Global Gateway Protection
- **Limit**: 100 requests per minute (per IP)
- **Purpose**: Prevent DDoS and general abuse
- **Applies to**: All API endpoints

### Authentication Endpoints

#### Login (`POST /api/auth/login`)
- **Limit**: 5 attempts per 15 minutes (per IP)
- **Purpose**: Prevent brute force password attacks
- **Response**: 429 with retry-after header

#### Signup (`POST /api/auth/signup`)
- **Limit**: 3 attempts per hour (per IP)
- **Purpose**: Prevent fake account spam
- **Response**: 429 with retry-after header

#### Password Reset (`POST /api/auth/password-reset`)
- **Limit**: 3 requests per hour (per email)
- **Purpose**: Prevent email spam
- **Response**: 429 with retry-after header

### QR Service Endpoints

#### QR Code Creation (`POST /api/qr/create`)
- **Limit**: 10 QR codes per day (per user)
- **Purpose**: Prevent spam QR generation
- **Response**: 429 with upgrade message (for future paid tiers)

#### QR Code Scanning (`GET /api/qr/scan/:id`)
- **Limit**: 1000 scans per hour (per IP)
- **Purpose**: Prevent click fraud while allowing legitimate traffic
- **Response**: 429 with retry-after header

### Microsite Service Endpoints

#### Lead Submission (`POST /api/microsites/:id/leads`)
- **Limit**: 5 submissions per hour (per IP)
- **Purpose**: Prevent spam form submissions
- **Response**: 429 with retry-after header

## Implementation Details

### Technology Stack
- **Redis**: For distributed rate limit storage
- **Sliding Window**: Accurate rate limiting algorithm
- **Fastify Hooks**: Middleware integration

### Key Components

1. **Rate Limit Middleware** (`middleware/rateLimit.ts`)
   - Redis connection management
   - Sliding window implementation
   - Rate limit checking logic

2. **Rate Limit Config** (`config/rateLimits.ts`)
   - Centralized limit definitions
   - Easy to update without code changes
   - Route-specific configurations

3. **Gateway Integration** (`index.ts`)
   - Applied as first middleware (before auth)
   - Protects all downstream services
   - Consistent enforcement

### Redis Key Structure

```
rate-limit:<endpoint>:<identifier>
```

**Examples:**
- `rate-limit:/api/auth/login:192.168.1.100`
- `rate-limit:/api/qr/create:user_123`
- `rate-limit:/api/microsites/leads:192.168.1.100`

### Response Headers

Every response includes rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 2026-02-02T15:30:00Z
```

### Error Response (429 Too Many Requests)

```json
{
  "error": "Too Many Requests",
  "message": "Too many login attempts, please try again in 15 minutes",
  "retryAfter": 900
}
```

## Environment Variables

```bash
# Redis connection for rate limiting
REDIS_URL=redis://localhost:6379

# Or for production with authentication
REDIS_URL=redis://:password@redis-host:6379
```

## Testing Rate Limits

### Test with curl:

```bash
# Test global rate limit (100 req/min)
for i in {1..101}; do
  curl http://localhost:3000/api/qr/list
done

# Should get 429 on 101st request

# Test login rate limit (5 attempts/15min)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done

# Should get 429 on 6th attempt
```

### Test with JavaScript:

```javascript
// Test rate limit in browser console
async function testRateLimit() {
  const responses = [];
  for (let i = 0; i < 101; i++) {
    const res = await fetch('/api/qr/list');
    responses.push({
      status: res.status,
      remaining: res.headers.get('X-RateLimit-Remaining')
    });
  }
  console.table(responses);
}

testRateLimit();
```

## Monitoring

### Key Metrics to Track

1. **Rate Limit Hits**: How many 429 responses
2. **Top Rate Limited IPs**: Potential attackers
3. **Service-specific limits**: Which endpoints hit most
4. **False positives**: Legitimate users blocked

### Recommended Tools
- **Mixpanel**: Track `rate_limit_exceeded` events
- **Sentry**: Alert on high rate limit violations
- **Redis**: Monitor key counts and memory usage

## Future Enhancements (Paid Tiers)

When you add paid plans, you can easily extend this:

```typescript
// Example: Plan-based limits
export const RATE_LIMITS_BY_PLAN = {
  FREE: {
    QR_CREATION: { max: 10, timeWindow: 86400000 }, // 10/day
  },
  PRO: {
    QR_CREATION: { max: 100, timeWindow: 86400000 }, // 100/day
  },
  ENTERPRISE: {
    QR_CREATION: { max: 1000, timeWindow: 86400000 }, // 1000/day
  },
};

// In middleware, check user's plan
const userPlan = request.user?.plan || 'FREE';
const limit = RATE_LIMITS_BY_PLAN[userPlan].QR_CREATION;
```

## Deployment Checklist

- [ ] Redis instance deployed (Railway/Upstash free tier)
- [ ] `REDIS_URL` environment variable set
- [ ] Rate limiting tested locally
- [ ] Monitoring configured (Mixpanel + Sentry)
- [ ] Documentation shared with users
- [ ] Support ready for false positive reports

## Redis Hosting Options

### Free Tier Launch
- **Upstash**: Free tier (10K commands/day)
- **Railway**: $5/month Redis addon
- **Redis Cloud**: Free 30MB

### Production Scale
- **Upstash**: $10-50/month (pay per use)
- **Railway**: $5-20/month
- **AWS ElastiCache**: $15-50/month

## Security Considerations

1. **IP Spoofing**: Use `trustProxy: true` in Fastify to get real client IP
2. **Distributed Attacks**: Rate limit by IP prevents coordinated attacks
3. **Fail Open**: If Redis fails, allow requests (don't block everything)
4. **Monitoring**: Alert on suspicious patterns (rapid 429s from same IP)

## Support

If users hit rate limits legitimately:
1. Check their usage patterns
2. Consider per-user limits (not just IP)
3. Provide clear upgrade path to paid plans
4. Whitelist known good IPs (corporate offices, etc.)

---

**Last Updated**: February 2, 2026  
**Owner**: Platform Team  
**Status**: ✅ Implemented and Ready for Launch
