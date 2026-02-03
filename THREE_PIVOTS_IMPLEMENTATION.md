# Three Strategic Pivots Implementation Summary

## Overview

This implementation transforms your QR/microsite platform into three high-value B2B products:

1. **White-Label Agency Platform** - Sell to agencies who rebrand your tool
2. **High-Ticket E-commerce Funnels** - Single-product funnels optimized for $1,000+ sales
3. **Professional Link-in-Bio with AI** - Mobile-first builder with agentic optimization

---

## PIVOT 1: White-Label Agency Platform (B2B)

### Business Model
- **Target:** Digital agencies, consultancies, resellers
- **Pricing:** $99/mo (Starter) → $299/mo (Professional) → $999/mo (Enterprise)
- **Revenue Multiplier:** Each agency brings 5-15 team seats + their clients

### Key Features Implemented

#### 1. Agency Management (`/services/auth-service`)
- **Database Schema:**
  - `agencies` table: org details, white-label config, subscription, limits
  - `agencyMembers` table: team roles, permissions, invitations
  - `users` table: extended with organizationId and role fields

- **API Routes** (`/routes/agencies.ts`):
  - `POST /agencies` - Create new agency
  - `GET /agencies/:id` - Get agency details
  - `PATCH /agencies/:id/white-label` - Update branding
  - `POST /agencies/:id/members/invite` - Invite team members
  - `GET /agencies/:id/members` - List team
  - `GET /pricing-plans` - Get subscription tiers

#### 2. White-Label Branding
Each agency can customize:
- Logo and favicon
- Primary/secondary colors
- Custom CSS
- Custom domain (e.g., `builder.agency.com`)
- Email branding (from name, from address, support email)
- "Powered by" badge visibility

#### 3. Subscription Tiers

| Feature | Starter ($99) | Professional ($299) | Enterprise ($999) |
|---------|--------------|---------------------|-------------------|
| Microsites | 10 | 50 | Unlimited |
| Team Seats | 5 | 15 | Unlimited |
| Digital Sales Rooms | 3 | 20 | Unlimited |
| White-Labeling | ❌ | ✅ | ✅ |
| Custom Domain | ❌ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ |
| Dedicated Support | ❌ | ❌ | ✅ |

#### 4. Digital Sales Room Templates (`/services/microsite-service/src/templates/sales-room-templates.ts`)

**Enterprise Proposal Template:**
- Hero with prospect name
- Executive summary
- Video message (Loom integration)
- Pricing table
- Timeline
- CTA (Calendly integration)

**Interactive Pitch Deck:**
- Cover slide
- Problem statement
- Solution features
- Case studies
- Demo video
- Next steps CTA

**Contract Review Portal:**
- Password-protected access
- Contract summary
- Accordion terms
- E-signature integration (DocuSign)

**Template Usage:**
```typescript
import { digitalSalesRoomTemplates, populateTemplate } from './templates/sales-room-templates';

const proposal = populateTemplate(digitalSalesRoomTemplates[0], {
  prospect_name: 'John Smith',
  agency_name: 'Acme Agency',
  deal_value: '$85,000',
  video_url: 'https://loom.com/share/abc123',
  calendly_link: 'https://calendly.com/agency/kickoff',
});
```

### Revenue Impact
- **LTV:** $999/mo × 12 months = $11,988/year per enterprise customer
- **Viral Coefficient:** Each agency serves 20-50 clients → indirect platform growth
- **Churn Reduction:** Agencies have multi-year contracts with their clients

---

## PIVOT 2: High-Ticket E-commerce Microsites

### Business Model
- **Target:** Solar installers, jewelry makers, furniture craftsmen, home upgrade contractors
- **Sweet Spot:** Products priced $1,000 - $50,000
- **Unique Angle:** Answer Engine Optimization (AEO) for AI search

### Key Features Implemented

#### 1. E-commerce Templates (`/services/microsite-service/src/templates/ecommerce-templates.ts`)

**Solar Panel Installation Funnel:**
- Hero with autoplay video
- Benefits grid (savings, carbon reduction, home value)
- ROI calculator (interactive)
- Customer testimonials with $ savings
- Free consultation form

**Custom Jewelry Showcase:**
- Full-screen hero
- Image gallery with zoom
- Artisan story
- Product customizer (material, gemstone, engraving)
- Secure checkout

**Home Energy Audit Package:**
- Problem-agitate-solve structure
- Energy savings calculator
- Package breakdown
- Money-back guarantee
- Calendar booking (Calendly)

#### 2. Answer Engine Optimization (AEO)

