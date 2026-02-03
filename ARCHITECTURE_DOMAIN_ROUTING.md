# 🏗️ Domain Routing Architecture

## Complete Traffic Flow

```mermaid
graph TB
    subgraph "User Traffic"
        U1[User scans QR:<br/>nike.scanly.io/airmax]
        U2[User scans QR:<br/>scan.yourbrand.com/promo]
    end
    
    subgraph "DNS Layer"
        CF[Cloudflare DNS<br/>*.scanly.io → 123.45.67.89<br/>SSL Certificate Management]
        DNS[User's DNS Provider<br/>scan.yourbrand.com → proxy.scanly.io<br/>TXT: _qr-verify → token]
    end
    
    subgraph "Edge Layer (Nginx)"
        N1[Subdomain Server<br/>~^(?&lt;subdomain&gt;.+).scanly.io$<br/>Extract: subdomain=nike]
        N2[Custom Domain Server<br/>server_name _<br/>Extract: host=scan.yourbrand.com]
    end
    
    subgraph "Routing Service (3007)"
        RS[Route Resolver<br/>1. Look up subdomain/domain in DB<br/>2. Match path to QR code<br/>3. Track analytics<br/>4. Forward to microsite]
    end
    
    subgraph "Databases"
        DB1[(PostgreSQL<br/>subdomains table<br/>subdomain_routes table)]
        DB2[(PostgreSQL<br/>custom_domains table<br/>domain_routes table)]
    end
    
    subgraph "Content Services"
        MS[Microsite Service (3005)<br/>Render QR content HTML]
        QR[QR Service (3002)<br/>QR code metadata]
    end
    
    subgraph "Analytics Pipeline"
        AN[Analytics Service (3004)<br/>Store scan events]
        MX[Mixpanel<br/>Real-time analytics<br/>Funnel tracking<br/>Conversion metrics]
        KF[Kafka<br/>Event streaming]
    end
    
    U1 --> CF
    U2 --> DNS
    CF --> N1
    DNS --> N2
    
    N1 -->|X-Subdomain: nike<br/>X-Path: /airmax| RS
    N2 -->|X-Custom-Domain: scan.yourbrand.com<br/>X-Path: /promo| RS
    
    RS -->|Query subdomain| DB1
    RS -->|Query custom domain| DB2
    RS -->|Track scan| AN
    RS -->|Track scan| MX
    RS -->|Publish event| KF
    RS -->|GET /microsite/qr-id| MS
    
    MS -->|Fetch QR metadata| QR
    MS -->|Return HTML| RS
    RS -->|HTTP 200| N1
    RS -->|HTTP 200| N2
    N1 --> U1
    N2 --> U2
    
    style CF fill:#f9a825
    style DNS fill:#90caf9
    style N1 fill:#66bb6a
    style N2 fill:#66bb6a
    style RS fill:#ab47bc
    style MS fill:#ef5350
    style MX fill:#ff7043
```

---

## How Subdomains Work (Linktree-style)

### User Flow
```
1. User Claims Subdomain
   ↓
   POST /api/subdomains/claim
   { "subdomain": "nike" }
   
2. Backend Creates DNS Record in Cloudflare (Automated)
   ↓
   Cloudflare API: Create A Record
   nike.scanly.io → 123.45.67.89 (proxied for SSL)
   
3. SSL Certificate Provisioned (Automatic)
   ↓
   Cloudflare provisions SSL certificate
   https://nike.scanly.io is now live
   
4. User Publishes Content
   ↓
   POST /api/subdomains/routes
   { "slug": "airmax", "qrId": "qr-123" }
   
5. Traffic Routes Correctly
   ↓
   https://nike.scanly.io/airmax
   → Nginx extracts subdomain="nike"
   → Routing service queries DB
   → Finds qrId="qr-123"
   → Microsite renders content
```

### Database Schema
```sql
-- Subdomains table
CREATE TABLE subdomains (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  subdomain VARCHAR(63) UNIQUE NOT NULL,  -- "nike"
  default_qr_id TEXT,                     -- Default content
  is_active BOOLEAN DEFAULT true,
  total_scans BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subdomain routes table
CREATE TABLE subdomain_routes (
  id UUID PRIMARY KEY,
  subdomain_id UUID REFERENCES subdomains(id),
  slug VARCHAR(100) NOT NULL,             -- "airmax", "membership", etc.
  qr_id TEXT NOT NULL,                    -- Points to specific QR code
  is_active BOOLEAN DEFAULT true,
  click_count BIGINT DEFAULT 0
);

-- Example data:
-- subdomain: nike
-- routes:
--   /          → qr-nike-home
--   /airmax    → qr-nike-airmax
--   /membership→ qr-nike-membership
```

---

