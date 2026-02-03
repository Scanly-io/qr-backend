# Quick Start Guide - Three Pivots

## Setup (5 minutes)

### 1. Run Database Migrations

```bash
# Auth service (agencies tables)
cd /Users/saurabhbansal/qr-backend/services/auth-service
npm run db:generate
npm run db:push

# Microsite service (extended microsites + new tables)
cd /Users/saurabhbansal/qr-backend/services/microsite-service
npm run db:generate
npm run db:push

# ML service (AI recommendations)
cd /Users/saurabhbansal/qr-backend/services/ml-service
npm run db:generate
npm run db:push
```

### 2. Register New Routes

**auth-service/src/index.ts:**
```typescript
// Add this import at the top
import agencyRoutes from './routes/agencies.js';

// Add this route registration (after existing routes)
await server.register(agencyRoutes, { prefix: '/api' });
```

**microsite-service/src/index.ts:**
```typescript
// Add this import
import templateRoutes from './routes/templates.js';

// Add this route registration
await server.register(templateRoutes, { prefix: '/api/templates' });
```

**ml-service/src/index.ts:**
```typescript
// Add this import
import agenticRoutes from './routes/agentic.js';

// Add this route registration
await server.register(agenticRoutes, { prefix: '/agentic' });
```

### 3. Restart Services

```bash
# Stop all services
cd /Users/saurabhbansal/qr-backend
./stop-all.sh

# Start all services
./start-all.sh
```

---

## Test Each Pivot

### PIVOT 1: White-Label Agency Platform

**Create an agency:**
```bash
curl -X POST http://localhost:3001/api/agencies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Digital Agency",
    "website": "https://acmedigital.com",
    "plan": "professional",
    "ownerId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Update white-label branding:**
```bash
curl -X PATCH http://localhost:3001/api/agencies/AGENCY_ID/white-label \
  -H "Content-Type: application/json" \
  -d '{
    "logo": "https://acmedigital.com/logo.png",
    "primaryColor": "#FF6B6B",
    "secondaryColor": "#4ECDC4",
    "customDomain": "builder.acmedigital.com",
    "hidePoweredBy": true
  }'
```

**Invite team member:**
```bash
curl -X POST http://localhost:3001/api/agencies/AGENCY_ID/members/invite \
  -H "Content-Type: application/json" \
  -d '{
    "email": "designer@acmedigital.com",
    "role": "member"
  }'
```

**Create Digital Sales Room from template:**
```bash
curl -X POST http://localhost:3003/api/templates/sales-rooms/enterprise-proposal/create \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "prospect_name": "John Smith",
      "agency_name": "Acme Digital",
      "date": "2025-01-15",
      "prospect_company": "TechCorp Inc.",
      "roi_percentage": "250",
      "timeline_weeks": "12",
      "deal_value": "$85,000",
      "video_url": "https://loom.com/share/abc123",
      "calendly_link": "https://calendly.com/acme/kickoff"
    },
    "micrositeData": {
      "createdBy": "agency-user-id"
    }
  }'
```

### PIVOT 2: High-Ticket E-commerce

**List e-commerce templates by niche:**
```bash
curl http://localhost:3003/api/templates/ecommerce?niche=solar
```

**Create solar panel funnel with AEO:**
```bash
curl -X POST http://localhost:3003/api/templates/ecommerce/solar-panel-installation-funnel/create \
  -H "Content-Type: application/json" \
  -d '{
    "productData": {
      "product_name": "Premium Solar Panel System",
      "product_description": "Professional 8kW solar installation with 25-year warranty",
      "product_price": "25000",
      "starting_price": "24999",
      "images": ["https://example.com/solar1.jpg"],
      "company_name": "SolarTech Ontario"
    },
    "locationData": {
      "city": "Toronto",
      "province": "Ontario"
    },
    "micrositeData": {
      "createdBy": "solar-company-user-id"
    }
  }'