**Structured Data Templates:**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Residential Solar Panel Installation",
  "offers": {
    "@type": "Offer",
    "price": "25000",
    "priceCurrency": "CAD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "127"
  }
}
```

**FAQ Schema for Voice Search:**
```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much do solar panels cost in Toronto?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Residential solar in Toronto ranges from $12k-$35k CAD. Average payback is 7-9 years."
      }
    }
  ]
}
```

**Speakable Content:**
- Identifies key text for voice assistants
- Short, direct answers optimized for featured snippets
- Example: "Save $2,400+ per year on electricity with solar panels"

#### 3. Niche-Specific Optimizations

| Niche | Avg Ticket | Key Feature | Conversion Tactic |
|-------|-----------|-------------|-------------------|
| Solar | $25,000 | ROI Calculator | Show 25-year savings |
| Jewelry | $5,000 | 3D Customizer | Real-time preview |
| Furniture | $4,500 | Material Selector | AR visualization |
| Home Upgrade | $15,000 | Savings Calculator | Government rebates |

### AEO Advantage
- **Problem:** ChatGPT, Perplexity, Google SGE can't recommend products they can't "read"
- **Solution:** Structured data makes your product the AI's direct answer
- **Example Query:** "Where can I buy solar panels in Toronto?"
  - **AI Answer:** "{{Your Company}} offers residential solar from $12k with 25-year warranty. Average ROI: 7 years. [Link to microsite]"

---

## PIVOT 3: Professional Link-in-Bio (Advanced Creator Tool)

### Business Model
- **Target:** Content creators, influencers, coaches, consultants
- **Differentiation:** AI assistant that auto-optimizes for conversions
- **Mobile-First:** Entire builder works from a phone

### Key Features Implemented

#### 1. Agentic AI Assistant (`/services/ml-service/src/lib/agentic-optimizer.ts`)

**How It Works:**
1. Monitor microsite traffic in real-time
2. Analyze bounce rate, time on page, click-through rates
3. Generate actionable recommendations
4. Auto-apply low-risk changes

**Example Recommendations:**

| Trigger | Recommendation | Expected Impact |
|---------|---------------|-----------------|
| Bounce rate >70% | Change CTA from "Learn More" to "Get Started Free" | +25% conversion |
| Avg time <10s | Add autoplay video to hero | +60% engagement |
| Button CTR <5% | Move button to sticky header | +40% clicks |
| Conversion <2% | Update headline to outcome-focused | +35% conversion |
| Mobile bounce >75% | Remove sidebar, simplify to single-column | +30% mobile conversion |

**API Routes** (`/routes/agentic.ts`):
- `GET /agentic/recommendations/:micrositeId` - Get AI suggestions
- `POST /agentic/recommendations/:micrositeId/auto-apply` - Apply safe changes
- `GET /agentic/insights/:micrositeId` - Get performance insights

**Auto-Apply Logic:**
```typescript
const autoApplyWhitelist = [
  'cta-text',      // Low risk
  'color-tweak',   // Low risk
];

// Only apply if:
// 1. Type is whitelisted
// 2. Confidence > 75%
if (rec.confidence > 0.75 && autoApplyWhitelist.has(rec.type)) {
  await applyChange(micrositeId, rec);
}
```

#### 2. Native Video Embedding

**Supported Providers:**
- YouTube
- Vimeo
- Loom
- Direct uploads

**Video Analytics:**
- View count
- Completion rate
- Average watch time
- Conversions after watching

**Why Native (not embedded iframes)?**
- Keeps users on your page (no YouTube redirect)
- Custom controls
- Better mobile experience
- Attribution tracking

#### 3. Deep UTM/Attribution Tracking

**Captured Parameters:**
```typescript
interface UTMParams {
  source: string;      // utm_source
  medium: string;      // utm_medium
  campaign: string;    // utm_campaign
  term?: string;       // utm_term
  content?: string;    // utm_content
  [key: string]: any;  // Custom params
}
```

**Use Case:**
Creator posts on Instagram with link: `bio.link/creator?utm_source=instagram&utm_campaign=product-launch`

**Dashboard shows:**
- "Instagram → Product Launch" drove 47 visits → 3 purchases
- ROI: $450 revenue from that specific post

**Lead Attribution:**
Every lead/conversion captures:
- Which UTM parameters
- Which social post
- Which video was watched
- Exact click path

---

## Database Schema Additions

### Auth Service

```typescript
// agencies table
{
  id: uuid,
  name: text,
  slug: text,              // URL-safe subdomain
  whiteLabel: jsonb,       // Branding config
  plan: varchar,           // 'starter', 'professional', 'enterprise'
  seats: integer,          // Max team members
  seatsUsed: integer,
  limits: jsonb,           // Feature limits per plan
  status: varchar,         // 'active', 'suspended', 'cancelled'
  trialEndsAt: timestamp,
  ownerId: uuid,
}