## How Custom Domains Work

### User Flow
```
1. User Adds Custom Domain
   ↓
   POST /api/domains
   { "domain": "scan.yourbrand.com" }
   
2. System Generates Verification Token
   ↓
   verificationToken: "abc123xyz..."
   
3. User Configures DNS Records
   ↓
   CNAME: scan.yourbrand.com → proxy.scanly.io
   TXT: _qr-verify.yourbrand.com → abc123xyz...
   
4. User Triggers Verification
   ↓
   POST /api/domains/:id/verify
   
5. System Verifies DNS
   ↓
   Check CNAME record exists
   Check TXT record matches token
   
6. SSL Certificate Issued
   ↓
   Certbot requests Let's Encrypt certificate
   /etc/letsencrypt/live/scan.yourbrand.com/
   
7. Nginx Configured Dynamically
   ↓
   Domain becomes active
   Traffic routed correctly
```

### DNS Verification Process
```typescript
// services/domains-service/src/routes/verify-domain.ts

async function verifyDomain(domainId: string) {
  // 1. Look up domain
  const domain = await db.select()
    .from(customDomains)
    .where(eq(customDomains.id, domainId));
  
  // 2. Check CNAME record
  const cnameRecords = await dns.resolveCname(domain.domain);
  const cnameValid = cnameRecords.includes('proxy.scanly.io');
  
  // 3. Check TXT record
  const txtRecords = await dns.resolveTxt(`_qr-verify.${domain.domain}`);
  const txtValid = txtRecords.flat().includes(domain.verificationToken);
  
  // 4. Update status
  if (cnameValid && txtValid) {
    await db.update(customDomains)
      .set({ verificationStatus: 'verified', isActive: true })
      .where(eq(customDomains.id, domainId));
    
    // 5. Provision SSL certificate
    await provisionSSL(domain.domain);
    
    // 6. Update nginx configuration
    await updateNginxConfig(domain.domain);
    
    // 7. Publish event
    await publishEvent('domain.verified', { domainId, domain: domain.domain });
  }
}
```

---

## Nginx Configuration Details

### Subdomain Routing
```nginx
# /etc/nginx/sites-available/subdomains.conf

server {
    listen 80;
    listen 443 ssl http2;
    
    # Regex to capture subdomain
    # Matches: nike.scanly.io → subdomain=nike
    server_name ~^(?<subdomain>.+)\.scanly\.io$;
    
    # Wildcard SSL certificate
    ssl_certificate /etc/letsencrypt/live/scanly.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/scanly.io/privkey.pem;
    
    # Pass subdomain to routing service
    location / {
        proxy_set_header X-Subdomain $subdomain;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
        
        proxy_pass http://routing_service:3007;
    }
}
```

### Custom Domain Routing
```nginx
# /etc/nginx/sites-available/custom-domains.conf

# Map to dynamically load SSL certificates
map $ssl_server_name $ssl_cert {
    default /etc/letsencrypt/live/default/fullchain.pem;
    ~^(.+)$ /etc/letsencrypt/live/$1/fullchain.pem;
}

map $ssl_server_name $ssl_key {
    default /etc/letsencrypt/live/default/privkey.pem;
    ~^(.+)$ /etc/letsencrypt/live/$1/privkey.pem;
}

server {
    listen 80;
    listen 443 ssl http2;
    
    # Catch-all for custom domains
    server_name _;
    
    # Dynamic SSL certificate loading
    ssl_certificate $ssl_cert;
    ssl_certificate_key $ssl_key;
    
    # Pass custom domain to routing service
    location / {
        proxy_set_header X-Custom-Domain $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_pass http://routing_service:3007;
    }
}
```

---

## Routing Service Logic

### Path Matching Algorithm
```typescript
// services/routing-service/src/lib/matcher.ts

interface RouteRule {
  pathPattern: string;
  matchType: 'exact' | 'prefix' | 'wildcard' | 'regex';
  qrId: string;
  priority: number;
}

export function findMatchingRoute(
  path: string,
  rules: RouteRule[]
): RouteRule | null {
  
  // Sort by priority (lower number = higher priority)
  const sorted = rules.sort((a, b) => a.priority - b.priority);
  
  for (const rule of sorted) {
    if (matchPath(path, rule.pathPattern, rule.matchType)) {
      return rule;
    }
  }
  
  return null;
}

function matchPath(path: string, pattern: string, matchType: string): boolean {
  switch (matchType) {
    case 'exact':
      // Exact match: /lunch
      return path === pattern;
      
    case 'prefix':
      // Prefix match: /products → /products/123, /products/456
      return path.startsWith(pattern);
      
    case 'wildcard':
      // Wildcard: /promo/* → /promo/summer, /promo/winter
      const wildcardRegex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return wildcardRegex.test(path);
      
    case 'regex':
      // Regex: /product/[0-9]+ → /product/123, /product/456
      return new RegExp(pattern).test(path);
      
    default:
      return false;
  }
}
```

