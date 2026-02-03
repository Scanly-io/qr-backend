# 🔍 Observability & Error Tracking Setup

**Last Updated:** January 29, 2026

## Overview

This guide covers setting up **Mixpanel** (analytics) and **Sentry** (error tracking) for comprehensive observability.

---

## 📊 Mixpanel Setup (Analytics & User Tracking)

### Pricing
- ✅ **FREE:** 10,000 monthly tracked users (MTU)
- ✅ Unlimited events
- ✅ 90-day data retention
- ✅ All core features
- **Perfect for MVP and early growth!**

### 1. Create Mixpanel Account

```bash
# Go to: https://mixpanel.com/register/
# Create account
# Create new project: "QR Code Platform Production"
# Copy your Project Token
```

### 2. Install Mixpanel SDK

**Backend Services:**
```bash
cd qr-backend
npm install mixpanel --workspace=services/analytics-service
npm install mixpanel --workspace=services/auth-service
npm install mixpanel --workspace=services/qr-service
npm install mixpanel --workspace=services/microsite-service
```

**Frontend:**
```bash
cd qr-frontend
npm install mixpanel-browser
```

### 3. Backend Configuration

**Create shared Mixpanel utility:**
```bash
# File: packages/common/src/mixpanel.ts
```

```typescript
// packages/common/src/mixpanel.ts
import Mixpanel from 'mixpanel';

let mixpanel: Mixpanel.Mixpanel | null = null;

export function initializeMixpanel(token?: string) {
  const mixpanelToken = token || process.env.MIXPANEL_TOKEN;
  
  if (!mixpanelToken) {
    console.warn('Mixpanel token not found. Analytics disabled.');
    return null;
  }
  
  if (!mixpanel) {
    mixpanel = Mixpanel.init(mixpanelToken, {
      debug: process.env.NODE_ENV !== 'production',
      protocol: 'https',
    });
    console.log('✅ Mixpanel initialized');
  }
  
  return mixpanel;
}

export function getMixpanel() {
  return mixpanel;
}

/**
 * Track an event
 */
export function trackEvent(
  eventName: string,
  userId: string,
  properties: Record<string, any> = {}
) {
  if (!mixpanel) return;
  
  try {
    mixpanel.track(eventName, {
      distinct_id: userId,
      time: Date.now(),
      ...properties,
    });
  } catch (error) {
    console.error('Mixpanel track error:', error);
  }
}

/**
 * Identify user with properties
 */
export function identifyUser(
  userId: string,
  properties: Record<string, any> = {}
) {
  if (!mixpanel) return;
  
  try {
    mixpanel.people.set(userId, {
      $last_seen: new Date().toISOString(),
      ...properties,
    });
  } catch (error) {
    console.error('Mixpanel identify error:', error);
  }
}

/**
 * Track revenue
 */
export function trackRevenue(
  userId: string,
  amount: number,
  properties: Record<string, any> = {}
) {
  if (!mixpanel) return;
  
  try {
    mixpanel.people.track_charge(userId, amount, properties);
    
    // Also track as event
    trackEvent('revenue', userId, {
      amount,
      currency: 'USD',
      ...properties,
    });
  } catch (error) {
    console.error('Mixpanel revenue tracking error:', error);
  }
}

export { mixpanel };
```

### 4. Frontend Configuration

```typescript
// qr-frontend/src/lib/mixpanel.ts
import mixpanel from 'mixpanel-browser';

// Initialize on app load
export function initMixpanel() {
  const token = import.meta.env.VITE_MIXPANEL_TOKEN;
  
  if (!token) {
    console.warn('Mixpanel token not found. Analytics disabled.');
    return;
  }
  
  mixpanel.init(token, {
    debug: import.meta.env.DEV,
    track_pageview: true,
    persistence: 'localStorage',
    ignore_dnt: false,
  });
  
  console.log('✅ Mixpanel initialized');
}

// Track page view
export function trackPageView(pageName: string, properties = {}) {
  mixpanel.track('page_viewed', {
    page: pageName,
    timestamp: new Date().toISOString(),
    ...properties,
  });
}

// Track event
export function trackEvent(eventName: string, properties = {}) {
  mixpanel.track(eventName, {
    timestamp: new Date().toISOString(),
    ...properties,
  });
}

// Identify user
export function identifyUser(userId: string, properties = {}) {
  mixpanel.identify(userId);
  mixpanel.people.set({
    $last_login: new Date().toISOString(),
    ...properties,
  });
}

// Reset on logout
export function resetMixpanel() {
  mixpanel.reset();
}

export { mixpanel };
```

