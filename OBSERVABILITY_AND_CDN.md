# Complete Architecture with CDN & Observability

## 🎯 Production-Ready Architecture Diagram

### Full System with CDN, Monitoring, and Analytics

```mermaid
flowchart TB
%% =========================
%% CLIENT LAYER
%% =========================
subgraph Client["👥 Client Layer"]
    Browser[Web Browser<br/>React SPA]
    Mobile[Mobile App]
end

%% =========================
%% CDN & EDGE LAYER
%% =========================
subgraph CDN["🌐 CDN & Edge Layer"]
    CF[Cloudflare CDN<br/>Static Assets]
    R2[Cloudflare R2<br/>Image Storage]
    LB[Load Balancer]
end

%% =========================
%% API LAYER
%% =========================
subgraph API["🛡️ API Gateway Layer"]
    Nginx[Nginx<br/>SSL Termination]
    Gateway["Tenant Gateway<br/>━━━━━━━━━━━━━━<br/>Rate Limiting<br/>Input Validation<br/>Security Headers<br/>Tenant Context"]
end

%% =========================
%% SERVICES
%% =========================
subgraph Services["🎯 Backend Services"]
    Auth[Auth Service]
    Core[Core Services<br/>QR | Microsites | Domains]
    Analytics[Analytics Services<br/>Tracking | Insights | ML]
    Enterprise[Enterprise Services<br/>Billing | Teams | Assets]
end

%% =========================
%% EVENT BUS
%% =========================
subgraph Events["🚀 Event Streaming"]
    Kafka[Kafka/Redpanda<br/>Event Bus]
end

%% =========================
%% DATA LAYER
%% =========================
subgraph Data["🗄️ Data Layer"]
    Postgres[(PostgreSQL<br/>Multi-Tenant)]
    Redis[(Redis<br/>Cache & Rate Limits)]
end

%% =========================
%% OBSERVABILITY
%% =========================
subgraph Observability["📊 Observability & Analytics"]
    Sentry[Sentry<br/>Error Tracking]
    Mixpanel[Mixpanel<br/>Product Analytics]
    Logs[CloudWatch Logs<br/>Centralized Logging]
    Metrics[Prometheus<br/>System Metrics]
    Grafana[Grafana<br/>Dashboards]
end

%% =========================
%% EXTERNAL SERVICES
%% =========================
subgraph External["🔌 External Integrations"]
    Stripe[Stripe<br/>Payments]
    SendGrid[SendGrid<br/>Email]
    Twilio[Twilio<br/>SMS]
end

%% =========================
%% TRAFFIC FLOW
%% =========================
Browser --> CF
Mobile --> CF

CF -->|Static Assets| Browser
CF --> LB
LB --> Nginx
Nginx --> Gateway

Gateway --> Auth
Gateway --> Services

Services -->|Publish Events| Kafka
Kafka -->|Consume| Analytics

%% =========================
%% DATA CONNECTIONS
%% =========================
Gateway -.->|Rate Limits| Redis
Auth --> Postgres
Services --> Postgres
Analytics --> Postgres

Enterprise -.->|Upload| R2
R2 -.->|Serve via CDN| CF

%% =========================
%% OBSERVABILITY CONNECTIONS
%% =========================
Gateway -.->|Errors| Sentry
Services -.->|Errors| Sentry
Gateway -.->|Events| Mixpanel
Services -.->|Events| Mixpanel
Services -.->|Logs| Logs
Services -.->|Metrics| Metrics
Metrics -.->|Visualize| Grafana

%% =========================
%% EXTERNAL INTEGRATIONS
%% =========================
Enterprise -.->|Payments| Stripe
Services -.->|Email| SendGrid
Services -.->|SMS| Twilio

%% =========================
%% STYLES
%% =========================
classDef client fill:#3b82f6,stroke:#1d4ed8,color:#fff
classDef cdn fill:#f59e0b,stroke:#d97706,color:#fff
classDef api fill:#7c3aed,stroke:#5b21b6,color:#fff
classDef services fill:#10b981,stroke:#047857,color:#fff
classDef events fill:#ec4899,stroke:#be185d,color:#fff
classDef data fill:#fde68a,stroke:#f59e0b,color:#000
classDef observability fill:#ef4444,stroke:#b91c1c,color:#fff
classDef external fill:#6366f1,stroke:#4338ca,color:#fff

class Browser,Mobile client
class CF,R2,LB cdn
class Nginx,Gateway api
class Auth,Core,Analytics,Enterprise services
class Kafka events
class Postgres,Redis data
class Sentry,Mixpanel,Logs,Metrics,Grafana observability
class Stripe,SendGrid,Twilio external
```

---

## 🖼️ CDN Architecture Detail

### How Assets Flow Through the System

```
User uploads image:
1. Browser → POST /api/assets/upload
2. Gateway → validates file type, size
3. Asset Service → uploads to R2
4. R2 returns: https://r2.yourdomain.com/qr-codes/abc123.png
5. Cloudflare CDN caches it globally
6. User accesses: https://cdn.yourdomain.com/qr-codes/abc123.png
   ├── First request: Fetches from R2 (slow, ~500ms)
   └── Subsequent: Serves from edge cache (fast, ~20ms)
```