### Example Routing Rules
```typescript
// Restaurant example: scan.restaurant.com

const routes: RouteRule[] = [
  {
    pathPattern: '/lunch',
    matchType: 'exact',
    qrId: 'qr-menu-lunch',
    priority: 10,
  },
  {
    pathPattern: '/dinner',
    matchType: 'exact',
    qrId: 'qr-menu-dinner',
    priority: 10,
  },
  {
    pathPattern: '/specials/*',
    matchType: 'wildcard',
    qrId: 'qr-menu-specials',
    priority: 20,
  },
  {
    pathPattern: '/*',  // Catch-all
    matchType: 'wildcard',
    qrId: 'qr-menu-main',
    priority: 100,
  },
];

// Path matching:
// /lunch           → qr-menu-lunch
// /dinner          → qr-menu-dinner
// /specials/summer → qr-menu-specials
// /about           → qr-menu-main (catch-all)
```

---

## Analytics & Conversion Tracking

### Event Flow
```mermaid
graph LR
    subgraph "User Action"
        UA[QR Code Scanned<br/>Button Clicked<br/>Form Submitted]
    end
    
    subgraph "Tracking Layer"
        FE[Frontend Mixpanel<br/>mixpanel.track()]
        BE[Backend Tracking<br/>trackEvent()]
    end
    
    subgraph "Storage"
        MX[Mixpanel Cloud<br/>Real-time analytics]
        DB[(PostgreSQL<br/>conversions table)]
        KF[Kafka Topics<br/>Event streaming]
    end
    
    subgraph "Analysis"
        FN[Funnel Analysis<br/>Conversion rates]
        CO[Cohort Analysis<br/>User behavior]
        DG[Dashboards<br/>Real-time metrics]
    end
    
    UA --> FE
    UA --> BE
    FE --> MX
    BE --> MX
    BE --> DB
    BE --> KF
    
    MX --> FN
    MX --> CO
    DB --> DG
    KF --> DG
```

### Conversion Events Schema
```typescript
// Database schema
CREATE TABLE conversions (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  event VARCHAR(50) NOT NULL,  -- 'qr_created', 'payment_completed', etc.
  metadata JSONB,              -- Event-specific data
  revenue DECIMAL(10,2),       -- For revenue-generating events
  timestamp TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_event (user_id, event),
  INDEX idx_timestamp (timestamp DESC)
);

// Example records
{
  user_id: 'user-123',
  event: 'payment_completed',
  metadata: {
    qr_id: 'qr-abc',
    product_id: 'prod-456',
    amount: 29.99,
    payment_method: 'stripe'
  },
  revenue: 29.99,
  timestamp: '2026-01-29T10:30:00Z'
}
```

### Mixpanel Events
```typescript
// Track QR scan with rich metadata
mixpanel.track('QR Code Scanned', {
  qr_id: 'qr-abc123',
  qr_type: 'restaurant_menu',
  user_id: 'user-123',
  
  // Domain context
  domain_type: 'subdomain',  // or 'custom'
  domain: 'nike.scanly.io',
  path: '/airmax',
  
  // Device & location
  device_type: 'mobile',
  device_os: 'iOS 17.2',
  browser: 'Safari 17',
  country: 'United States',
  city: 'New York',
  
  // Attribution
  referrer: 'instagram.com',
  utm_source: 'instagram',
  utm_campaign: 'summer_sale',
  
  // Business metrics
  is_first_scan: false,
  time_since_creation: 86400,  // 1 day
});

// Track conversion
mixpanel.track('Payment Completed', {
  qr_id: 'qr-abc123',
  user_id: 'user-123',
  revenue: 29.99,
  product_id: 'prod-456',
  quantity: 1,
  payment_method: 'stripe',
  
  // Tag as conversion
  conversion: true,
});

// Create funnel in Mixpanel UI
const PURCHASE_FUNNEL = [
  'QR Code Scanned',      // Step 1
  'Product Viewed',       // Step 2
  'Add to Cart',          // Step 3
  'Checkout Started',     // Step 4
  'Payment Completed',    // Step 5 (conversion)
];
```

---

## Performance Optimization

### Caching Strategy
```typescript
// services/routing-service/src/lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache domain lookups (1 hour TTL)
export async function getCachedDomain(domain: string) {
  const cacheKey = `domain:${domain}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Query database
  const domainRecord = await db.select()
    .from(customDomains)
    .where(eq(customDomains.domain, domain))
    .limit(1);
  
  if (domainRecord) {
    await redis.setex(cacheKey, 3600, JSON.stringify(domainRecord));
  }
  
  return domainRecord;
}