### 5. Environment Variables

**Backend (.env):**
```bash
MIXPANEL_TOKEN=your_project_token_here
```

**Frontend (.env):**
```bash
VITE_MIXPANEL_TOKEN=your_project_token_here
```

---

## 🐛 Sentry Setup (Error Tracking & Performance Monitoring)

### Pricing
- ✅ **FREE:** 5,000 errors/month, 1 user
- ✅ **Developer:** $26/month (50K errors, unlimited users)
- **Recommended:** Start free, upgrade when needed

### 1. Create Sentry Account

```bash
# Go to: https://sentry.io/signup/
# Create account
# Create organization: "Your Company Name"
# Create projects:
#   - "qr-backend" (Node.js)
#   - "qr-frontend" (React)
# Copy DSN for each project
```

### 2. Install Sentry SDK

**Backend Services:**
```bash
cd qr-backend
npm install @sentry/node @sentry/profiling-node --workspace=packages/common
```

**Frontend:**
```bash
cd qr-frontend
npm install @sentry/react
```

### 3. Backend Configuration

**Create shared Sentry utility:**
```typescript
// packages/common/src/sentry.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export function initializeSentry(serviceName: string, dsn?: string) {
  const sentryDsn = dsn || process.env.SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('Sentry DSN not found. Error tracking disabled.');
    return;
  }
  
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    
    // Service identifier
    serverName: serviceName,
    
    // Set sample rate
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Enable performance monitoring
    integrations: [
      new ProfilingIntegration(),
    ],
    
    // Filter out health check noise
    beforeSend(event, hint) {
      // Ignore health check errors
      if (event.request?.url?.includes('/health')) {
        return null;
      }
      return event;
    },
    
    // Add context
    initialScope: {
      tags: {
        service: serviceName,
      },
    },
  });
  
  console.log(`✅ Sentry initialized for ${serviceName}`);
}

/**
 * Capture exception with context
 */
export function captureException(
  error: Error,
  context?: Record<string, any>
) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message (non-error logging)
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb (for debugging)
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    data,
    timestamp: Date.now() / 1000,
  });
}

export { Sentry };
```

### 4. Frontend Configuration

```typescript
// qr-frontend/src/lib/sentry.ts
import * as Sentry from '@sentry/react';
import { createBrowserRouter } from 'react-router-dom';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('Sentry DSN not found. Error tracking disabled.');
    return;
  }
  
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    // Session replay (optional, requires separate plan)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    integrations: [
      // React Router integration
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
      }),
      // Replay integration (optional)
      Sentry.replayIntegration(),
    ],
    
    // Filter noise
    beforeSend(event, hint) {
      // Don't send events in development
      if (import.meta.env.DEV) {
        console.log('Sentry event (dev mode):', event);
        return null;
      }
      return event;
    },
  });
  
  console.log('✅ Sentry initialized');
}

// Error boundary component
export const SentryErrorBoundary = Sentry.ErrorBoundary;

// Wrap router for automatic route tracking
export function createSentryRouter(routes: any) {
  return createBrowserRouter(routes, {
    future: {
      v7_startTransition: true,
    },
  });
}

export { Sentry };
```

### 5. Integration in Services

**Auth Service Example:**
```typescript
// services/auth-service/src/index.ts
import { buildServer } from '@qr/common';
import { initializeSentry, captureException, setUserContext } from '@qr/common';
import { initializeMixpanel, trackEvent } from '@qr/common';

async function start() {
  // Initialize observability
  initializeSentry('auth-service');
  initializeMixpanel();
  
  const app = buildServer();
  
  // Add Sentry request handler
  app.addHook('onRequest', async (request, reply) => {
    // Set request context for Sentry
    Sentry.setContext('request', {
      url: request.url,
      method: request.method,
      headers: request.headers,
    });
  });
  
  // Add error handler
  app.setErrorHandler((error, request, reply) => {
    // Log to Sentry
    captureException(error, {
      url: request.url,
      method: request.method,
      userId: (request as any).userId,
    });
    
    // Log to console
    request.log.error(error);
    
    // Return error response
    reply.status(500).send({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : error.message,
    });
  });
  
  // Signup endpoint example
  app.post('/auth/signup', async (request, reply) => {
    try {
      const { email, password } = request.body as any;
      
      // ... signup logic ...
      
      // Track in Mixpanel
      trackEvent('signup_completed', user.id, {
        email: user.email,
        signup_method: 'email',
        plan: 'free',
      });
      
      return reply.send({ user, token });
      
    } catch (error: any) {
      // Capture in Sentry
      captureException(error, {
        endpoint: '/auth/signup',
        email: request.body?.email,
      });
      
      throw error;
    }
  });
  
  await app.listen({ port: 3001, host: '0.0.0.0' });
  console.log('✅ Auth service running on port 3001');
}

start();
```

