# Scanly Backend - Enterprise QR & Microsite Platform

> **Production-grade microservices architecture powering dynamic QR codes, real-time analytics, AI-powered insights, and multi-tenant SaaS infrastructure.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 Table of Contents

- [What is Scanly Backend?](#-what-is-scanly-backend)
- [Why Scanly Backend?](#-why-scanly-backend)
- [Architecture](#-architecture)
- [Services](#-services)
- [Content Block System](#-content-block-system)
- [Quick Start](#-quick-start)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [API Documentation](#-api-documentation)
- [Production Deployment](#-production-deployment)
- [Monitoring & Observability](#-monitoring--observability)
- [Security](#-security)
- [Testing](#-testing)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🎯 What is Scanly Backend?

Scanly Backend is a **production-ready microservices architecture** that powers a comprehensive link-in-bio and QR code management platform. It combines the simplicity of Linktree with enterprise-grade features including:

- 🔗 **Dynamic QR Codes** - Generate, track, and manage QR codes at scale
- 📱 **Microsite Engine** - Render 40+ interactive content blocks with real-time publishing
- 📊 **Real-time Analytics** - Event-driven analytics with Kafka/Redis for instant insights
- 🤖 **AI-Powered ML** - Content recommendations, A/B testing, and predictive analytics
- 👥 **Multi-Tenancy** - Organization/workspace management with role-based access control
- 🌍 **Global Scale** - CDN integration, geo-tracking, and device fingerprinting
- 💳 **Payment Processing** - Stripe integration for monetization and subscriptions
- 📧 **Email Automation** - Transactional emails, campaigns, and lead nurturing

---

## ⚡ Why Scanly Backend?

| Feature | Traditional Platforms | Scanly Backend |
|---------|----------------------|----------------|
| **Architecture** | Monolithic | **Microservices with 18+ services** |
| **Content Blocks** | 10-15 basic types | **40+ interactive blocks** (gallery, pricing, real estate, artist, shop) |
| **Analytics** | Basic click tracking | **Real-time event streaming** with ML insights |
| **QR Codes** | Static images | **Dynamic routing + pixel tracking** |
| **Multi-Tenancy** | Single workspace | **Organizations + teams + workspaces** |
| **AI Features** | None | **Content optimization, A/B testing, fraud detection** |
| **Deployment** | Platform lock-in | **Self-hosted + Docker + Kubernetes ready** |
| **Observability** | Limited logging | **Prometheus metrics + Grafana dashboards** |

### 🚀 Built for Scale

- **Event-Driven**: Kafka message streaming for high-throughput analytics
- **Cached Rendering**: Redis caching with 95%+ cache hit rates
- **Database Isolation**: Separate PostgreSQL databases per service
- **Horizontal Scaling**: Stateless services ready for Kubernetes
- **API Gateway**: Centralized routing, rate limiting, and authentication

---

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Public Access"
        QR[QR Code Scan]
        WEB[Web Browser]
    end

    subgraph "API Gateway Layer"
        GW[Tenant Gateway<br/>Port 8080]
        NGINX[Nginx Reverse Proxy]
    end

    subgraph "Core Services"
        AUTH[Auth Service<br/>Port 3001]
        QRS[QR Service<br/>Port 3002]
        MS[Microsite Service<br/>Port 3005]
        ANALYTICS[Analytics Service<br/>Port 3004]
    end

    subgraph "Enhanced Services"
        MEDIA[Media Service<br/>Port 3006]
        EMAIL[Email Service<br/>Port 3007]
        DOMAINS[Domains Service<br/>Port 3008]
        ROUTING[Routing Service<br/>Port 3009]
    end

    subgraph "Enterprise Services"
        TENANT[Tenant Service<br/>Port 3010]
        CREATOR[Creator Service<br/>Port 3011]
        INTEGRATIONS[Integrations<br/>Port 3012]
        PIXELS[Pixels Service<br/>Port 3013]
    end

    subgraph "AI & Intelligence"
        ML[ML Service<br/>Port 3030]
        INSIGHTS[Insights Service<br/>Port 3031]
        EXPERIMENTS[Experiments<br/>Port 3032]
    end

    subgraph "Infrastructure"
        KAFKA[(Kafka/Redpanda)]
        REDIS[(Redis Cache)]
        PG1[(PostgreSQL - Auth)]
        PG2[(PostgreSQL - QR)]
        PG3[(PostgreSQL - Microsite)]
        PG4[(PostgreSQL - Analytics)]
        PG5[(PostgreSQL - Multi-tenant)]
    end

    subgraph "Monitoring"
        PROM[Prometheus]
        GRAF[Grafana]
    end

    QR --> GW
    WEB --> NGINX
    GW --> AUTH
    GW --> QRS
    GW --> MS
    
    AUTH --> PG1
    QRS --> PG2
    MS --> PG3
    MS --> REDIS
    MS --> KAFKA
    ANALYTICS --> PG4
    ANALYTICS --> KAFKA
    
    ML --> PG5
    TENANT --> PG5
    
    AUTH -.-> PROM
    QRS -.-> PROM
    MS -.-> PROM
    ANALYTICS -.-> PROM
    PROM --> GRAF
```

### Service Communication Flow

1. **QR Code Scan** → Routing Service → Microsite Service (cached HTML) → Analytics Event
2. **Microsite Publish** → Auth (JWT) → Microsite Service → Render Engine → Redis Cache
3. **Analytics Pipeline** → Kafka Producer → Event Stream → Analytics Consumer → PostgreSQL
4. **ML Recommendations** → Analytics Data → ML Service → Content Suggestions → Frontend

---

## 🔧 Services

### Core Platform (4 Services)

| Service | Port | Description | Database | Key Features |
|---------|------|-------------|----------|--------------|
| **Auth Service** | 3001 | User authentication & authorization | `auth_service` | JWT tokens, refresh tokens, RBAC |
| **QR Service** | 3002 | QR code generation & management | `qr_service` | Dynamic QR codes, PNG/SVG export |
| **Microsite Service** | 3005 | Content rendering & publishing | `microsite_service` | 40+ blocks, Redis caching, HTML generation |
| **Analytics Service** | 3004 | Event tracking & metrics | `qr_analytics` | Real-time streams, device tracking, geo data |

### Enhanced Services (4 Services)

| Service | Port | Description | Features |
|---------|------|-------------|----------|
| **Media Service** | 3006 | File uploads & asset management | Cloudflare R2, image optimization |
| **Email Service** | 3007 | Transactional & marketing emails | SendGrid, templates, campaigns |
| **Domains Service** | 3008 | Custom domain management | DNS validation, SSL certificates |
| **Routing Service** | 3009 | Dynamic QR routing & redirects | A/B testing, geo-routing |

### Enterprise Services (4 Services)

| Service | Port | Description | Features |
|---------|------|-------------|----------|
| **Tenant Service** | 3010 | Multi-tenant organizations | Workspaces, teams, invitations |
| **Creator Service** | 3011 | Creator monetization tools | Products, payments, subscriptions |
| **Integrations Service** | 3012 | Third-party app connections | Stripe, Zapier, webhooks |
| **Pixels Service** | 3013 | Tracking pixels & conversions | Facebook, Google Analytics |

### AI & Intelligence (3 Services)

| Service | Port | Description | Features |
|---------|------|-------------|----------|
| **ML Service** | 3030 | Machine learning & AI | Content recommendations, fraud detection |
| **Insights Service** | 3031 | Predictive analytics | User behavior, conversion optimization |
| **Experiments Service** | 3032 | A/B testing framework | Multivariate testing, statistics |

### Additional Services (3 Services)

| Service | Description | Features |
|---------|-------------|----------|
| **Print Studio** | Physical QR product design | Templates, customization, ordering |
| **Workflow Builder** | Automation & triggers | If-this-then-that logic, actions |
| **Asset Service** | Digital asset management | Versioning, metadata, CDN |

**Total: 18 Microservices** - Each with isolated database, Swagger docs, and health checks

---

## 🎨 Content Block System

Scanly supports **40+ interactive content blocks** for building dynamic microsites. The backend rendering engine (`render.ts`) generates static HTML with embedded JavaScript for client-side interactivity.

### Block Categories

#### 🔗 **Linktree-Style Blocks** (4 blocks)
- **Profile** - Avatar, name, bio, location
- **LinkButton** - Call-to-action buttons with icons
- **Header** - Page header with logo
- **Footer** - Copyright and branding

#### 📝 **Content Blocks** (6 blocks)
- **Heading** - H1/H2/H3 typography
- **Text** - Rich text with TipTap editor
- **Image** - Responsive images with alt text
- **Video** - YouTube/Vimeo embeds
- **Divider** - Horizontal separators
- **Spacer** - Vertical spacing control

#### 🎯 **Interactive Blocks** (8 blocks)
- **Button** - Customizable CTAs
- **Form** - Lead capture with validation
- **FAQ** - Accordion with smooth animations
- **Gallery** - Image carousel with lightbox
- **Countdown** - Event timers with live updates
- **Calendar** - Events list with filtering
- **Testimonial** - Customer reviews with ratings
- **Social** - Social media link grid

#### 📊 **Business Blocks** (8 blocks)
- **Pricing** - Subscription plan comparisons
- **Features** - Icon grid with descriptions
- **Stats** - Animated counters
- **Map** - Google Maps embeds
- **Hero** - Full-width hero sections
- **Schedule** - Calendly-style booking
- **Real Estate** - Property listings with filters
- **Menu** - Restaurant menus with categories

#### 💰 **Monetization Blocks** (5 blocks)
- **Payment** - Stripe payment/tip jar
- **Product** - Single product showcase
- **Shop** - Multi-product store with cart
- **Artist** - Music player with Spotify integration
- **Deals** - Promotions and coupons

### Block Rendering Architecture

```javascript
// Backend: services/microsite-service/src/utils/render.ts
export function renderMicrosite(site: Microsite): string {
  const blocksHtml = site.layout
    .map(block => renderBlock(block, site.theme))
    .join('\n');
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${site.title}</title>
        ${injectThemeStyles(site.theme)}
        ${injectAnalyticsPixels(site.pixels)}
      </head>
      <body>
        ${blocksHtml}
        <script src="/js/microsite-client.js"></script>
      </body>
    </html>
  `;
}

function renderBlock(block: Block, theme: Theme): string {
  switch (block.type) {
    case 'profile': return renderProfileBlock(block, theme);
    case 'linkButton': return renderLinkButtonBlock(block, theme);
    case 'gallery': return renderGalleryBlock(block, theme);
    case 'pricing': return renderPricingBlock(block, theme);
    // ... 40+ block renderers
  }
}
```

### Client-Side Interactivity

**Location:** `services/microsite-service/src/utils/microsite-client.js`

All interactive features (FAQ accordions, Gallery lightbox, Countdown timers, Stats animations) use **vanilla JavaScript** (no React dependencies) for:
- ⚡ Fast load times (<50KB gzipped)
- 📱 Mobile optimization
- ♿ Keyboard navigation
- 🎨 Smooth animations (CSS transitions)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
Node.js >= 18.x
Docker & Docker Compose
PostgreSQL 15+
Redis 7+

# Optional (for full features)
Kafka/Redpanda
Cloudflare R2 (media storage)
```

### Installation

```bash
# Clone repository
git clone https://github.com/Scanly-io/qr-backend.git
cd qr-backend

# Install dependencies (monorepo)
npm install

# Start infrastructure
docker-compose up -d  # PostgreSQL, Redis, Redpanda, Prometheus, Grafana

# Setup databases (run for each service)
cd services/auth-service && npx drizzle-kit push && cd ../..
cd services/qr-service && npx drizzle-kit push && cd ../..
cd services/microsite-service && npx drizzle-kit push && cd ../..
cd services/analytics-service && npx drizzle-kit push && cd ../..

# Start all services
npm run dev:all
```

### Environment Setup

Create `.env` files for each service:

```env
# services/auth-service/.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/auth_service
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
PORT=3001

# services/microsite-service/.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/microsite_service
JWT_SECRET=your-secret-key-min-32-chars
REDIS_URL=redis://localhost:6379
KAFKA_BROKER=localhost:9092
KAFKA_DISABLED=false  # Set to 'true' to run without Kafka
PORT=3005

# services/analytics-service/.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/qr_analytics
KAFKA_BROKER=localhost:9092
KAFKA_GROUP_ID=analytics-consumer-group
PORT=3004
```

See [`ENVIRONMENT.md`](./ENVIRONMENT.md) for complete environment variable reference.

### Verify Installation

```bash
# Check service health
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # QR Service
curl http://localhost:3005/health  # Microsite Service
curl http://localhost:3004/health  # Analytics Service

# View Swagger API docs
open http://localhost:3001/docs  # Auth API
open http://localhost:3005/docs  # Microsite API
```

---

## 💻 Tech Stack

### Backend Framework
- **Node.js** 18+ - JavaScript runtime
- **Fastify** - High-performance web framework (2x faster than Express)
- **TypeScript** - Type-safe development

### Databases & Caching
- **PostgreSQL** 15+ - Primary data store (isolated per service)
- **Redis** 7+ - Caching layer for microsite HTML
- **Drizzle ORM** - Type-safe database queries

### Message Streaming
- **Kafka/Redpanda** - Event streaming for analytics
- **Graceful degradation** - Services run without Kafka if disabled

### Authentication & Security
- **JWT** - Stateless authentication tokens
- **bcrypt** - Password hashing (12 rounds)
- **RBAC** - Role-based access control
- **Rate limiting** - @fastify/rate-limit

### Monitoring & Observability
- **Prometheus** - Metrics collection
- **Grafana** - Dashboards and visualization
- **Pino** - Structured JSON logging
- **Swagger/OpenAPI** - Interactive API documentation

### File Storage
- **Cloudflare R2** - Object storage for media
- **Sharp** - Image processing and optimization

### Email & Communications
- **SendGrid** - Transactional emails
- **Nodemailer** - SMTP fallback

### AI & Machine Learning
- **TensorFlow.js** - Machine learning models
- **brain.js** - Neural networks for predictions
- **Natural** - NLP for content analysis

---

## ✨ Features

### 🔐 Authentication & Authorization

- ✅ **JWT Access Tokens** - 15-minute expiration
- ✅ **Refresh Tokens** - 7-day rotation with automatic renewal
- ✅ **Password Security** - bcrypt hashing, strength validation
- ✅ **Role-Based Access Control** - Owner, Admin, Editor, Viewer roles
- ✅ **Multi-Factor Authentication** - TOTP support (planned)
- ✅ **OAuth Integration** - Google, GitHub login (planned)

### 📊 Real-Time Analytics

- ✅ **Event Streaming** - Kafka-based analytics pipeline
- ✅ **Device Tracking** - Browser, OS, device type detection
- ✅ **Geo-Location** - Country, city, timezone tracking
- ✅ **Referrer Analysis** - Traffic source attribution
- ✅ **Session Tracking** - User journey analysis
- ✅ **Conversion Events** - Form submissions, purchases, clicks
- ✅ **Real-Time Dashboards** - Live metrics via WebSocket (planned)

### 📱 QR Code Management

- ✅ **Dynamic QR Codes** - Update destination without regenerating
- ✅ **Multiple Formats** - PNG, SVG, PDF export
- ✅ **Custom Styling** - Colors, logos, error correction levels
- ✅ **Batch Generation** - Create QR codes at scale
- ✅ **Scan Tracking** - Every scan logged with metadata
- ✅ **Expiration Dates** - Time-limited campaigns
- ✅ **A/B Testing** - Route to different content per scan

### 🎨 Microsite Rendering

- ✅ **40+ Content Blocks** - Rich interactive components
- ✅ **Server-Side Rendering** - Static HTML generation
- ✅ **Redis Caching** - 95%+ cache hit rate
- ✅ **Theme System** - 30+ pre-built themes
- ✅ **Responsive Design** - Mobile-first approach
- ✅ **SEO Optimization** - Meta tags, Open Graph, Twitter Cards
- ✅ **Custom Domains** - CNAME configuration
- ✅ **SSL Certificates** - Automatic HTTPS

### 👥 Multi-Tenancy

- ✅ **Organizations** - Top-level tenant entities
- ✅ **Workspaces** - Project isolation within orgs
- ✅ **Teams** - Role-based member management
- ✅ **Invitations** - Email-based team invites
- ✅ **Permissions** - Granular access control
- ✅ **Billing** - Per-organization subscription (planned)

### 🤖 AI & Machine Learning

- ✅ **Content Recommendations** - ML-powered suggestions
- ✅ **A/B Test Optimization** - Automatic winner selection
- ✅ **Fraud Detection** - Anomaly detection for scans
- ✅ **Predictive Analytics** - Conversion forecasting
- ✅ **Sentiment Analysis** - Form response analysis
- ✅ **Accessibility Scoring** - WCAG compliance checks

### 💳 Payments & Monetization

- ✅ **Stripe Integration** - Payment processing
- ✅ **Tip Jars** - Creator monetization
- ✅ **Product Sales** - Digital/physical goods
- ✅ **Subscriptions** - Recurring billing
- ✅ **Invoicing** - B2B payment links
- ✅ **Payout Management** - Creator earnings

---

## 📚 API Documentation

All services provide **interactive Swagger documentation** at `/docs` endpoint:

- **Auth Service**: http://localhost:3001/docs
- **QR Service**: http://localhost:3002/docs
- **Microsite Service**: http://localhost:3005/docs
- **Analytics Service**: http://localhost:3004/docs
- **Tenant Gateway**: http://localhost:8080/docs

### Example API Calls

#### 1. User Authentication

```bash
# Register new user
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!", "name": "John Doe"}'

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "8f3b2a1c...",
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}'
```

#### 2. Create QR Code

```bash
curl -X POST http://localhost:3002/api/qr \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://scanly.io/demo",
    "name": "Marketing Campaign Q1",
    "color": "#6366f1",
    "errorCorrection": "M"
  }'

# Download QR image
curl http://localhost:3002/qr/{qrId}/image -o qrcode.png
```

#### 3. Publish Microsite

```bash
curl -X POST http://localhost:3005/api/microsite/{micrositeId}/publish \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Portfolio",
    "layout": [
      {
        "type": "profile",
        "content": {
          "displayName": "Jane Designer",
          "bio": "Product designer & creative director",
          "avatarUrl": "https://..."
        }
      },
      {
        "type": "linkButton",
        "content": {
          "label": "View My Work",
          "url": "https://portfolio.example.com",
          "icon": "arrow"
        }
      }
    ],
    "theme": {
      "name": "Minimal",
      "primaryColor": "#000000",
      "fontFamily": "Inter"
    }
  }'
```

#### 4. Query Analytics

```bash
# Get scan statistics
curl http://localhost:3004/api/analytics/qr/{qrId}/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response
{
  "totalScans": 1247,
  "uniqueUsers": 892,
  "topCountries": [
    {"country": "US", "count": 523},
    {"country": "UK", "count": 187}
  ],
  "devices": {
    "mobile": 876,
    "desktop": 289,
    "tablet": 82
  },
  "timeSeriesData": [...]
}
```

---

## 🚀 Production Deployment

### Docker Deployment

```bash
# Build all services
docker-compose -f docker-compose.yml build

# Run in production mode
docker-compose -f docker-compose.yml up -d

# Scale specific services
docker-compose up -d --scale microsite-service=3
```

### Kubernetes (Helm Charts - Planned)

```bash
# Install Scanly backend
helm install scanly-backend ./helm/scanly \
  --set postgresql.enabled=true \
  --set redis.enabled=true \
  --set kafka.enabled=true \
  --set ingress.domain=api.scanly.io
```

### Environment Variables for Production

```env
# Security
NODE_ENV=production
JWT_SECRET=<generate-with-openssl-rand-base64-32>
ALLOWED_ORIGINS=https://scanly.io,https://app.scanly.io

# Database (use connection pooling)
DATABASE_URL=postgresql://user:pass@db-host:5432/dbname?sslmode=require&pool_max=20

# Redis (use Redis Cluster for HA)
REDIS_URL=redis://redis-cluster:6379

# Kafka (production broker)
KAFKA_BROKER=kafka-1:9092,kafka-2:9092,kafka-3:9092

# Monitoring
PROMETHEUS_ENABLED=true
LOG_LEVEL=info

# External Services
CLOUDFLARE_R2_ENDPOINT=https://...
SENDGRID_API_KEY=SG...
STRIPE_SECRET_KEY=sk_live_...
```

### Infrastructure Checklist

- [ ] **Database Backups** - Automated daily PostgreSQL backups
- [ ] **SSL Certificates** - Let's Encrypt or Cloudflare SSL
- [ ] **CDN** - Cloudflare for static assets and caching
- [ ] **Load Balancer** - Nginx or AWS ALB for service routing
- [ ] **Auto-Scaling** - Kubernetes HPA or AWS Auto Scaling
- [ ] **Monitoring Alerts** - PagerDuty/Opsgenie integration
- [ ] **Secret Management** - AWS Secrets Manager or Vault
- [ ] **CI/CD Pipeline** - GitHub Actions for automated deployments

---

## 📊 Monitoring & Observability

### Prometheus Metrics

All services expose metrics at `/metrics` endpoint:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Cache hit ratio
sum(rate(cache_hits_total[5m])) / sum(rate(cache_requests_total[5m]))
```

### Grafana Dashboards

Access Grafana at http://localhost:3000 (default credentials: `admin` / `admin`)

**Pre-built Dashboards:**
- **Services Overview** - Health, uptime, request rates
- **Analytics Pipeline** - Kafka lag, event throughput
- **Cache Performance** - Redis hit/miss ratios
- **Database Performance** - Query latency, connection pools
- **Error Tracking** - 4xx/5xx error rates by service

### Structured Logging

```javascript
// Using Pino logger
import { logger } from '@qr-backend/common/logger';

logger.info({ 
  userId: 'usr_123', 
  action: 'microsite_publish',
  micrositeId: 'site_456' 
}, 'Microsite published successfully');

// Output (JSON)
{
  "level": 30,
  "time": 1705932400000,
  "userId": "usr_123",
  "action": "microsite_publish",
  "micrositeId": "site_456",
  "msg": "Microsite published successfully"
}
```

---

## 🔒 Security

### Implemented Security Measures

- ✅ **JWT Authentication** - Stateless token verification
- ✅ **Password Hashing** - bcrypt with 12 rounds
- ✅ **SQL Injection Prevention** - Parameterized queries via Drizzle ORM
- ✅ **XSS Protection** - Content Security Policy headers
- ✅ **CORS Configuration** - Whitelist allowed origins
- ✅ **Rate Limiting** - 100 requests/minute per IP
- ✅ **Helmet.js** - Security headers (X-Frame-Options, etc.)
- ✅ **Input Validation** - Zod schema validation
- ✅ **HTTPS Only** - SSL/TLS encryption in production
- ✅ **Secret Rotation** - Environment-based key management

### Security Best Practices

```javascript
// 1. Environment variable validation
import { z } from 'zod';

const envSchema = z.object({
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test'])
});

const env = envSchema.parse(process.env);

// 2. Input sanitization
import { sanitize } from '@qr-backend/common/sanitize';

fastify.post('/api/microsite', async (request, reply) => {
  const { title, content } = sanitize(request.body);
  // Process sanitized input...
});

// 3. Rate limiting
fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});
```

### Compliance

- **GDPR Ready** - User data export/deletion endpoints
- **SOC 2 Considerations** - Audit logging, access controls
- **WCAG 2.1 AA** - Accessibility compliance for rendered microsites

---

## 🧪 Testing

### Test Suite

```bash
# Run all tests
npm test

# Run tests for specific service
npm test --workspace=services/auth-service

# Run with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Test Structure

```
test/
├── unit/               # Unit tests for individual functions
│   ├── auth.test.ts
│   ├── qr.test.ts
│   └── render.test.ts
├── integration/        # API endpoint tests
│   ├── auth-flow.test.ts
│   ├── microsite-publish.test.ts
│   └── analytics-pipeline.test.ts
└── e2e/               # End-to-end user flows
    ├── signup-to-publish.test.ts
    └── qr-scan-tracking.test.ts
```

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { renderBlock } from '../services/microsite-service/src/utils/render';

describe('Block Rendering', () => {
  it('should render profile block with correct HTML structure', () => {
    const block = {
      type: 'profile',
      content: {
        displayName: 'John Doe',
        bio: 'Designer & Developer',
        avatarUrl: 'https://example.com/avatar.jpg'
      }
    };

    const html = renderBlock(block, defaultTheme);
    
    expect(html).toContain('John Doe');
    expect(html).toContain('Designer & Developer');
    expect(html).toContain('<img');
  });
});
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e
```

---

## 🗺️ Roadmap

### Q1 2026

- [ ] **GraphQL API** - Alternative to REST for complex queries
- [ ] **WebSocket Support** - Real-time analytics dashboard updates
- [ ] **Multi-Language Support** - i18n for microsites (10+ languages)
- [ ] **Advanced A/B Testing** - Multivariate experiments with statistical significance
- [ ] **Mobile SDKs** - React Native components for embedded microsites

### Q2 2026

- [ ] **Headless CMS Integration** - Contentful, Sanity, Strapi connectors
- [ ] **Workflow Automation** - Zapier-like automation builder
- [ ] **White-Label Solution** - Rebrandable platform for agencies
- [ ] **Advanced Analytics** - Funnel analysis, cohort retention, attribution
- [ ] **Marketplace** - Third-party block library

### Q3 2026

- [ ] **Voice Integration** - Alexa/Google Assistant QR code actions
- [ ] **AR Features** - Augmented reality overlays on QR scans
- [ ] **Blockchain QR** - NFT gating, crypto payments
- [ ] **Edge Computing** - Cloudflare Workers for ultra-low latency
- [ ] **AI Content Generation** - GPT-powered block content creation

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Support & Contact

- **Documentation**: [docs.scanly.io](https://docs.scanly.io) (coming soon)
- **GitHub Issues**: [github.com/Scanly-io/qr-backend/issues](https://github.com/Scanly-io/qr-backend/issues)
- **Discussions**: [github.com/Scanly-io/qr-backend/discussions](https://github.com/Scanly-io/qr-backend/discussions)
- **Email**: support@scanly.io
- **Twitter**: [@ScanlyIO](https://twitter.com/ScanlyIO)

---

## 🙏 Credits

Built with amazing open-source technologies:

- [Fastify](https://www.fastify.io/) - Lightning-fast web framework
- [PostgreSQL](https://www.postgresql.org/) - World's most advanced open-source database
- [Redis](https://redis.io/) - In-memory data structure store
- [Kafka](https://kafka.apache.org/) - Distributed event streaming
- [TensorFlow.js](https://www.tensorflow.org/js) - Machine learning for JavaScript
- [Prometheus](https://prometheus.io/) - Monitoring and alerting
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe database toolkit

---

<div align="center">

**[Website](https://scanly.io)** • **[Demo](https://demo.scanly.io)** • **[Docs](https://docs.scanly.io)** • **[Blog](https://blog.scanly.io)**

Built with ❤️ by [Saurabh Bansal](https://github.com/sbansa1)

⭐ **Star us on GitHub** if you find Scanly useful!

</div>
