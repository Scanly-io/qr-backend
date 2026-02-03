# QR Code Scan Tracking & Direct Link Access

## Problem Statement

When a microsite can be accessed via:
1. **QR Code Scan**: User scans QR → opens microsite
2. **Direct Link**: User clicks shared link → opens microsite

**We need to distinguish between these two access methods for accurate analytics.**

---

## Solution Architecture

### 🎯 Two-Step Tracking Flow

```
┌─────────────────────────────────────────────────────────────┐
│  QR CODE SCAN FLOW (via scan tracking endpoint)            │
└─────────────────────────────────────────────────────────────┘

1. QR Code Image encodes: https://qr.example.com/scan/abc123
   ↓
2. User scans QR → Camera opens URL
   ↓
3. QR Service /scan/:qrId endpoint:
   - Tracks qr.scanned event → Kafka → Analytics
   - Records: IP, User-Agent, device, timestamp
   - Redirects (302) to microsite URL
   ↓
4. Microsite loads: https://microsites.example.com/abc123
   ↓
5. Microsite Service tracks microsite.viewed event → Kafka → Analytics

RESULT: 
✅ qr.scanned event (1 count)
✅ microsite.viewed event (1 count)


┌─────────────────────────────────────────────────────────────┐
│  DIRECT LINK ACCESS FLOW (bypasses scan tracking)          │
└─────────────────────────────────────────────────────────────┘

1. User receives shared link: https://microsites.example.com/abc123
   ↓
2. User clicks link → Browser opens microsite directly
   ↓
3. Microsite Service tracks microsite.viewed event → Kafka → Analytics

RESULT:
❌ qr.scanned event (0 count) - never tracked
✅ microsite.viewed event (1 count)
```

---

## Implementation Details

### 1. QR Service - Scan Tracking Endpoint

**File**: `/services/qr-service/src/routes/qr.ts`

```typescript
/**
 * GET /scan/:qrId
 * 
 * QR code scan tracking endpoint that:
 * 1. Records a qr.scanned event to Kafka
 * 2. Redirects user to the target URL (microsite)
 */
app.get("/scan/:qrId", async (req, res) => {
  const { qrId } = req.params;
  
  // Get QR from database
  const qr = await db.select().from(qrs).where(eq(qrs.qrId, qrId));
  
  // Track scan event
  await producer.send({
    topic: "analytics.events",
    messages: [{
      value: JSON.stringify({
        eventType: "qr.scanned",
        qrId,
        timestamp: new Date().toISOString(),
        metadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
      }),
    }],
  });
  
  // Redirect to microsite
  res.redirect(302, qr.targetUrl);
});
```

### 2. Microsite Service - View Tracking

**File**: `/services/microsite-service/src/routes/render.ts`

```typescript
// Already implemented - tracks ALL microsite views
await producer.send({
  topic: "analytics.events",
  messages: [{
    value: JSON.stringify({
      eventType: "microsite.viewed",
      qrId,
      timestamp: new Date().toISOString(),
      metadata: {
        ip,
        userAgent,
        deviceType,
        os,
        browser,
        country,
        city,
      },
    }),
  }],
});
```

### 3. Analytics Service - Funnel Calculation

**File**: `/services/analytics-service/src/routes/analytics.ts`

```typescript
/**
 * GET /analytics/:qrId/funnel
 * 
 * Returns conversion funnel:
 * - scans: QR scans only (from /scan/:qrId)
 * - views: All microsite views (scans + direct links)
 * - clicks: Button clicks
 * - leads: Form submissions
 */
app.get("/analytics/:qrId/funnel", async (req, reply) => {
  const scans = await countEvents(qrId, 'qr.scanned');
  const views = await countEvents(qrId, 'microsite.viewed');
  const clicks = await countEvents(qrId, 'button.clicked');
  const leads = await countEvents(qrId, 'lead.captured');
  
  // viewRate can be >100% if microsite is shared!
  const viewRate = scans > 0 ? (views / scans) * 100 : 0;
  
  return { scans, views, clicks, leads, viewRate };
});
```

---

## Analytics Interpretation

### 📊 Funnel Metrics

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **Scans** | Count of `qr.scanned` events | Number of times QR code was physically scanned |
| **Views** | Count of `microsite.viewed` events | Total microsite visits (scans + direct links) |
| **View Rate** | `(views / scans) × 100` | **Can exceed 100%** if people share the link! |
| **Clicks** | Count of `button.clicked` events | CTA button engagements |
| **Leads** | Count of `lead.captured` events | Form submissions |

