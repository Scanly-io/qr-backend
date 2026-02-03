# Enterprise QR & Microsite SaaS Platform

### *A Technical PM's Journey: When Enterprise Architecture Meets Mom's Corner Store*

**Status:** Phase 1 Deployed (MVP) | **Role:** Technical Project Manager & Product Strategist  
**Technologies:** Node.js, TypeScript, PostgreSQL, Redis, Kafka, Docker, Fastify

> *"I'm a Project Manager, not a software engineer. So how do you build an 18-microservice platform? You treat AI as your virtual engineering squad, manage the architecture, and ship what matters."*

---

**Hey there, I'm Saurabh.** I'm a Technical Project Manager who excels at bridging the gap between high-level architectural vision and lean, efficient delivery. I specialize in **Agile Workflows, AI-Accelerated Development,** and **Product Strategy** for SaaS platforms.

This project started simply: My mom runs a small shop in India, and existing online tools just aren't "accessible" for folks like her. As a TPM who's managed **$1.5M+ portfolios** (at Venuiti Health), I thought, *"I can fix this."*

In August 2025, I began a deep dive into building an enterprise-grade solution—an **18-microservice platform** competing with Linktree, Bitly, and QR Code Generator. Here's what I learned about product strategy, cost management, and shipping MVPs in 2026.

---

