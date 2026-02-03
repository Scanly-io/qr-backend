# QR Analytics Platform - Complete Overview

**Last Updated:** December 16, 2025  
**Architecture:** Microservices + Event-Driven (Kafka)  
**Status:** Active Development

---

## 🎯 Platform Vision

**Mission:** Build the most powerful QR code platform combining analytics, branding, and smart routing - competing with Bitly, Linktree, and QR Tiger.

**Core Value Proposition:**
- 📊 **Advanced Analytics** - Understand every scan with device, location, and campaign tracking
- 🎨 **Beautiful Microsites** - Linktree-style landing pages with custom branding
- 🌐 **Custom Domains** - White-label with your own domain or free subdomains
- 🧠 **Smart Routing** - Time-based and location-based QR redirects
- 🎯 **Retargeting Pixels** - Connect QR scans to ad campaigns
- 📈 **A/B Testing** - Optimize conversion with experiments

---

## 🏗️ System Architecture

### **Microservices Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    NGINX API Gateway                         │
│                   (Port 80/443 - HTTPS)                      │
│          Routing, Rate Limiting, SSL Termination            │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌────────▼─────────┐
│  Auth Service  │    │   QR Service     │
│   Port 3002    │    │   Port 3001      │
│  - Signup      │    │  - Create QR     │
│  - Login       │    │  - List QR       │
│  - JWT tokens  │    │  - Update QR     │
└────────────────┘    └──────────────────┘
        │                       │
        └───────────┬───────────┘
                    │
        ┌───────────▼────────────────────────────┐
        │         PostgreSQL Database             │
        │  - auth_service (users, sessions)      │
        │  - qr_service (qrs table)              │
        │  - 7 more databases (see below)        │
        └────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│               Event Bus (Kafka/Redpanda)                      │
│  Topics: qr.created, qr.deleted, user.deleted,               │
│          domain.verified, pixel.fired, route.matched         │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Microservices Breakdown

### **1. Auth Service** (Port 3002) ✅ COMPLETE
**Purpose:** User authentication and authorization

**Features:**
- User signup/login
- JWT token generation
- Refresh token rotation
- Session management
- Password hashing (bcrypt)

**Database:** `auth_service`
- `users` table
- `sessions` table

**Events Published:**
- `user.created`
- `user.deleted`
- `user.updated`

---

### **2. QR Service** (Port 3001) ✅ COMPLETE
**Purpose:** Core QR code generation and management

**Features:**
- Generate QR codes (various formats)
- CRUD operations on QR codes
- QR code metadata
- URL shortening

**Database:** `qr_service`
- `qrs` table (id, userId, shortCode, targetUrl, metadata)

**Events Published:**
- `qr.created`
- `qr.updated`
- `qr.deleted`

**Events Subscribed:**
- `user.deleted` → Delete all user QR codes

---

### **3. Analytics Service** (Port 3004) ✅ COMPLETE
**Purpose:** Track and analyze QR code scans

**Features:**
- **Device Tracking:**
  - Device type (mobile/tablet/desktop)
  - OS (iOS, Android, Windows, Mac, Linux)
  - OS version (iOS 17.2, Android 14)
  - Browser (Chrome, Safari, Firefox)
  - Browser version
  
- **Location Analytics:**
  - Country (from IP)
  - City (from IP)
  - Region/State
  - Timezone
  - ISP information

- **Campaign Tracking:**
  - UTM parameters (source, medium, campaign, term, content)
  - Referrer URLs
  - Custom parameters

- **Time Analytics:**
  - Scan timestamps
  - Peak hours analysis
  - Day of week patterns
  - Timezone-aware stats

**Database:** `qr_analytics`
- `scan_events` table (all scan data)
- `utm_campaigns` table
- `geo_locations` table

**Events Subscribed:**
- `qr.scanned` → Record analytics
- `qr.deleted` → Archive analytics