// Invalidate cache on domain update
export async function invalidateDomainCache(domain: string) {
  await redis.del(`domain:${domain}`);
}
```

### Cloudflare CDN
```typescript
// Purge CDN cache after content update
import { CloudflareService } from './lib/cloudflare';

export async function publishContent(subdomainId: string) {
  // Publish to database
  await db.update(subdomains)
    .set({ updatedAt: new Date() })
    .where(eq(subdomains.id, subdomainId));
  
  // Purge Cloudflare cache
  const subdomain = await getSubdomain(subdomainId);
  const cf = new CloudflareService();
  await cf.purgeCacheForSubdomain(subdomain.subdomain);
  
  // Invalidate Redis cache
  await invalidateSubdomainCache(subdomain.subdomain);
}
```

---

## Security Considerations

### Domain Verification
```typescript
// Prevent domain hijacking
async function validateDomainOwnership(domain: string, userId: string) {
  // 1. Check TXT record contains verification token
  const txtRecords = await dns.resolveTxt(`_qr-verify.${domain}`);
  const token = await getVerificationToken(domain, userId);
  
  if (!txtRecords.flat().includes(token)) {
    throw new Error('Domain verification failed');
  }
  
  // 2. Check domain not already claimed
  const existing = await db.select()
    .from(customDomains)
    .where(eq(customDomains.domain, domain))
    .limit(1);
  
  if (existing && existing.userId !== userId) {
    throw new Error('Domain already claimed by another user');
  }
  
  return true;
}
```

### SSL Certificate Management
```bash
# Automated renewal with Certbot
0 0 * * * certbot renew --quiet --deploy-hook "nginx -s reload"

# Certificate monitoring
*/30 * * * * /usr/local/bin/check-ssl-expiry.sh
```

### Rate Limiting
```typescript
// Protect against abuse
import rateLimit from '@fastify/rate-limit';

app.register(rateLimit, {
  max: 100,  // 100 requests
  timeWindow: '1 minute',
  cache: 10000,
  
  // Custom key generator (by user ID or IP)
  keyGenerator: (req) => {
    return req.userId || req.ip;
  },
});
```

---

## Monitoring & Alerts

### Health Checks
```typescript
// services/routing-service/src/health.ts
app.get('/health', async (req, reply) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    kafka: await checkKafka(),
    mixpanel: await checkMixpanel(),
  };
  
  const healthy = Object.values(checks).every(c => c.status === 'ok');
  
  return reply.code(healthy ? 200 : 503).send({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});
```

### Prometheus Metrics
```typescript
import client from 'prom-client';

// Domain routing metrics
const domainLookupDuration = new client.Histogram({
  name: 'domain_lookup_duration_seconds',
  help: 'Time to lookup domain in database',
});

const domainCacheHitRate = new client.Counter({
  name: 'domain_cache_hits_total',
  help: 'Number of domain cache hits',
});

// Track metrics
app.addHook('onRequest', async (req, reply) => {
  const end = domainLookupDuration.startTimer();
  
  // ... routing logic ...
  
  end();
});
```

---

## Troubleshooting

### Common Issues

**Issue: Subdomain not resolving**
```bash
# Check DNS propagation
dig nike.scanly.io

# Check Cloudflare DNS record
curl -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN"

# Check nginx logs
tail -f /var/log/nginx/access.log | grep nike.scanly.io
```

**Issue: Custom domain verification failing**
```bash
# Check CNAME record
dig CNAME scan.yourbrand.com

# Check TXT record
dig TXT _qr-verify.yourbrand.com

# Manual verification
curl -X POST http://localhost:3000/api/domains/:id/verify
```

**Issue: SSL certificate not provisioned**
```bash
# Check Certbot logs
journalctl -u certbot -n 100

# Manually request certificate
certbot certonly --webroot -w /var/www/html -d scan.yourbrand.com

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/scan.yourbrand.com/cert.pem -noout -dates
```

---

## Summary

### How Domains Work
1. **Subdomains**: Instant, automated DNS + SSL via Cloudflare
2. **Custom Domains**: User configures DNS, system verifies, provisions SSL

### How Routing Works
1. Nginx captures subdomain/domain from request
2. Routing service queries database for QR code mapping
3. Microsite service renders content
4. Analytics tracked in Mixpanel + PostgreSQL

### How to Set Up
1. Configure Cloudflare wildcard DNS: `*.scanly.io → SERVER_IP`
2. Update nginx.conf with subdomain/custom domain configs
3. Start routing service and domains service
4. Install Mixpanel SDK and configure tracking
5. Test with curl or browser

**You're ready to go! 🚀**
