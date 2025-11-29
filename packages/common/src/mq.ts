// packages/common/src/mq.ts
// =====================================================================
// KAFKA MESSAGE QUEUE CLIENT WITH GRACEFUL DEGRADATION
// =====================================================================
// This module provides Kafka producers & consumers that:
// 1. Gracefully degrade to no-op stubs if Kafka unavailable
// 2. Prevent service crashes due to Kafka connection issues
// 3. Allow development without running Kafka infrastructure
// =====================================================================

import { Kafka, Producer, Consumer, Partitioners } from "kafkajs";
import { logger } from "./logger";

// ---------------------------------------------------------------------
// CONFIGURATION: Environment-driven setup
// ---------------------------------------------------------------------

/**
 * KAFKA_DISABLED=1 → Completely bypass Kafka, return stub implementations
 * Useful for:
 * - Local development without infrastructure
 * - Testing individual services in isolation
 * - CI/CD pipelines that don't need message queue
 */
const disabled = process.env.KAFKA_DISABLED === "1";

/**
 * Parse broker addresses from environment variables
 * Supports multiple formats:
 * - Single broker: KAFKA_BROKER=localhost:9092
 * - Multiple brokers: KAFKA_BROKERS=kafka1:9092,kafka2:9092,kafka3:9092
 * - Comma or space separated
 * 
 * In production, use multiple brokers for high availability
 * In development, single localhost broker is fine
 */
const brokerList = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || "localhost:9092")
  .split(/[,\s]+/)      // Split on commas or whitespace
  .filter(Boolean);     // Remove empty strings

// ---------------------------------------------------------------------
// KAFKA CLIENT INITIALIZATION
// ---------------------------------------------------------------------

/**
 * Create the main Kafka client instance (or null if disabled)
 * This is the connection manager that creates producers & consumers
 */
let kafka: Kafka | null = null;

if (!disabled) {
  // Normal mode: Create real Kafka client
  kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "qr-backend",  // Identifies this app in Kafka logs
    brokers: brokerList,                                     // List of Kafka broker addresses
    // Future enhancements:
    // - Add SSL/TLS: ssl: { ca: [...], cert: ..., key: ... }
    // - Add authentication: sasl: { mechanism: 'plain', username: ..., password: ... }
  });
} else {
  // Disabled mode: Log warning and kafka stays null
  // Services will get stub implementations instead
  logger.warn({ disabled }, "Kafka disabled via KAFKA_DISABLED=1 environment variable");
}

// ---------------------------------------------------------------------
// NO-OP STUB IMPLEMENTATIONS
// ---------------------------------------------------------------------
// Why stubs? To avoid "if (kafka enabled)" checks everywhere in business logic
// Services can call producer.send() without worrying if Kafka exists
// The stub silently succeeds, keeping code clean and maintainable
// ---------------------------------------------------------------------

/**
 * NO-OP PRODUCER STUB
 * 
 * Implements the full Producer interface from KafkaJS
 * All methods succeed but do nothing
 * 
 * Benefits:
 * - Service code doesn't need conditional checks
 * - TypeScript type safety maintained
 * - No null pointer errors
 * - Service can start even if Kafka down
 * 
 * Example usage in your service:
 *   const producer = await createProducer(); // Gets stub if Kafka unavailable
 *   await producer.send({ topic: "events", messages: [...] }); // Silently succeeds
 */
const noopProducer: Producer = {
  // Connection methods - log warning but don't throw errors
  connect: async () => { 
    logger.warn("Kafka producer stub connect (disabled)"); 
  },
  disconnect: async () => {},  // No-op: nothing to disconnect
  
  // Sending methods - return empty success arrays
  send: async () => { 
    return [];  // Return empty RecordMetadata[] (message successfully "sent" to nowhere)
  },
  sendBatch: async () => { 
    return [];  // Batch "sent" successfully
  },
  
  // Producer capabilities
  isIdempotent: () => false,  // Stub producer isn't idempotent
  
  // Transactions not supported in stub mode
  transaction: async () => { 
    throw new Error("Kafka disabled: transactions unsupported"); 
  },
  
  // Event system stubs (required by Producer interface)
  events: { 
    CONNECT: "producer.connect", 
    DISCONNECT: "producer.disconnect", 
    REQUEST: "producer.request", 
    REQUEST_TIMEOUT: "producer.request_timeout" 
  } as any,
  on: () => ({ remove: () => {} }) as any,  // Event listener stub
  logger: undefined as any,                  // No logger needed for stub
} as Producer;

