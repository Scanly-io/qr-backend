# Lead Capture Flow - Explanation

## What Happens When Someone Submits a Contact Form?

### The Journey

```text
User scans QR → Views microsite → Fills contact form → Submits → Lead captured!
```

---

## Step-by-Step Flow

### 1. User Reaches Contact Form

**From Microsite:**
- User already viewed microsite (via `/public/:qrId` endpoint)
- Sees a "Contact Us" or "Get in Touch" button/form
- Fills out: Name, Email, Message fields
- Clicks Submit

### 2. Form Submission (POST Request)

```http
POST /public/menu-qr/lead HTTP/1.1
Host: yourapp.com
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "I'd like to make a reservation for 4 people on Friday evening",
  "micrositeId": "uuid-of-microsite"
}
```

### 3. Store Lead in Database

**Why Database First?**
- Leads are **business-critical** (potential customers!)
- Can't afford to lose them if Kafka is down
- Need persistence for CRM integration
- Staff accesses leads from admin panel

```typescript
const [lead] = await db.insert(leads).values({
  qrId: "menu-qr",
  micrositeId: "uuid-of-microsite",
  name: "John Doe",
  email: "john@example.com",
  message: "I'd like to make a reservation...",
  source: "form",
  // createdAt automatically set by database
});
```

**Database Record Created:**

| id | qr_id | microsite_id | name | email | message | source | created_at |
|----|-------|--------------|------|-------|---------|--------|-----------|
| uuid-123 | menu-qr | uuid-456 | John Doe | john@... | I'd like... | form | 2025-11-30 10:30:00 |

### 4. Send Analytics Event (Async)

**To Kafka Topic: `analytics.events`**

```json
{
  "eventType": "lead.captured",
  "qrId": "menu-qr",
  "leadId": "uuid-123",
  "timestamp": "2025-11-30T10:30:00.000Z",
  "name": "John Doe",
  "email": "john@example.com",
  "message": "I'd like to make a reservation..."
}
```

**Who Consumes This Event:**
- **Analytics Service:** Tracks conversion rates (how many scans → leads)
- **DLQ Processor:** Handles failed events for retry
- **Future: Email Service:** Send confirmation email to user
- **Future: CRM Service:** Sync lead to Salesforce/HubSpot

### 5. Respond to User

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true
}
```

**Frontend Shows:**
- ✅ "Thank you! We'll be in touch soon."
- Clears form fields
- Redirects to confirmation page
- Tracks conversion in Google Analytics

---

## Why This Architecture?

### Database First, Analytics Second

**Correct Order:**

```text
1. Save to database ✅ (critical)
2. Send to Kafka ✅ (nice to have)
3. Respond to user ✅ (fast)
```

**Wrong Order:**

```text
1. Send to Kafka ❌ (if Kafka is down, lead is lost!)
2. Save to database
3. Respond to user
```

### Fire-and-Forget to Kafka

```typescript
await producer.send({...}); // Don't wait for confirmation
```

**Why?**
- User shouldn't wait for analytics processing
- Lead is already safely in database
- If Kafka is down, lead is still captured
- Analytics can catch up later via replay

---

## Business Value

### Lead = Potential Revenue

**Restaurant Example:**

```text
100 QR scans/day
→ 5 contact form submissions (5% conversion)
→ 3 actual reservations (60% close rate)
→ $150 average bill × 3 = $450/day revenue
→ $13,500/month from one QR code!
```

### Admin Panel Integration

Staff can view leads with context:

| When | QR Code | Name | Email | Message | Status |
|------|---------|------|-------|---------|--------|
| 10:30 AM | table-12-qr | John Doe | john@... | Reservation for 4 | New |
| 11:15 AM | menu-qr | Jane Smith | jane@... | Catering inquiry | Contacted |
| 2:45 PM | event-qr | Bob Wilson | bob@... | Wedding venue | Pending |

**Staff Actions:**
- Click "Mark as Contacted"
- Reply via email directly from admin panel
- Export to CSV for CRM import
- Filter by QR code to see campaign performance

---

## Data Fields Explained

### Core Fields

**qrId** (text, required)
- Which QR code generated this lead
- Example: "restaurant-menu", "table-5", "event-poster"
- Use: Campaign tracking, ROI analysis

**micrositeId** (UUID, required, foreign key)
- Reference to the microsite record
- Ensures lead links to actual published microsite
- Use: Data integrity, microsite analytics

**name** (text, required)
- User's full name
- Example: "John Doe"
- Use: Personalized follow-up emails

**email** (text, required)
- Primary contact method
- Example: "john@example.com"
- Use: Email communication, CRM sync

**message** (text, optional)
- User's inquiry, question, or note
- Example: "I'd like to book a table for Friday at 7pm"
- Use: Context for staff, categorization (reservation vs general inquiry)

**source** (text)
- How lead was captured
- Values: "form" (manual), "api" (import), "integration" (CRM sync)
- Use: Attribution, data quality tracking

**createdAt** (timestamp, auto)
- When lead was submitted
- Use: Sorting, filtering, time-based reports

---

## Security Considerations

### Current State (MVP)

⚠️ **No validation** - accepts any data
⚠️ **No rate limiting** - vulnerable to spam
⚠️ **No CAPTCHA** - bots can submit
⚠️ **No duplicate prevention** - same email multiple times

### Production Requirements

✅ **Email Validation**

```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return reply.code(400).send({ error: "Invalid email format" });
}
```

✅ **Rate Limiting**

```typescript
// Max 5 submissions per IP per hour
const recentSubmissions = await db
  .select()
  .from(leads)
  .where(and(
    eq(leads.ip, req.ip),
    gte(leads.createdAt, new Date(Date.now() - 3600000))
  ));

