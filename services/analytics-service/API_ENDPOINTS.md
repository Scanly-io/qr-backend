# Analytics Service API Endpoints

## Overview

The Analytics Service provides comprehensive QR code scan analytics with 6 endpoints covering different use cases.

## Endpoints

### 1. Summary Statistics
**GET** `/analytics/:qrId/summary`

Quick overview of scan counts.

**Response:**
```json
{
  "totalScans": 15234,
  "todayScans": 45,
  "last7DaysScans": 892
}
```

**Use Case:** Dashboard widgets, KPI cards

**Performance:** ~10-20ms

---

### 2. Time Series Data
**GET** `/analytics/:qrId/timeseries`

Daily scan counts for charting.

**Response:**
```json
{
  "timeSeries": [
    { "date": "2025-01-01", "count": 123 },
    { "date": "2025-01-02", "count": 456 }
  ]
}
```

**Use Case:** Line charts, trend analysis

**Performance:** ~50-200ms

---

### 3. Raw Scan Records
**GET** `/analytics/:qrId/raw?page=1&pageSize=50&startDate=2025-01-01&endDate=2025-12-31`

Individual scan records with pagination and filtering.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `pageSize` (optional, default: 50) - Records per page
- `startDate` (optional) - ISO date filter (e.g., "2025-01-01")
- `endDate` (optional) - ISO date filter

**Response:**
```json
{
  "records": [
    {
      "id": 123,
      "qrId": "abc123",
      "userId": "user456",
      "eventType": "qr.scanned",
      "timestamp": "2025-11-29T10:30:00Z",
      "rawPayload": { "deviceType": "mobile", "os": "iOS" }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 10000,
    "totalPages": 200
  }
}
```

**Use Case:** Detailed audit logs, debugging, compliance

**Performance:** ~10-50ms (with pagination)

---

### 4. Pattern Analysis (NEW! 🎉)
**GET** `/analytics/:qrId/patterns`

Scan patterns by hour and day of week.

**Response:**
```json
{
  "byHourOfDay": [
    { "hour": 0, "count": 12 },
    { "hour": 12, "count": 450 },
    { "hour": 18, "count": 520 }
  ],
  "byDayOfWeek": [
    { "day": 0, "dayName": "Sunday", "count": 1200 },
    { "day": 1, "dayName": "Monday", "count": 800 },
    { "day": 6, "dayName": "Saturday", "count": 1800 }
  ]
}
```

**Use Cases:**
- **Restaurants:** Identify peak dining hours, optimize staff scheduling
- **Retail:** Understand customer shopping patterns
- **Events:** Plan capacity for popular times

**Example Insights:**
- "Most scans happen at 12pm (lunch) and 6pm (dinner)"
- "Saturdays are busiest, Mondays are slowest"
- "Should schedule more staff 11am-2pm and 5pm-8pm"

**Performance:** ~100-300ms

---

### 5. Device Analytics (NEW! 🎉)

**GET** `/analytics/:qrId/devices?startDate=2025-01-01&endDate=2025-12-31`

Device, OS, and browser breakdown using dedicated database columns.

**Query Parameters:**

- `startDate` (optional) - Filter from date (ISO format: 2025-01-01)
- `endDate` (optional) - Filter to date (ISO format: 2025-12-31)

**Response:**

```json
{
  "qrId": "menu-qr",
  "period": {
    "start": "2025-11-01T00:00:00.000Z",
    "end": "2025-11-30T23:59:59.999Z"
  },
  "byDeviceType": [
    { "deviceType": "mobile", "count": 9500 },
    { "deviceType": "desktop", "count": 500 },
    { "deviceType": "tablet", "count": 100 }
  ],
  "byOS": [
    { "os": "iOS", "count": 6000 },
    { "os": "Android", "count": 3500 },
    { "os": "Windows", "count": 400 }
  ],
  "byBrowser": [
    { "browser": "Safari", "count": 6200 },
    { "browser": "Chrome", "count": 3800 },
    { "browser": "Firefox", "count": 200 }
  ],
  "totalScans": 10000
}
```

**Use Cases:**

- **Optimize UX:** 95% mobile → prioritize mobile design
- **Browser Testing:** 62% Safari → test Safari first, Chrome second
- **Platform Strategy:** 60% iOS → consider iOS app development

**Example Insights:**

- "95% of scans are from mobile devices - go mobile-first!"
- "Need to optimize for iOS Safari (62% of traffic)"
- "Desktop usage is only 5% - deprioritize desktop features"

**How Device Data is Captured:**

1. User scans QR → microsite service receives HTTP request
2. Microsite parses `User-Agent` header using ua-parser-js library
3. Extracts device info: `{ deviceType: "mobile", os: "iOS", browser: "Safari" }`
4. Sends to Kafka event stream with metadata
5. Analytics service stores in **dedicated database columns** (deviceType, os, browser)
6. This endpoint aggregates using fast GROUP BY queries on those columns

**Performance:** ~200-500ms (uses indexed columns, no JSON parsing!)

**Data Source:** Direct database columns (`deviceType`, `os`, `browser`)  
Previously stored in rawPayload, now in proper columns for faster queries!

---

### 6. CSV Export (NEW! 🎉)

**GET** `/analytics/:qrId/export?startDate=2025-01-01&endDate=2025-12-31&limit=10000`