```

**Validate AEO structured data:**
```bash
# Use Google Rich Results Test
# https://search.google.com/test/rich-results
# Paste your microsite URL to see if Product schema is detected
```

### PIVOT 3: AI Assistant for Link-in-Bio

**Get AI recommendations:**
```bash
curl http://localhost:3016/agentic/recommendations/MICROSITE_ID
```

**Example response:**
```json
{
  "success": true,
  "data": {
    "micrositeId": "abc-123",
    "recommendations": [
      {
        "type": "cta-text",
        "elementId": "primary-cta",
        "currentValue": "Learn More",
        "suggestedValue": "Get Started Free",
        "reason": "Bounce rate is 72%. Generic CTAs underperform—action-oriented text boosts clicks by 20-30%.",
        "expectedImpact": "+25% conversion rate",
        "confidence": 0.85
      },
      {
        "type": "add-video",
        "elementId": "hero-section",
        "currentValue": null,
        "suggestedValue": {
          "type": "video",
          "autoplay": true,
          "provider": "loom"
        },
        "reason": "Average time on page is only 8.5s. Native autoplay videos increase engagement by 80%.",
        "expectedImpact": "+60% avg time on page",
        "confidence": 0.78
      }
    ],
    "count": 2
  }
}
```

**Auto-apply safe recommendations:**
```bash
curl -X POST http://localhost:3016/agentic/recommendations/MICROSITE_ID/auto-apply
```

**Get conversion insights:**
```bash
curl http://localhost:3016/agentic/insights/MICROSITE_ID
```

---

## Frontend Integration Examples

### Agency Dashboard (React/Next.js)

```tsx
// components/AgencyDashboard.tsx
import { useState, useEffect } from 'react';

