# Pino Error Aggregation Guide

## Overview

All services use **Pino** for structured logging with automatic error aggregation capabilities. Every log entry includes:

- **Service name** - Which service logged the error
- **Timestamp** - ISO 8601 format for accurate time tracking
- **Log level** - info, warn, error, etc.
- **Error context** - Stack traces, operation details, metadata
- **Environment** - development, production, etc.

## Configuration

### Current Setup

**File:** `packages/common/src/logger.ts`

```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { 
    service: process.env.SERVICE_NAME,
    environment: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: pino.stdSerializers.err,    // Full error serialization
    error: pino.stdSerializers.err,  // Alternative error field
  },
});
```

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `SERVICE_NAME` | Identifies which service logged | `auth-service`, `qr-service` |
| `LOG_LEVEL` | Controls verbosity | `info`, `warn`, `error`, `debug` |
| `NODE_ENV` | Environment context | `development`, `production` |

## Structured Error Logging

### Standard Error Format

All errors are logged with consistent structure:

```typescript
logger.error({ 
  err,                    // Error object (serialized with stack)
  operation: "qr.create", // What was being done
  metadata: {             // Additional context
    qrId: "abc-123",
    userId: "user-456"
  }
}, "Failed to create QR code");
```

### Log Output Example

```json
{
  "level": 50,
  "time": "2025-12-01T10:30:45.123Z",
  "service": "qr-service",
  "environment": "production",
  "err": {
    "type": "Error",
    "message": "Database connection failed",
    "stack": "Error: Database connection failed\n    at ..."
  },
  "operation": "qr.create",
  "metadata": {
    "qrId": "abc-123",
    "userId": "user-456"
  },
  "msg": "Failed to create QR code"
}
```

## Error Sources

### 1. Application Errors (withDLQ)

Caught by `withDLQ()` wrapper:

```typescript
const result = await withDLQ(
  () => db.insert(qrs).values({ ... }),
  {
    service: "qr",
    operation: "qr.create",
    metadata: { qrId, userId }
  }
);
// Automatically logs error with full context
```

### 2. Kafka Consumer Errors

Analytics service logs processing failures:

```typescript
logger.error({ 
  err, 
  topic, 
  partition 
}, "Failed to process message");
```

### 3. Database Errors

All database operations wrapped with error handling:

```typescript
const fetchResult = await withDLQ(
  () => db.select().from(users).where(eq(users.id, userId)),
  {
    service: "auth",
    operation: "user.fetch",
    metadata: { userId }
  }
);
```

### 4. DLQ Processor Errors

DLQ processor logs all received errors:

```typescript
logger.warn({ 
  topic,
  partition,
  errorType,
  failedMessage 
}, "DLQ message received");
```

## Error Aggregation Methods

### Method 1: JSON Logs to File

**Production Setup:**
```bash
# Redirect logs to file
node src/index.js > /var/log/qr-service.log 2>&1

# Or use PM2
pm2 start src/index.js --log /var/log/qr-service.log
```

**Query Errors:**
```bash
# All errors today
cat /var/log/qr-service.log | grep '"level":50' | jq .

# Errors from specific service
cat /var/log/qr-service.log | grep '"service":"qr-service"' | grep '"level":50'

# Errors for specific operation
cat /var/log/qr-service.log | jq 'select(.operation == "qr.create" and .level == 50)'
```

### Method 2: Datadog Integration

**Install:**
```bash
npm install pino-datadog
```

**Usage:**
```bash
# Pipe logs to Datadog
node src/index.js | pino-datadog --key YOUR_API_KEY

# Or in package.json
{
  "scripts": {
    "start:prod": "node src/index.js | pino-datadog"
  }
}
```

**Datadog Config:**
```typescript
// logger.ts
if (process.env.NODE_ENV === "production") {
  baseConfig.transport = {
    target: 'pino-datadog',
    options: {
      apiKey: process.env.DATADOG_API_KEY,
      service: serviceName,
      tags: [`env:${process.env.NODE_ENV}`],
    }
  };
}
```

### Method 3: Loki (Grafana)

**Install:**
```bash
npm install pino-loki
```

**Usage:**
```typescript
// logger.ts
if (process.env.LOKI_URL) {
  baseConfig.transport = {
    target: 'pino-loki',
    options: {
      batching: true,
      interval: 5,
      host: process.env.LOKI_URL,
      labels: { service: serviceName }
    }
  };
}
```

**Query in Grafana:**
```logql
# All errors
{service="qr-service"} |= "level\":50"

# Specific operation errors
{service="qr-service"} | json | operation="qr.create" | level=50

# Error rate
rate({service="qr-service"} | json | level=50[5m])
```

### Method 4: CloudWatch

