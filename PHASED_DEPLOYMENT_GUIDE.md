# 🚀 Phased Deployment Guide - $0 to Scale

**Deploy your 19-microservice architecture in phases to save costs and validate features**

---

## 📋 **Overview: 3-Phase Deployment**

```
Phase 1 (Week 1-2):  Core MVP - 6 services - $0/month - Validate idea
Phase 2 (Week 3-4):  Enhanced - 10 services - $50/month - Prove demand  
Phase 3 (Week 5-8):  Full - 19 services - $150/month - Scale up
```

---

## 🎯 **Phase 1: Core MVP (6 Services) - $0/month**

### **Services to Deploy:**

```yaml
# docker-compose.minimal.yml
version: '3.8'

services:
  # Infrastructure
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_MULTIPLE_DATABASES: auth_service,qr_service,microsite_service,qr_analytics,routing_db
    volumes:
      - ./scripts/init-multiple-dbs.sh:/docker-entrypoint-initdb.d/init-multiple-dbs.sh
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Gateway
  tenant-gateway:
    build: ./services/tenant-gateway
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  # Core Services (Phase 1)
  auth-service:
    build: ./services/auth-service
    ports:
      - "3010:3010"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/auth_service
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis

  qr-service:
    build: ./services/qr-service
    ports:
      - "3011:3011"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/qr_service
      - CLOUDFLARE_R2_ENDPOINT=${CLOUDFLARE_R2_ENDPOINT}
      - CLOUDFLARE_R2_ACCESS_KEY=${CLOUDFLARE_R2_ACCESS_KEY}
      - CLOUDFLARE_R2_SECRET_KEY=${CLOUDFLARE_R2_SECRET_KEY}
    depends_on:
      - postgres

  microsite-service:
    build: ./services/microsite-service
    ports:
      - "3013:3013"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/microsite_service
    depends_on:
      - postgres

  routing-service:
    build: ./services/routing-service
    ports:
      - "3021:3021"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/routing_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  analytics-service:
    build: ./services/analytics-service
    ports:
      - "3012:3012"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/qr_analytics
      - MIXPANEL_TOKEN=${MIXPANEL_TOKEN}
    depends_on:
      - postgres
```

### **Free Hosting Options:**

**Option A: Railway.app (Recommended)**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up

# Cost: $0 (free tier: $5 credit/month)
# Limits: 500MB RAM per service, shared CPU
```

**Option B: Fly.io**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy each service
flyctl launch --dockerfile ./services/auth-service/Dockerfile

# Cost: $0 (free tier: 3 shared-cpu VMs)
```

**Option C: Single DigitalOcean Droplet**
```bash
# $6/month (1GB RAM)
# Docker Compose on one server
# All 6 services in one droplet
```

### **Features Available in Phase 1:**

```typescript
// Phase 1 features - what users will see
export const PHASE_1_FEATURES = {
  // ✅ AVAILABLE
  authentication: true,
  qrGeneration: true,
  qrCustomization: true,
  bioLinkPages: true,
  socialLinks: true,
  basicAnalytics: true,
  qrScanning: true,
  
  // 🚫 HIDDEN (not deployed yet)
  aiGeneration: false,
  customDomains: false,
  emailCampaigns: false,
  integrations: false,
  abTesting: false,
  printStudio: false,
  workflows: false,
  advancedAnalytics: false,
};
```

### **Frontend Feature Flags:**

```typescript
// frontend/src/config/features.ts
export const FEATURES = {
  // Phase 1 - Core Features
  QR_GENERATION: import.meta.env.VITE_FEATURE_QR_GENERATION === 'true',
  BIO_LINKS: import.meta.env.VITE_FEATURE_BIO_LINKS === 'true',
  BASIC_ANALYTICS: import.meta.env.VITE_FEATURE_BASIC_ANALYTICS === 'true',
  
  // Phase 2 - Enhanced Features
  CUSTOM_DOMAINS: import.meta.env.VITE_FEATURE_CUSTOM_DOMAINS === 'true',
  EMAIL_NOTIFICATIONS: import.meta.env.VITE_FEATURE_EMAIL === 'true',
  TRACKING_PIXELS: import.meta.env.VITE_FEATURE_PIXELS === 'true',
  
  // Phase 3 - Advanced Features
  AI_GENERATION: import.meta.env.VITE_FEATURE_AI === 'true',
  INTEGRATIONS: import.meta.env.VITE_FEATURE_INTEGRATIONS === 'true',
  AB_TESTING: import.meta.env.VITE_FEATURE_AB_TESTING === 'true',
  PRINT_STUDIO: import.meta.env.VITE_FEATURE_PRINT === 'true',
  WORKFLOWS: import.meta.env.VITE_FEATURE_WORKFLOWS === 'true',
};

// Usage in components
import { FEATURES } from '@/config/features';

function Dashboard() {
  return (
    <div>
      {/* Always show */}
      <QRGeneratorCard />
      <BioLinkEditor />
      
      {/* Conditionally show based on deployment */}
      {FEATURES.AI_GENERATION && <AIGeneratorCard />}
      {FEATURES.CUSTOM_DOMAINS && <DomainSettings />}
      {FEATURES.INTEGRATIONS && <IntegrationsList />}
      
      {/* Show "Coming Soon" for future features */}
      {!FEATURES.AI_GENERATION && (
        <ComingSoonCard 
          title="AI-Powered Design" 
          description="Generate beautiful pages with AI"
          launchDate="Week 5"
        />
      )}
    </div>
  );
}
```