**API Endpoints:**
- `GET /analytics/:qrId/summary` - Aggregated stats
- `GET /analytics/:qrId/events` - Raw scan events
- `GET /analytics/:qrId/timeline` - Scans over time
- `GET /analytics/:qrId/locations` - Geographic breakdown
- `GET /analytics/:qrId/devices` - Device breakdown
- `GET /analytics/:qrId/campaigns` - UTM campaign performance

---

### **4. Microsite Service** (Port 3005) ✅ COMPLETE
**Purpose:** Create Linktree-style landing pages for QR codes

**Features:**
- Drag-and-drop page builder
- Custom blocks (text, image, button, video, contact)
- Template system
- Custom CSS/styling
- Mobile-responsive design
- SEO optimization

**Database:** `microsite_service`
- `microsites` table
- `blocks` table
- `templates` table

**Events Published:**
- `microsite.created`
- `microsite.published`
- `microsite.updated`

**Events Subscribed:**
- `qr.deleted` → Delete associated microsite

---

### **5. Domains Service** (Port 3010) ✅ COMPLETE + NEW FEATURES
**Purpose:** Custom domains and free subdomains (Linktree-style)

**Features:**

#### **Custom Domains:**
- Add custom domain (e.g., `scan.yourbrand.com`)
- DNS verification (CNAME + TXT records)
- SSL certificate management
- Path-based routing (`/lunch` → QR-1, `/dinner` → QR-2)

#### **Free Subdomains:** 🆕
- Claim `username.scanly.io` for free
- No DNS setup required
- Instant activation
- Multiple routes per subdomain
- One subdomain per user
- Reserved words protection

#### **Automated Publishing:** 🆕
- Upload assets to AWS S3/CDN
- Auto-create DNS via Cloudflare API
- Generate static HTML
- Automatic SSL (via Cloudflare)
- CDN cache purging
- < 5 second publish time

**Database:** `domains_db`
- `custom_domains` table
- `domain_routes` table
- `domain_verification_logs` table
- `subdomains` table 🆕
- `subdomain_routes` table 🆕

**Events Published:**
- `domain.created`
- `domain.verified`
- `domain.failed`
- `subdomain.claimed` 🆕
- `subdomain.published` 🆕
- `subdomain.route.created` 🆕

**Integrations:**
- Cloudflare API (DNS management)
- AWS S3 (asset storage)
- CDN (content delivery)

---

### **6. Pixels Service** (Port 3011) ✅ COMPLETE
**Purpose:** Retargeting pixels for advertising platforms

**Features:**
- Integrate with 8 advertising platforms:
  - Facebook Pixel
  - Google Ads
  - TikTok Pixel
  - LinkedIn Insight Tag
  - Twitter Pixel
  - Snapchat Pixel
  - Pinterest Tag
  - Custom pixels

- Event tracking:
  - PageView
  - Lead
  - Purchase
  - AddToCart
  - Custom events

**Database:** `pixels_db`
- `pixels` table
- `pixel_events` table
- `pixel_templates` table

**Events Published:**
- `pixel.created`
- `pixel.fired`

**Events Subscribed:**
- `qr.scanned` → Fire pixel events

---

### **7. Routing Service** (Port 3012) ✅ COMPLETE
**Purpose:** Smart QR routing based on time and location

**Features:**

#### **Time-Based Routing (Link Scheduling):**
- **Once:** Single time window (Black Friday sale)
- **Recurring:** Daily/weekly patterns (lunch vs dinner menu)
- **Date Range:** Multi-day campaigns (conference week)
- Timezone-aware
- Priority-based matching

#### **Location-Based Routing (Geo-Fencing):**
- **Country:** Route by country code (US vs UK)
- **Region:** State/province level (California)
- **City:** City-specific content
- **Radius:** Circular geo-fence (lat/lng + radius)
- Priority-based matching

**Database:** `routing_db`
- `link_schedules` table
- `geo_fences` table
- `routing_logs` table