### CDN Configuration

**R2 + Cloudflare Setup:**
```typescript
// services/asset-service/src/storage/r2.ts

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // https://abc123.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadAsset(
  file: Buffer, 
  key: string, 
  contentType: string
) {
  await r2Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000', // 1 year cache
  }));
  
  // Return CDN URL, not R2 direct URL
  return `https://cdn.yourdomain.com/${key}`;
}
```

**What gets cached:**
- ✅ QR code images (generated once, accessed millions of times)
- ✅ User logos/avatars
- ✅ Microsite assets (backgrounds, images)
- ✅ Frontend static files (JS, CSS)
- ❌ API responses (too dynamic)

---

## 📊 Observability & Analytics Detail

### 1. **Mixpanel** (Product Analytics)

**What data goes to Mixpanel:**
```typescript
// Track user actions for product insights

// services/tenant-gateway/src/middleware/analytics.ts
import mixpanel from 'mixpanel';

const mp = mixpanel.init(process.env.MIXPANEL_TOKEN);

export function trackEvent(eventName: string, properties: object) {
  mp.track(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
}

// Usage in services:
trackEvent('QR Code Created', {
  userId: 'user_123',
  tenantId: 'tenant_acme',
  qrType: 'url',
  plan: 'pro',
});

trackEvent('Microsite Published', {
  userId: 'user_123',
  tenantId: 'tenant_acme',
  blockCount: 5,
  hasCustomDomain: true,
});

trackEvent('Rate Limit Hit', {
  tenantId: 'tenant_acme',
  endpoint: '/api/qr',
  limit: 100,
  attemptedRequests: 150,
});
```

**Mixpanel Data Storage:**
- **Your side:** You SEND events to Mixpanel API
- **Mixpanel side:** They store it in THEIR cloud database
- **You access:** Via Mixpanel dashboard or API

**Data sent to Mixpanel (JSON):**
```json
{
  "event": "QR Code Created",
  "properties": {
    "distinct_id": "user_123",
    "tenant_id": "tenant_acme",
    "qr_type": "url",
    "plan": "pro",
    "time": 1643836800,
    "$browser": "Chrome",
    "$os": "macOS"
  }
}
```

**You DON'T store Mixpanel data yourself.** It's a SaaS service—you send events, they store and analyze.

---

### 2. **Sentry** (Error Tracking)

**What data goes to Sentry:**
```typescript
// services/tenant-gateway/src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of requests for performance monitoring
});

// Automatic error capture
server.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error, {
    contexts: {
      request: {
        method: request.method,
        url: request.url,
        headers: request.headers,
      },
      user: {
        id: request.headers['x-user-id'],
        tenant: request.headers['x-tenant-id'],
      },
    },
  });
  
  reply.code(500).send({ error: 'Internal server error' });
});
```

**Sentry Data Storage:**
- **Your side:** You SEND errors to Sentry API
- **Sentry side:** They store stack traces, context, breadcrumbs
- **You access:** Via Sentry dashboard

**Example error sent to Sentry:**
```json
{
  "exception": {
    "type": "ValidationError",
    "value": "Invalid email format",
    "stacktrace": "..."
  },
  "user": {
    "id": "user_123",
    "tenant": "tenant_acme"
  },
  "request": {
    "url": "/api/auth/signup",
    "method": "POST"
  },
  "breadcrumbs": [
    {"message": "User started signup", "timestamp": 1643836800},
    {"message": "Input validation failed", "timestamp": 1643836801}
  ]
}
```

---

### 3. **CloudWatch Logs** (Centralized Logging)

**What data goes to CloudWatch:**
```typescript
// services/tenant-gateway/src/logger.ts
import winston from 'winston';
import CloudWatchTransport from 'winston-cloudwatch';

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new CloudWatchTransport({
      logGroupName: '/qr-platform/tenant-gateway',
      logStreamName: `${process.env.NODE_ENV}-${Date.now()}`,
      awsRegion: 'us-east-1',
    }),
  ],
});

// Usage
logger.info('QR code created', {
  userId: 'user_123',
  tenantId: 'tenant_acme',
  qrId: 'qr_789',
  duration: 45, // ms
});

logger.error('Database connection failed', {
  error: err.message,
  retries: 3,
});
```

**CloudWatch Data Storage:**
- **Your side:** You SEND logs via AWS SDK
- **AWS side:** Stores in CloudWatch Logs (AWS infrastructure)
- **Retention:** Configurable (7 days, 30 days, forever)

---

### 4. **Prometheus + Grafana** (System Metrics)

**What data goes to Prometheus:**
```typescript
// services/tenant-gateway/src/metrics.ts
import client from 'prom-client';

// Define metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const rateLimitHits = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['tenant_id', 'endpoint'],
});