### **Environment Variables (Phase 1):**

```bash
# .env.phase1
# Auth
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Database (Local Docker)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432

# Redis (Local Docker)
REDIS_URL=redis://localhost:6379

# Cloudflare R2 (Free tier: 10GB)
CLOUDFLARE_R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY=your-access-key
CLOUDFLARE_R2_SECRET_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET=qr-codes

# Observability (Free tiers)
MIXPANEL_TOKEN=your-mixpanel-token
SENTRY_DSN=your-sentry-dsn

# Frontend Feature Flags
VITE_FEATURE_QR_GENERATION=true
VITE_FEATURE_BIO_LINKS=true
VITE_FEATURE_BASIC_ANALYTICS=true
VITE_FEATURE_CUSTOM_DOMAINS=false
VITE_FEATURE_EMAIL=false
VITE_FEATURE_AI=false
VITE_FEATURE_INTEGRATIONS=false
VITE_FEATURE_AB_TESTING=false
VITE_FEATURE_PRINT=false
VITE_FEATURE_WORKFLOWS=false

# API URLs
VITE_API_URL=http://localhost:3000
VITE_AUTH_SERVICE_URL=http://localhost:3010
VITE_QR_SERVICE_URL=http://localhost:3011
```

---

## 🎯 **Phase 2: Enhanced Features (10 Services) - $50/month**

### **When to Deploy Phase 2:**
- ✅ 50+ active users in Phase 1
- ✅ Users requesting custom domains
- ✅ Ready to charge for premium features
- ✅ Some revenue to cover hosting

### **Additional Services to Deploy:**

```yaml
# docker-compose.enhanced.yml (extends minimal.yml)
services:
  # Add Kafka for async communication
  redpanda:
    image: docker.redpanda.com/vectorized/redpanda:v24.2.5
    ports:
      - "9092:9092"
    command:
      - redpanda
      - start
      - --overprovisioned
      - --smp 1

  # Phase 2 Services
  email-service:
    build: ./services/email-service
    ports:
      - "3014:3014"
    environment:
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - KAFKA_BROKERS=redpanda:9092
    depends_on:
      - redpanda

  domains-service:
    build: ./services/domains-service
    ports:
      - "3020:3020"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/domains_db
      - CLOUDFLARE_API_KEY=${CLOUDFLARE_API_KEY}
    depends_on:
      - postgres

  pixels-service:
    build: ./services/pixels-service
    ports:
      - "3025:3025"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/pixels_db
    depends_on:
      - postgres

  insights-service:
    build: ./services/insights-service
    ports:
      - "3017:3017"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/qr_analytics
      - KAFKA_BROKERS=redpanda:9092
    depends_on:
      - postgres
      - redpanda
```

### **Enable Phase 2 Features:**

```bash
# Update .env
VITE_FEATURE_CUSTOM_DOMAINS=true
VITE_FEATURE_EMAIL=true
VITE_FEATURE_PIXELS=true
VITE_FEATURE_ADVANCED_ANALYTICS=true
```

### **Hosting Cost Breakdown:**

```
DigitalOcean Droplet (4GB RAM)      $24/month
Managed PostgreSQL (Basic)          $15/month
Cloudflare R2 (50GB)                 $5/month
SendGrid (10K emails)                $0/month (free)
Domain (.io)                         $10/month
─────────────────────────────────────────────
Total:                               ~$54/month
```

---

## 🎯 **Phase 3: Full Platform (19 Services) - $150-200/month**

### **When to Deploy Phase 3:**
- ✅ 500+ active users
- ✅ Generating $500+/month revenue
- ✅ Users requesting AI features, integrations
- ✅ Ready to scale

### **Additional Services:**

