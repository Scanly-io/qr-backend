# Fixes Applied

## Overview
This document tracks all the fixes and improvements made to the QR backend system.

---

## 🔧 Kafka Message Format Issue

### Problem
The analytics service was experiencing continuous validation errors when consuming messages from Kafka:
```
ZodError: Invalid literal value, expected "qr.scanned"
Required fields: qrId, userId, timestamp
```

### Root Cause
The QR service was wrapping the event payload in an extra object layer:
```typescript
// ❌ Incorrect (before)
value: JSON.stringify({ payload })

// ✅ Correct (after)
value: JSON.stringify(payload)
```

### Fix Applied
**File:** `services/qr-service/src/index.ts`

Changed the Kafka producer message format from wrapped to direct payload:
- **Before:** `JSON.stringify({ payload })` - event wrapped in `{ payload: {...} }`
- **After:** `JSON.stringify(payload)` - raw event object sent directly

### Verification
- Consumer successfully validates and processes messages
- No more ZodError validation failures
- Events are logged as received: `Received event from Redpanda: { event: 'qr.scanned', qrId: 'qr_abc', userId: 'user_123', timestamp: '...' }`

---

## 🗄️ Database Schema Missing

### Problem
Analytics service failed to store events with error:
```
DrizzleQueryError: relation "scans" does not exist
```

### Root Cause
Database migrations were never run - the `scans` table didn't exist in PostgreSQL.

### Fix Applied
**Command:** `npx drizzle-kit push` (in analytics-service directory)

This created the `scans` table with the following schema:
- `id` - Auto-incrementing primary key
- `qr_id` - QR code identifier
- `user_id` - User who scanned
- `event_type` - Type of event (e.g., 'qr.scanned')
- `timestamp` - When the event occurred
- `raw_payload` - JSON of the complete event

### Verification
- Events successfully stored in database
- Log shows: `"Scan event stored in DB"`
- Database queries work correctly

---

## 📊 Prometheus Metrics Implementation

### Problem
Metrics endpoint was returning 500 errors and couldn't expose Prometheus metrics.

### Root Causes
1. `prom-client` package not installed in `packages/common`
2. Wrong import syntax for ESM modules
3. Incorrect histogram configuration

### Fixes Applied

#### 1. Package Installation
**File:** `packages/common/package.json`
```bash
npm install prom-client
```

#### 2. ESM Import Fix
**File:** `packages/common/src/metrics.ts`
```typescript
// ❌ Before (default import doesn't work with ESM)
import client from "prom-client";

// ✅ After (namespace import required)
import * as client from "prom-client";
```

#### 3. Metrics Configuration
**File:** `packages/common/src/metrics.ts`

Created proper Prometheus metrics setup:
- Registry for collecting metrics
- Default metrics collection (CPU, memory, etc.)
- HTTP request duration histogram with labels: `service`, `method`, `status`
- Buckets in seconds: `[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]`

#### 4. Metrics Endpoint
**File:** `packages/common/src/index.ts`

Added `/metrics` endpoint to `buildServer()`:
```typescript
app.get("/metrics", async (req, res) => {
  res.header("Content-Type", register.contentType);
  return register.metrics();
});
```

### Verification
- Both services return HTTP 200 on `/metrics` endpoint
- Prometheus-formatted metrics exposed successfully
- Prometheus successfully scrapes both services

---

## 🔭 Observability Stack Setup

### Components Added

#### 1. Prometheus
**File:** `docker-compose.yml`
- Port: 9090
- Scrape interval: 15 seconds
- Targets: qr-service:3002, analytics-service:3004, dlq-processor:3005

**File:** `monitoring/prometheus.yml`
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'qr-service'
    static_configs:
      - targets: ['host.docker.internal:3002']
        labels:
          service: 'qr-service'
          environment: 'dev'
  # ... (similar for analytics-service and dlq-processor)
```

#### 2. Grafana
**File:** `docker-compose.yml`
- Port: 3000
- Credentials: `admin` / `admin`
- Auto-provisioned with Prometheus datasource

**File:** `monitoring/grafana/provisioning/datasources/prometheus.yml`
- Automatically connects to Prometheus at `http://prometheus:9090`
- Set as default datasource

### Access URLs
- **Grafana Dashboard:** http://localhost:3000
- **Prometheus UI:** http://localhost:9090
- **Prometheus Targets:** http://localhost:9090/targets

---

## 🔄 Kafka Consumer Offset Reset

### Problem
Consumer was stuck on offset 0 with a malformed message, causing infinite retry loops.

### Fix Applied
**Command:** 
```bash
docker exec -it qr_redpanda rpk group seek analytics-group --to-group qr.events:0=1
```

This skipped the corrupted message at offset 0 and allowed the consumer to proceed with clean messages.

### Verification
- Consumer no longer retries bad messages
- Offset moved forward successfully
- New messages processed without errors

---

## ✅ Current System Status

### Working Components
✅ QR Service
- HTTP server on port 3002
- Kafka producer sending events
- `/metrics` endpoint working
- `/health` endpoint working

✅ Analytics Service  
- HTTP server on port 3004
- Kafka consumer receiving events
- Event validation passing
- Database inserts successful
- `/metrics` endpoint working

✅ Infrastructure
- PostgreSQL database with `scans` table
- Redpanda (Kafka) message broker
- Prometheus scraping both services
- Grafana ready for dashboard creation

### Services Running
```
qr-service:3002         ✅ Healthy
analytics-service:3004  ✅ Healthy
prometheus:9090         ✅ Scraping
grafana:3000           ✅ Ready
postgres:5432          ✅ Connected
redpanda:9092          ✅ Active
redis:6379             ✅ Running
```

---

## 📝 Code Documentation

### Added Comprehensive Comments
**File:** `services/qr-service/src/index.ts`

Added detailed block and inline comments explaining:
- Server initialization and configuration
- Kafka producer setup
- Event schema validation
- Message publishing flow
- Graceful shutdown patterns

---

## 🎯 Next Steps

### Recommended Actions
1. **Create Grafana Dashboards**
   - Request rate per service
   - P95/P99 latency
   - Error rates
   - System resource usage

2. **Add More Metrics**
   - Kafka consumer lag
   - Database query performance
   - Event processing success/failure rates

3. **Production Readiness**
   - Add authentication to Grafana
   - Configure alerting rules in Prometheus
   - Set up log aggregation
   - Implement circuit breakers for DB/Kafka

4. **Clean Up**
   - Silence KafkaJS partitioner warnings
   - Fix TimeoutNegativeWarning in consumer/producer
   - Add error handling for edge cases

---

## 🐛 Known Issues

### Minor Warnings (Non-Critical)
1. **TimeoutNegativeWarning**: Negative timeout values in Kafka client (cosmetic, doesn't affect functionality)
2. **KafkaJS Partitioner Warning**: Using legacy partitioner (can be silenced with env var)
3. **"Failed to create consumer"** log appears once on startup (followed immediately by successful consumption)

These warnings don't impact functionality but should be cleaned up in future iterations.