/**
 * NO-OP CONSUMER STUB
 * 
 * Implements the full Consumer interface from KafkaJS
 * All methods succeed but don't actually consume messages
 * 
 * Why needed:
 * - Service can call consumer.run() without checking if Kafka exists
 * - No crashes if Kafka unavailable during startup
 * - Clean error handling in logs vs hard failures
 * 
 * Example usage in your service:
 *   const consumer = await createConsumer("my-group");
 *   await consumer.subscribe({ topic: "events" });
 *   await consumer.run({ eachMessage: async ({ message }) => {...} });
 *   // If Kafka disabled, subscribe & run succeed but no messages received
 */
const noopConsumer: Consumer = {
  // Connection lifecycle
  connect: async () => { 
    logger.warn("Kafka consumer stub connect (disabled)"); 
  },
  disconnect: async () => {},  // No-op
  
  // Subscription methods - all no-ops
  subscribe: async () => {},   // "Successfully" subscribed to nothing
  run: async () => {},          // "Running" but no messages to process
  stop: async () => {},         // Already stopped
  
  // Flow control methods
  pause: () => {},              // Can't pause what's not running
  resume: () => {},             // Can't resume what's not running
  paused: () => [],             // No paused partitions
  
  // Offset management
  commitOffsets: async () => {}, // No offsets to commit
  seek: () => {},                // No position to seek
  
  // Event system stubs
  events: { 
    CONNECT: "consumer.connect", 
    DISCONNECT: "consumer.disconnect", 
    REQUEST: "consumer.request", 
    REQUEST_TIMEOUT: "consumer.request_timeout" 
  } as any,
  on: () => ({ remove: () => {} }) as any,  // Event listener stub
  logger: undefined as any,
  
  // Group management
  describeGroup: async () => ({}) as any,   // Empty group description
} as Consumer;

// ---------------------------------------------------------------------
// SAFE CONNECTION WITH TIMEOUT PROTECTION
// ---------------------------------------------------------------------

/**
 * Attempt to connect to Kafka with timeout protection
 * 
 * THE PROBLEM THIS SOLVES:
 * Without this function, if Kafka is down or unreachable:
 * - producer.connect() hangs forever (never resolves)
 * - Your service startup is blocked indefinitely
 * - Service never becomes ready, fails health checks
 * - You can't develop without running Kafka
 * 
 * THE SOLUTION:
 * - Race connect() against a timeout timer
 * - If connect succeeds → return true (use real producer/consumer)
 * - If timeout hits first → return false (fall back to stub)
 * - Service always starts within 5 seconds max
 * 
 * @param entity - Producer or Consumer to connect
 * @param label - "producer" or "consumer" for logging
 * @returns true if connected, false if timeout/error (use stub)
 */
async function safeConnect<T extends { connect: () => Promise<any> }>(
  entity: T, 
  label: string
): Promise<boolean> {
  // How long to wait before giving up (configurable via env)
  const timeoutMs = Number(process.env.KAFKA_CONNECT_TIMEOUT_MS || 5000);
  
  try {
    // Race between two promises:
    // 1. entity.connect() - try to connect to Kafka
    // 2. setTimeout - reject after timeout
    // Whichever finishes first wins
    await Promise.race([
      entity.connect(),  // Promise A: actual Kafka connection
      new Promise((_, reject) => 
        setTimeout(
          () => reject(new Error(`Kafka ${label} connect timeout after ${timeoutMs}ms`)), 
          timeoutMs
        )
      )  // Promise B: timeout rejection
    ]);
    
    // If we get here, connect() succeeded before timeout
    logger.info({ label, brokers: brokerList }, `Kafka ${label} connected`);
    return true;  // Signal: use real producer/consumer
    
  } catch (err: any) {
    // Either timeout fired, or connect() threw error
    // Either way: Kafka unavailable, fall back to stub
    logger.error(
      { err, label, brokers: brokerList }, 
      `Kafka ${label} failed to connect – falling back to stub`
    );
    return false;  // Signal: use stub instead
  }
}