**Frontend App.tsx Example:**
```typescript
// qr-frontend/src/App.tsx
import { useEffect } from 'react';
import { initMixpanel, trackPageView } from './lib/mixpanel';
import { initSentry, SentryErrorBoundary } from './lib/sentry';

function App() {
  useEffect(() => {
    // Initialize observability on app load
    initSentry();
    initMixpanel();
  }, []);
  
  return (
    <SentryErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="error-page">
          <h1>Oops! Something went wrong</h1>
          <p>{error.message}</p>
          <button onClick={resetError}>Try again</button>
        </div>
      )}
    >
      <Router>
        {/* Your app routes */}
      </Router>
    </SentryErrorBoundary>
  );
}
```

### 6. Environment Variables

**Backend (.env):**
```bash
# Sentry
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production

# Mixpanel
MIXPANEL_TOKEN=your_mixpanel_token
```

**Frontend (.env):**
```bash
# Sentry
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Mixpanel
VITE_MIXPANEL_TOKEN=your_mixpanel_token
```

---

## 🎯 Usage Examples

### Track User Signup (Backend)

```typescript
// services/auth-service/src/routes/signup.ts
import { trackEvent, identifyUser } from '@qr/common';

export async function signupHandler(req, reply) {
  try {
    const user = await createUser(req.body);
    
    // Track signup event
    trackEvent('signup_completed', user.id, {
      email: user.email,
      signup_method: 'email',
      plan: 'free',
      source: req.headers.referer,
    });
    
    // Set user properties
    identifyUser(user.id, {
      $email: user.email,
      $name: user.name,
      $created: user.createdAt,
      plan: 'free',
      total_qrs_created: 0,
    });
    
    return reply.send({ user, token });
  } catch (error) {
    captureException(error, { email: req.body.email });
    throw error;
  }
}
```

### Track QR Scan (Backend)

```typescript
// services/routing-service/src/index.ts
import { trackEvent } from '@qr/common';
import { addBreadcrumb } from '@qr/common';

app.get('/scan/:qrId', async (req, reply) => {
  const { qrId } = req.params;
  
  addBreadcrumb('QR scan started', { qrId });
  
  try {
    const qr = await getQRCode(qrId);
    
    // Track scan
    trackEvent('qr_scanned', qrId, {
      qr_id: qrId,
      qr_owner_id: qr.userId,
      device_type: getDeviceType(req.headers['user-agent']),
      country: getCountry(req.ip),
      browser: getBrowser(req.headers['user-agent']),
      scan_time: new Date().toISOString(),
    });
    
    return reply.redirect(qr.destinationUrl);
  } catch (error) {
    captureException(error, {
      qrId,
      userAgent: req.headers['user-agent'],
    });
    throw error;
  }
});
```

### Track Frontend Events

```typescript
// qr-frontend/src/components/qr/CreateQRForm.tsx
import { trackEvent } from '../../lib/mixpanel';
import { Sentry } from '../../lib/sentry';

export function CreateQRForm() {
  const handleSubmit = async (data: QRFormData) => {
    try {
      Sentry.addBreadcrumb({
        message: 'Creating QR code',
        data: { type: data.type },
      });
      
      const response = await api.post('/qr/generate', data);
      
      // Track success
      trackEvent('qr_created', {
        qr_id: response.id,
        qr_type: data.type,
        has_custom_logo: !!data.logo,
        is_first_qr: userStats.total_qrs_created === 0,
      });
      
      navigate(`/qr/${response.id}`);
      
    } catch (error) {
      // Capture error
      Sentry.captureException(error, {
        extra: {
          formData: data,
          userId: currentUser.id,
        },
      });
      
      toast.error('Failed to create QR code');
    }
  };
  
  return (
    // ... form JSX
  );
}
```

---

## 📈 Monitoring Dashboards