**Install:**
```bash
npm install pino-cloudwatch
```

**Usage:**
```bash
node src/index.js | pino-cloudwatch \
  --aws_access_key_id=XXX \
  --aws_secret_access_key=YYY \
  --aws_region=us-east-1 \
  --group=/qr-backend/logs \
  --stream=qr-service
```

### Method 5: Elasticsearch

**Install:**
```bash
npm install pino-elasticsearch
```

**Usage:**
```bash
node src/index.js | pino-elasticsearch \
  --node http://localhost:9200 \
  --index qr-backend-logs
```

**Query:**
```json
GET /qr-backend-logs/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "service": "qr-service" } },
        { "term": { "level": 50 } }
      ]
    }
  }
}
```

## Child Loggers for Request Tracking

Track related logs across an operation:

```typescript
import { createChildLogger } from "@qr/common";

// In route handler
const reqLogger = createChildLogger({ 
  requestId: req.id, 
  userId: user.id,
  operation: "qr.create"
});

reqLogger.info("Starting QR creation");
reqLogger.debug({ targetUrl }, "Validating URL");

const result = await db.insert(qrs).values({ ... });

if (result.error) {
  reqLogger.error({ err: result.error }, "Database insert failed");
} else {
  reqLogger.info({ qrId: result.id }, "QR created successfully");
}
```

**Benefits:**
- All logs for a request grouped by `requestId`
- Easy to trace operations end-to-end
- Better debugging context

## Production Best Practices

### 1. Set Appropriate Log Level

```bash
# Production: Only errors and warnings
LOG_LEVEL=warn node src/index.js

# Debugging: Everything
LOG_LEVEL=debug node src/index.js
```

### 2. Rotate Logs

**Using logrotate:**
```bash
# /etc/logrotate.d/qr-backend
/var/log/qr-backend/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 nodejs nodejs
    sharedscripts
    postrotate
        pm2 reload qr-backend
    endscript
}
```

### 3. Monitor Error Rates

**Prometheus query:**
```promql
# Error rate per service
rate(log_errors_total{service="qr-service"}[5m])

# Alert if error rate > 10/min
rate(log_errors_total[5m]) > 10
```

### 4. Set Up Alerts

**Example alert rules:**
```yaml
- alert: HighErrorRate
  expr: rate(log_errors_total[5m]) > 10
  for: 5m
  annotations:
    summary: "High error rate in {{ $labels.service }}"

- alert: CriticalError
  expr: log_errors_total{severity="critical"} > 0
  annotations:
    summary: "Critical error in {{ $labels.service }}"
```

## Viewing Logs

### Development

Pretty-printed logs in terminal:
```bash
npm run dev
# Output: Colorized, readable logs
```

### Production

JSON logs for machine parsing:
```bash
# View all logs
tail -f /var/log/qr-service.log

# View only errors
tail -f /var/log/qr-service.log | grep '"level":50'

# Pretty print errors
tail -f /var/log/qr-service.log | grep '"level":50' | pino-pretty
```

## Error Analysis Queries

### Find All Errors by Service

```bash
cat logs.json | jq 'select(.level == 50) | {
  time, 
  service, 
  operation, 
  error: .err.message
}'
```

### Error Count by Operation

```bash
cat logs.json | jq -r 'select(.level == 50) | .operation' | sort | uniq -c
```

### Most Common Errors

```bash
cat logs.json | jq -r 'select(.level == 50) | .err.message' | sort | uniq -c | sort -rn
```

### Errors in Time Range

```bash
cat logs.json | jq 'select(
  .level == 50 and 
  .time >= "2025-12-01T10:00:00.000Z" and 
  .time <= "2025-12-01T11:00:00.000Z"
)'
```

## Integration with DLQ

Errors flow through multiple channels:

```
1. Operation fails
   ↓
2. withDLQ() catches error
   ↓
3. Pino logger logs error (structured JSON)
   ↓
4. DLQ receives error message (Kafka topic)
   ↓
5. Log aggregation tool indexes error
   ↓
6. Dashboard/alerts notify team
```

## Summary

✅ **Structured Logging**: All errors include service, operation, context  
✅ **Multiple Outputs**: Console (dev), JSON files (prod), aggregation services  
✅ **DLQ Integration**: Errors sent to both logs and Kafka topics  
✅ **Query Support**: Easy filtering by service, operation, time  
✅ **Child Loggers**: Track related operations with requestId  
✅ **Production Ready**: Log rotation, alerting, monitoring

**Current Configuration:**
- Service name: From `SERVICE_NAME` env var
- Log level: From `LOG_LEVEL` env var (default: `info`)
- Format: JSON in production, pretty in development
- Error serialization: Full stack traces included
- DLQ: Errors also sent to `{service}.errors` Kafka topics
