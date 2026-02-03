# 🚀 Quick Start: Mixpanel & Sentry Setup

## Summary

✅ **Both tools have FREE tiers** - perfect for your MVP!

### Mixpanel (Analytics) - FREE Tier
- 10,000 monthly tracked users
- Unlimited events
- 90-day data retention
- All core features (funnels, cohorts, retention)

### Sentry (Error Tracking) - FREE Tier
- 5,000 errors/month
- 1 user account
- Full error tracking + performance monitoring

---

## Setup Steps

### 1. Create Accounts

**Mixpanel:**
```bash
# Visit: https://mixpanel.com/register/
# Create project: "QR Code Platform Production"
# Copy your Project Token
```

**Sentry:**
```bash
# Visit: https://sentry.io/signup/
# Create organization
# Create 2 projects:
#   1. "qr-backend" (Node.js)
#   2. "qr-frontend" (React)
# Copy both DSNs
```

---

### 2. Install Packages

**Backend:**
```bash
cd qr-backend
npm install mixpanel @sentry/node @sentry/profiling-node --save --workspace=packages/common
```

**Frontend:**
```bash
cd qr-frontend
npm install mixpanel-browser @sentry/react
```

---

### 3. Add Environment Variables

**Backend (.env):**
```bash
# Mixpanel
MIXPANEL_TOKEN=your_mixpanel_project_token

# Sentry
SENTRY_DSN=https://xxx@sentry.io/123456
```

**Frontend (.env):**
```bash
# Mixpanel
VITE_MIXPANEL_TOKEN=your_mixpanel_project_token

# Sentry
VITE_SENTRY_DSN=https://xxx@sentry.io/789012
```

---

### 4. Initialize in Services

**Backend (each service):**
```typescript
// services/auth-service/src/index.ts
import { buildServer, initializeSentry, initializeMixpanel } from '@qr/common';

async function start() {
  // Initialize observability FIRST
  initializeSentry('auth-service');
  initializeMixpanel();
  
  const app = buildServer();
  
  // ... rest of your service setup
}
```

**Frontend:**
```typescript
// qr-frontend/src/main.tsx or App.tsx
import { initSentry } from './lib/sentry';
import { initMixpanel } from './lib/mixpanel';

// Initialize on app load
initSentry();
initMixpanel();
```

---

### 5. Track Events

**Backend Example:**
```typescript
import { trackEvent, identifyUser, captureException } from '@qr/common';

// Track QR creation
trackEvent('qr_created', userId, {
  qr_id: qr.id,
  qr_type: qr.type,
  has_logo: !!qr.logo,
});

// Track errors
try {
  await createQR(data);
} catch (error) {
  captureException(error, { userId, data });
  throw error;
}
```

**Frontend Example:**
```typescript
import { trackEvent } from './lib/mixpanel';
import { Sentry } from './lib/sentry';

// Track page view
trackEvent('page_viewed', { page: 'dashboard' });

// Track errors
try {
  await api.createQR(data);
} catch (error) {
  Sentry.captureException(error, {
    extra: { formData: data },
  });
}
```

---

## Priority Events to Track

### 🎯 Top 5 Conversion Events
1. **`subscription_started`** - User upgrades (REVENUE!)
2. **`qr_scanned`** - Core product usage
3. **`payment_completed`** - E-commerce transactions
4. **`microsite_published`** - User activation
5. **`custom_domain_verified`** - Premium feature adoption

### 📊 Key Funnels
1. **Onboarding:** signup → verify → create QR → publish → scan
2. **Free-to-Paid:** signup → feature limit → upgrade → subscribe
3. **E-commerce:** scan → view → add to cart → checkout → payment

---

## Files Created

### Backend
- ✅ `/packages/common/src/mixpanel.ts` - Mixpanel utility
- ✅ `/packages/common/src/sentry.ts` - Sentry utility
- ✅ Updated `/packages/common/src/index.ts` - Exports

### Frontend
- ⏳ `/src/lib/mixpanel.ts` - To create
- ⏳ `/src/lib/sentry.ts` - To create

### Documentation
- ✅ `/OBSERVABILITY_SETUP.md` - Complete guide
- ✅ `/MIXPANEL_EVENTS_TRACKING.md` - 47 events documented

---

## Testing

**Test Mixpanel:**
```bash
# Trigger an event
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Check Mixpanel dashboard for "signup_completed" event
```

**Test Sentry:**
```bash
# Trigger an error
curl http://localhost:3001/auth/nonexistent-endpoint

# Check Sentry dashboard for error
```

---

## Dashboards to Create

### Mixpanel Dashboards
1. **Product Metrics**
   - Total QR codes created
   - Total scans
   - Active users (DAU/MAU)

2. **Conversion Funnels**
   - Signup → Activation
   - Free → Paid
   - Microsite → Payment

3. **Retention**
   - Day 1, 7, 30 retention
   - Cohort analysis

### Sentry Dashboards
1. **Error Overview**
   - Error rate by service
   - Top errors
   - Error trends

2. **Performance**
   - API response times
   - Slow endpoints
   - Database query time

---

## Cost Estimate

### Current (0-10K users)
- Mixpanel: **$0/month** (free tier)
- Sentry: **$0/month** (free tier)
- **Total: $0/month**

### Growth (10K-50K users)
- Mixpanel: ~$100-300/month
- Sentry: ~$26-100/month
- **Total: ~$126-400/month**

### Scale (100K+ users)
- Mixpanel: ~$500-1000/month
- Sentry: ~$200-500/month
- **Total: ~$700-1500/month**

**ROI:** These tools pay for themselves by reducing support costs, increasing conversion rates, and preventing churn.

---

## Next Steps

1. ✅ Install packages (`npm install`)
2. ✅ Add environment variables
3. ✅ Initialize in services
4. ✅ Test with sample events
5. ✅ Create dashboards
6. ✅ Set up alerts
7. ✅ Track core conversion events

---

## Support

- **Mixpanel Docs:** https://docs.mixpanel.com/
- **Sentry Docs:** https://docs.sentry.io/
- **Internal:** See `/OBSERVABILITY_SETUP.md` for detailed guide
- **Events:** See `/MIXPANEL_EVENTS_TRACKING.md` for all 47 events