// agencyMembers table
{
  id: uuid,
  agencyId: uuid,
  userId: uuid,
  role: varchar,           // 'owner', 'admin', 'member', 'viewer'
  permissions: jsonb,      // Fine-grained permissions
  status: varchar,         // 'invited', 'active', 'suspended'
}
```

### Microsite Service

```typescript
// microsites table (extended)
{
  ...existingFields,
  
  type: varchar,                    // 'link-in-bio', 'digital-sales-room', 'single-product-funnel'
  agencyId: uuid,                   // If created by agency
  brandingConfig: jsonb,            // Agency branding overrides
  
  ecommerceConfig: jsonb,           // Product details, pricing, niche
  salesRoomConfig: jsonb,           // Prospect info, deal value, expiry
  advancedFeatures: jsonb,          // Video embeds, UTM tracking, AI assistant
  seoConfig: jsonb,                 // AEO structured data, FAQ schema
}

// aiRecommendations table
{
  id: uuid,
  micrositeId: uuid,
  type: varchar,                    // 'button-position', 'headline-change', etc.
  recommendation: jsonb,            // What to change and why
  basedOnMetrics: jsonb,            // Traffic data that triggered it
  status: varchar,                  // 'pending', 'accepted', 'rejected', 'auto-applied'
}

// videoAnalytics table
{
  id: uuid,
  micrositeId: uuid,
  videoId: text,
  provider: varchar,
  views: integer,
  completionRate: decimal,
  conversionsAfterWatch: integer,
}
```

---

## API Endpoints Summary

### Agency Platform
```
POST   /agencies                          Create agency
GET    /agencies/:id                      Get agency details
PATCH  /agencies/:id/white-label          Update branding
POST   /agencies/:id/members/invite       Invite team member
GET    /agencies/:id/members              List team members
GET    /pricing-plans                     Get subscription tiers
```

### Templates
```
GET    /templates/sales-rooms             List Digital Sales Room templates
GET    /templates/sales-rooms/:name       Get specific template
POST   /templates/sales-rooms/:name/create   Create microsite from template

GET    /templates/ecommerce               List e-commerce templates
GET    /templates/ecommerce?niche=solar   Filter by niche
GET    /templates/ecommerce/:name         Get specific template
POST   /templates/ecommerce/:name/create  Create funnel with AEO

GET    /templates/niches                  List available niches
```

### AI Assistant
```
GET    /agentic/recommendations/:micrositeId        Get AI recommendations
POST   /agentic/recommendations/:micrositeId/auto-apply   Auto-apply safe changes
GET    /agentic/insights/:micrositeId               Get performance insights
```

---

## Migration Path

### Phase 1: Database Migration
```bash
cd services/auth-service
npm run db:generate
npm run db:push

cd ../microsite-service
npm run db:generate
npm run db:push
```

### Phase 2: Register New Routes

**auth-service/src/index.ts:**
```typescript
import agencyRoutes from './routes/agencies.js';

await server.register(agencyRoutes, { prefix: '/agencies' });
```

**microsite-service/src/index.ts:**
```typescript
import templateRoutes from './routes/templates.js';

await server.register(templateRoutes, { prefix: '/templates' });
```

**ml-service/src/index.ts:**
```typescript
import agenticRoutes from './routes/agentic.js';