**Events Published:**
- `schedule.created`
- `geo_fence.created`
- `route.matched`

**Events Subscribed:**
- `qr.scanned` → Match and route
- `qr.deleted` → Remove routing rules

---

### **8. DLQ Processor** (Background Service) ✅ COMPLETE
**Purpose:** Handle failed Kafka events (Dead Letter Queue)

**Features:**
- Retry failed events
- Exponential backoff
- Error logging
- Manual replay capability

---

## 🚀 Planned Services (Roadmap)

### **9. Experiments Service** (Port 3013) 📋 PLANNED
**Purpose:** A/B testing for QR codes

**Features:**
- Create experiments with variants (A/B/C testing)
- Traffic splitting (50/50, 70/30, etc.)
- Conversion tracking
- Statistical significance calculation
- Winner selection
- Auto-optimization

**Database:** `experiments_db`
- `experiments` table
- `variants` table
- `experiment_results` table

---

### **10. Integrations Service** (Port 3014) 📋 PLANNED
**Purpose:** Third-party integrations

**Features:**
- Zapier integration
- Webhooks (trigger on scan)
- API webhooks
- Google Sheets export
- Slack notifications
- Email notifications
- CRM integrations (Salesforce, HubSpot)

**Database:** `integrations_db`
- `webhooks` table
- `integrations` table
- `webhook_logs` table

---

### **11. Insights Service** (Port 3015) 📋 PLANNED
**Purpose:** Advanced analytics and reporting

**Features:**
- Predictive analytics (scan forecasting)
- Anomaly detection
- Custom reports
- Scheduled reports (email PDF)
- Dashboard widgets
- Executive summaries
- ROI calculations

**Database:** `insights_db`
- `reports` table
- `insights` table
- `predictions` table

---

## 🗄️ Database Architecture

### **PostgreSQL Databases (9 total)**

```
qr_backend (PostgreSQL Container)
├── auth_service          (Users, sessions)
├── qr_service           (QR codes)
├── qr_analytics         (Scan events, analytics)
├── microsite_service    (Microsites, blocks, templates)
├── domains_db           (Domains, subdomains, DNS)
├── pixels_db            (Retargeting pixels)
├── routing_db           (Schedules, geo-fences)
├── experiments_db       (A/B tests) [Planned]
├── integrations_db      (Webhooks, APIs) [Planned]
└── insights_db          (Reports, predictions) [Planned]
```

---

## 🔄 Event-Driven Architecture

### **Kafka/Redpanda Topics**

```
Core Events:
├── qr.created           → Analytics, Domains, Pixels
├── qr.updated           → Analytics
├── qr.deleted           → All services (cleanup)
├── qr.scanned           → Analytics, Routing, Pixels
├── user.created         → Welcome emails
├── user.deleted         → All services (GDPR compliance)
└── user.updated         → Profile sync

Domain Events:
├── domain.created       → DNS verification queue
├── domain.verified      → Enable routing
├── subdomain.claimed    → DNS auto-creation
├── subdomain.published  → CDN cache purge
└── subdomain.route.created → Update routing table

Pixel Events:
├── pixel.created        → Validation
├── pixel.fired          → Ad platform sync
└── pixel.error          → Error monitoring

Routing Events:
├── schedule.created     → Routing rules update
├── geo_fence.created    → Location lookup table
└── route.matched        → Analytics

Analytics Events:
├── scan.recorded        → Data warehouse
└── campaign.tracked     → UTM attribution
```

---

## 🎯 Competitive Feature Matrix