// Collect metrics
server.addHook('onResponse', (request, reply, done) => {
  const duration = reply.getResponseTime() / 1000; // seconds
  
  httpRequestDuration.labels(
    request.method,
    request.routerPath,
    reply.statusCode.toString()
  ).observe(duration);
  
  done();
});

// Expose metrics endpoint
server.get('/metrics', async (request, reply) => {
  return client.register.metrics();
});
```

**Prometheus Data Storage:**
- **Your side:** Expose `/metrics` endpoint
- **Prometheus:** Scrapes your endpoints every 15s
- **Prometheus storage:** Time-series database (local or cloud)
- **Grafana:** Queries Prometheus for visualization

**Metrics format (Prometheus scrapes this):**
```
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",route="/api/qr",status_code="200",le="0.1"} 45
http_request_duration_seconds_bucket{method="POST",route="/api/qr",status_code="200",le="0.5"} 98
http_request_duration_seconds_sum{method="POST",route="/api/qr",status_code="200"} 12.5
http_request_duration_seconds_count{method="POST",route="/api/qr",status_code="200"} 100

# TYPE rate_limit_hits_total counter
rate_limit_hits_total{tenant_id="tenant_acme",endpoint="/api/qr"} 15
```

---

## 📊 Data Storage Summary

| Tool | What You Store | Where It's Stored | How You Access |
|------|----------------|-------------------|----------------|
| **PostgreSQL** | User data, QR codes, microsites | Your database server | SQL queries |
| **Redis** | Rate limits, sessions, cache | Your Redis server | Redis commands |
| **Cloudflare R2** | Images, QR codes, assets | Cloudflare's storage | S3 API |
| **Mixpanel** | User events, product analytics | Mixpanel's cloud | Mixpanel dashboard/API |
| **Sentry** | Errors, stack traces | Sentry's cloud | Sentry dashboard |
| **CloudWatch** | Application logs | AWS infrastructure | AWS Console/API |
| **Prometheus** | System metrics (CPU, memory, requests) | Prometheus server (your infra) | Prometheus queries |
| **Grafana** | Nothing (just visualizes) | N/A | Grafana dashboards |

**Key Insight:**
- **Own infrastructure:** PostgreSQL, Redis, Prometheus
- **SaaS services:** Mixpanel, Sentry, CloudWatch (you send data, they store it)

---

## 🎯 Updated Architecture with Data Flows

```
User Action:
├── Creates QR Code
│   ├── Data stored: PostgreSQL ✅
│   ├── Event sent: Mixpanel ("QR Code Created") ✅
│   ├── Metrics: Prometheus (http_requests_total++) ✅
│   └── Logs: CloudWatch ("QR created for tenant_acme") ✅
│
├── QR Code Generation
│   ├── Image stored: Cloudflare R2 ✅
│   ├── Served via: Cloudflare CDN ✅
│   └── Cache: 1 year (static image)
│
└── Error occurs
    ├── Error sent: Sentry (stack trace + context) ✅
    ├── Log sent: CloudWatch (error details) ✅
    └── Metric: Prometheus (errors_total++) ✅
```

---

## 💰 Cost Breakdown

| Service | Cost | What You Get |
|---------|------|--------------|
| **Cloudflare R2** | $0.015/GB storage<br/>$0 egress | Unlimited bandwidth! |
| **Cloudflare CDN** | FREE | Global edge caching |
| **Mixpanel** | FREE (10K events/mo)<br/>$25/mo (100K events) | Product analytics |
| **Sentry** | FREE (5K errors/mo)<br/>$26/mo (50K errors) | Error tracking |
| **CloudWatch Logs** | $0.50/GB ingested | Centralized logging |
| **Prometheus** | FREE (self-hosted)<br/>$100/mo (managed) | System metrics |
| **Grafana** | FREE (self-hosted)<br/>$49/mo (Cloud) | Dashboards |

**Total for small startup:** ~$100-200/month

---

## 🎤 Interview Talking Points

### "How do you monitor the system?"

**Perfect Answer:**
> "We have a multi-layered observability stack. For product analytics, we use Mixpanel to track user behavior—QR code creation, microsite views, feature usage. For error tracking, Sentry captures exceptions with full stack traces and user context. Application logs go to CloudWatch for centralized storage and searching. For system metrics, we expose Prometheus endpoints that track request latency, throughput, and error rates, visualized in Grafana dashboards. This gives us visibility across the entire stack—from user actions down to infrastructure metrics."

### "How do you handle static assets?"

**Perfect Answer:**
> "Static assets like QR code images and user uploads are stored in Cloudflare R2, which is S3-compatible object storage. R2 integrates with Cloudflare's global CDN, so assets are automatically cached at edge locations worldwide. This gives us fast load times—20ms from edge cache vs 500ms from origin—and zero egress fees, which is a huge cost saving compared to AWS S3. We set long cache headers for immutable assets like QR codes since they never change once generated."

---

## ✅ Next Steps

Want me to:
1. Create configuration files for Mixpanel, Sentry, Prometheus?
2. Add observability layer to your architecture diagram?
3. Build a monitoring dashboard setup guide?
4. Focus back on job application materials?

What would be most helpful?