## Table of Contents
- [Overview & Motivation](#overview--motivation)
- [Product Thinking & Competitive Analysis](#product-thinking--competitive-analysis)
- [The Toolkit: My 2026 AI-Powered Stack](#the-toolkit-my-2026-ai-powered-stack)
- [System Architecture Design](#system-architecture-design)
- [Phase 1: MVP Deployment](#phase-1-mvp-deployment)
- [Roadmap & Future Phases](#roadmap--future-phases)
- [Key Outcomes](#key-outcomes)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Skills Demonstrated](#skills-demonstrated)
- [Contact & Connect](#contact--connect)

---

## Overview & Motivation

### The Problem: The "A/A Gap" (Availability vs Accessibility)

While tools like **Shopify, Linktree, and Bitly** exist, I noticed a critical gap through my mom's experience running a small shop in India:

- **Availability ✅** - Tools exist everywhere
- **Accessibility ❌** - UX designed for tech-savvy users, not everyday shop owners

**Market insight:** Existing platforms focus on feature richness (enterprise users) but sacrifice simplicity (SMB users). There's a massive market for "Shopify-level features with Notion-level simplicity."

### The Solution: Enterprise Architecture with Lean Execution

I decided to design a **19-microservice SaaS platform** with a twist:
- **Design for enterprise scale** (custom domains, AI features, multi-tenancy)
- **Deploy lean MVP** (4 core services, <$50/month infrastructure)
- **Use AI as development accelerator** (I'm a PM, not a developer)

This became a case study in **balancing technical ambition with operational reality**.

---

## Product Thinking & Competitive Analysis

### Competitor Research (5 Platforms Analyzed)

| Platform | Strength | Weakness | My Differentiator |
|----------|----------|----------|-------------------|
| **Linktree** | Simple link-in-bio | Limited customization, no QR codes | QR + Microsite in one platform |
| **Bitly** | URL shortening + analytics | No landing pages | Smart routing + microsites |
| **QR Tiger** | Advanced QR codes | No microsite builder | Integrated experience |
| **Shopify** | Full e-commerce | Overwhelming for small shops | Simplified UX for non-tech users |
| **Canva** | Design tools | No QR analytics | Data-driven design |

### The "Accessibility Gap" Discovery

**User research insight (from mom's shop):**
- **Pain Point 1:** Existing tools require technical knowledge to set up domains
- **Pain Point 2:** No clear analytics for offline-to-online tracking (QR scans in store)
- **Pain Point 3:** Design tools (Canva) don't connect to business logic (Shopify)

**Product strategy decision:**
- One platform for QR codes + microsites + analytics
- Drag-and-drop editor (no coding required)
- Real-time scan tracking (bridge offline and online)

### Target Market & Positioning

**Primary Target:** 
- **Small business owners** (retail shops, restaurants, service providers)
- **Content creators** (Instagram, YouTube, TikTok influencers)
- **Marketing agencies** (managing multiple client campaigns)

**Go-to-Market Strategy:**
- **Phase 1:** Free tier for creators (viral loop through QR sharing)
- **Phase 2:** Pro tier for SMBs ($19/month) - custom branding
- **Phase 3:** Enterprise tier (custom pricing) - multi-tenant, white-label

---

## The Toolkit: My 2026 AI-Powered Stack

**I'm a Project Manager, not a professional developer.** So how do you manage the build of 18 microservices? You leverage the right tools and treat AI as your "virtual engineering squad."

### The Stack I Orchestrated

**Backend (The Engine):**
- Node.js + Fastify (high-performance web framework)
- TypeScript (type safety for complex systems)
- PostgreSQL (relational data, 12 databases designed)
- Redis (caching layer, 100x performance improvement)

**Frontend (The Experience):**
- React + Vite (drag-and-drop microsite builder)
- TailwindCSS + shadcn/ui (modern design system)
- Real-time analytics dashboard

**Messaging & Events (The Backbone):**
- Kafka/Redpanda (event-driven architecture)
- 13 topics designed for async processing

**My AI Co-Pilots:**
- **GitHub Copilot** - Code generation and autocomplete (real-time suggestions in VS Code)
- **Claude Sonnet 4.5** - Architecture validation, PRD reviews, and technical documentation
- **GPT-4** - API design, security analysis, and diagram generation
- **AI-Assisted Development** - Reduced prototype time by 60%

### The TPM's Role in 2026

**What I managed:**
- Architecture design and service boundaries
- API contracts and database schemas
- Security requirements (8/10 OWASP score)
- Performance targets (100x faster with caching)
- Cost optimization (deployed at <$50/month)

**What AI executed:**
- Boilerplate service code
- Database migrations
- API endpoint implementation
- Unit tests and validation logic

**Key learning:** *A TPM's role in 2026 is guiding the architecture, not typing every semicolon.*

---

## � The Lessons: From "Build It All" to "Ship What Matters"

This project was my hands-on masterclass in **FinOps, user-centric design, and realistic delivery.**

### Lesson 1: Market Analysis & the "A/A Gap"

**Discovery:** I did a competitor analysis of Shopify, Linktree, Bitly, QR Tiger, and Canva. The gap isn't a lack of tools (**Availability**), it's a lack of UX designed for non-technical users (**Accessibility**).

**Product decision:** This became my core differentiator—"Shopify-level features with Notion-level simplicity."

### Lesson 2: FinOps 101 (The AWS Wake-Up Call)

**Reality check:** It turns out running a full Kafka architecture on AWS is expensive!

**Cost breakdown (initial architecture):**
- Kafka cluster: $200+/month
- PostgreSQL (12 databases): $150+/month  
- Redis cluster: $50+/month
- CDN + monitoring: $100+/month
- **Total: $500+/month** 😱

**Decision:** Design for enterprise scale, deploy lean MVP ($50/month).

**Key learning:** *Balancing technical ambition with affordable operational reality is the ultimate PM skill.*

### Lesson 3: Agile Mindset (The Pivot)

**Original plan:** Deploy all 18 services simultaneously (Big Bang release)

**Reality:** Deployed 4 core services in Phase 1, deferred 14 services to Phase 2/3

**Agile pivot:**
- Auth, QR, Analytics, Microsite (core value delivered)
- ML, Email, Integrations (deferred until customer revenue)
- Architecture documented for future scaling

**Key learning:** *Incremental delivery > Big Bang releases.*

### Lesson 4: AI for PMs (60% Time Reduction)

**Traditional development:** 6-8 months for 4 services

**AI-assisted development:** 3 months for 4 services + full 18-service architecture

**My AI Stack:**
- **GitHub Copilot** - Real-time code suggestions in VS Code (autocomplete for boilerplate)
- **Claude Sonnet 3.5** - Architecture reviews, PRD validation, technical documentation
- **GPT-4** - Diagram generation (Mermaid.js), API design, security analysis

**How I used AI as a TPM:**
- Architecture validation (Claude reviewing system design for scalability issues)
- Code generation (Copilot for service templates, API routes, database schemas)
- Documentation (Auto-generated OpenAPI specs, README templates)
- Security scanning (Automated OWASP compliance checks)
- Diagram iteration (Generated 15+ versions of architecture diagrams)

**Example workflow:**
1. I write PRD for "QR Service with Redis caching"
2. Claude validates architecture decisions (cache TTLs, invalidation strategy)
3. GitHub Copilot generates boilerplate service code
4. I review, test, and refine the implementation
5. GPT-4 generates Mermaid diagram showing caching flow

**Key learning:** *The TPM role in 2026 is architecture orchestration, not code implementation.*

---

## System Architecture Design

### Full Architecture Vision (19 Services)

The platform was **designed** as a decoupled, service-oriented architecture for horizontal scaling and fault tolerance. The full architecture supports enterprise features while maintaining a clear path from MVP to scale.

```
User → Cloudflare CDN → Nginx → Tenant Gateway → Microservices → Data Layer
```

---

### C4 Model - Level 1: System Context Diagram

**The Big Picture:** How the QR & Microsite Platform fits into the broader ecosystem of users and external systems.

```mermaid
graph TB
    %% Users (People)
    Owner["Business Owner<br/>[Person]"]
    Customer["End Customer<br/>[Person]"]
    Creator["Content Creator<br/>[Person]"]
    Agency["Marketing Agency<br/>[Person]"]

    %% The System (Central)
    System["QR & Microsite Platform<br/>[Software System]<br/><br/>Generates QR codes, builds microsites,<br/>tracks real-time analytics"]

    %% External Systems
    OpenAI["OpenAI API<br/>[External System]<br/><br/>AI content generation"]
    Cloudflare["Cloudflare CDN<br/>[External System]<br/><br/>Edge caching & DDoS protection"]
    SendGrid["SendGrid<br/>[External System]<br/><br/>Email delivery"]
    Twilio["Twilio<br/>[External System]<br/><br/>SMS notifications"]
    Stripe["Stripe<br/>[External System]<br/><br/>Payment processing"]
    Mixpanel["Mixpanel<br/>[External System]<br/><br/>Product analytics"]
    Sentry["Sentry<br/>[External System]<br/><br/>Error monitoring"]

    %% User → System interactions
    Owner -->|"Uses [HTTPS]"| System
    Creator -->|"Uses [HTTPS]"| System
    Agency -->|"Uses [HTTPS]"| System
    Customer -->|"Scans QR codes [HTTPS]"| System

    %% System → External Systems interactions
    System -->|"Generates content [REST]"| OpenAI
    System -->|"Delivers assets [CDN]"| Cloudflare
    System -->|"Sends emails [REST]"| SendGrid
    System -->|"Sends SMS [REST]"| Twilio
    System -->|"Processes payments [REST]"| Stripe
    System -->|"Tracks events [REST]"| Mixpanel
    System -->|"Reports errors [REST]"| Sentry

    %% Styling (C4 Model standard colors)
    classDef personStyle fill:#08427b,stroke:#052e56,stroke-width:2px,color:#ffffff
    classDef systemStyle fill:#1168bd,stroke:#0b4884,stroke-width:4px,color:#ffffff
    classDef externalStyle fill:#999999,stroke:#6b6b6b,stroke-width:2px,color:#ffffff

    class Owner,Customer,Creator,Agency personStyle
    class System systemStyle
    class OpenAI,Cloudflare,SendGrid,Twilio,Stripe,Mixpanel,Sentry externalStyle
```

**What This System Context Shows:**

**1. People Using The System (4 Personas)**
- **Business Owner** - Manages QR codes for physical products (retail shops, restaurants)
- **End Customer** - Scans QR codes in physical locations to access microsites
- **Content Creator** - Builds link-in-bio pages for social media (Instagram, TikTok)
- **Marketing Agency** - Manages QR campaigns for multiple clients (B2B use case)

**2. The Software System (Black Box)**
- **QR & Microsite Platform** - The entire 19-service architecture appears as ONE system
- Users interact with the business capabilities, not the technical implementation
- Focus: **What value it provides**, not **how it's built internally**

**3. External Systems (7 Integrations)**
- **OpenAI API** - AI-powered content generation (deferred to Phase 2)
- **Cloudflare CDN** - Global edge caching and DDoS protection
- **SendGrid** - Transactional email delivery (welcome, notifications)
- **Twilio** - SMS alerts for limit exceeded, important events
- **Stripe** - Payment processing and subscription management
- **Mixpanel** - Product analytics and user behavior tracking
- **Sentry** - Application error monitoring and performance tracking

**4. Relationships (Communication Protocols)**
- **Person → System**: HTTPS (web browsers, mobile apps)
- **System → External Systems**: REST API (JSON over HTTPS), CDN edge delivery
- **Interactions are simplified** - Details shown in Level 2 Container Diagram below

**Why This Matters for TPM Interviews:**

✅ **Business Context** - Shows you understand 4 distinct user personas (not just "users")  
✅ **Integration Strategy** - 7 external dependencies managed (vendor selection decisions)  
✅ **Phased Approach** - OpenAI marked for Phase 2 (cost-conscious planning)  
✅ **Stakeholder Communication** - Simple diagram for non-technical audiences (executives, investors)

**From Context to Containers:**
- This Level 1 diagram shows the **business view** (what problems we solve, for whom)
- The Level 2 Container Diagram (below) shows the **technology view** (how we built it)

---

### C4 Model - Level 2: Container Diagram

**Technology Architecture:** This diagram shows the high-level technology choices and how containers (applications, data stores, message queues) communicate. Each container is a separately deployable/runnable unit that executes code or stores data.

```mermaid
flowchart TB
    User[👤 User]
    CDN[☁️ Cloudflare CDN]
    Nginx[⚙️ Nginx]
    
    subgraph gateway[" 🔐 GATEWAY "]
        Gateway[API Gateway]
        RateLimitRedis[(Rate Limit<br/>Redis)]
    end
    
    subgraph auth[" 🔑 AUTH SERVICE "]
        AuthService[Auth Logic]
        AuthDB[(Users DB<br/>PostgreSQL)]
    end
    
    subgraph qr[" 📱 QR SERVICE "]
        QRService[QR Generator]
        QRCache[(QR Cache<br/>Redis)]
        QRDB[(QR Codes DB<br/>PostgreSQL)]
        QRStorage[QR Images<br/>R2]
    end
    
    subgraph analytics[" 📊 ANALYTICS SERVICE "]
        AnalyticsService[Analytics Engine]
        AnalyticsCache[(Hot Metrics<br/>Redis)]
        AnalyticsDB[(Scan Events DB<br/>PostgreSQL)]
    end
    
    subgraph microsite[" 🌐 MICROSITE SERVICE "]
        MicrositeService[Page Builder]
        MicrositeDB[(Pages DB<br/>PostgreSQL)]
        MicrositeStorage[Media Files<br/>R2]
    end
    
    Kafka[📮 Kafka Events]
    Consumers[⚡ Background Jobs]
    
    User <-->|HTTPS| CDN
    CDN <-->|Route| Nginx
    Nginx <-->|Proxy| Gateway
    Gateway <-->|Check Limit| RateLimitRedis
    
    Gateway <-->|Verify JWT| AuthService
    AuthService <-->|SQL Query| AuthDB
    
    Gateway <-->|REST API| QRService
    QRService <-->|Cache Get/Set| QRCache
    QRService <-->|SQL Read/Write| QRDB
    QRService <-->|Upload Image| QRStorage
    QRService -.->|Publish Event| Kafka
    
    Gateway <-->|REST API| AnalyticsService
    AnalyticsService <-->|INCR Counter| AnalyticsCache
    AnalyticsService <-->|SQL Insert| AnalyticsDB
    AnalyticsService -.->|Publish Event| Kafka
    
    Gateway <-->|REST API| MicrositeService
    MicrositeService <-->|SQL Read/Write| MicrositeDB
    MicrositeService <-->|Upload File| MicrositeStorage
    
    QRService <-->|Get Page Data| MicrositeService
    
    Kafka -.->|Consume| Consumers
    Consumers -->|Batch Write| AnalyticsDB
    
    style User fill:#60a5fa,color:#fff
    style Kafka fill:#f59e0b,color:#fff
    style Consumers fill:#8b5cf6,color:#fff
```

**Legend:**
- **Solid arrows (<-->)** = Synchronous request/response (HTTP/REST API)
- **Dotted arrows (-.->)** = Asynchronous events (fire-and-forget)
- **Cylinders [(DB)]** = Data storage (PostgreSQL, Redis, R2)
- **Rectangles [Service]** = Processing logic
- **Grouped boxes** = Service boundaries (owns its data)

**Container Types in This Architecture:**

**1. Web Applications (Node.js + Fastify)**
- 🔐 **API Gateway** - Entry point, rate limiting, JWT validation (Port 3000)
- 🔑 **Auth Service** - User authentication, session management (Port 3010)
- 📱 **QR Service** - QR code generation and management (Port 3011)
- 📊 **Analytics Service** - Metrics processing and reporting (Port 3012)
- 🌐 **Microsite Service** - Landing page builder (Port 3013)

**2. Data Stores**
- **PostgreSQL Databases** - Relational data (Users, QR Codes, Analytics, Pages)
- **Redis Caches** - In-memory storage (Rate limits, QR metadata, Hot metrics)
- **Cloudflare R2** - Object storage (QR images, Media files)

**3. Message Infrastructure**
- 📮 **Kafka Event Bus** - Asynchronous event streaming (13 topics designed)
- ⚡ **Background Jobs (Consumers)** - Event processors (Node.js workers)

**4. Edge Infrastructure**
- ☁️ **Cloudflare CDN** - Global edge caching and DDoS protection
- ⚙️ **Nginx** - Reverse proxy and load balancer

**Why This C4 Container Diagram Shows:**

**Service Isolation & Ownership:**
- Each service owns its data - No shared databases (except in MVP where all PostgreSQL instances are in one DB)
- Services communicate via well-defined APIs (REST) or events (Kafka)
- Containers can scale independently based on load

**Technology Decisions Visible:**
- **Runtime**: Node.js 20+ with Fastify framework for all web services
- **Databases**: PostgreSQL for relational data, Redis for caching
- **Storage**: Cloudflare R2 for static assets (S3-compatible)
- **Messaging**: Kafka for event-driven architecture
- **Edge**: Cloudflare CDN + Nginx for traffic management

**Communication Patterns:**
- **Synchronous (Solid arrows)**: REST API calls for real-time operations (QR creation, user queries)
- **Asynchronous (Dotted arrows)**: Kafka events for background processing (analytics, notifications)
- **Cache-First**: Redis checked before PostgreSQL for 100x performance improvement
- **Event-Driven**: Services publish events without knowing who consumes them (loose coupling)

**Deployment & Scaling:**
- **Phase 1 (MVP)**: All containers run on single VPS, shared PostgreSQL/Redis instances
- **Phase 2 (Growth)**: Services split across multiple VPS, Kafka cluster added
- **Phase 3 (Enterprise)**: Kubernetes orchestration, per-tenant databases, Redis cluster

---

### Why C4 Level 2 Matters for TPM Roles

**This Container Diagram demonstrates:**
- ✅ **Technology Selection** - Chose Node.js (team familiarity), PostgreSQL (ACID compliance), Redis (performance)
- ✅ **Scalability Planning** - Each container can scale independently (horizontal scaling ready)
- ✅ **Cost Awareness** - Designed for enterprise scale ($1000/month), deployed lean MVP ($50/month)
- ✅ **Communication Strategy** - Async events for non-critical paths, sync APIs for user-facing operations
- ✅ **Trade-off Analysis** - Single PostgreSQL in Phase 1 vs per-tenant DBs in Phase 3

**What recruiters see:**
- Clear understanding of modern tech stack (microservices, event-driven, caching)
- Ability to communicate architecture to technical and non-technical stakeholders
- Strategic thinking (phased deployment based on revenue triggers)

---

**Service Boundaries Explained (for deeper context):**

- **Each service owns its data** - No shared databases (except in MVP where all PostgreSQL instances are in one DB)
- **Redis is duplicated for clarity** - Rate limiting (Gateway) vs application caching (QR/Analytics)
- **R2 Storage is duplicated** - QR images vs Microsite media (separate buckets)
- **Kafka enables loose coupling** - Services publish events without knowing who consumes them
- **Hot metrics sync** - Redis stores real-time counters (page views, scan counts), Background Processors flush to PostgreSQL every 60 seconds
- **QR ↔ Microsite integration** - When a QR code is scanned, QR Service queries Microsite Service to fetch the linked microsite page

**Background Jobs (⚡ Kafka Consumers) - What They Do:**

Background jobs are Node.js workers that consume events from Kafka and process them asynchronously. This architecture decouples slow operations from user-facing requests for faster response times.

**Why Separate Jobs?**
- **Fast User Response**: QR scan returns redirect in <100ms, analytics processing happens later
- **Batch Efficiency**: Process 1000 events together instead of 1000 individual database writes
- **Scalability**: Add more consumers during high traffic without affecting web services
- **Resilience**: Failed jobs retry automatically, user requests never fail due to analytics issues

**Specific Background Jobs Running:**

1. **Scan Event Processor**
   - Consumes: `qr.scanned` events from Kafka
   - Processes: Device fingerprinting, location enrichment, user agent parsing
   - Writes: Analytics DB with full scan metadata (device type, browser, OS, country, city)
   - Frequency: Real-time (processes events as they arrive)

2. **Metrics Aggregator**
   - Consumes: `analytics.metric_updated` events
   - Processes: Calculates daily/weekly/monthly aggregates (total scans, unique visitors, top locations)
   - Writes: Pre-computed dashboard metrics to Analytics DB
   - Frequency: Every 5 minutes (batch processing)

3. **Hot Metrics Sync**
   - Consumes: Timer-based (not Kafka, runs on schedule)
   - Processes: Reads Redis counters (`INCR scan_count:qr_abc123`), batches 1000s of writes
   - Writes: Flushes to Analytics PostgreSQL for persistence
   - Frequency: Every 60 seconds
   - Why: Reduces database writes by 99% (1000 Redis writes → 1 PostgreSQL batch)

4. **A/B Test Results Processor**
   - Consumes: `experiment.conversion` events
   - Processes: Calculates conversion rates, statistical significance, winning variants
   - Writes: Experiment results to Analytics DB
   - Frequency: Real-time for conversions, aggregates every 10 minutes

5. **Notification Dispatcher**
   - Consumes: `analytics.threshold_exceeded` events (e.g., QR scan limit reached)
   - Processes: Sends email/SMS notifications to users
   - External Calls: SendGrid (email), Twilio (SMS)
   - Frequency: Real-time (immediate notifications)

**Example Flow - QR Scan with Background Processing:**

```
1. User scans QR code
   → QR Service receives request (10ms)
   → Check cache for QR metadata (5ms)
   → Return redirect URL to user (total: 50ms) ✅ FAST

2. QR Service publishes event to Kafka (non-blocking, 2ms)
   → Event: { qr_id: "abc123", user_ip: "1.2.3.4", timestamp: "2026-02-03T10:30:00Z" }

3. Background Job picks up event (happens in parallel, user already redirected)
   → Scan Event Processor consumes from Kafka
   → Enriches with geo-location (IP → San Francisco, CA)
   → Parses user agent (Chrome 120 on iPhone 15 Pro)
   → Writes full record to Analytics DB (100ms, but user doesn't wait)

4. Metrics Aggregator processes batch every 5 minutes
   → Reads 5000 scan events from last 5 minutes
   → Calculates: Total scans today, unique visitors, top countries
   → Updates dashboard metrics in 1 batch write

5. Hot Metrics Sync (every 60 seconds)
   → Redis has: scan_count:qr_abc123 = 1247 (from 1000s of INCR commands)
   → Background job reads all counters, writes to PostgreSQL
   → Redis stays hot, PostgreSQL has persistent backup
```

**Technology Stack for Background Jobs:**
- **Runtime**: Node.js 20+ (same as web services for code sharing)
- **Kafka Library**: `kafkajs` (consumer groups for parallel processing)
- **Deployment**: Docker containers (separate from web services)
- **Scaling**: Horizontal - add more consumers to process faster
- **Monitoring**: Datadog tracks consumer lag, processing time, error rates

**Key Architecture Decisions:**

- **Gateway-centric:** Single entry point for observability and security
- **Cache-first:** Redis checks before database (100x performance improvement)
- **Event-driven:** Kafka decouples request processing from background jobs
- **Service isolation:** Each service can scale independently
- **Storage separation:** R2 handles static assets (QR codes, images, media)
- **Write-through caching:** High-frequency metrics stay in Redis, batch written to PostgreSQL for persistence

---

### Request Flow: Sequence Diagram

**The Journey of a Single Request:** This sequence diagram shows exactly how a user request flows through the system, including authentication, rate limiting, caching, database queries, and event publishing.

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant CDN as Cloudflare CDN
    participant Nginx
    participant Gateway
    participant Redis
    participant Core as Core Service<br/>(QR/Microsite)
    participant Postgres as PostgreSQL
    participant Kafka
    participant Events as Event Consumer<br/>(Analytics/Billing)
    participant Obs as Observability<br/>(Grafana/Sentry)

    %% Request Flow
    User->>CDN: HTTPS Request<br/>(POST /api/qr/create)
    CDN->>Nginx: Route to Origin
    Nginx->>Gateway: Forward Request
    
    %% Gateway Processing
    Gateway->>Obs: Log Request Started<br/>(timestamp, path, IP)
    Gateway->>Redis: Check Rate Limit<br/>(GET rate_limit:tenant_123)
    Redis-->>Gateway: Counter: 45/100 requests
    Gateway->>Redis: Increment Counter<br/>(INCR rate_limit:tenant_123)
    
    Gateway->>Gateway: Validate JWT Token<br/>(verify signature & expiry)
    
    Note over Gateway: If rate limit exceeded<br/>→ Return 429 Too Many Requests
    Note over Gateway: If JWT invalid<br/>→ Return 401 Unauthorized
    
    %% Core Service Processing
    Gateway->>Core: Forward Authenticated Request<br/>(+ X-Tenant-ID header)
    
    %% Check Cache First
    Core->>Redis: Check Cache<br/>(GET qr:metadata:abc123)
    Redis-->>Core: Cache Miss
    
    %% Database Query
    Core->>Postgres: SQL Query<br/>(INSERT INTO qr_codes...)
    Postgres-->>Core: QR Code Created<br/>(id: abc123, url: xyz)
    
    %% Update Cache
    Core->>Redis: Set Cache<br/>(SET qr:abc123, TTL 3600s)
    
    %% Publish Event (Async)
    Core->>Kafka: Publish Event<br/>(topic: qr.created, payload: {...})
    Note over Kafka: Event queued for consumers
    
    %% Response to User
    Core-->>Gateway: Return QR Code Data<br/>(200 OK, JSON response)
    Gateway->>Obs: Log Response<br/>(status: 200, latency: 45ms)
    Gateway-->>Nginx: Response
    Nginx-->>CDN: Response
    CDN-->>User: QR Code Created! ✅
    
    %% Async Event Processing (Happens in Background)
    Note over User,Events: User receives response instantly.<br/>Background processing happens asynchronously.
    
    Kafka->>Events: Consume Event<br/>(qr.created)
    Events->>Postgres: Track Analytics<br/>(INSERT INTO analytics...)
    Events->>Postgres: Update Billing Usage<br/>(UPDATE tenant_usage...)
    Events->>Obs: Log Job Completed<br/>(event processed successfully)
    
    %% Optional: Billing Limit Check
    Note over Events: If usage exceeds limit<br/>→ Publish billing.limit_exceeded
    Events->>Kafka: Publish Event<br/>(topic: billing.limit_exceeded)
    Kafka->>Gateway: Consume Event
    Gateway->>Redis: Cache Blocked Tenant<br/>(SET blocked:tenant_123)
```

**Key Insights from the Sequence:**

1. **Gateway as Traffic Cop (Steps 4-7)**
   - Every request goes through rate limiting (Redis check)
   - JWT validation happens at Gateway (not Core Services)
   - Failed auth/rate limit returns immediately (no wasted Core Service calls)

2. **Redis Dual Purpose (Steps 5, 10, 13)**
   - **Security**: Rate limiting counters (`rate_limit:tenant_123`)
   - **Performance**: Application data caching (`qr:abc123`)
   - **Why separate from Gateway Redis?** Same instance in Phase 1, separate clusters in Phase 3

3. **Cache-First Pattern (Steps 10-12)**
   - Core checks Redis before hitting PostgreSQL
   - Cache miss → Database query → Update cache (TTL: 1 hour)
   - Next request for same QR code is 100x faster (5ms vs 500ms)

4. **Event-Driven Decoupling (Steps 14-20)**
   - Core publishes event and returns immediately (user doesn't wait)
   - Analytics, Billing, Email services consume events independently
   - Adding new consumers (e.g., Billing) doesn't require Core Service changes

5. **Gateway-Centric Observability (Steps 4, 16, 20)**
   - Gateway logs ALL requests and responses (single source of truth)
   - Services only log specific errors or job statuses
   - Grafana dashboards aggregate Gateway logs for metrics

6. **Billing Integration (Steps 19-22)**
   - Billing Service consumes `qr.created` events
   - Increments usage counter in database
   - If limit exceeded → publishes `billing.limit_exceeded` event
   - Gateway consumes billing events and caches blocked tenants in Redis

**Why This Architecture Scales:**

- **User Experience**: Synchronous flow (steps 1-17) completes in ~50ms
- **Background Jobs**: Async processing (steps 18-22) doesn't block user response
- **Loose Coupling**: Adding Billing Service in Phase 2 requires ZERO Core Service code changes
- **Observability**: Gateway sees 100% of traffic for monitoring and debugging

---

### Architecture Decision Framework

**Problem:** How to compete with established players while managing infrastructure costs?

**Solution:** Design for scale, deploy lean

1. **Full architecture designed upfront** - All 19 services specified in technical docs
2. **Phased deployment strategy** - Deploy only core services initially
3. **Event-driven foundation** - Kafka events allow adding consumers without modifying producers
4. **Database-per-tenant design** - Enterprise isolation ready, single DB for MVP

### Key Architectural Decisions

**Why Gateway-Centric Architecture?**

The **Tenant Gateway** is the single entry point for all traffic, making it the perfect place for cross-cutting concerns:

✅ **Observability** - All traffic flows through one point, making it the single source of truth for:
- Request logging (Grafana dashboards)
- Error tracking (Sentry)
- Performance metrics (latency, throughput)
- User analytics (Mixpanel events)

✅ **Security** - Centralized enforcement of:
- JWT authentication
- Rate limiting (100 req/min per tenant)
- Tenant isolation (X-Tenant-ID header injection)

✅ **Simplicity** - Services don't need to:
- Implement their own auth logic
- Handle rate limiting
- Manage observability libraries

**Trade-off:** Single point of failure (mitigated by horizontal scaling and load balancing)

---

## Phase 1: MVP Deployment

### Scope & Infrastructure Decisions

**Objective:** Validate product-market fit with minimal infrastructure investment

**Deployed Services (4 of 19):**
1. **Auth Service** - User authentication, JWT tokens, session management
2. **QR Service** - QR code generation, Redis caching, scan tracking
3. **Analytics Service** - Real-time scan analytics, dashboard metrics
4. **Microsite Service** - Simple landing page builder (limited blocks)

**Infrastructure (Cost-Optimized):**
- **Single PostgreSQL instance** (instead of 12 tenant databases)
- **Single Redis instance** (sessions + cache)
- **No Kafka** (direct service-to-service calls for MVP)
- **No CDN** (single region deployment)
- **Docker Compose** deployment (instead of Kubernetes)

**Monthly Infrastructure Cost:** ~$30-50
- VPS/Cloud Server: $20-30
- Domain + SSL: $10
- Monitoring (Free tier): $0

### What's NOT Deployed (Yet)

**Deferred to Phase 2+ (Post-Revenue):**
- ML Service (AI content generation) - Requires OpenAI API costs
- Email Service - Using transactional email free tier for now
- Integrations Service - Zapier, webhooks (low priority for MVP)
- Domains Service - Custom domains (enterprise feature)
- Experiments Service - A/B testing (requires traffic first)
- Advanced Analytics - Mixpanel integration (free tier sufficient)
- Kafka Event Bus - Direct calls work for low traffic MVP
- Cloudflare CDN - Single region handles initial users

### MVP Feature Set

**What Users Can Do:**
- ✅ Sign up / Login (JWT authentication)
- ✅ Generate QR codes with custom colors/logos
- ✅ Create simple microsites (3-4 block types)
- ✅ Track scans (real-time analytics dashboard)
- ✅ View device, location, time data
- ❌ Custom domains (Phase 2)
- ❌ AI content generation (Phase 2)
- ❌ A/B testing (Phase 2)
- ❌ Advanced integrations (Phase 2)

---

## Roadmap & Future Phases

### Phase 1: MVP - Product Validation **CURRENT**
**Timeline:** Q1 2026 (Completed)  
**Goal:** Validate product-market fit with core features  
**Investment:** $30-50/month infrastructure

**Deployed:**
- ✅ 4 core services (Auth, QR, Analytics, Microsite)
- ✅ Basic QR generation with customization
- ✅ Simple microsite builder
- ✅ Real-time analytics dashboard
- ✅ 8/10 security score (OWASP compliance)

**Success Metrics:**
- 100+ users signed up
- 1,000+ QR codes generated
- Positive user feedback on core features
- <$50/month infrastructure costs maintained

---

### Phase 2: Growth Features **PLANNED**
**Timeline:** Q2-Q3 2026  
**Goal:** Add differentiated features post-customer validation  
**Investment:** $200-300/month (scales with revenue)

**Planned Deployments:**
- 🔄 **ML Service** - AI content generation (GPT-4 integration)
- 🔄 **Email Service** - Automated campaigns, drip sequences
- 🔄 **Integrations Service** - Zapier, webhooks, Google Sheets
- 🔄 **Domains Service** - Custom branded domains (go.acme.com)
- 🔄 **Kafka Event Bus** - Decouple services for scale
- 🔄 **Cloudflare CDN** - Global edge caching

**New Features:**
- AI-powered microsite content generation
- Smart routing (time-based, geo-based)
- Advanced integrations (CRM, analytics platforms)
- Custom domains with SSL
- Email marketing automation

**Trigger Criteria:**
- 500+ paying customers ($5k+ MRR)
- Infrastructure costs <20% of revenue
- Customer requests for AI/integrations features

---

### Phase 3: Enterprise Scale **FUTURE**
**Timeline:** Q4 2026 - Q1 2027  
**Goal:** Enterprise-ready platform with full 19-service architecture  
**Investment:** $1,000+/month (customer-funded)

**Planned Deployments:**
- 🔮 **Experiments Service** - A/B testing, multivariate tests
- 🔮 **Workflow Builder** - Visual automation builder
- 🔮 **Print Studio** - QR code design templates, bulk export
- 🔮 **Creator Service** - Template marketplace
- 🔮 **Advanced Analytics** - Cohort analysis, retention metrics
- 🔮 **Kubernetes** - Container orchestration for auto-scaling
- 🔮 **Multi-region deployment** - Global infrastructure

**Enterprise Features:**
- Team collaboration (workspaces, permissions)
- SSO / SAML authentication
- SLA guarantees (99.9% uptime)
- Dedicated support
- White-label solutions
- API access for developers

**Trigger Criteria:**
- $50k+ MRR
- 10+ enterprise customers requesting features
- Infrastructure costs justified by revenue

---

### Infrastructure Evolution Path

| Component | Phase 1 (MVP) | Phase 2 (Growth) | Phase 3 (Enterprise) |
|-----------|--------------|------------------|---------------------|
| **Servers** | 1 VPS | 3-5 VPS | Kubernetes cluster |
| **Database** | 1 PostgreSQL | 3 PostgreSQL (replicas) | 12 PostgreSQL (per-tenant) |
| **Caching** | 1 Redis | 2 Redis (primary/replica) | Redis cluster |
| **Events** | Direct calls | Kafka (3 brokers) | Kafka cluster |
| **CDN** | None | Cloudflare (basic) | Cloudflare (enterprise) |
| **Monitoring** | Free tier | Paid tier | Enterprise tier |
| **Cost/Month** | $30-50 | $200-300 | $1,000+ |

---

### Future Enhancements (Beyond Phase 3)

**Advanced Features:**
- [ ] Blockchain-based QR verification
- [ ] Real-time collaboration (WebSockets)
- [ ] Mobile SDK for native apps
- [ ] GraphQL API layer
- [ ] Advanced fraud detection (ML)
- [ ] International expansion (multi-language)

**Infrastructure:**
- [ ] Distributed tracing (Jaeger/Zipkin)
- [ ] Log aggregation (ELK stack)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Infrastructure as Code (Terraform)
- [ ] Automated database backups
- [ ] Disaster recovery plan

---

## Key Outcomes

### Project Management Success
- ✅ **Delivered on time** - Phase 1 MVP completed within planned timeline
- ✅ **Under budget** - Infrastructure costs maintained at <$50/month
- ✅ **Scope managed** - Deployed 4 of 19 planned services based on priority
- ✅ **Documentation complete** - PRDs, architecture diagrams, roadmap, competitive analysis

### Product Strategy Validation
- ✅ **Architecture designed for scale** - Full 19-service system specified and ready to deploy
- ✅ **Phased rollout plan** - Clear triggers and metrics for Phase 2/3 deployment
- ✅ **Cost-conscious decisions** - Validated lean deployment before expensive infrastructure
- ✅ **Feature prioritization** - Core value (QR + analytics) deployed, advanced features deferred

### Technical Achievements
- ✅ **Performance optimized** - Redis caching achieves 100x faster reads (500ms → 5ms)
- ✅ **Security implemented** - 8/10 OWASP score, zero npm vulnerabilities
- ✅ **Scalable foundation** - Event-driven architecture ready for Kafka when traffic justifies
- ✅ **Multi-tenant ready** - Database design supports enterprise isolation when needed

### Skills Demonstrated
- ✅ **End-to-end ownership** - Managed from concept to deployed MVP
- ✅ **Trade-off analysis** - Balanced features, costs, and technical debt
- ✅ **Strategic thinking** - Designed for enterprise scale, deployed lean MVP
- ✅ **Stakeholder communication** - Created diagrams and docs for technical and business audiences

---

## Getting Started

> **Note:** This repository contains Phase 1 MVP deployment (4 services). The full 19-service architecture is documented but not deployed to minimize infrastructure costs.

### For Product Managers & Recruiters

If you're reviewing this for a **TPM/Product role**, focus on:
- **This README** - Product strategy, scope management, phased rollout planning
- [**Architecture Diagrams**](./MERMAID_ARCHITECTURE.md) - Full system design (19 services)
- [**Roadmap**](#-roadmap--future-phases) - Phase 1/2/3 deployment strategy
- [**Competitive Analysis**](./COMPETITIVE_ANALYSIS.md) - Market positioning

### Prerequisites (For Technical Review)
- [Docker](https://www.docker.com) and Docker Compose
- [Node.js](https://nodejs.org) v18+ (optional)

### Quick Start (Phase 1 MVP)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Scanly-io/qr-backend.git
   cd qr-backend
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials (PostgreSQL, Redis, JWT secret)
   ```

3. **Start Phase 1 services:**
   ```bash
   docker-compose up --build
   ```

4. **Access the platform:**
   - API Gateway: `http://localhost:3000`
   - Health Check: `http://localhost:3000/health`

### What's Running in Phase 1

**Active Services:**
- ✅ Auth Service (Port 3010)
- ✅ QR Service (Port 3011)
- ✅ Analytics Service (Port 3012)
- ✅ Microsite Service (Port 3013)

**Infrastructure:**
- ✅ PostgreSQL (Port 5432)
- ✅ Redis (Port 6379)

**Not Running (Cost Optimization):**
- ❌ Kafka/Redpanda (Phase 2)
- ❌ Grafana/Prometheus (Phase 2)
- ❌ ML/Email/Integrations services (Phase 2)
- ❌ CDN (Phase 2)

---

## Documentation

### Product & Strategy Documents

- [**Product Roadmap**](./COMPLETE_PLATFORM_FEATURES.md) - Complete feature list and prioritization
- [**Competitive Analysis**](./COMPETITIVE_ANALYSIS.md) - Linktree, Bitly, QR Tiger comparison
- [**Architecture Diagrams**](./MERMAID_ARCHITECTURE.md) - 6 Mermaid diagrams for different scenarios
- **Phase 1 Scope** - This README (deployment strategy)

### Technical Documentation

- [**Security Audit**](./SECURITY_AUDIT_CHECKLIST.md) - OWASP compliance and penetration testing
- [**Docker Setup**](./DOCKER.md) - Infrastructure and deployment guide
- [**Performance Guide**](./PERFORMANCE.md) - Caching strategies and optimization

### Architecture Resources

- Full system design (19 services)
- Database schema (ER diagrams)
- Event-driven patterns (Kafka topics)
- Multi-tenancy design
- API specifications

---

## Skills Demonstrated

### Product Management Core Competencies

- ✅ **Market Analysis** - Analyzed 5+ competitors to identify differentiation opportunities
- ✅ **Product Strategy** - Defined positioning, pricing tiers, and go-to-market approach
- ✅ **Roadmap Planning** - Created 3-phase rollout with clear triggers and success metrics
- ✅ **Scope Management** - Prioritized 4 of 19 services for MVP based on value vs cost
- ✅ **Stakeholder Communication** - Created visual diagrams for technical and business audiences

### Project Management

- ✅ **Agile Execution** - Managed development in sprints with daily standups and retrospectives
- ✅ **Budget Management** - Maintained <$50/month infrastructure costs for Phase 1
- ✅ **Risk Management** - Identified and mitigated technical debt in phased approach
- ✅ **Documentation** - Authored PRDs, technical specs, architecture diagrams
- ✅ **Delivery** - Shipped Phase 1 MVP on time and under budget

### System Design & Architecture

- ✅ **Distributed Systems** - Designed microservices architecture with event-driven patterns
- ✅ **Scalability Planning** - Architected for horizontal scaling (ready for Kubernetes)
- ✅ **Security Architecture** - Achieved 8/10 OWASP compliance score
- ✅ **Trade-off Analysis** - Balanced complexity, cost, and performance across 3 phases
- ✅ **Infrastructure Planning** - Designed observability stack and monitoring strategy

### Modern TPM Skills

- ✅ **Cost Optimization** - Deployed lean ($50/month) while designing for enterprise scale
- ✅ **Technical Fluency** - Can discuss APIs, databases, caching, and system design with engineers
- ✅ **Data-Driven Decisions** - Defined metrics (performance, security, costs) to validate phases
- ✅ **Strategic Thinking** - Positioned phased rollout based on revenue and customer triggers
- ✅ **Rapid Prototyping** - Used AI-assisted development to validate architecture quickly

---

## Roadmap & Future Enhancements

### Planned Features
- [ ] Kubernetes deployment (Helm charts)
- [ ] GraphQL API layer
- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced analytics (cohort analysis, retention metrics)
- [ ] Blockchain-based QR verification
- [ ] Mobile SDK for native apps

### Infrastructure Improvements
- [ ] Automated database backups (daily PostgreSQL snapshots)
- [ ] Distributed tracing (Jaeger/Zipkin)
- [ ] Log aggregation (ELK stack)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Infrastructure as Code (Terraform)

---

## Contact & Connect

**Saurabh Bansal**  
Technical Product Manager | System Architect

- 📧 Email: [saurabh.ca007@gmail.com](mailto:saurabh.ca007@gmail.com)
- 💼 LinkedIn: [linkedin.com/in/your-profile](https://www.linkedin.com/in/your-profile)
- 🐙 GitHub: [github.com/Scanly-io](https://github.com/Scanly-io)
- 📄 Portfolio: [Link to your portfolio website]

---

## License

This project is available under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Fastify** - High-performance web framework
- **PostgreSQL** - Robust relational database
- **Redis** - Lightning-fast caching layer
- **Redpanda** - Kafka-compatible event streaming
- **Cloudflare** - CDN and DDoS protection
- **OpenAI** - GPT-4 for AI features
- **Grafana Labs** - Monitoring and observability

---

**⭐ If you found this project interesting, please consider starring the repository!**

---

*Last Updated: February 2026*
