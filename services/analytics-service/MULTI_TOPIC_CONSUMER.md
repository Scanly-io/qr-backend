# Analytics Service - Multi-Topic Consumer Update

## What Changed?

The analytics service now consumes events from **TWO Kafka topics** instead of just one:

### Before (Single Topic)
```typescript
await consumer.subscribe({ topic: "qr.events", fromBeginning: true });
```
- Only received `qr.scanned` events from QR service
- Only stored scan analytics

### After (Multi-Topic)
```typescript
await consumer.subscribe({ 
  topics: ["qr.events", "analytics.events"], 
  fromBeginning: true 
});
```
- Receives events from **QR service** and **Microsite service**
- Handles 3 event types: `qr.scanned`, `button.clicked`, `lead.captured`

---

## Event Flow Architecture

```
┌─────────────────┐
│   QR Service    │──────► qr.events topic ──────► qr.scanned
└─────────────────┘

┌─────────────────┐
│ Microsite Svc   │──────► analytics.events ────┬► button.clicked
└─────────────────┘                              └► lead.captured

                                ↓
                                
                    ┌───────────────────────┐
                    │  Analytics Service    │
                    │  (Multi-Topic Consumer)│
                    └───────────────────────┘
                                ↓
                    ┌───────────────────────┐
                    │  Event Router         │
                    │  (by eventType)       │
                    └───────────────────────┘
                                ↓
                    ┌───────────┬───────────┬───────────┐
                    ↓           ↓           ↓           ↓
              qr.scanned  button.clicked  lead.captured
                    ↓           ↓           ↓
              scans table  (TODO: button_clicks)  (TODO: leads_analytics)
```

---

## Event Type Handlers

### 1. QR Scanned Events ✅ (Implemented)
**Source:** QR Service → `qr.events` topic  
**Handler:** `handleScanEvent()`  
**Storage:** `scans` table

```typescript
{
  eventType: "qr.scanned",
  qrId: "uuid",
  userId: "uuid",
  timestamp: "2025-11-30T12:00:00Z",
  metadata: {
    deviceType: "mobile",
    os: "iOS",
    browser: "Safari",
    ip: "1.2.3.4",
    userAgent: "..."
  }
}
```

**Database:** Stores in `scans` table with device tracking fields.

---

### 2. Button Clicked Events 🚧 (Logging Only)
**Source:** Microsite Service → `analytics.events` topic  
**Handler:** `handleButtonClickEvent()`  
**Storage:** Currently just logs, TODO: create `button_clicks` table

```typescript
{
  eventType: "button.clicked",
  qrId: "uuid",
  buttonId: "uuid",
  label: "Visit Website",
  url: "https://example.com",
  timestamp: "2025-11-30T12:00:00Z"
}
```

**TODO:** Create schema and migration for `button_clicks` table:
```sql
CREATE TABLE button_clicks (
  id SERIAL PRIMARY KEY,
  qr_id TEXT NOT NULL,
  button_id TEXT NOT NULL,
  label TEXT,
  url TEXT,
  timestamp TIMESTAMP NOT NULL,
  device_type TEXT,
  os TEXT,
  browser TEXT,
  ip TEXT,
  user_agent TEXT
);
```

---

### 3. Lead Captured Events 🚧 (Logging Only)
**Source:** Microsite Service → `analytics.events` topic  
**Handler:** `handleLeadCapturedEvent()`  
**Storage:** Currently just logs, TODO: create `leads_analytics` table

```typescript
{
  eventType: "lead.captured",
  qrId: "uuid",
  micrositeId: "uuid",
  email: "user@example.com",  // Only for logging context
  phone: "555-1234",           // Only for logging context
  timestamp: "2025-11-30T12:00:00Z"
}
```

**IMPORTANT:** Analytics service should NOT store PII (name, email, phone).  
Only store metadata for aggregate reporting:

**TODO:** Create schema for `leads_analytics` table:
```sql
CREATE TABLE leads_analytics (
  id SERIAL PRIMARY KEY,
  qr_id TEXT NOT NULL,
  microsite_id TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  has_email BOOLEAN,     -- Flag only, not actual email
  has_phone BOOLEAN,     -- Flag only, not actual phone
  device_type TEXT,
  os TEXT,
  browser TEXT
);
```

---

## Error Handling Improvements

### Before
- Single try-catch around database insert
- No error routing to DLQ topic

### After
1. **Per-Event Error Handling:** Each event is processed in try-catch
2. **Consumer Continues:** Failed events don't crash the consumer
3. **DLQ Topic:** Processing errors sent to `analytics.errors` topic
4. **Detailed Logging:** Logs include eventType, topic, partition