### 🎯 Real-World Scenarios

#### Scenario 1: Pure QR Code Campaign
```
Scans:  1,000 (QR codes scanned)
Views:  950 (95% view rate - 5% dropped before page loaded)
Clicks: 400 (42% of viewers clicked CTA)
Leads:  50 (5.3% conversion rate)
```
**Interpretation**: Standard QR campaign, slight dropoff during redirect.

#### Scenario 2: Viral Sharing
```
Scans:  1,000 (QR codes scanned)
Views:  3,500 (350% view rate - microsite went viral!)
Clicks: 1,400 (40% click rate)
Leads:  175 (5% conversion rate)
```
**Interpretation**: People scanned QR, loved it, and shared the direct link. **GREAT SUCCESS!** 🎉

#### Scenario 3: Direct Link Only
```
Scans:  0 (no QR scans)
Views:  2,000 (all from direct links/social media)
Clicks: 800 (40% click rate)
Leads:  100 (5% conversion rate)
```
**Interpretation**: QR code wasn't used, but microsite URL was shared directly.

---

## Frontend Display

### Dashboard Changes

**File**: `/src/pages/AnalyticsDashboardPage.tsx`

```tsx
{/* Conversion Funnel with Direct Link Warning */}
{funnel && (
  <div>
    <div className="flex items-center justify-between">
      <h2>Conversion Funnel</h2>
      {funnel.views > funnel.scans && (
        <span className="text-amber-400">
          Views exceed scans (microsite shared via direct link)
        </span>
      )}
    </div>
    
    <FunnelStage label="Scans" value={funnel.scans} />
    <FunnelStage label="Views" value={funnel.views} rate={funnel.viewRate} />
    <FunnelStage label="Clicks" value={funnel.clicks} />
    <FunnelStage label="Leads" value={funnel.leads} />
    
    <p className="text-xs text-slate-400">
      💡 Views can exceed scans if users share the microsite direct link.
      Scans are tracked via QR code, views include all access methods.
    </p>
  </div>
)}
```

---

## Migration Guide

### For Existing QR Codes

**IMPORTANT**: Existing QR codes may have microsite URLs encoded directly.

#### Option 1: Re-generate QR Codes (Recommended)
```bash
# Update QR generation to use /scan/:qrId endpoint
const qrCodeUrl = `https://qr.example.com/scan/${qrId}`;
// NOT: `https://microsites.example.com/${qrId}`
```

#### Option 2: URL Rewrite (If re-generation not possible)
```nginx
# NGINX rewrite rule to catch direct microsite access
location ~ ^/microsites/(.+)$ {
  # Check if came from QR scan or direct link
  # If no referrer, assume direct link
  return 302 https://qr.example.com/scan/$1;
}
```

---

## Testing

### Test QR Scan Flow
```bash
# 1. Create QR code
curl -X POST http://localhost/qr/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"targetUrl": "https://microsites.example.com/test123"}'

# 2. Access via scan endpoint (simulates QR scan)
curl -L http://localhost/scan/test123

# 3. Check analytics
curl http://localhost/analytics/test123/funnel
# Expected: scans: 1, views: 1
```

### Test Direct Link Access
```bash
# 1. Access microsite directly (simulates shared link)
curl http://localhost/microsites/test123

# 2. Check analytics
curl http://localhost/analytics/test123/funnel
# Expected: scans: 0, views: 1 (no scan tracked!)
```

---

## Benefits

✅ **Accurate Attribution**: Know if success came from QR or viral sharing  
✅ **ROI Measurement**: Calculate true QR code campaign effectiveness  
✅ **Viral Tracking**: Identify when content gets shared organically  
✅ **A/B Testing**: Compare QR placement vs. digital campaigns  
✅ **Geographic Insights**: See where QR codes are physically located  
✅ **Device Analytics**: Understand scanning vs. browsing behavior  

---

## Key Takeaways

1. **QR codes should encode** `https://qr.example.com/scan/{qrId}` ← Tracks scans
2. **NOT** `https://microsites.example.com/{qrId}` ← Bypasses scan tracking
3. **Views > Scans is GOOD** = Your content is being shared! 🎉
4. **Views < Scans is BAD** = People scan but don't wait for page load 😞
5. **Both metrics matter** for complete campaign analysis
