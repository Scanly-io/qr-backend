# 🌐 Domain Service & Analytics Integration Guide

**Last Updated:** January 29, 2026

## Table of Contents
1. [Domain Architecture Overview](#domain-architecture-overview)
2. [Free Subdomains (Linktree-style)](#free-subdomains)
3. [Custom Domain Setup](#custom-domain-setup)
4. [DNS Configuration](#dns-configuration)
5. [Routing & Load Balancing](#routing-and-load-balancing)
6. [Mixpanel Integration](#mixpanel-integration)
7. [Conversion Tracking](#conversion-tracking)
8. [Analytics Dashboard](#analytics-dashboard)

---

## Domain Architecture Overview

Our platform supports **TWO types of branded domains**:

### 1. **Free Subdomains** (Instant, Like Linktree)
- Format: `username.scanly.io` or `username.yourdomain.com`
- **Zero DNS configuration** - instant activation
- Managed automatically by Cloudflare
- Perfect for users who don't own a domain

### 2. **Custom Domains** (Professional Branding)
- Format: `scan.yourbrand.com` or `qr.yourcompany.com`
- Requires DNS configuration (CNAME + TXT records)
- SSL certificates via Let's Encrypt
- Full brand control

---

## Free Subdomains

### How It Works

```
User Flow:
1. User claims "nike" → nike.scanly.io
2. Backend creates DNS record in Cloudflare (automated)
3. Cloudflare provisions SSL certificate (automatic)
4. User's microsite is live instantly at https://nike.scanly.io
```

### Technical Implementation

#### **Step 1: User Claims Subdomain**
```bash
POST /api/subdomains/claim
{
  "subdomain": "nike",
  "defaultQrId": "qr-abc123"  # Optional: default content
}
```

#### **Step 2: Cloudflare Creates DNS Record**
```typescript
// services/domains-service/src/lib/cloudflare.ts
async createSubdomainDNS(subdomain: string) {
  const record = {
    type: 'A',
    name: `${subdomain}.scanly.io`,
    content: process.env.SERVER_IP,  // Your server IP
    ttl: 1,  // Auto
    proxied: true  // Enable CDN + SSL
  };
  
  await cloudflareAPI.createDNSRecord(record);
}
```

#### **Step 3: Nginx Routes Traffic**
```nginx
# nginx/nginx.conf
server {
    listen 80;
    listen 443 ssl;
    server_name ~^(?<subdomain>.+)\.scanly\.io$;
    
    location / {
        # Pass subdomain to routing service
        proxy_set_header X-Subdomain $subdomain;
        proxy_pass http://routing_service;
    }
}
```

#### **Step 4: Routing Service Resolves Content**
```typescript
// services/routing-service/src/index.ts
app.get('/*', async (req, res) => {
  const subdomain = req.headers['x-subdomain'];
  const path = req.path;
  
  // Look up subdomain in database
  const subdomainRecord = await db.select()
    .from(subdomains)
    .where(eq(subdomains.subdomain, subdomain));
  
  if (!subdomainRecord) {
    return res.status(404).send('Subdomain not found');
  }
  
  // Check if there's a specific route for this path
  const route = await db.select()
    .from(subdomainRoutes)
    .where(and(
      eq(subdomainRoutes.subdomainId, subdomainRecord.id),
      eq(subdomainRoutes.slug, path.slice(1))  // Remove leading /
    ));
  
  const qrId = route?.qrId || subdomainRecord.defaultQrId;
  
  // Forward to microsite service to render content
  return res.redirect(`/microsite/${qrId}`);
});
```

### Subdomain Routing Examples

```javascript
// User: nike.scanly.io
{
  subdomain: "nike",
  defaultQrId: "qr-nike-home"
}

// Routes:
nike.scanly.io/           → qr-nike-home
nike.scanly.io/airmax     → qr-nike-airmax
nike.scanly.io/membership → qr-nike-membership
nike.scanly.io/contact    → qr-nike-contact
```

---

## Custom Domain Setup

### How It Works

```
User Flow:
1. User adds scan.yourbrand.com
2. System generates verification token: abc123xyz
3. User configures DNS records:
   - CNAME: scan.yourbrand.com → proxy.scanly.io
   - TXT: _qr-verify.yourbrand.com → abc123xyz
4. System verifies DNS records
5. Let's Encrypt issues SSL certificate
6. Domain goes live
```

### Technical Implementation

#### **Step 1: User Adds Custom Domain**
```bash
POST /api/domains
{
  "domain": "scan.yourbrand.com",
  "qrId": "qr-abc123"  # Optional
}

Response:
{
  "id": "domain-uuid",
  "domain": "scan.yourbrand.com",
  "verificationToken": "abc123xyz",
  "verificationStatus": "pending",
  "dnsInstructions": {
    "cname": {
      "host": "scan.yourbrand.com",
      "value": "proxy.scanly.io",
      "ttl": 3600
    },
    "txt": {
      "host": "_qr-verify.yourbrand.com",
      "value": "abc123xyz",
      "ttl": 3600
    }
  }
}
```

#### **Step 2: User Configures DNS**

**Option A: Cloudflare Users**
```bash
# In Cloudflare Dashboard:
1. DNS → Add record
   Type: CNAME
   Name: scan
   Target: proxy.scanly.io
   Proxy: ON (orange cloud)

2. DNS → Add record
   Type: TXT
   Name: _qr-verify.scan
   Content: abc123xyz
```

**Option B: Other DNS Providers (GoDaddy, Namecheap, etc.)**
```bash
# In DNS Provider Dashboard:
CNAME Record:
  Host: scan.yourbrand.com
  Points to: proxy.scanly.io
  TTL: 3600

TXT Record:
  Host: _qr-verify.yourbrand.com
  Value: abc123xyz
  TTL: 3600
```

#### **Step 3: System Verifies DNS**
```bash
POST /api/domains/:id/verify

Response:
{
  "success": true,
  "verificationStatus": "verified",
  "checks": {
    "cname": {
      "found": true,
      "value": "proxy.scanly.io"
    },
    "txt": {
      "found": true,
      "value": "abc123xyz"
    }
  }
}
```

#### **Step 4: SSL Certificate Provisioning**

**Using Certbot (Let's Encrypt)**
```bash
# Automated SSL certificate renewal
certbot certonly \
  --webroot \
  -w /var/www/html \
  -d scan.yourbrand.com \
  --email admin@yourplatform.com \
  --agree-tos \
  --non-interactive

# Certificate files:
/etc/letsencrypt/live/scan.yourbrand.com/fullchain.pem
/etc/letsencrypt/live/scan.yourbrand.com/privkey.pem
```

**Nginx SSL Configuration**
```nginx
server {
    listen 443 ssl http2;
    server_name scan.yourbrand.com;
    
    ssl_certificate /etc/letsencrypt/live/scan.yourbrand.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/scan.yourbrand.com/privkey.pem;
    
    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Custom-Domain $host;
        proxy_pass http://routing_service;
    }
}
```

---

## DNS Configuration

### Required DNS Records

#### For Subdomains (Automated)
```dns
Type: A
Name: *.scanly.io
Value: YOUR_SERVER_IP (e.g., 123.45.67.89)
TTL: Auto
Proxied: Yes (Cloudflare CDN + SSL)
```

#### For Custom Domains (User Configures)
```dns
# 1. CNAME Record (Routes traffic)
Type: CNAME
Name: scan.yourbrand.com
Value: proxy.scanly.io
TTL: 3600

# 2. TXT Record (Verification)
Type: TXT
Name: _qr-verify.yourbrand.com
Value: <generated_token>
TTL: 3600
```

### DNS Propagation

- **Cloudflare**: 1-5 minutes (very fast)
- **Other Providers**: 15 minutes - 48 hours
- **Check Propagation**: https://www.whatsmydns.net/

---

## Routing and Load Balancing

### Architecture Overview

```
Internet → Cloudflare CDN → Nginx → Routing Service → Microsite Service
                                  ↘ Analytics Service
                                  ↘ Pixels Service
```

### Nginx Routing Configuration

```nginx
# Main routing logic
http {
    # Upstream service pools
    upstream routing_service {
        server routing-service:3007;
        server routing-service-2:3007;  # For load balancing
    }
    
    upstream microsite_service {
        server microsite-service:3005;
        server microsite-service-2:3005;
    }
    
    # =============================================
    # SUBDOMAIN ROUTING (*.scanly.io)
    # =============================================
    server {
        listen 80;
        listen 443 ssl http2;
        server_name ~^(?<subdomain>.+)\.scanly\.io$;
        
        # SSL certificates (wildcard)
        ssl_certificate /etc/letsencrypt/live/scanly.io/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/scanly.io/privkey.pem;
        
        location / {
            # Pass subdomain to routing service
            proxy_set_header X-Subdomain $subdomain;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Host $host;
            
            proxy_pass http://routing_service;
        }
    }
    
    # =============================================
    # CUSTOM DOMAIN ROUTING (scan.*.com)
    # =============================================
    server {
        listen 80;
        listen 443 ssl http2;
        server_name _;  # Catch-all for custom domains
        
        # Dynamic SSL (loaded from database)
        ssl_certificate_by_lua_block {
            local ssl = require "ngx.ssl"
            local domain = ngx.var.ssl_server_name
            
            -- Load certificate from filesystem or database
            local cert_path = "/etc/letsencrypt/live/" .. domain .. "/fullchain.pem"
            local key_path = "/etc/letsencrypt/live/" .. domain .. "/privkey.pem"
            
            ssl.set_cert(cert_path)
            ssl.set_priv_key(key_path)
        }
        
        location / {
            # Pass custom domain to routing service
            proxy_set_header X-Custom-Domain $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_pass http://routing_service;
        }
    }
}
```

### Routing Service Logic

```typescript
// services/routing-service/src/index.ts
import { FastifyInstance } from 'fastify';
import { db } from './db';
import { subdomains, subdomainRoutes, customDomains, domainRoutes } from './schema';
import { eq, and } from 'drizzle-orm';

app.get('/*', async (req, reply) => {
  const customDomain = req.headers['x-custom-domain'];
  const subdomain = req.headers['x-subdomain'];
  const path = req.url;
  
  let qrId: string | null = null;
  let routeType: 'subdomain' | 'custom' | null = null;
  
  // ==========================================
  // CUSTOM DOMAIN ROUTING
  // ==========================================
  if (customDomain) {
    // Look up custom domain
    const [domain] = await db
      .select()
      .from(customDomains)
      .where(and(
        eq(customDomains.domain, customDomain),
        eq(customDomains.isActive, true)
      ))
      .limit(1);
    
    if (!domain) {
      return reply.code(404).send({ error: 'Domain not found' });
    }
    
    // Check for path-based routing rules
    const routes = await db
      .select()
      .from(domainRoutes)
      .where(and(
        eq(domainRoutes.domainId, domain.id),
        eq(domainRoutes.isActive, true)
      ))
      .orderBy(domainRoutes.priority);
    
    // Match path to routing rule
    for (const route of routes) {
      if (matchPath(path, route.pathPattern, route.matchType)) {
        qrId = route.qrId;
        break;
      }
    }
    
    // Fallback to domain's default QR
    if (!qrId) {
      qrId = domain.qrId;
    }
    
    routeType = 'custom';
  }
  
  // ==========================================
  // SUBDOMAIN ROUTING
  // ==========================================
  else if (subdomain) {
    // Look up subdomain
    const [subdomainRecord] = await db
      .select()
      .from(subdomains)
      .where(and(
        eq(subdomains.subdomain, subdomain),
        eq(subdomains.isActive, true)
      ))
      .limit(1);
    
    if (!subdomainRecord) {
      return reply.code(404).send({ error: 'Subdomain not found' });
    }
    
    // Check for path-based routes
    if (path !== '/') {
      const slug = path.slice(1).split('/')[0];  // Extract first segment
      
      const [route] = await db
        .select()
        .from(subdomainRoutes)
        .where(and(
          eq(subdomainRoutes.subdomainId, subdomainRecord.id),
          eq(subdomainRoutes.slug, slug),
          eq(subdomainRoutes.isActive, true)
        ))
        .limit(1);
      
      if (route) {
        qrId = route.qrId;
      }
    }
    
    // Fallback to subdomain's default QR
    if (!qrId) {
      qrId = subdomainRecord.defaultQrId;
    }
    
    routeType = 'subdomain';
  }
  
  // ==========================================
  // FORWARD TO MICROSITE SERVICE
  // ==========================================
  if (!qrId) {
    return reply.code(404).send({ error: 'No content found' });
  }
  
  // Track analytics before forwarding
  await trackPageView({
    qrId,
    routeType,
    domain: customDomain || `${subdomain}.scanly.io`,
    path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  
  // Forward to microsite service
  return reply.redirect(`/microsite/${qrId}`);
});

// Path matching helper
function matchPath(path: string, pattern: string, matchType: string): boolean {
  switch (matchType) {
    case 'exact':
      return path === pattern;
    case 'prefix':
      return path.startsWith(pattern);
    case 'wildcard':
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(path);
    case 'regex':
      return new RegExp(pattern).test(path);
    default:
      return false;
  }
}
```

---

## Mixpanel Integration

### Why Mixpanel?

- **Event Tracking**: Track every user action (QR scan, button click, form submission)
- **Funnel Analysis**: Understand conversion paths
- **Cohort Analysis**: Group users by behavior
- **Real-time Dashboards**: Live metrics
- **A/B Testing**: Integrate with experiments service

### Setup Steps

#### **Step 1: Install Mixpanel SDK**
```bash
cd qr-backend
npm install mixpanel --workspace=services/analytics-service
npm install mixpanel-browser --workspace=qr-frontend
```

#### **Step 2: Initialize Mixpanel (Backend)**
```typescript
// services/analytics-service/src/lib/mixpanel.ts
import Mixpanel from 'mixpanel';

export const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN || '', {
  debug: process.env.NODE_ENV !== 'production',
  protocol: 'https',
});

// Track event helper
export async function trackEvent(
  eventName: string,
  userId: string,
  properties: Record<string, any>
) {
  mixpanel.track(eventName, {
    distinct_id: userId,
    time: new Date().getTime(),
    ...properties,
  });
}

// Identify user
export async function identifyUser(userId: string, traits: Record<string, any>) {
  mixpanel.people.set(userId, {
    $name: traits.name,
    $email: traits.email,
    $created: traits.createdAt,
    plan: traits.plan,
    ...traits,
  });
}
```

#### **Step 3: Initialize Mixpanel (Frontend)**
```typescript
// qr-frontend/src/lib/mixpanel.ts
import mixpanel from 'mixpanel-browser';

// Initialize on app load
mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN, {
  debug: import.meta.env.DEV,
  track_pageview: true,
  persistence: 'localStorage',
});

export { mixpanel };

// Helper functions
export const trackPageView = (pageName: string) => {
  mixpanel.track('Page View', {
    page: pageName,
    timestamp: new Date().toISOString(),
  });
};

export const trackButtonClick = (buttonName: string, context?: Record<string, any>) => {
  mixpanel.track('Button Click', {
    button: buttonName,
    ...context,
  });
};

export const identifyUser = (userId: string, email: string, name?: string) => {
  mixpanel.identify(userId);
  mixpanel.people.set({
    $email: email,
    $name: name,
    $last_login: new Date().toISOString(),
  });
};
```

#### **Step 4: Track Events Throughout App**

**QR Code Scanning**
```typescript
// services/routing-service/src/index.ts
import { trackEvent } from './lib/mixpanel';

app.get('/scan/:qrId', async (req, reply) => {
  const { qrId } = req.params;
  
  // Track scan event
  await trackEvent('QR Code Scanned', req.userId || 'anonymous', {
    qr_id: qrId,
    domain: req.headers.host,
    path: req.url,
    device: getDeviceType(req.headers['user-agent']),
    location: getLocation(req.ip),
    referrer: req.headers.referer,
  });
  
  // Continue with routing logic...
});
```

**Frontend Events**
```typescript
// qr-frontend/src/components/dashboard/DashboardStats.tsx
import { mixpanel } from '../../lib/mixpanel';

export function DashboardStats() {
  useEffect(() => {
    mixpanel.track('Dashboard Viewed', {
      timestamp: new Date().toISOString(),
    });
  }, []);
  
  const handleExportClick = () => {
    mixpanel.track('Export Data', {
      format: 'csv',
      date_range: dateRange,
    });
    // Export logic...
  };
  
  return (
    // Dashboard UI...
  );
}
```

**QR Code Creation**
```typescript
// qr-frontend/src/components/qr/CreateQRForm.tsx
import { mixpanel } from '../../lib/mixpanel';

const handleCreateQR = async (data: QRFormData) => {
  const response = await api.post('/qr', data);
  
  mixpanel.track('QR Code Created', {
    qr_id: response.id,
    type: data.type,
    has_custom_domain: !!data.customDomain,
    has_logo: !!data.logo,
    blocks_count: data.content?.blocks?.length || 0,
  });
  
  // Show success message...
};
```

---

## Conversion Tracking

### Define Conversion Events

```typescript
// services/analytics-service/src/lib/conversions.ts

export enum ConversionEvent {
  // Account & Auth
  SIGNUP_STARTED = 'signup_started',
  SIGNUP_COMPLETED = 'signup_completed',
  EMAIL_VERIFIED = 'email_verified',
  
  // QR Code Lifecycle
  QR_CREATED = 'qr_created',
  QR_FIRST_SCAN = 'qr_first_scan',
  QR_PUBLISHED = 'qr_published',
  
  // Domain Events
  SUBDOMAIN_CLAIMED = 'subdomain_claimed',
  CUSTOM_DOMAIN_ADDED = 'custom_domain_added',
  DOMAIN_VERIFIED = 'domain_verified',
  
  // Monetization
  LINK_CLICKED = 'link_clicked',
  PRODUCT_VIEWED = 'product_viewed',
  ADD_TO_CART = 'add_to_cart',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  
  // Engagement
  FORM_SUBMITTED = 'form_submitted',
  VIDEO_PLAYED = 'video_played',
  FILE_DOWNLOADED = 'file_downloaded',
  SOCIAL_FOLLOW = 'social_follow',
  
  // Subscription
  PLAN_VIEWED = 'plan_viewed',
  UPGRADE_CLICKED = 'upgrade_clicked',
  SUBSCRIPTION_STARTED = 'subscription_started',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
}

// Track conversion
export async function trackConversion(
  userId: string,
  event: ConversionEvent,
  metadata: Record<string, any>
) {
  // Track in Mixpanel
  await trackEvent(event, userId, {
    conversion: true,
    revenue: metadata.revenue || 0,
    ...metadata,
  });
  
  // Store in database for historical analysis
  await db.insert(conversions).values({
    userId,
    event,
    metadata: JSON.stringify(metadata),
    timestamp: new Date(),
  });
  
  // Publish Kafka event for real-time processing
  await publishEvent('conversion.tracked', {
    userId,
    event,
    metadata,
  });
}
```

### Funnel Examples

#### **User Onboarding Funnel**
```typescript
// Track funnel progression
const ONBOARDING_FUNNEL = [
  'signup_started',        // Step 1
  'signup_completed',      // Step 2
  'email_verified',        // Step 3
  'qr_created',            // Step 4
  'qr_published',          // Step 5
];

// In Mixpanel: Create funnel with these events
```

#### **E-commerce Conversion Funnel**
```typescript
const ECOMMERCE_FUNNEL = [
  'product_viewed',        // Step 1
  'add_to_cart',          // Step 2
  'payment_initiated',    // Step 3
  'payment_completed',    // Step 4
];
```

#### **Domain Setup Funnel**
```typescript
const DOMAIN_FUNNEL = [
  'custom_domain_added',   // Step 1
  'dns_configured',        // Step 2
  'domain_verified',       // Step 3
  'domain_activated',      // Step 4
];
```

---

## Analytics Dashboard

### Enhanced Analytics Service

```typescript
// services/analytics-service/src/routes/dashboard.ts
import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { mixpanel } from '../lib/mixpanel';

export default async function dashboardRoutes(app: FastifyInstance) {
  
  /**
   * GET /analytics/dashboard
   * 
   * Real-time dashboard metrics
   */
  app.get('/dashboard', async (req, reply) => {
    const userId = (req as any).userId;
    const { timeRange = '7d' } = req.query as any;
    
    // Fetch metrics from Mixpanel
    const mixpanelMetrics = await getMixpanelMetrics(userId, timeRange);
    
    // Fetch metrics from database
    const dbMetrics = await getDatabaseMetrics(userId, timeRange);
    
    return reply.send({
      overview: {
        totalScans: mixpanelMetrics.totalScans,
        uniqueVisitors: mixpanelMetrics.uniqueVisitors,
        conversionRate: mixpanelMetrics.conversionRate,
        revenue: mixpanelMetrics.revenue,
      },
      trends: {
        scansOverTime: mixpanelMetrics.scansOverTime,
        conversionsOverTime: mixpanelMetrics.conversionsOverTime,
      },
      topQRCodes: dbMetrics.topQRCodes,
      topLocations: mixpanelMetrics.topLocations,
      devices: mixpanelMetrics.devices,
      funnels: {
        onboarding: await getFunnelData(userId, ONBOARDING_FUNNEL),
        ecommerce: await getFunnelData(userId, ECOMMERCE_FUNNEL),
      },
    });
  });
  
  /**
   * GET /analytics/conversions
   * 
   * Conversion tracking and analysis
   */
  app.get('/conversions', async (req, reply) => {
    const userId = (req as any).userId;
    const { event, startDate, endDate } = req.query as any;
    
    const conversions = await db
      .select()
      .from(conversionsTable)
      .where(and(
        eq(conversionsTable.userId, userId),
        event ? eq(conversionsTable.event, event) : undefined,
        gte(conversionsTable.timestamp, startDate),
        lte(conversionsTable.timestamp, endDate)
      ))
      .orderBy(desc(conversionsTable.timestamp));
    
    // Calculate conversion metrics
    const metrics = {
      totalConversions: conversions.length,
      conversionRate: calculateConversionRate(userId, event),
      revenue: conversions.reduce((sum, c) => sum + (c.metadata.revenue || 0), 0),
      averageValue: 0,
    };
    
    metrics.averageValue = metrics.revenue / metrics.totalConversions;
    
    return reply.send({
      metrics,
      conversions: conversions.slice(0, 100),  // Paginate in production
    });
  });
}

// Helper: Get Mixpanel metrics
async function getMixpanelMetrics(userId: string, timeRange: string) {
  // Use Mixpanel Query API
  const response = await fetch('https://mixpanel.com/api/2.0/segmentation', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(process.env.MIXPANEL_API_SECRET + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event: 'QR Code Scanned',
      type: 'general',
      unit: 'day',
      interval: getDaysFromRange(timeRange),
      where: `properties["user_id"] == "${userId}"`,
    }),
  });
  
  const data = await response.json();
  return data;
}
```

### Frontend Dashboard Component

```typescript
// qr-frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { mixpanel } from '../lib/mixpanel';
import { api } from '../lib/api';

export function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Track page view
    mixpanel.track('Dashboard Viewed');
    
    // Load metrics
    loadDashboardMetrics();
  }, []);
  
  const loadDashboardMetrics = async () => {
    try {
      const data = await api.get('/analytics/dashboard');
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="dashboard">
      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total Scans"
          value={metrics.overview.totalScans}
          change="+12.5%"
          trend="up"
        />
        <MetricCard
          title="Unique Visitors"
          value={metrics.overview.uniqueVisitors}
          change="+8.3%"
          trend="up"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.overview.conversionRate}%`}
          change="-2.1%"
          trend="down"
        />
        <MetricCard
          title="Revenue"
          value={`$${metrics.overview.revenue}`}
          change="+15.7%"
          trend="up"
        />
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <LineChart
          title="Scans Over Time"
          data={metrics.trends.scansOverTime}
        />
        <PieChart
          title="Devices"
          data={metrics.devices}
        />
      </div>
      
      {/* Conversion Funnels */}
      <div className="mt-6">
        <h2>Conversion Funnels</h2>
        <FunnelChart
          title="Onboarding Funnel"
          steps={metrics.funnels.onboarding}
        />
        <FunnelChart
          title="E-commerce Funnel"
          steps={metrics.funnels.ecommerce}
        />
      </div>
      
      {/* Top QR Codes */}
      <div className="mt-6">
        <TopQRCodesTable data={metrics.topQRCodes} />
      </div>
    </div>
  );
}
```

---

## Environment Variables

### Backend (.env)

```bash
# Domain Service
SUBDOMAIN_BASE=scanly.io
SERVER_IP=123.45.67.89
PLATFORM_DOMAIN=proxy.scanly.io

# Cloudflare (for automated subdomain DNS)
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_ACCOUNT_ID=your_account_id

# SSL Certificates
CERTBOT_EMAIL=admin@scanly.io
SSL_AUTO_RENEW=true

# Mixpanel
MIXPANEL_TOKEN=your_project_token
MIXPANEL_API_SECRET=your_api_secret
```

### Frontend (.env)

```bash
# Mixpanel
VITE_MIXPANEL_TOKEN=your_project_token

# API
VITE_API_URL=https://api.scanly.io
```

---

## Testing End-to-End

### 1. Start All Services
```bash
cd qr-backend
./scripts/start-all.sh
```

### 2. Test Subdomain Claiming
```bash
# Claim subdomain
curl -X POST http://localhost:3000/api/subdomains/claim \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subdomain": "testuser", "defaultQrId": "qr-abc123"}'

# Visit subdomain
curl http://testuser.scanly.io
```

### 3. Test Custom Domain
```bash
# Add custom domain
curl -X POST http://localhost:3000/api/domains \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "scan.example.com"}'

# Configure DNS (manual step)

# Verify domain
curl -X POST http://localhost:3000/api/domains/:id/verify \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test Analytics Tracking
```bash
# Track QR scan
curl http://localhost:3000/scan/qr-abc123

# Check Mixpanel dashboard
open https://mixpanel.com/project/YOUR_PROJECT_ID
```

---

## Next Steps

1. ✅ **Start All Microservices** - Use `./scripts/start-all.sh`
2. ✅ **Verify Kafka Communication** - Check service logs
3. ✅ **Set Up Cloudflare** - Add DNS wildcard record
4. ✅ **Configure SSL** - Run Certbot for certificates
5. ✅ **Install Mixpanel** - Add tracking to frontend/backend
6. ✅ **Test Conversion Funnels** - Create test events
7. ✅ **Improve Frontend** - Enhance dashboard, analytics, integrations pages

---

**Questions? Issues?** Check the logs:
- Domain Service: `./services/domains-service/logs/app.log`
- Routing Service: `./services/routing-service/logs/app.log`
- Analytics Service: `./services/analytics-service/logs/app.log`