```yaml
# docker-compose.full.yml (all 19 services)
services:
  ml-service:
    build: ./services/ml-service
    ports:
      - "3016:3016"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - KAFKA_BROKERS=redpanda:9092

  integrations-service:
    build: ./services/integrations-service
    ports:
      - "3023:3023"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/integrations_db

  experiments-service:
    build: ./services/experiments-service
    ports:
      - "3022:3022"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/experiments_db

  workflow-builder:
    build: ./services/workflow-builder
    ports:
      - "3029:3029"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/workflow_db

  print-studio:
    build: ./services/print-studio
    ports:
      - "3028:3028"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/print_studio_db

  creator-service:
    build: ./services/creator-service
    ports:
      - "3026:3026"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/creator_db

  asset-service:
    build: ./services/asset-service
    ports:
      - "3027:3027"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/asset_db

  media-service:
    build: ./services/media-service
    ports:
      - "3024:3024"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/asset_db
      - CLOUDFLARE_R2_ENDPOINT=${CLOUDFLARE_R2_ENDPOINT}

  dlq-processor:
    build: ./services/dlq-processor
    environment:
      - KAFKA_BROKERS=redpanda:9092
    depends_on:
      - redpanda

  notification-service:
    build: ./services/notification-service
    ports:
      - "3015:3015"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/notifications_db
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
```

### **Enable All Features:**

```bash
# Update .env
VITE_FEATURE_AI=true
VITE_FEATURE_INTEGRATIONS=true
VITE_FEATURE_AB_TESTING=true
VITE_FEATURE_PRINT=true
VITE_FEATURE_WORKFLOWS=true
```

---

## 📋 **Deployment Checklist**

### **Phase 1 Deployment (Week 1):**

```bash
✅ Day 1-2: Setup & Infrastructure
□ Sign up for Railway.app or Fly.io
□ Create PostgreSQL database
□ Setup Redis instance
□ Get Cloudflare R2 credentials
□ Get Mixpanel API key (free)
□ Get Sentry DSN (free)

✅ Day 3-4: Deploy Services
□ Deploy tenant-gateway
□ Deploy auth-service
□ Deploy qr-service
□ Deploy microsite-service
□ Deploy routing-service
□ Deploy analytics-service

✅ Day 5: Frontend & Testing
□ Deploy frontend to Vercel
□ Update environment variables
□ Test user signup/login
□ Test QR code generation
□ Test bio link page creation
□ Test QR scanning
□ Test analytics tracking

✅ Day 6-7: Beta Testing
□ Invite 10-20 beta users
□ Collect feedback
□ Fix critical bugs
□ Monitor error rates (Sentry)
□ Monitor usage (Mixpanel)
```

### **Phase 2 Deployment (Week 3-4):**

```bash
✅ Prerequisites
□ Have 50+ active users
□ Monthly revenue: $100+
□ User requests for custom domains/emails

✅ Infrastructure
□ Upgrade to DigitalOcean ($24/month droplet)
□ Setup managed PostgreSQL ($15/month)
□ Deploy Redpanda (Kafka)
□ Get SendGrid API key
□ Get Cloudflare API key

✅ Deploy Services
□ Deploy email-service
□ Deploy domains-service
□ Deploy pixels-service
□ Deploy insights-service

✅ Update Frontend
□ Enable Phase 2 feature flags
□ Deploy updated frontend
□ Announce new features
```

### **Phase 3 Deployment (Week 5-8):**

```bash
✅ Prerequisites
□ Have 500+ active users
□ Monthly revenue: $500+
□ Users requesting AI/integrations

✅ Infrastructure
□ Upgrade to 8GB RAM droplet ($48/month)
□ Add managed Kafka ($50/month) OR stick with Redpanda
□ Get OpenAI API key

✅ Deploy Remaining Services
□ Deploy ml-service
□ Deploy integrations-service
□ Deploy experiments-service
□ Deploy workflow-builder
□ Deploy print-studio
□ Deploy creator-service
□ Deploy asset-service
□ Deploy media-service
□ Deploy dlq-processor
□ Deploy notification-service

✅ Update Frontend
□ Enable all feature flags
□ Deploy final frontend
□ Marketing push for new features
```

---

## 🎨 **Frontend Components for Feature Gating**

### **ComingSoon Card Component:**

```tsx
// components/ComingSoonCard.tsx
interface ComingSoonCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  launchDate?: string;
  onNotifyMe?: () => void;
}

export function ComingSoonCard({
  title,
  description,
  icon,
  launchDate,
  onNotifyMe
}: ComingSoonCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 opacity-60">
      {/* Coming Soon Badge */}
      <div className="absolute right-4 top-4">
        <Badge variant="secondary">Coming Soon</Badge>
      </div>
      
      {/* Icon */}
      <div className="mb-4 text-gray-400">
        {icon}
      </div>
      
      {/* Content */}
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mb-4 text-sm text-gray-600">{description}</p>
      
      {/* Launch Date */}
      {launchDate && (
        <p className="mb-4 text-xs font-medium text-purple-600">
          🚀 Launching {launchDate}
        </p>
      )}
      
      {/* Notify Me Button */}
      {onNotifyMe && (
        <Button
          variant="outline"
          size="sm"
          onClick={onNotifyMe}
          className="w-full"
        >
          <Bell className="mr-2 h-4 w-4" />
          Notify Me When Available
        </Button>
      )}
    </div>
  );
}
```

