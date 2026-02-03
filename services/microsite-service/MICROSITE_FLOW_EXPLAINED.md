# Microsite Rendering Flow - Complete Explanation

## What Happens When Someone Scans a QR Code?

### The Journey

```text
User scans QR → QR points to /public/menu-qr → Your server receives request → ???
```

Let's break down that `???` part step by step.

---

## Step-by-Step Flow

### 1. User Scans QR Code

```text
Physical QR Code → Contains URL: https://yourapp.com/public/menu-qr
User's phone camera scans it → Opens in browser
Browser makes HTTP GET request to your server
```

### 2. Request Arrives at Server

```http
GET /public/menu-qr HTTP/1.1
Host: yourapp.com
User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 15_0...)
X-Forwarded-For: 203.0.113.1
```

The server receives:

- **URL path**: `/public/menu-qr`
- **Headers**: Browser info, IP address, etc.

### 3. Check Redis Cache (Fast Path)

**Why cache?**

- Restaurant has 500 customers/day scanning the same QR
- Without cache: 500 database queries (slow, expensive)
- With cache: 1 database query, 499 instant responses from Redis

```typescript
// Try to get HTML from Redis
const cached = await cacheInstance.get("microsite:menu-qr");

if (cached) {
  // ✅ Cache HIT - HTML is already in Redis!
  // This happens 99% of the time after first request
  
  // Still track analytics (who viewed it)
  sendAnalytics(...);
  
  // Return HTML instantly (~1-5ms response time)
  return res.send(cached);
}
```

**Cache HIT**: HTML is in Redis → Super fast response (~1-5ms)

**Cache MISS**: HTML not in Redis → Need to fetch from database

### 4. Load from Database (Slow Path)

Cache miss means first time someone views this QR, or cache was cleared.

```typescript
// SQL equivalent:
// SELECT * FROM microsites WHERE qr_id = 'menu-qr' LIMIT 1

const siteRows = await db
  .select()
  .from(microsites)
  .where(eq(microsites.qrId, 'menu-qr'))
  .limit(1);

const site = siteRows[0];
```

**Database query returns:**

```json
{
  "id": 123,
  "qrId": "menu-qr",
  "publishedHtml": "<html><body><h1>Our Menu</h1>...</body></html>",
  "publishedAt": "2025-11-20T10:00:00Z"
}
```

**If not found or not published:**

```typescript
if (!site || !site.publishedHtml) {
  return res.code(404).send("Microsite not published");
}
```

This means:

- QR code doesn't exist in system
- OR admin hasn't clicked "Publish" yet

### 5. Send Analytics Event

**Every view is tracked** (both cache hits and misses).

```typescript
sendAnalytics(producer, qrId, req);
```

This function:

1. **Parses User-Agent** to detect device
2. **Extracts IP address** for location tracking
3. **Sends event to Kafka**

Let's break down each part...

---

## Deep Dive: User-Agent Parsing

### What is User-Agent?

Every browser sends a User-Agent string automatically in HTTP headers:

```text
Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) 
AppleWebKit/605.1.15 (KHTML, like Gecko) 
Version/15.0 Mobile/15E148 Safari/604.1
```

This cryptic string contains:

- **Device**: iPhone
- **OS**: iOS 15.0
- **Browser**: Safari 15.0

### How UAParser Works

```typescript
const userAgent = req.headers["user-agent"] || "";
const parser = new UAParser(userAgent);
const ua = parser.getResult();
```

**Input:**

```text
"Mozilla/5.0 (iPhone; CPU iPhone OS 15_0..."
```

**Output:**

```json
{
  "device": {
    "type": "mobile",
    "vendor": "Apple",
    "model": "iPhone"
  },
  "os": {
    "name": "iOS",
    "version": "15.0"
  },
  "browser": {
    "name": "Safari",
    "version": "15.0"
  }
}
```

Now we know: **iPhone user with iOS 15, using Safari browser**

### Why This Matters

**Business decisions based on this data:**

```javascript
// After analyzing 10,000 scans
{
  "mobile": 9500,    // 95% mobile
  "desktop": 500     // 5% desktop
}
```

**Decision**: Don't waste time on desktop optimization, go mobile-first!

---

## Deep Dive: IP Address Extraction

### Why Two Places to Check?

```typescript
const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
```

#### Scenario 1: Direct Connection