| Feature | Our Platform | Bitly | Linktree | QR Tiger |
|---------|--------------|-------|----------|----------|
| QR Code Generation | ✅ | ✅ | ❌ | ✅ |
| Custom Domains | ✅ | ✅ | ✅ | ✅ |
| Free Subdomains | ✅ | ❌ | ✅ | ❌ |
| Device Analytics | ✅ | ✅ | ✅ | ✅ |
| Location Analytics | ✅ | ✅ | ✅ | ✅ |
| UTM Campaign Tracking | ✅ | ✅ | ✅ | ⚠️ |
| Retargeting Pixels | ✅ | ⚠️ | ✅ | ❌ |
| Time-Based Routing | ✅ | ❌ | ❌ | ⚠️ |
| Geo-Fencing | ✅ | ❌ | ❌ | ⚠️ |
| A/B Testing | 📋 | ✅ | ⚠️ | ❌ |
| Microsites | ✅ | ❌ | ✅ | ⚠️ |
| API Access | ✅ | ✅ | ✅ | ✅ |
| Webhooks | 📋 | ✅ | ⚠️ | ❌ |
| White Label | ✅ | 💰 | 💰 | 💰 |
| Automated Publishing | ✅ | ❌ | ❌ | ❌ |

Legend: ✅ Full Support | ⚠️ Limited | ❌ Not Available | 📋 Planned | 💰 Paid Only

---

## 📈 Development Roadmap

### **Phase 1: Foundation** ✅ COMPLETE
- [x] Authentication system
- [x] QR code generation
- [x] Basic analytics
- [x] Microsite builder
- [x] Database setup
- [x] Event bus (Kafka)

### **Phase 2: Core Features** ✅ COMPLETE
- [x] Advanced analytics (device, location, UTM)
- [x] Custom domains
- [x] DNS verification
- [x] Retargeting pixels
- [x] Smart routing (time + location)

### **Phase 3: Branding & Publishing** ✅ COMPLETE
- [x] Free subdomains (Linktree-style)
- [x] Automated publishing workflow
- [x] Cloudflare DNS integration
- [x] AWS S3 asset storage
- [x] CDN integration
- [x] Auto SSL

### **Phase 4: Optimization** 📋 IN PROGRESS
- [ ] A/B testing (Experiments service)
- [ ] Conversion optimization
- [ ] Statistical analysis
- [ ] Auto-winner selection

### **Phase 5: Integrations** 📋 PLANNED
- [ ] Zapier integration
- [ ] Webhooks
- [ ] CRM integrations
- [ ] Email notifications
- [ ] Slack integration

### **Phase 6: Intelligence** 📋 PLANNED
- [ ] Predictive analytics
- [ ] Anomaly detection
- [ ] Custom reports
- [ ] Executive dashboards
- [ ] ROI tracking

### **Phase 7: Scale** 📋 FUTURE
- [ ] Multi-region deployment
- [ ] Edge computing
- [ ] Real-time analytics
- [ ] Machine learning recommendations
- [ ] Enterprise features

---

## 🛠️ Technology Stack

### **Backend**
- **Language:** TypeScript (Node.js)
- **Framework:** Fastify (high-performance HTTP)
- **Database:** PostgreSQL 16
- **ORM:** Drizzle ORM
- **Event Bus:** Kafka (RedPanda)
- **Cache:** Redis
- **API Gateway:** Nginx

### **Frontend**
- **Framework:** React + Vite
- **UI Library:** shadcn/ui + Tailwind CSS
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **HTTP Client:** Axios

### **Infrastructure**
- **Containerization:** Docker + Docker Compose
- **DNS:** Cloudflare
- **Storage:** AWS S3
- **CDN:** Cloudflare CDN
- **SSL:** Cloudflare Automatic SSL
- **Monitoring:** Prometheus + Grafana

### **DevOps**
- **CI/CD:** GitHub Actions (planned)
- **Logging:** Pino
- **Error Tracking:** Sentry (planned)
- **Load Balancing:** Nginx
- **Rate Limiting:** Nginx + Redis

---

## 🔐 Security Features

