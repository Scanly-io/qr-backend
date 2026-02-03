# Geo-Location Tracking Setup Guide

## ✅ Code Changes Complete

All code has been updated to support geo-location tracking (country & city). Now you just need to install dependencies and download the GeoIP database.

---

## Installation Steps

### Step 1: Install MaxMind GeoIP2 Package

```bash
cd services/microsite-service
npm install @maxmind/geoip2-node
```

### Step 2: Download GeoLite2 Database

1. **Sign up for free account:**
   - Go to: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
   - Click "Sign Up" (it's completely free)
   - Verify your email

2. **Download the database:**
   - Log in to MaxMind account
   - Go to: https://www.maxmind.com/en/accounts/current/geoip/downloads
   - Find "GeoLite2 City" in the list
   - Click "Download GZIP" (for .mmdb format)

3. **Extract and place the file:**
   ```bash
   # Extract the downloaded file
   gunzip GeoLite2-City.mmdb.gz
   
   # Move it to your microsite service directory
   mv GeoLite2-City.mmdb services/microsite-service/
   ```

**Important:** The file must be named exactly `GeoLite2-City.mmdb` and placed in the root of the microsite-service directory.

---

## What Was Changed

### 1. Package.json
- Added `@maxmind/geoip2-node` dependency to microsite-service

### 2. Microsite Service (`services/microsite-service/src/routes/render.ts`)
**Added:**
- `Reader` import from `@maxmind/geoip2-node`
- `getGeoReader()` function - singleton pattern for database access
- IP parsing logic - handles proxy chains (x-forwarded-for)
- Geo lookup in `sendAnalytics()` - converts IP → country/city
- Country and city fields in event metadata

**Before:**
```typescript
metadata: {
  deviceType,
  os,
  browser,
  ip,
  userAgent
}
```

**After:**
```typescript
metadata: {
  deviceType,
  os,
  browser,
  ip,
  userAgent,
  country,  // 🌍 NEW: "United States", "Canada", etc.
  city      // 🌆 NEW: "San Francisco", "Toronto", etc.
}
```

### 3. Analytics Service (`services/analytics-service/src/index.ts`)
**Added:**
- `handleMicrositeViewEvent()` - new event handler for microsite.viewed
- Country/city storage in both `handleScanEvent()` and `handleMicrositeViewEvent()`

**Database inserts now include:**
```typescript
country: event.metadata?.country || null,
city: event.metadata?.city || null,
```

---

## How It Works

```
┌─────────────┐
│ User scans  │
│  QR code    │
└──────┬──────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Microsite Service receives request  │
│  - Extracts IP from headers          │
│  - Parses User-Agent (device info)   │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  GeoIP2 Lookup (LOCAL DATABASE)     │
│  IP: 203.0.113.1                     │
│  ↓                                   │
│  Country: "United States"            │
│  City: "San Francisco"               │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Send to Kafka (analytics.events)   │
│  {                                   │
│    eventType: "microsite.viewed",    │
│    qrId: "menu-qr",                  │
│    metadata: {                       │
│      country: "United States",       │
│      city: "San Francisco",          │
│      deviceType: "mobile",           │
│      os: "iOS",                      │
│      browser: "Safari"               │
│    }                                 │
│  }                                   │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  Analytics Service stores in DB      │
│  - events table has country column   │
│  - events table has city column      │
└──────────────────────────────────────┘
```

---

## Testing

### 1. Verify GeoIP Database Loaded

Start the microsite service and look for this log:
```
✅ GeoIP2 database loaded successfully
```

If you see this instead:
```
⚠️  GeoIP2 database not found. Geo-location will be unavailable.
```
→ Check that `GeoLite2-City.mmdb` is in `services/microsite-service/` directory

### 2. Test with Real Request

```bash
# Scan a QR code or visit a microsite
curl http://localhost:3003/public/your-qr-id

# Check analytics service logs - should show:
# "Microsite view event stored in DB" with country and city
```

### 3. Query Analytics

The country and city are now available in:
- `/analytics/:qrId/raw` - See individual events with geo data
- `/analytics/:qrId/export` - CSV export includes country & city columns

---

## Geo Data Available in Analytics

### CSV Export
The `/analytics/:qrId/export` endpoint now includes:
- Country column
- City column

Example CSV:
```
ID,QR ID,Event Type,Timestamp,Device Type,OS,Browser,Country,City,Referrer,Session ID
1,menu-qr,microsite.viewed,2025-12-01T10:00:00Z,mobile,iOS,Safari,United States,San Francisco,,,
2,menu-qr,microsite.viewed,2025-12-01T10:05:00Z,desktop,Windows,Chrome,Canada,Toronto,,,
```

### Future Endpoints (TODO)
Add geo-analytics endpoints:
- `/analytics/:qrId/geography` - Top countries & cities
- `/analytics/:qrId/map` - GeoJSON for map visualization

---

## Performance

### Lookup Speed
- **Local database lookup:** ~1ms per request
- **API-based services:** 50-200ms per request
- **No rate limits** (local database)
- **No costs** (free forever)

### Accuracy
- **Country:** ~99% accurate
- **City:** ~80% accurate (varies by region)
  - Very accurate: US, UK, Canada, Australia
  - Less accurate: Some regions of Asia, Africa

### Private IPs
Geo lookup will **silently fail** for:
- `127.0.0.1` (localhost)
- `192.168.x.x` (private networks)
- `10.x.x.x` (private networks)

→ This is expected! Country/city will be `null` for these IPs.

---

## Database Updates

MaxMind releases updated databases **monthly**. For best accuracy:

```bash
# Download new database (monthly)
# 1. Log in to MaxMind: https://www.maxmind.com/en/accounts/current/geoip/downloads
# 2. Download latest GeoLite2-City.mmdb.gz
# 3. Extract and replace

cd services/microsite-service
gunzip GeoLite2-City.mmdb.gz
# Replace existing file
```

**Pro tip:** Add this to your deployment pipeline to auto-update monthly.

---

## Troubleshooting

### Error: "Cannot find module '@maxmind/geoip2-node'"
→ Run: `cd services/microsite-service && npm install`

### Warning: "GeoIP2 database not found"
→ Download `GeoLite2-City.mmdb` and place in `services/microsite-service/`

### Country/City always null
1. Check if you're testing with localhost (127.0.0.1) - this is expected
2. Check if database file exists: `ls services/microsite-service/GeoLite2-City.mmdb`
3. Check logs for IP value being looked up

### Database file is too old
→ Download latest version from MaxMind (released monthly)

---

## Alternative: Cloud API (if database doesn't work)

If you can't use the local database, you can use a cloud API instead:

### Option 1: ipapi.co (Free tier: 1000/day)
```typescript
const response = await fetch(`https://ipapi.co/${ip}/json/`);
const data = await response.json();
const country = data.country_name;
const city = data.city;
```

### Option 2: ip-api.com (Free tier: 45/min)
```typescript
const response = await fetch(`http://ip-api.com/json/${ip}`);
const data = await response.json();
const country = data.country;
const city = data.city;
```

**Trade-offs:**
- ✅ No database file to maintain
- ✅ Always up-to-date
- ❌ Slower (50-200ms per lookup)
- ❌ Rate limits
- ❌ Costs money at scale
- ❌ Requires internet connection

---

## Summary

✅ **Code Complete** - All changes are in place  
🔧 **Next Steps:**  
1. `cd services/microsite-service && npm install`  
2. Download `GeoLite2-City.mmdb` from MaxMind  
3. Place file in `services/microsite-service/`  
4. Restart microsite service  
5. Test with QR scan  

🌍 **Result:** Every event will now have country & city data!