### Sentry Dashboard
- **Issues:** See all errors grouped by type
- **Performance:** Monitor API response times
- **Releases:** Track errors per deployment
- **Alerts:** Email/Slack when errors spike

### Mixpanel Dashboard
- **Insights:** Query events, create charts
- **Funnels:** Visualize conversion funnels
- **Retention:** Track user retention over time
- **Cohorts:** Group users by behavior

---

## 🚨 Alerts Setup

### Sentry Alerts

1. Go to Settings → Alerts
2. Create alert rules:
   - **Error spike:** >100 errors in 1 hour
   - **New issue:** Any new error type
   - **Slow transactions:** API >5s response time

### Mixpanel Alerts

1. Go to Insights → Create Alert
2. Alert conditions:
   - **Signup drop:** <10 signups/day
   - **Scan spike:** >1000 scans/hour (good!)
   - **Conversion drop:** Conversion rate <5%

---

## 🔒 Privacy & GDPR Compliance

### PII Handling

**Mixpanel:**
```typescript
// Hash email before sending
import crypto from 'crypto';

const hashEmail = (email: string) => {
  return crypto.createHash('sha256').update(email).digest('hex');
};

trackEvent('signup_completed', userId, {
  email_hash: hashEmail(user.email), // ✅ Hashed
  // email: user.email, // ❌ Don't send raw email
});
```

**Sentry:**
```typescript
// Scrub sensitive data
Sentry.init({
  beforeSend(event) {
    // Remove passwords from request body
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.creditCard;
    }
    return event;
  },
});
```

---

## 💰 Cost Estimates

### Free Tier (First 6-12 months)
- **Mixpanel:** FREE (up to 10K MTU)
- **Sentry:** FREE (up to 5K errors/month)
- **Total:** $0/month

### Growth Stage (10K-50K users)
- **Mixpanel:** ~$100-300/month
- **Sentry:** ~$26-100/month
- **Total:** ~$126-400/month

### Scale (100K+ users)
- **Mixpanel:** ~$500-1000/month
- **Sentry:** ~$200-500/month
- **Total:** ~$700-1500/month

**ROI:** These tools pay for themselves by:
- Reducing bug resolution time (50% faster)
- Increasing conversion rates (10-20% improvement)
- Preventing churn (identify issues before users leave)

---

## ✅ Implementation Checklist

- [ ] Create Mixpanel account
- [ ] Create Sentry account (backend + frontend projects)
- [ ] Install SDKs in backend services
- [ ] Install SDKs in frontend
- [ ] Add Mixpanel utility to `@qr/common`
- [ ] Add Sentry utility to `@qr/common`
- [ ] Update environment variables
- [ ] Initialize in each service
- [ ] Add error boundaries in React
- [ ] Test events in Mixpanel
- [ ] Test errors in Sentry
- [ ] Set up alerts
- [ ] Create dashboards
- [ ] Document events (MIXPANEL_EVENTS_TRACKING.md)

---

## 🎓 Best Practices

1. **Always track both success and failure**
   ```typescript
   try {
     const result = await createQR();
     trackEvent('qr_created', userId, { qr_id: result.id });
   } catch (error) {
     captureException(error);
     trackEvent('qr_creation_failed', userId, { error: error.message });
   }
   ```

2. **Add context to errors**
   ```typescript
   captureException(error, {
     userId,
     qrId,
     action: 'publish_microsite',
     timestamp: new Date().toISOString(),
   });
   ```

3. **Use breadcrumbs for debugging**
   ```typescript
   addBreadcrumb('Fetching QR data');
   const qr = await getQR(id);
   
   addBreadcrumb('Validating QR data');
   validateQR(qr);
   
   addBreadcrumb('Publishing microsite');
   await publish(qr);
   ```

4. **Track user journey**
   ```typescript
   // Login
   identifyUser(userId, { email, plan });
   
   // Activity
   trackEvent('dashboard_viewed', userId);
   trackEvent('qr_created', userId);
   
   // Logout
   resetMixpanel(); // Clear user data
   ```

---

## 📚 Resources

- **Mixpanel Docs:** https://docs.mixpanel.com/
- **Sentry Docs:** https://docs.sentry.io/
- **Mixpanel Best Practices:** https://mixpanel.com/blog/
- **Sentry Best Practices:** https://blog.sentry.io/

---

## Support

For questions or issues:
- **Mixpanel:** support@mixpanel.com
- **Sentry:** support@sentry.io
- **Internal:** Check #engineering Slack channel