```text
User → Your Server
```

Use: `req.socket.remoteAddress` → `"203.0.113.1"`

#### Scenario 2: Behind Proxy (Production Setup)

```text
User → CloudFlare/Nginx → Your Server
```

Without proxy awareness:

- `req.socket.remoteAddress` → `"10.0.0.5"` (CloudFlare's IP - WRONG!)

With proxy awareness:

- `req.headers["x-forwarded-for"]` → `"203.0.113.1"` (User's real IP - CORRECT!)

### X-Forwarded-For Header

When you use CloudFlare, nginx, or AWS Load Balancer, they add this header:

```http
X-Forwarded-For: 203.0.113.1, 70.41.3.18, 10.0.0.5
                 ^^^^^^^^^^^^  ^^^^^^^^^^^  ^^^^^^^^^
                 Real User IP  Proxy 1 IP   Proxy 2 IP
```

We take the **first IP** = real user's IP.

---

## Deep Dive: Kafka Event

### Why Kafka Instead of Direct Database?

#### Option A: Direct Database (❌ Bad)

```typescript
// In microsite service
await analyticsDb.insert(scans).values({
  qrId,
  timestamp: new Date(),
  // ...
});
```

**Problems:**

1. Microsite service now depends on analytics database
2. If analytics DB is slow, user waits
3. If analytics DB is down, microsite breaks
4. Can't scale analytics independently

#### Option B: Kafka Event (✅ Good)

```typescript
// In microsite service
producer.send({
  topic: "analytics.events",
  messages: [{ value: JSON.stringify(event) }]
});
```

**Benefits:**

1. **Decoupling**: Microsite doesn't know about analytics DB
2. **Performance**: Fire-and-forget, user doesn't wait
3. **Reliability**: Events queue if analytics service is down
4. **Scalability**: Can add 10 analytics consumers, microsite unchanged

### The Event Structure

```json
{
  "type": "microsite.viewed",
  "qrId": "menu-qr",
  "timestamp": "2025-11-29T10:30:00.000Z",
  "metadata": {
    "ip": "203.0.113.1",
    "userAgent": "Mozilla/5.0 (iPhone...",
    "deviceType": "mobile",
    "os": "iOS",
    "browser": "Safari"
  }
}
```

This event flows through Kafka to analytics-service, which stores it in the database.

---

## Deep Dive: Caching Strategy

### How Redis Caching Works

```typescript
// Key: "microsite:menu-qr"
// Value: "<html><body>...</body></html>" (the full HTML)

await cacheInstance.set(cacheKey, site.publishedHtml);
```

**First Request (Cache Miss):**

```text
User 1 scans QR
→ No cache
→ Query database (50ms)
→ Store in Redis
→ Return HTML
→ Total: ~60ms
```

**Subsequent Requests (Cache Hit):**

```text
User 2 scans same QR
→ Found in cache!
→ Return HTML instantly
→ Total: ~2ms (30x faster!)
```

### Cache Invalidation

**When to clear cache?**

- Admin updates microsite content
- Admin clicks "Publish" with new changes

**How to clear:**

```typescript
// In your publish endpoint
await redis.del(`microsite:${qrId}`);
// Next request will fetch fresh HTML from database
```

### X-Cache Header

We send this header to help with debugging:

```http
HTTP/1.1 200 OK
X-Cache: HIT
Content-Type: text/html

<html>...</html>
```

Or:

```http
HTTP/1.1 200 OK
X-Cache: MISS
Content-Type: text/html

<html>...</html>
```

**In browser DevTools:**

- `X-Cache: HIT` → Served from Redis (fast)
- `X-Cache: MISS` → Served from database (slower)

---

## Complete Flow Diagram

```text
┌─────────────────────────────────────────────────────────────┐
┌─────────────────────────────────────────────────────────────┐
│                    USER SCANS QR CODE                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │  GET /public/menu-qr │
            │  Headers:             │
            │  - User-Agent         │
            │  - X-Forwarded-For    │
            └──────────┬────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Check Redis Cache    │
            │  Key: microsite:menu-qr│
            └──────┬─────────┬──────┘
                   │         │
          Cache HIT│         │Cache MISS
                   │         │
                   ▼         ▼
         ┌─────────────┐  ┌──────────────────┐
         │Return HTML  │  │Query PostgreSQL  │
         │from Redis   │  │SELECT * FROM ... │
         │(~2ms)       │  │(~50ms)           │
         └──────┬──────┘  └────────┬─────────┘
                │                  │
                │                  ▼
                │         ┌──────────────────┐
                │         │Store in Redis    │
                │         │for next time     │
                │         └────────┬─────────┘
                │                  │
                └──────────┬───────┘
                           │
                           ▼
                ┌──────────────────────┐
                │Send Analytics Event  │
                │to Kafka (async)      │
                │- Parse User-Agent    │
                │- Extract IP          │
                │- Device/OS/Browser   │
                └──────────┬───────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │Return HTML to  │
                  │User's Browser  │
                  └────────────────┘
```

---

## Performance Numbers

### Without Caching

```text
Every request hits database
Average response: 50ms
500 users/day = 500 database queries
Database load: HIGH
```

### With Caching

```text
First request: 60ms (DB + cache store)
Next 499 requests: 2ms (from Redis)
Average response: ~2.1ms
Database load: LOW (1 query for 500 users)
```

**Result:** 95% reduction in database load, 24x faster responses

---

## Error Scenarios

### 1. Database Error

```typescript
try {
  siteRows = await db.select()...
} catch (err) {
  // Database connection failed
  return res.code(500).send("Microsite DB error");
}
```

**User sees:** "Microsite DB error"

**Fix:** Check database connection, credentials, network

### 2. Microsite Not Found

```typescript
if (!site || !site.publishedHtml) {
  return res.code(404).send("Microsite not published");
}
```

**User sees:** "Microsite not published"

**Reasons:**

- QR code ID doesn't exist in database
- Admin created microsite but hasn't published it yet

**Fix:** Publish the microsite from admin panel

### 3. Redis Down

```typescript
const cached = await cacheInstance.get(cacheKey);
// If Redis is down, this throws error
```

**Current behavior:** Request fails

**Better approach:** Add try-catch, fallback to database if Redis fails

---

## Common Questions

### Q: Why not cache in memory instead of Redis?

**Memory Cache:**

```typescript
const cache = {}; // In-memory object
cache[qrId] = html;
```

**Problems:**

- Lost on server restart
- Not shared between multiple server instances
- Limited by server RAM
- Can't evict old entries easily

**Redis:**

- Persists across restarts
- Shared between all servers
- Dedicated caching layer with LRU eviction
- Can handle terabytes of data

### Q: What if analytics event send fails?

```typescript
producer.send({...}); // We don't await this
```

**If Kafka is down:**

- Event is lost
- Microsite still works (user gets HTML)
- Analytics shows gap in data

**This is acceptable because:**

- User experience > analytics accuracy
- Missing 1-2 analytics events is OK
- Better than making user wait or showing error

### Q: How long does HTML stay cached?

Currently: **Forever** (until manually deleted)

Better approach:

```typescript
// Cache for 1 hour
await cacheInstance.set(cacheKey, html, 'EX', 3600);
```

Or invalidate on publish:

```typescript
// In publish endpoint
await redis.del(`microsite:${qrId}`);
```

### Q: Can I see what device data is being captured?

Yes! Check the analytics database:

```sql
SELECT raw_payload FROM scans 
WHERE qr_id = 'menu-qr' 
LIMIT 1;
```

Returns:

```json
{
  "ip": "203.0.113.1",
  "deviceType": "mobile",
  "os": "iOS",
  "browser": "Safari",
  "userAgent": "Mozilla/5.0..."
}
```

Then use `/analytics/menu-qr/devices` endpoint to see aggregated stats!

---

## Summary

**When user scans QR:**

1. ✅ Check Redis cache first (fast)
2. ✅ If not cached, get from database (slower)
3. ✅ Parse User-Agent to detect device/browser/OS
4. ✅ Extract IP address for location
5. ✅ Send tracking event to Kafka (async)
6. ✅ Cache HTML in Redis for next time
7. ✅ Return HTML to user

**Performance:**

- Cache hit: ~2ms ⚡
- Cache miss: ~60ms
- 95% of requests are cache hits after warmup

**Analytics captured:**

- Device type (mobile/tablet/desktop)
- Operating system (iOS/Android/Windows)
- Browser (Safari/Chrome/Firefox)
- IP address
- Timestamp

This data powers the `/analytics/:qrId/devices` and `/analytics/:qrId/patterns` endpoints!