- **Authentication:** JWT tokens with refresh rotation
- **Authorization:** Role-based access control (RBAC)
- **Rate Limiting:** Per-user and per-IP limits
- **CORS:** Configurable cross-origin policies
- **SQL Injection:** Parameterized queries (Drizzle ORM)
- **XSS Protection:** Input sanitization
- **HTTPS:** Automatic SSL via Cloudflare
- **DDoS Protection:** Cloudflare proxy
- **Data Encryption:** At-rest and in-transit

---

## 📊 Use Cases

### **1. Restaurant Chain**
**Scenario:** Multi-location restaurant with dynamic menus

**Setup:**
- Claim subdomain: `tacobell.scanly.io`
- Add routes:
  - `/lunch` → Lunch menu QR
  - `/dinner` → Dinner menu QR
  - `/drinks` → Drinks menu QR
- Time-based routing: Lunch 11am-3pm, Dinner 5pm-10pm
- Geo-fencing: Different menus per city
- Analytics: Track which items are scanned most

**Result:** One QR code per table, auto-updates based on time/location

---

### **2. Event Conference**
**Scenario:** 3-day tech conference

**Setup:**
- Claim subdomain: `summit2025.scanly.io`
- Add routes:
  - `/schedule` → Day-by-day schedule
  - `/speakers` → Speaker bios
  - `/venue` → Venue map
- Time-based routing: Different schedule each day
- Geo-fencing: Parking instructions by entrance
- Pixels: Track registration conversions
- Analytics: Most popular sessions

**Result:** Attendees scan one QR, see relevant content

---

### **3. E-Commerce Brand**
**Scenario:** Product packaging with QR codes

**Setup:**
- Custom domain: `scan.brand.com`
- Path routing: `/product/SKU123` → Product page
- Pixels: Facebook + Google Ads retargeting
- A/B testing: Product page variants
- Analytics: Conversion tracking
- Geo-fencing: Show local stores

**Result:** QR codes drive sales with retargeting

---

### **4. Real Estate**
**Scenario:** Property listings with yard signs

**Setup:**
- Claim subdomain: `realty.scanly.io`
- Geo-fencing: Show nearest properties
- Routes per listing: `/123-main-st`
- Microsite: Photo gallery, virtual tour, contact form
- Analytics: Which properties get most interest
- UTM tracking: Yard sign vs online ad

**Result:** Track which marketing channels drive showings

---

### **5. Personal Brand (Influencer)**
**Scenario:** Social media influencer link-in-bio

**Setup:**
- Claim subdomain: `johndoe.scanly.io`
- Routes:
  - `/portfolio` → Work samples
  - `/contact` → Contact form
  - `/shop` → Merch store
  - `/youtube` → YouTube redirect
  - `/instagram` → Instagram redirect
- Pixels: Track click-through to shop
- Analytics: Which links get most clicks

**Result:** Professional branded links, detailed analytics

---

## 💰 Pricing Strategy (Proposed)

### **Free Tier**
- ✅ 3 QR codes
- ✅ 1,000 scans/month
- ✅ Free subdomain (username.scanly.io)
- ✅ Basic analytics
- ✅ 3 microsite blocks
- ❌ No custom domain
- ❌ No retargeting pixels
- ❌ No A/B testing

### **Pro Tier** ($19/month)
- ✅ Unlimited QR codes
- ✅ 10,000 scans/month
- ✅ Free subdomain
- ✅ 1 custom domain
- ✅ Advanced analytics
- ✅ Unlimited microsite blocks
- ✅ Retargeting pixels (3 platforms)
- ✅ Time-based routing
- ✅ Geo-fencing
- ❌ No A/B testing
- ❌ No white label

### **Business Tier** ($49/month)
- ✅ Everything in Pro
- ✅ 50,000 scans/month
- ✅ 5 custom domains
- ✅ A/B testing
- ✅ Retargeting pixels (all 8 platforms)
- ✅ Priority support
- ✅ Webhooks
- ✅ API access
- ❌ No white label