// ---------------------------------------------------------------------
// PUBLIC API: Create Kafka clients with automatic fallback
// ---------------------------------------------------------------------

/**
 * Create a Kafka Producer with automatic fallback to stub
 * 
 * FLOW:
 * 1. If KAFKA_DISABLED=1 → immediately return stub (no connection attempt)
 * 2. If kafka client null → return stub
 * 3. Create real producer with partitioning strategy
 * 4. Try to connect with 5-second timeout
 * 5. If connection succeeds → return real producer
 * 6. If timeout/error → return stub (log error, service continues)
 * 
 * PARTITIONING STRATEGY:
 * - DefaultPartitioner: Murmur2 hash (modern, recommended)
 * - LegacyPartitioner: Old algorithm (for compatibility)
 * - Set KAFKA_LEGACY_PARTITIONER=1 for old behavior
 * 
 * USAGE IN YOUR SERVICE:
 *   const producer = await createProducer();
 *   await producer.send({ 
 *     topic: "analytics.events",
 *     messages: [{ value: JSON.stringify({ type: "click", qrId: "123" }) }]
 *   });
 *   // Works whether Kafka running or not
 */
export async function createProducer(): Promise<Producer> {
  // Early exit: Kafka explicitly disabled or client null
  if (disabled || !kafka) return noopProducer;
  
  // Determine partitioning algorithm (affects message distribution across partitions)
  const useLegacy = process.env.KAFKA_LEGACY_PARTITIONER === "1";
  
  // Create producer with chosen partitioner
  const producer = kafka.producer({ 
    createPartitioner: useLegacy 
      ? Partitioners.LegacyPartitioner    // Old default (deprecated but stable)
      : Partitioners.DefaultPartitioner    // New default (better distribution)
  });
  
  // Attempt connection with timeout protection
  const ok = await safeConnect(producer, "producer");
  
  // Return real producer if connected, stub if failed
  return ok ? producer : noopProducer;
}

/**
 * Create a Kafka Consumer with automatic fallback to stub
 * 
 * FLOW:
 * 1. If KAFKA_DISABLED=1 → immediately return stub
 * 2. If kafka client null → return stub
 * 3. Create real consumer for specified consumer group
 * 4. Try to connect with 5-second timeout
 * 5. If connection succeeds → return real consumer
 * 6. If timeout/error → return stub (service continues)
 * 
 * CONSUMER GROUPS:
 * - groupId identifies which consumer group this instance belongs to
 * - All consumers with same groupId share message processing load
 * - Different groupIds get independent copies of all messages
 * 
 * Example:
 *   Group "analytics-workers": 3 instances share processing
 *   Group "email-service": Gets all messages independently
 * 
 * USAGE IN YOUR SERVICE:
 *   const consumer = await createConsumer("analytics-group");
 *   await consumer.subscribe({ topic: "qr.events", fromBeginning: false });
 *   await consumer.run({
 *     eachMessage: async ({ topic, partition, message }) => {
 *       const data = JSON.parse(message.value.toString());
 *       await processEvent(data);
 *     }
 *   });
 * 
 * @param groupId - Consumer group identifier (e.g., "analytics-group", "email-service")
 */
export async function createConsumer(groupId: string): Promise<Consumer> {
  // Early exit: Kafka explicitly disabled or client null
  if (disabled || !kafka) return noopConsumer;
  
  // Create consumer for specified group
  const consumer = kafka.consumer({ groupId });
  
  // Attempt connection with timeout protection
  const ok = await safeConnect(consumer, "consumer");
  
  // Return real consumer if connected, stub if failed
  return ok ? consumer : noopConsumer;
}