### **Feature Gate Hook:**

```tsx
// hooks/useFeature.ts
import { FEATURES } from '@/config/features';

export function useFeature(featureName: keyof typeof FEATURES) {
  const isEnabled = FEATURES[featureName];
  
  const requestFeature = async () => {
    // Track feature request
    await trackEvent('feature_requested', {
      feature: featureName,
      userId: user?.id,
      timestamp: new Date()
    });
    
    // Show toast
    toast.success('Thanks! We\'ll notify you when this feature launches.');
    
    // Store in backend
    await api.post('/api/feature-requests', {
      feature: featureName
    });
  };
  
  return {
    isEnabled,
    requestFeature
  };
}

// Usage
function Dashboard() {
  const aiFeature = useFeature('AI_GENERATION');
  
  return (
    <div>
      {aiFeature.isEnabled ? (
        <AIGeneratorCard />
      ) : (
        <ComingSoonCard
          title="AI-Powered Design"
          description="Generate beautiful pages with AI"
          icon={<Sparkles />}
          launchDate="Week 5"
          onNotifyMe={aiFeature.requestFeature}
        />
      )}
    </div>
  );
}
```

---

## 📊 **Monitoring Feature Requests**

```typescript
// backend: Track what users want
app.post('/api/feature-requests', async (req, res) => {
  const { feature } = req.body;
  
  await db.featureRequest.create({
    userId: req.user.id,
    feature,
    requestedAt: new Date()
  });
  
  // Track in Mixpanel
  mixpanel.track('Feature Requested', {
    distinct_id: req.user.id,
    feature,
    userPlan: req.user.plan
  });
  
  res.json({ success: true });
});

// Dashboard to see top requested features
app.get('/admin/feature-requests', async (req, res) => {
  const topFeatures = await db.featureRequest.groupBy({
    by: ['feature'],
    _count: true,
    orderBy: {
      _count: {
        feature: 'desc'
      }
    }
  });
  
  res.json(topFeatures);
  /*
  [
    { feature: 'AI_GENERATION', count: 47 },
    { feature: 'CUSTOM_DOMAINS', count: 32 },
    { feature: 'INTEGRATIONS', count: 28 },
    ...
  ]
  */
});
```

---

## 🚀 **Quick Start Commands**

### **Deploy Phase 1 (Local Development):**

```bash
# Clone repo
git clone https://github.com/Scanly-io/qr-backend.git
cd qr-backend

# Setup environment
cp .env.example .env.phase1
# Edit .env.phase1 with your values

# Start Phase 1 services
docker-compose -f docker-compose.minimal.yml up -d

# Check logs
docker-compose -f docker-compose.minimal.yml logs -f

# Frontend (separate terminal)
cd ../qr-frontend
cp .env.example .env.phase1
npm install
npm run dev
```

### **Deploy Phase 1 (Railway.app):**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy
railway up

# Add environment variables
railway variables set JWT_SECRET=your-secret-key

# View logs
railway logs
```

### **Deploy Phase 2:**

```bash
# Switch to enhanced compose file
docker-compose -f docker-compose.enhanced.yml up -d

# Or on Railway
railway up --service email-service
railway up --service domains-service
railway up --service pixels-service
railway up --service insights-service
```

### **Deploy Phase 3:**

```bash
# Deploy all services
docker-compose -f docker-compose.full.yml up -d

# Or deploy to production (DigitalOcean)
# See PRODUCTION_DEPLOYMENT_GUIDE.md
```

---

## 💡 **Cost Summary**

| Phase | Services | Users | Cost/Month | Features |
|-------|----------|-------|------------|----------|
| **Phase 1** | 6 | 0-100 | $0-20 | Core MVP |
| **Phase 2** | 10 | 100-500 | $50-100 | Enhanced |
| **Phase 3** | 19 | 500-5000 | $150-300 | Full platform |

---

## ✅ **Success Criteria**

### **Phase 1 → Phase 2:**
- ✅ 50+ active users
- ✅ 10+ paying users
- ✅ $100+ MRR
- ✅ Users requesting custom domains

### **Phase 2 → Phase 3:**
- ✅ 500+ active users
- ✅ 50+ paying users
- ✅ $500+ MRR
- ✅ Users requesting AI features

---

## 🎯 **Next Steps**

1. **This Week:** Deploy Phase 1 (6 services, $0 cost)
2. **Week 2:** Get 50 beta users, collect feedback
3. **Week 3:** If validated, deploy Phase 2
4. **Week 4:** Launch publicly, start marketing
5. **Week 5-8:** Scale to Phase 3 based on demand

**Start with Phase 1 today - you can validate your idea for $0!** 🚀