Export scan data as CSV file including all device tracking fields.

**Query Parameters:**

- `startDate` (optional) - Filter from date
- `endDate` (optional) - Filter to date
- `limit` (optional, default: 10000) - Max records to prevent huge files

**Response:** CSV file download

**CSV Format (Updated with Device Columns!):**

```csv
ID,QR ID,User ID,Event Type,Timestamp,Device Type,OS,Browser,IP Address,User Agent
1,"menu-qr","user456","qr.scanned","2025-11-29T10:30:00Z","mobile","iOS","Safari","203.0.113.1","Mozilla/5.0..."
2,"menu-qr","user789","qr.scanned","2025-11-29T11:15:00Z","desktop","Windows","Chrome","198.51.100.5","Mozilla/5.0..."
```

**New Columns:**

- **Device Type** - mobile, tablet, desktop
- **OS** - iOS, Android, Windows, macOS, Linux
- **Browser** - Safari, Chrome, Firefox, Edge
- **IP Address** - User's IP for geo-analysis
- **User Agent** - Full browser string for debugging

**Use Cases:**

- **Financial Reports:** Monthly scan reports with device breakdown
- **Compliance:** Audit trail export including IP addresses
- **Excel Analysis:** Import into Excel, pivot by device/OS/browser
- **Advanced Analytics:** Import into Tableau/PowerBI for custom dashboards

**Example Workflows:**

1. Monthly report: `?startDate=2025-10-01&endDate=2025-10-31`
2. Quarterly analysis: `?startDate=2025-07-01&endDate=2025-09-30`
3. Recent activity: `?limit=1000` (most recent 1000 scans)

**Performance:** ~500ms-2s depending on limit

**File Naming:** `qr-analytics-{qrId}-{YYYY-MM-DD}.csv`

---

## Quick Reference Table

| Endpoint | Purpose | Pagination | Typical Response Size | Speed |
|----------|---------|------------|----------------------|-------|
| `/summary` | KPIs | No | ~100 bytes | 10ms |
| `/timeseries` | Charts | No | ~10 KB | 50ms |
| `/raw` | Audit logs | **Yes** | 25 KB/page | 20ms |
| `/patterns` | Peak times | No | ~5 KB | 150ms |
| `/devices` | Tech breakdown | No | ~2 KB | 300ms |
| `/export` | CSV download | Limit param | Varies | 1s |

## Database Schema

Device tracking data is stored in dedicated columns for fast queries:

```sql
CREATE TABLE scans (
  id SERIAL PRIMARY KEY,
  qr_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  raw_payload JSONB,
  
  -- Device tracking columns (captured from User-Agent)
  device_type TEXT,  -- mobile, tablet, desktop
  os TEXT,           -- iOS, Android, Windows, etc.
  browser TEXT,      -- Safari, Chrome, Firefox, etc.
  ip TEXT,           -- User's IP address
  user_agent TEXT    -- Raw User-Agent string
);
```

**Migration:** Run `services/analytics-service/migrate.sh` to add these columns to existing databases.

## Performance Optimization Tips

1. **Add Database Indexes:**
   ```sql
   CREATE INDEX idx_scans_qrid_timestamp ON scans(qr_id, timestamp DESC);
   CREATE INDEX idx_scans_timestamp_hour ON scans(EXTRACT(HOUR FROM timestamp));
   CREATE INDEX idx_scans_timestamp_dow ON scans(EXTRACT(DOW FROM timestamp));
   ```

2. **Use Caching for Patterns:**
   - Pattern data changes slowly (hourly aggregates)
   - Cache for 5-15 minutes using Redis
   - Reduces DB load significantly

3. **Limit Export Size:**
   - Default limit is 10,000 records
   - For larger exports, suggest date filtering
   - Consider async exports for 100k+ records

4. **Device Analytics Optimization:**
   - Currently loads all records (can be slow for millions)
   - Future: Pre-aggregate device counts in separate table
   - Update counts on each scan insert

## Example Usage

### Dashboard Widget
```javascript
// Get summary stats for dashboard
const response = await fetch('/analytics/my-qr/summary');
const { totalScans, todayScans, last7DaysScans } = await response.json();

// Show in UI
<Card title="Total Scans">{totalScans}</Card>
<Card title="Today">{todayScans}</Card>
<Card title="Last 7 Days">{last7DaysScans}</Card>
```

### Chart Visualization
```javascript
// Get timeseries for line chart
const response = await fetch('/analytics/my-qr/timeseries');
const { timeSeries } = await response.json();

// Render chart
<LineChart data={timeSeries} xKey="date" yKey="count" />
```

### Staff Scheduling Insights
```javascript
// Get peak hours for scheduling
const response = await fetch('/analytics/my-qr/patterns');
const { byHourOfDay } = await response.json();

// Find peak hours
const peakHours = byHourOfDay
  .sort((a, b) => b.count - a.count)
  .slice(0, 3);

console.log('Schedule more staff during:', peakHours);
// Output: [{ hour: 12, count: 450 }, { hour: 18, count: 520 }, ...]
```

### Export for Monthly Report
```javascript
// Download last month's data
const startDate = '2025-10-01';
const endDate = '2025-10-31';
window.location.href = `/analytics/my-qr/export?startDate=${startDate}&endDate=${endDate}`;
// Browser downloads CSV file
```
