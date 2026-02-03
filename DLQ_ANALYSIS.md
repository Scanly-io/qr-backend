# DLQ (Dead Letter Queue) Usage Analysis

## Current State

### ✅ What's Working

1. **Analytics Service** - Has DLQ error handling:
   - Sends processing errors to `analytics.errors` topic
   - Includes error context (message, topic, partition, timestamp)
   - Wraps message processing in try-catch blocks

2. **DLQ Processor** - Now listens to multiple topics:
   - `qr.events.dlq` - QR service errors (planned)
   - `analytics.errors` - Analytics service errors (active)
   - `microsite.errors` - Microsite service errors (planned)

### ❌ Missing DLQ Integration

#### 1. QR Service (`services/qr-service`)
**Issues:**
- ❌ No try-catch around database operations
- ❌ No error handling for Kafka send failures
- ❌ Database errors crash the request
- ❌ Failed events are lost (no DLQ)

**Affected Routes:**
- `POST /generate` - QR creation
- `PUT /qr/:qrId` - QR updates
- `GET /qr/:qrId/image` - Image generation

**Example Problem:**
```typescript
// Current code - no error handling
await db.insert(qrs).values({ qrId: id, targetUrl, createdBy });
await producerInstance.send({ topic: "qr.events", messages: [...] });
// If DB fails → 500 error, no logging
// If Kafka fails → silently lost (stub producer)
```

#### 2. Microsite Service (`services/microsite-service`)
**Issues:**
- ❌ No try-catch in publish route
- ❌ Database errors not sent to DLQ
- ❌ Rendering errors not tracked
- ❌ No `microsite.errors` topic usage

**Affected Routes:**
- `POST /microsite/:qrId/publish` - Microsite publishing
- `GET /microsite/:qrId` - Get microsite
- `PUT /microsite/:qrId` - Update microsite
- `POST /microsite/:qrId/lead` - Lead capture

**Example Problem:**
```typescript
// Current code
const site = await db.select()...;  // No error handling
const html = await renderMicrosite(site);  // No error handling
await db.update(microsites).set({ publishedHtml: html });  // No error handling
```

## Recommendations

### 1. Add Error Handling Wrapper

Create a common error handler for all routes:

```typescript
// packages/common/src/errorHandler.ts
export async function withDLQ<T>(
  operation: () => Promise<T>,
  context: {
    service: string;
    operation: string;
    metadata?: Record<string, any>;
  }
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    
    logger.error({ ...context, error }, `${context.operation} failed`);
    
    // Send to DLQ
    const producer = await createProducer();
    await producer.send({
      topic: `${context.service}.errors`,
      messages: [{
        key: context.operation,
        value: JSON.stringify({
          error,
          context,
          timestamp: new Date().toISOString(),
        }),
        headers: {
          "x-event-type": `${context.service}.error`,
        },
      }],
    });
    
    return { success: false, error };
  }
}
```

### 2. Usage Example

**QR Service:**
```typescript
// Before
await db.insert(qrs).values({ qrId: id, targetUrl, createdBy });

// After
const result = await withDLQ(
  () => db.insert(qrs).values({ qrId: id, targetUrl, createdBy }),
  {
    service: "qr",
    operation: "qr.create",
    metadata: { qrId: id, userId: user.id },
  }
);

if (!result.success) {
  return res.code(500).send({ error: "Failed to create QR code" });
}
```

**Microsite Service:**
```typescript
// Before
const html = await renderMicrosite(site);

// After
const result = await withDLQ(
  () => renderMicrosite(site),
  {
    service: "microsite",
    operation: "microsite.render",
    metadata: { qrId: site.qrId },
  }
);

if (!result.success) {
  return reply.code(500).send({ error: "Failed to render microsite" });
}
```

### 3. DLQ Processor Enhancements

Current DLQ processor just logs errors. Should add:

```typescript
await consumer.run({
  eachMessage: async ({ topic, message }) => {
    const error = JSON.parse(message.value?.toString() || "{}");
    
    // 1. Store in error database
    await db.insert(errorLogs).values({
      topic,
      service: error.context?.service,
      operation: error.context?.operation,
      errorMessage: error.error,
      metadata: error.context?.metadata,
      timestamp: error.timestamp,
    });
    
    // 2. Check if retryable
    if (isRetryable(error)) {
      await scheduleRetry(error);
    }
    
    // 3. Alert on critical errors
    if (isCritical(error)) {
      await sendSlackAlert(error);
    }
    
    // 4. Update metrics
    errorMetrics.inc({ service: error.context?.service });
  },
});
```

## Implementation Priority

1. **High Priority** (Do Now):
   - ✅ Update DLQ processor to listen to `analytics.errors` (DONE)
   - ⬜ Add error handling to QR service routes
   - ⬜ Add error handling to Microsite service routes

2. **Medium Priority** (Next Sprint):
   - ⬜ Create `withDLQ()` helper in common package
   - ⬜ Implement error database table
   - ⬜ Add retry logic to DLQ processor

3. **Low Priority** (Future):
   - ⬜ Slack/email alerting
   - ⬜ Error dashboard in Grafana
   - ⬜ Automatic retry strategies
   - ⬜ Error classification (transient vs permanent)

## Quick Wins

### Add Try-Catch to Critical Paths

**QR Service - POST /generate:**
```typescript
try {
  await db.insert(qrs).values({ qrId: id, targetUrl, createdBy });
  await producerInstance.send({ topic: "qr.events", messages: [...] });
  res.code(201).send({ qrId: id, targetUrl });
} catch (err) {
  logger.error({ err, qrId: id }, "Failed to create QR code");
  res.code(500).send({ error: "Internal server error" });
}
```

**Microsite Service - POST /publish:**
```typescript
try {
  const html = await renderMicrosite(site);
  await db.update(microsites).set({ publishedHtml: html }).where(eq(microsites.qrId, qrId));
  await cache.set(micrositeCacheKey(qrId), html);
  return { message: "Published successfully", length: html.length };
} catch (err) {
  logger.error({ err, qrId }, "Failed to publish microsite");
  
  // Send to DLQ
  await producer.send({
    topic: "microsite.errors",
    messages: [{
      value: JSON.stringify({
        error: err.message,
        operation: "publish",
        qrId,
        timestamp: new Date().toISOString(),
      }),
    }],
  });
  
  return reply.code(500).send({ error: "Failed to publish microsite" });
}
```

## Testing DLQ Flow

1. **Trigger an error in analytics service:**
   ```bash
   # Send invalid event
   curl -X POST http://localhost:3004/analytics/test/raw \
     -H "Content-Type: application/json" \
     -d '{"invalid": "data"}'
   ```

2. **Check analytics.errors topic:**
   ```bash
   # If using Kafka CLI tools
   kafka-console-consumer --bootstrap-server localhost:9092 \
     --topic analytics.errors --from-beginning
   ```

3. **Verify DLQ processor receives it:**
   ```bash
   # Check DLQ processor logs
   docker logs dlq-processor
   # Should see: "DLQ message received"
   ```

## Summary

**Current DLQ Coverage:**
- ✅ Analytics Service → `analytics.errors` → DLQ Processor
- ❌ QR Service → No DLQ integration
- ❌ Microsite Service → No DLQ integration

**Next Steps:**
1. Add try-catch blocks to QR and Microsite services
2. Send errors to respective DLQ topics
3. Test end-to-end error flow
4. Implement DLQ processor actions (store, retry, alert)
