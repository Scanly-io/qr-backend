# 🚀 Scanly Platform - Sprint Map & Development Journey

> **Project Type:** Full-stack Linktree-like SaaS Platform  
> **Tech Stack:** React + Fastify + PostgreSQL + Docker  
> **Development Period:** ~12 weeks  
> **Status:** MVP Ready for Deployment

---

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Sprint 1: Foundation](#sprint-1-foundation--core-infrastructure)
- [Sprint 2: Editor](#sprint-2-linktree-style-editor)
- [Sprint 3: Themes](#sprint-3-theme-system--visual-polish)
- [Sprint 4: Enterprise](#sprint-4-enterprise-features)
- [Sprint 5: Creator Economy](#sprint-5-creator-economy-features)
- [Sprint 6: Integration](#sprint-6-frontend-api-integration--polish)
- [Architecture](#architecture-overview)
- [Service Inventory](#service-inventory)
- [Future Roadmap](#remaining-work-future-sprints)

---

## Project Overview

Scanly is a modern link-in-bio platform that combines:
- **Linktree-style page builder** with 20+ block types
- **Dynamic QR code generation** with analytics
- **Multi-tenancy** for teams and organizations
- **Creator monetization** tools (tips, products, subscriptions)
- **Workflow automation** for power users
- **Batch printing** for physical QR deployments

### Key Differentiators
| Feature | Linktree | Scanly |
|---------|----------|--------|
| Block Types | ~10 | 20+ |
| QR Codes | Basic | Dynamic with analytics |
| Themes | Limited | Full customization + patterns |
| Teams | Premium only | Built-in multi-tenancy |
| Automation | ❌ | Workflow builder |
| Batch Print | ❌ | Print studio |

---

## Sprint 1: Foundation & Core Infrastructure
**Duration:** Week 1-2  
**Goal:** Establish backend architecture and core services

### Deliverables
- [x] PostgreSQL database schema design
- [x] Docker Compose for local development
- [x] JWT-based authentication
- [x] Core microservices setup

### Services Created
| Service | Port | Responsibility |
|---------|------|----------------|
| Auth Service | 3001 | User authentication, JWT tokens |
| QR Service | 3002 | QR code generation, customization |
| Analytics Service | 3004 | Click/scan tracking, metrics |
| Microsite Service | 3005 | Page & block CRUD operations |

### Technical Decisions
- **Fastify** over Express (2x performance)
- **Microservices** over monolith (scalability)
- **PostgreSQL** with JSONB for flexible schemas

---

## Sprint 2: Linktree-Style Editor
**Duration:** Week 3-4  
**Goal:** Build the visual page editor

### Frontend Stack
```
React 18 + Vite + TypeScript
├── TailwindCSS (styling)
├── Shadcn/UI (components)
├── Framer Motion (animations)
├── @dnd-kit (drag-and-drop)
└── Tiptap (rich text editing)
```

### Editor Architecture
```
EditorLayout.tsx (~500 lines)
├── BlockPalette.tsx    - Left sidebar, block library
├── Canvas.tsx          - Center, live preview (~2600 lines)
└── BlockInspector.tsx  - Right sidebar, property editor
```

### Block Types Implemented

**Core Blocks**
| Block | Purpose | Features |
|-------|---------|----------|
| ProfileBlock | Avatar + name + bio | Verified badge, pronouns, location |
| LinkButtonBlock | Clickable links | Favicons, platform detection, animations |
| SocialLinksBlock | Social icons | 15+ platforms, multiple layouts |
| HeaderBlock | Page header | Logo, navigation |
| FooterBlock | Page footer | Credits, links |

**Content Blocks**
| Block | Purpose | Features |
|-------|---------|----------|
| HeadingBlock | Titles | H1/H2/H3, gradients, animations |
| TextBlock | Rich text | Tiptap editor, formatting |
| ImageBlock | Images | Lightbox, lazy loading |
| VideoBlock | Videos | YouTube/Vimeo embeds |
| GalleryBlock | Image grid | Carousel, masonry layouts |
| DividerBlock | Separators | Styles, spacing |

**Interactive Blocks**
| Block | Purpose | Features |
|-------|---------|----------|
| FormBlock | Contact forms | Validation, submissions |
| FAQBlock | Q&A sections | Accordion, search |
| CountdownBlock | Event timers | Customizable, actions |
| StatsBlock | Numbers | Animated counters |
| TestimonialBlock | Reviews | Ratings, avatars |

**Monetization Blocks**
| Block | Purpose | Features |
|-------|---------|----------|
| PaymentBlock | Tips/donations | Stripe integration |
| ProductBlock | Digital products | Buy buttons, variants |

---

## Sprint 3: Theme System & Visual Polish
**Duration:** Week 5-6  
**Goal:** Advanced theming and customization

### Theme Architecture
```typescript
interface PageTheme {
  // Background (5 types)
  background: {
    type: 'solid' | 'gradient' | 'pattern' | 'image' | 'video';
    // ... type-specific options
  };
  
  // Typography
  typography: {
    titleFont: FontFamily;
    bodyFont: FontFamily;
    titleColor: string;
    bodyColor: string;
  };
  
  // Buttons
  button: {
    variant: 'fill' | 'outline' | 'soft' | 'shadow' | 'glass';
    borderRadius: 'none' | 'small' | 'medium' | 'large' | 'full';
    hoverEffect: 'scale' | 'lift' | 'glow' | 'bounce';
  };
  
  // Header & Footer
  header: HeaderTheme;
  footer: FooterTheme;
}
```

### Preset Themes (20+)
- **Minimal:** Classic White, Clean Gray, Paper
- **Dark:** Midnight, Charcoal, Dark Mode
- **Vibrant:** Ocean Blue, Sunset, Neon Glow
- **Gradient:** Aurora, Cosmic, Rainbow
- **Professional:** Corporate, Executive, Modern
- **Creative:** Glassmorphism, Retro, Playful

### Pattern Backgrounds
- Grid, Dots, Diagonal lines
- Waves, Morph, Organic shapes
- Configurable: opacity, size, color

---

## Sprint 4: Enterprise Features
**Duration:** Week 7-8  
**Goal:** B2B features and scalability

### New Services
| Service | Port | Purpose |
|---------|------|---------|
| Gateway | 3000 | API routing, rate limiting |
| Media Service | 3025 | Cloudflare R2 uploads |
| ML Service | 3030 | AI recommendations |
| Notifications | 3011 | Email/push alerts |
| Organizations | 3008 | Team management |
| Billing | 3015 | Stripe subscriptions |

### Multi-Tenancy Model
```
Organization
├── Teams
│   ├── Members (roles: Owner, Admin, Editor, Viewer)
│   └── Pages (with permissions)
├── Settings
│   ├── Branding (logo, colors)
│   ├── Domain (custom domains)
│   └── SSO (SAML/OIDC)
└── Billing
    ├── Plan
    └── Usage
```

### Analytics Dashboard
- Real-time scan/click tracking
- Geographic heatmaps
- Device & browser breakdown
- UTM parameter tracking
- Conversion funnels
- Export to CSV/PDF

---

## Sprint 5: Creator Economy Features
**Duration:** Week 9-10  
**Goal:** Monetization and automation tools

### Creator Service (Port 3020)
```
/api/creator/
├── /products        - Digital product management
│   ├── GET /        - List products
│   ├── POST /       - Create product
│   └── GET /:id     - Get product details
├── /earnings        - Revenue tracking
│   ├── GET /summary - Earnings overview
│   └── GET /payouts - Payout history
├── /social-planner  - Schedule posts
│   ├── GET /posts   - Scheduled posts
│   └── POST /posts  - Create scheduled post
├── /collections     - Curated links
├── /auto-reply      - Automated responses
└── /content-ideas   - AI suggestions
```

### Print Studio Service (Port 3022)
```
/api/print-studio/
├── /templates       - Print templates
│   ├── Business cards
│   ├── Posters (A4, A3, Letter)
│   ├── Stickers
│   └── Table tents
├── /batch           - Batch generation
│   ├── POST /       - Create batch job
│   └── GET /:id/pdf - Download PDF
└── /assets          - Custom graphics
```

### Workflow Builder Service (Port 3023)
```
Workflow Structure:
├── Triggers
│   ├── QR scan
│   ├── Form submission
│   ├── Schedule (cron)
│   └── Webhook
├── Actions
│   ├── Send email
│   ├── Send SMS
│   ├── HTTP request
│   ├── Update database
│   └── Notify team
└── Conditions
    ├── If/else branching
    ├── Value comparison
    └── Time-based rules
```

---

## Sprint 6: Frontend API Integration & Polish
**Duration:** Week 11-12 (Current)  
**Goal:** Connect frontend to all backend services

### API Clients Created
```
/src/lib/api/
├── client.ts         - Axios base config, interceptors
├── creator.ts        - Creator service API (~300 lines)
├── print-studio.ts   - Print studio API (~200 lines)
└── workflow.ts       - Workflow builder API (~230 lines)
```

### Component Polish
- **ProfileBlock:** Verified badge, glow effects, pronouns
- **LinkButtonBlock:** Platform detection, favicons, hover states
- **SocialLinksBlock:** 15+ icons, layout options
- **BlockPalette:** Categories, search, smart suggestions

### Theme Cascade System
```
Priority (highest → lowest):
1. Block-level overrides
2. Page theme settings
3. Organization defaults
4. System defaults
```

---

## Architecture Overview

```
                    ┌──────────────────┐
                    │   CDN (Cloudflare)│
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   Load Balancer   │
                    └────────┬─────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│                   API Gateway (3000)                     │
│            Rate Limiting • Auth • Routing                │
└────────────────────────────┬────────────────────────────┘
                             │
     ┌───────────┬───────────┼───────────┬───────────┐
     │           │           │           │           │
┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
│  Auth   │ │   QR    │ │Analytics│ │Microsite│ │ Creator │
│  3001   │ │  3002   │ │  3004   │ │  3005   │ │  3020   │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
     │           │           │           │           │
     └───────────┴───────────┼───────────┴───────────┘
                             │
                    ┌────────▼─────────┐
                    │    PostgreSQL     │
                    │    + Redis        │
                    └──────────────────┘
```

---

## Service Inventory

| # | Service | Port | Lines | Status |
|---|---------|------|-------|--------|
| 1 | API Gateway | 3000 | ~800 | ✅ Ready |
| 2 | Auth | 3001 | ~1,200 | ✅ Ready |
| 3 | QR | 3002 | ~1,500 | ✅ Ready |
| 4 | Analytics | 3004 | ~2,000 | ✅ Ready |
| 5 | Microsite | 3005 | ~1,800 | ✅ Ready |
| 6 | Experiments | 3006 | ~600 | ✅ Ready |
| 7 | Insights | 3007 | ~800 | ✅ Ready |
| 8 | Organizations | 3008 | ~1,000 | ✅ Ready |
| 9 | Audit | 3009 | ~500 | ✅ Ready |
| 10 | Integrations | 3010 | ~700 | ✅ Ready |
| 11 | Notifications | 3011 | ~600 | ✅ Ready |
| 12 | Webhooks | 3012 | ~500 | ✅ Ready |
| 13 | Billing | 3015 | ~900 | ✅ Ready |
| 14 | Creator | 3020 | ~1,100 | ✅ Ready |
| 15 | Print Studio | 3022 | ~800 | ✅ Ready |
| 16 | Workflow | 3023 | ~1,200 | ✅ Ready |
| 17 | Media | 3025 | ~600 | ✅ Ready |
| 18 | ML | 3030 | ~700 | ✅ Ready |

**Backend Total:** ~17,000+ lines of TypeScript  
**Frontend Total:** ~25,000+ lines of TypeScript/React

---

## Remaining Work (Future Sprints)

### Sprint 7: UI Pages
- [ ] Creator Dashboard page
- [ ] Print Studio page
- [ ] Workflow Builder page
- [ ] Analytics Dashboard page
- [ ] Settings/Account pages

### Sprint 8: Production Hardening
- [ ] Error boundaries
- [ ] Loading skeletons
- [ ] Offline support (PWA)
- [ ] Performance optimization
- [ ] E2E tests (Playwright)

### Sprint 9: Launch Preparation
- [ ] Production Docker configs
- [ ] CI/CD (GitHub Actions)
- [ ] Monitoring (Sentry, Prometheus)
- [ ] Documentation site
- [ ] Marketing landing page

---

## Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Backend Framework | Fastify | 2x faster than Express, TypeScript-first |
| Frontend | React + Vite | Fast HMR, modern tooling |
| Styling | TailwindCSS | Rapid development, consistency |
| Components | Shadcn/UI | Customizable, accessible |
| Animations | Framer Motion | Production-ready, performant |
| Database | PostgreSQL | Reliable, JSONB support |
| Cache | Redis | Sessions, rate limiting |
| File Storage | Cloudflare R2 | S3-compatible, cheap egress |
| Architecture | Microservices | Scale independently |

---

## Development Stats

- **Total Commits:** 500+
- **Total Files:** 300+
- **Total Lines:** 42,000+
- **Test Coverage:** ~60%
- **Lighthouse Score:** 95+

---

*Last Updated: January 21, 2026*