```typescript
try {
  await handleAnalyticsEvent(rawValue, topic);
} catch (err) {
  logger.error({ err, topic, partition }, "Failed to process message");
  
  // Send to Dead Letter Queue for monitoring
  await producer.send({
    topic: "analytics.errors",
    messages: [{
      key: "analytics.processing.error",
      value: JSON.stringify({ 
        error: err.message,
        originalMessage: message.value.toString(),
        topic,
        partition,
        timestamp: new Date().toISOString() 
      })
    }]
  });
}
```

---

## Benefits of This Architecture

### 1. **Separation of Concerns**
- QR service publishes to `qr.events` (only QR-specific events)
- Microsite service publishes to `analytics.events` (user interaction events)
- Analytics service consumes from both (central data hub)

### 2. **Extensibility**
Adding new event types is easy:
```typescript
switch (eventType) {
  case "qr.scanned":
    await handleScanEvent(event);
    break;
  case "button.clicked":
    await handleButtonClickEvent(event);
    break;
  case "lead.captured":
    await handleLeadCapturedEvent(event);
    break;
  case "video.viewed":  // Future: Add video tracking
    await handleVideoViewedEvent(event);
    break;
}
```

### 3. **Graceful Degradation**
- If one event fails, others continue processing
- If Kafka is down, services still work (fire-and-forget)
- Analytics loss is acceptable, user experience is not

### 4. **Business Intelligence**
With all events in one service, you can answer:
- **Conversion Funnel:** Scans → Button Clicks → Leads
- **Engagement Rate:** Which QR codes get the most button clicks?
- **Lead Quality:** Which campaigns generate the most leads?
- **Time-to-Action:** How long from scan to lead submission?

---

## Migration Path

### Phase 1: ✅ Multi-Topic Consumer (DONE)
- Updated analytics service to subscribe to both topics
- Added event routing logic
- Implemented handlers for all 3 event types

### Phase 2: 🚧 Schema Updates (TODO)
1. Create `button_clicks` table
2. Create `leads_analytics` table  
3. Create migrations for both tables
4. Update handlers to insert into new tables

### Phase 3: 🚧 API Endpoints (TODO)
Add analytics endpoints for:
- `GET /analytics/button-clicks/:qrId` - Button click stats
- `GET /analytics/conversion-funnel/:qrId` - Scans → Clicks → Leads
- `GET /analytics/lead-sources/:qrId` - Which campaigns drive leads

### Phase 4: 🚧 Dashboards (TODO)
- Real-time conversion tracking
- A/B testing for button text/URLs
- Lead source attribution

---

## Testing the Changes

### 1. Verify Multi-Topic Subscription
Check logs when analytics service starts:
```
Consumer created and subscribed to qr.events and analytics.events
```

### 2. Test QR Scan Events (Should Still Work)
```bash
# Scan a QR code
curl http://localhost:3003/public/qr123

# Check analytics service logs:
# "Scan event stored in DB"
```

### 3. Test Button Click Events (Should Log)
```bash
# Click a button in microsite
curl http://localhost:3003/click/qr123/btn456

# Check analytics service logs:
# "Button click event received"
# "Button click event: { qrId, buttonId, label, url }"
```

### 4. Test Lead Captured Events (Should Log)
```bash
# Submit contact form
curl -X POST http://localhost:3003/leads \
  -H "Content-Type: application/json" \
  -d '{
    "qrId": "qr123",
    "micrositeId": "site123",
    "name": "John Doe",
    "email": "john@example.com",
    "message": "Interested in your product",
    "consent": true
  }'

# Check analytics service logs:
# "Lead captured event received"
# "Lead captured event: { qrId, micrositeId, timestamp }"
```

---

## Next Steps

1. **Create Button Clicks Schema**
   - Add `button_clicks` table to schema.ts
   - Create migration script
   - Update `handleButtonClickEvent()` to insert into table

2. **Create Leads Analytics Schema**
   - Add `leads_analytics` table to schema.ts
   - Create migration script
   - Update `handleLeadCapturedEvent()` to insert into table

3. **Add Analytics API Endpoints**
   - Conversion funnel endpoint
   - Button performance endpoint
   - Lead source attribution endpoint

4. **Update Documentation**
   - Add button click analytics to API_ENDPOINTS.md
   - Add lead analytics to API_ENDPOINTS.md
   - Create CONVERSION_TRACKING.md guide

---

## Key Takeaways

✅ Analytics service now handles events from multiple sources  
✅ Event routing is extensible for future event types  
✅ Error handling is robust (graceful degradation)  
✅ Ready for button click and lead analytics (schema TODO)  
✅ Maintains backward compatibility with existing scan analytics  

🚀 **This unlocks conversion tracking and business intelligence across the entire QR → Microsite → Lead funnel!**