export default function AgencyDashboard({ agencyId }: { agencyId: string }) {
  const [agency, setAgency] = useState(null);
  const [members, setMembers] = useState([]);
  
  useEffect(() => {
    fetch(`/api/agencies/${agencyId}`)
      .then(res => res.json())
      .then(data => setAgency(data.data.agency));
    
    fetch(`/api/agencies/${agencyId}/members`)
      .then(res => res.json())
      .then(data => setMembers(data.data.members));
  }, [agencyId]);
  
  return (
    <div>
      <h1>{agency?.name}</h1>
      <p>Plan: {agency?.plan}</p>
      <p>Seats: {agency?.seatsUsed} / {agency?.seats}</p>
      
      <h2>Team Members</h2>
      <ul>
        {members.map(member => (
          <li key={member.id}>
            {member.user.email} - {member.role}
          </li>
        ))}
      </ul>
      
      <button onClick={() => {
        const email = prompt('Enter email to invite:');
        fetch(`/api/agencies/${agencyId}/members/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role: 'member' }),
        });
      }}>
        Invite Team Member
      </button>
    </div>
  );
}
```

### Template Selector

```tsx
// components/TemplateSelector.tsx
import { useState, useEffect } from 'react';

export default function TemplateSelector({ onSelect }: { onSelect: (template: any) => void }) {
  const [templates, setTemplates] = useState([]);
  const [niche, setNiche] = useState('solar');
  
  useEffect(() => {
    fetch(`/api/templates/ecommerce?niche=${niche}`)
      .then(res => res.json())
      .then(data => setTemplates(data.data.templates));
  }, [niche]);
  
  return (
    <div>
      <select value={niche} onChange={(e) => setNiche(e.target.value)}>
        <option value="solar">Solar Panels</option>
        <option value="jewelry">Custom Jewelry</option>
        <option value="furniture">Custom Furniture</option>
        <option value="home-upgrade">Home Upgrades</option>
      </select>
      
      <div className="grid grid-cols-3 gap-4">
        {templates.map(template => (
          <div key={template.name} className="border p-4 cursor-pointer" onClick={() => onSelect(template)}>
            <img src={template.thumbnail} alt={template.name} />
            <h3>{template.name}</h3>
            <p>{template.description}</p>
            <p className="text-sm text-gray-500">
              {template.suggestedPriceRange.min} - {template.suggestedPriceRange.max} {template.suggestedPriceRange.currency}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### AI Recommendations Widget

```tsx
// components/AIRecommendations.tsx
import { useState, useEffect } from 'react';

export default function AIRecommendations({ micrositeId }: { micrositeId: string }) {
  const [recommendations, setRecommendations] = useState([]);
  
  useEffect(() => {
    fetch(`/agentic/recommendations/${micrositeId}`)
      .then(res => res.json())
      .then(data => setRecommendations(data.data.recommendations));
  }, [micrositeId]);
  
  const applyRecommendation = async (rec: any) => {
    // TODO: Call microsite-service to apply change
    console.log('Applying:', rec);
  };
  
  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white shadow-lg rounded-lg p-4">
      <h3 className="font-bold text-lg mb-2">🤖 AI Suggestions</h3>
      
      {recommendations.length === 0 && (
        <p className="text-gray-500">No suggestions yet. Check back after 100+ visits.</p>
      )}
      
      {recommendations.map((rec, i) => (
        <div key={i} className="border-t pt-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{rec.type}</span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              {(rec.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          
          <p className="text-sm text-gray-700 mt-1">{rec.reason}</p>
          
          <p className="text-sm font-semibold text-blue-600 mt-1">
            Expected: {rec.expectedImpact}
          </p>
          
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => applyRecommendation(rec)}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              Apply
            </button>
            <button className="border border-gray-300 px-3 py-1 rounded text-sm">
              Dismiss
            </button>
          </div>
        </div>
      ))}
      
      <button
        onClick={async () => {
          const res = await fetch(`/agentic/recommendations/${micrositeId}/auto-apply`, {
            method: 'POST',
          });
          const data = await res.json();
          alert(`Applied ${data.data.appliedCount} recommendations automatically`);
        }}
        className="w-full mt-4 bg-purple-500 text-white py-2 rounded"
      >
        Auto-Apply Safe Changes
      </button>
    </div>
  );
}
```

---

## Pricing Page Example

```tsx
// pages/pricing.tsx
export default function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: 99,
      features: [
        '10 microsites',
        '5 team seats',
        '3 Digital Sales Rooms',
        'Basic analytics',
        'Email support',
      ],
    },
    {
      name: 'Professional',
      price: 299,
      popular: true,
      features: [
        '50 microsites',
        '15 team seats',
        '20 Digital Sales Rooms',
        'Full white-labeling',
        'Custom domain',
        'API access',
        'Priority support',
      ],
    },
    {
      name: 'Enterprise',
      price: 999,
      features: [
        'Unlimited microsites',
        'Unlimited seats',
        'Unlimited Digital Sales Rooms',
        'Full white-labeling',
        'Dedicated success manager',
        'Custom integrations',
      ],
    },
  ];
  
  return (
    <div className="container mx-auto py-16">
      <h1 className="text-4xl font-bold text-center mb-12">
        White-Label Platform Pricing
      </h1>
      
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map(plan => (
          <div
            key={plan.name}
            className={`border rounded-lg p-6 ${plan.popular ? 'border-blue-500 border-2' : ''}`}
          >
            {plan.popular && (
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                Most Popular
              </span>
            )}
            
            <h2 className="text-2xl font-bold mt-4">{plan.name}</h2>
            <p className="text-4xl font-bold mt-2">
              ${plan.price}
              <span className="text-lg text-gray-500">/month</span>
            </p>
            
            <ul className="mt-6 space-y-2">
              {plan.features.map(feature => (
                <li key={feature} className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            
            <button className="w-full mt-8 bg-blue-500 text-white py-3 rounded-lg font-semibold">
              Start Free Trial
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Success! What's Next?

### Immediate Testing

1. **Create test agency:** Run the curl command above
2. **Test Digital Sales Room:** Create a proposal for a fake prospect
3. **Test E-commerce funnel:** Create a solar panel funnel
4. **Test AI recommendations:** Visit a microsite 100+ times to trigger suggestions

### Marketing Angles

**Agency Platform:**
- "White-label microsite builder for agencies - $299/mo instead of $10k/mo for custom dev"
- "Scale website delivery without hiring more developers"
- "Digital Sales Rooms included - close deals faster"

**E-commerce Funnels:**
- "Solar companies: Get found by AI search engines (ChatGPT, Perplexity)"
- "Single-product funnels that convert at 8%+ (vs 2% for Shopify)"
- "Answer Engine Optimization - be the AI's recommended answer"

**Link-in-Bio:**
- "AI assistant auto-optimizes your bio for conversions"
- "Track exactly which Instagram post drove each sale"
- "Native video embedding - keep visitors on your page"

### Revenue Model

- **Agency Subscriptions:** $99 - $999/month recurring
- **E-commerce Commission:** 2% of sales generated (optional)
- **Premium AI Features:** $49/month add-on for creators
- **Template Marketplace:** 30% revenue share with creators

---

**Need Help?** Check `/THREE_PIVOTS_IMPLEMENTATION.md` for full documentation.