### **Enterprise Tier** (Custom Pricing)
- ✅ Everything in Business
- ✅ Unlimited scans
- ✅ Unlimited domains
- ✅ White label
- ✅ Dedicated account manager
- ✅ SLA guarantee
- ✅ Custom integrations
- ✅ On-premise deployment option

---

## 📞 API Documentation

All services expose Swagger documentation:
- Auth: `http://localhost/auth-docs`
- QR: `http://localhost/qr-docs`
- Analytics: `http://localhost/analytics-docs`
- Microsite: `http://localhost/microsite-docs`
- Domains: `http://localhost/domains-docs`
- Pixels: `http://localhost/pixels-docs`
- Routing: `http://localhost/routing-docs`

---

## 🚦 Current Status

### **Production Ready** ✅
- Auth Service
- QR Service
- Analytics Service (Tier 1)
- Microsite Service
- Domains Service (custom domains + subdomains)
- Pixels Service
- Routing Service

### **In Development** 🔄
- Automated publishing (95% complete)
- Cloudflare API integration (new)
- AWS S3 integration (new)

### **Planned** 📋
- Experiments Service (A/B testing)
- Integrations Service (webhooks, Zapier)
- Insights Service (advanced reporting)

---

## 🎓 Setup Instructions

### **1. Prerequisites**
```bash
- Docker + Docker Compose
- Node.js 20+
- npm 10+
- PostgreSQL (via Docker)
- Kafka/Redpanda (via Docker)
```

### **2. Clone & Install**
```bash
git clone https://github.com/Scanly-io/qr-backend
cd qr-backend
npm install
```

### **3. Environment Setup**
```bash
# Copy env files
cp .env.example .env
cp services/domains-service/.env.example services/domains-service/.env

# Configure:
# - Database URLs
# - Kafka brokers
# - Cloudflare API tokens
# - AWS credentials
# - Domain names
```

### **4. Start Infrastructure**
```bash
docker-compose up -d postgres redpanda redis
```

### **5. Run Migrations**
```bash
npm run db:push --workspace=@qr/auth-service
npm run db:push --workspace=@qr/qr-service
npm run db:push --workspace=@qr/analytics-service
npm run db:push --workspace=@qr/microsite-service
npm run db:push --workspace=@qr/domains-service
npm run db:push --workspace=@qr/pixels-service
npm run db:push --workspace=@qr/routing-service
```

### **6. Start All Services**
```bash
npm run dev:all
```

### **7. Access**
- API Gateway: `http://localhost`
- API Docs: `http://localhost/auth-docs` (and other service docs)
- Grafana: `http://localhost:3000`
- Prometheus: `http://localhost:9090`

---

## 📝 Notes

**Last Sprint Completed:**
- Added free subdomains (Linktree-style)
- Cloudflare DNS automation
- AWS S3 asset storage
- Automated publishing workflow
- Routing service completion

**Next Sprint:**
- Complete experiments service (A/B testing)
- Add integrations service (webhooks)
- Build insights service (reporting)

---

## 🏆 Competitive Advantages

1. **All-in-One Platform:** QR + Analytics + Microsite + Domains + Pixels
2. **Event-Driven:** Real-time updates, scalable architecture
3. **Smart Routing:** Time + Location aware (competitors lack this)
4. **Free Subdomains:** Lower barrier to entry than custom domains
5. **Automated Publishing:** < 5 second deploy time
6. **Developer-Friendly:** Full API access, webhooks, Zapier
7. **Privacy-Focused:** Self-hosted option, GDPR compliant
8. **Cost-Effective:** Cloudflare (free) + AWS (cheap) + Open source

---

## 🔮 Future Vision

**Year 1:** Become the #1 QR platform for small businesses
**Year 2:** Expand to enterprise with white-label solutions
**Year 3:** Add AI-powered insights and recommendations
**Year 5:** IPO or acquisition target for major marketing platform

---

**End of Document**