if (recentSubmissions.length >= 5) {
  return reply.code(429).send({ error: "Too many submissions" });
}
```

✅ **Spam Detection**

```typescript
// Honeypot field (hidden from users, filled by bots)
if (req.body.website) { // "website" is honeypot
  return reply.code(201).send({ success: true }); // Fake success
}

// Disposable email detection
const disposableDomains = ["tempmail.com", "10minutemail.com"];
const domain = email.split("@")[1];
if (disposableDomains.includes(domain)) {
  return reply.code(400).send({ error: "Invalid email domain" });
}
```

---

## Future Enhancements

### 1. Auto-Response Email

```typescript
// After storing lead
await emailService.send({
  to: email,
  subject: "Thank you for contacting us!",
  template: "lead-confirmation",
  data: { name, message },
});
```

### 2. CRM Integration

```typescript
// Sync to Salesforce
await salesforce.createLead({
  firstName: name.split(" ")[0],
  lastName: name.split(" ").slice(1).join(" "),
  email,
  description: message,
  leadSource: `QR Code: ${qrId}`,
});
```

### 3. SMS Notifications

```typescript
// Notify business owner
await twilio.messages.create({
  to: "+1-555-OWNER",
  from: "+1-555-BUSINESS",
  body: `New lead from ${name}! Check admin panel.`,
});
```

### 4. Analytics Dashboard

**Conversion Funnel:**
```text
1000 scans (views)
→ 100 form starts (10%)
→ 50 form submits (5%)
→ 30 conversions (3%)
```

**Optimize:**
- If 10% start but only 5% submit → simplify form
- If 5% submit but 3% convert → improve follow-up process
- If <10% start → make CTA more prominent

---

## Common Questions

### Q: Why store micrositeId if we have qrId?

**Answer:** One microsite can have multiple QR codes!

**Example:**

```text
Microsite: "Downtown Restaurant Menu"
├── QR Code 1: table-1-qr (Table 1)
├── QR Code 2: table-2-qr (Table 2)
└── QR Code 3: poster-qr (Street poster)
```

All lead to same microsite, but `qrId` shows which QR was scanned (location tracking).

### Q: What if Kafka is down?

**Answer:** Lead is still captured!

```text
Database insert ✅ (lead saved)
Kafka send fails ❌ (analytics delayed)
User sees success ✅ (201 response)

Later: Kafka reconnects, DLQ processor catches up
```

### Q: Can users submit multiple times?

**Answer:** Currently yes (no duplicate prevention).

**Solution:**

```typescript
const recentDuplicate = await db
  .select()
  .from(leads)
  .where(and(
    eq(leads.email, email),
    eq(leads.qrId, qrId),
    gte(leads.createdAt, new Date(Date.now() - 3600000)) // Within 1 hour
  ));

if (recentDuplicate.length > 0) {
  return reply.code(200).send({ 
    success: true,
    message: "We already received your message!" 
  });
}
```

---

## Summary

**When user submits contact form:**

1. ✅ Extract data from request body (name, email, message, micrositeId)
2. ✅ Validate data (future: add Zod schema)
3. ✅ Save lead to database (business-critical, must succeed)
4. ✅ Send analytics event to Kafka (fire-and-forget, async)
5. ✅ Respond with 201 Created success
6. ✅ Frontend shows thank you message

**Key Principles:**
- Database first (leads are revenue!)
- Fire-and-forget analytics (don't make user wait)
- Graceful degradation (works even if Kafka is down)
- Context tracking (qrId + micrositeId = full attribution)

This data powers your sales pipeline and helps measure campaign effectiveness! 🎯