await server.register(agenticRoutes, { prefix: '/agentic' });
```

### Phase 3: Frontend Integration

**Agency Dashboard:**
```tsx
// White-label settings page
<WhiteLabelForm
  onSubmit={async (data) => {
    await fetch(`/agencies/${agencyId}/white-label`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }}
/>
```

**Template Selector:**
```tsx
// E-commerce funnel creator
const templates = await fetch('/templates/ecommerce?niche=solar');

<TemplateCard
  template={templates[0]}
  onClick={() => setSelectedTemplate(template)}
/>
```

**AI Recommendations Widget:**
```tsx
// Show AI suggestions in microsite editor
const recs = await fetch(`/agentic/recommendations/${micrositeId}`);

<RecommendationCard
  recommendation={rec}
  onAccept={() => applyRecommendation(rec)}
  onReject={() => dismissRecommendation(rec)}
/>
```

---

## Revenue Projections

### Scenario: 100 Agency Customers

**Monthly Recurring Revenue:**
- 30 agencies × $99 (Starter) = $2,970
- 50 agencies × $299 (Professional) = $14,950
- 20 agencies × $999 (Enterprise) = $19,980
- **Total MRR:** $37,900
- **Annual Run Rate:** $454,800

**Indirect Revenue (agencies' clients):**
- 100 agencies × 30 clients each = 3,000 microsites
- At $10/microsite/month (platform fee) = $30,000/mo additional
- **Combined ARR:** $814,800

### Scenario: High-Ticket E-commerce

**10 Solar Installation Companies:**
- Each runs 5 funnel variations = 50 microsites
- At $99/month per funnel = $4,950/mo
- Each company generates 5-10 leads/month worth $25k each
- Platform takes 2% commission = $1,250/lead
- **Revenue:** $4,950 (SaaS) + $12,500 (commissions) = $17,450/mo per vertical

---

## Competitive Moats

### Why Agencies Can't Build This Themselves
1. **Development Time:** 6+ months to build white-label platform
2. **Maintenance Cost:** $10k/month for server, updates, support
3. **Compliance:** GDPR, SOC 2, data privacy = legal nightmare
4. **Your Moat:** Instant deployment, proven templates, no dev work

### Why Link-in-Bio Tools Can't Compete
1. **No AI Assistant:** Linktree, Beacons, etc. are static
2. **No Attribution:** They don't track UTM → conversion path
3. **No Video Analytics:** Can't measure video → purchase correlation
4. **Your Moat:** AI-powered optimization = measurably higher conversions

### Why E-commerce Platforms Fall Short
1. **Too Complex:** Shopify overkill for single-product sales
2. **No AEO:** Not optimized for AI search engines
3. **Generic Templates:** Not niche-specific (solar ≠ jewelry)
4. **Your Moat:** AEO = you show up as AI's recommended answer

---

## Next Steps

### Immediate (This Week)
1. Run database migrations
2. Test agency creation flow
3. Deploy one Digital Sales Room template
4. Validate AEO structured data with Google Rich Results Test

### Short-Term (This Month)
1. Build agency onboarding UI
2. Create 3 e-commerce funnel examples (solar, jewelry, home-upgrade)
3. Launch AI recommendations dashboard
4. Set up Stripe billing for agency subscriptions

### Long-Term (Next Quarter)
1. Partner with 5 pilot agencies (offer 50% discount)
2. Create marketplace for agency-submitted templates
3. Build mobile app for on-the-go editing
4. Add A/B testing to AI recommendations

---

## Files Created/Modified

### New Files
- `/services/auth-service/src/routes/agencies.ts` - Agency management API
- `/services/microsite-service/src/routes/templates.ts` - Template API
- `/services/microsite-service/src/templates/sales-room-templates.ts` - Digital Sales Room templates
- `/services/microsite-service/src/templates/ecommerce-templates.ts` - E-commerce templates with AEO
- `/services/ml-service/src/lib/agentic-optimizer.ts` - AI recommendation engine
- `/services/ml-service/src/routes/agentic.ts` - AI assistant API

### Modified Files
- `/services/auth-service/src/schema.ts` - Added agencies, agencyMembers tables
- `/services/auth-service/src/db.ts` - Exported new tables
- `/services/microsite-service/src/schema.ts` - Extended microsites table, added aiRecommendations, videoAnalytics

### Documentation
- `/qr-backend/THREE_PIVOTS_IMPLEMENTATION.md` - This file

---

## Success Metrics

### Agency Platform
- **Primary:** Number of active agency accounts
- **Secondary:** Average seats per agency
- **Revenue:** MRR growth rate
- **Retention:** Monthly churn rate

### E-commerce Funnels
- **Primary:** Number of funnels created per niche
- **Secondary:** Average conversion rate per niche
- **AEO Impact:** % of traffic from AI search (Perplexity, ChatGPT)
- **Revenue:** Commission from high-ticket sales

### Link-in-Bio + AI
- **Primary:** Number of AI recommendations accepted
- **Secondary:** Conversion rate improvement (pre/post AI)
- **Engagement:** % of users with AI assistant enabled
- **Revenue:** Upsell to premium AI features

---

## Support Resources

### For Agencies
- White-label setup guide
- Team onboarding checklist
- API documentation
- Custom domain configuration

### For E-commerce Users
- AEO optimization checklist
- Niche-specific best practices
- Stripe integration guide
- Voice search FAQ examples

### For Creators
- UTM parameter guide
- Video optimization tips
- AI recommendation FAQ
- Mobile editing tutorial

---

**Built:** December 30, 2025  
**Platform:** QR/Microsite Builder → B2B SaaS  
**Status:** Ready for Testing
