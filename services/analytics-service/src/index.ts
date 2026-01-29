/**
 * ANALYTICS SERVICE - EVENT CONSUMER & API
 * =========================================
 * 
 * PURPOSE:
 * Central analytics hub that consumes events from multiple services and stores them
 * for reporting, dashboards, and business intelligence.
 * 
 * EVENT SOURCES:
 * 1. QR Service → qr.events topic → qr.scanned events
 * 2. Microsite Service → analytics.events topic → button.clicked, lead.captured events
 * 
 * ARCHITECTURE:
 * - Multi-topic consumer: Subscribes to multiple Kafka topics
 * - Event routing: Routes different event types to appropriate handlers
 * - Database storage: Stores events in dedicated tables (scans, button_clicks, leads)
 * - REST API: Exposes analytics data via HTTP endpoints
 * 
 * EVENT TYPES HANDLED:
 * - qr.scanned: QR code was scanned → store in scans table
 * - button.clicked: CTA button was clicked → store in button_clicks table (future)
 * - lead.captured: Contact form submitted → store in leads table (future)
 * 
 * FUTURE ENHANCEMENTS:
 * - Add button_clicks and leads tables to schema
 * - Aggregate events for real-time dashboards
 * - Export analytics to external BI tools (Segment, Mixpanel, etc.)
 */

import { buildServer, logger, createConsumer, createProducer } from "@qr/common";
import { QREventSchema } from "@qr/common";
import type { Consumer, Producer } from "kafkajs";
import { events } from "./schema";
import { db } from "./db";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import analyticsRoutes from "./routes/analytics.js";

console.log("starting analytics-service...");   
process.env.SERVICE_NAME = "analytics-service";

/**
 * Build and configure the Fastify app (exported for testing)
 */
export async function buildApp() {
  const app = buildServer();

  // Register Swagger documentation
  app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Analytics Service API",
      description: "QR code scan analytics and reporting service",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3004",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Analytics", description: "Analytics operations" },
      { name: "Health", description: "Health check endpoints" },
    ],
  },
});

app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: true,
  },
  staticCSP: true,
});

  // Register analytics routes
  app.register(analyticsRoutes);

  app.get("/analytics", async () => ({ service: "analytics-service", ok: true }));

  return app;
}

const port = Number(process.env.PORT || 3004);
let consumer: Consumer | null = null;
let producer: Producer | null = null;

// Only start the server if this file is being run directly (not imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  buildApp().then((app) => {
    app.listen({ port, host: '0.0.0.0' }).then(() =>
      logger.info(`Analytics service running on :${port}, analytics-service`)
    );
  });

  async function initProducer() {
    producer = await createProducer();
  }

/**
 * CREATE KAFKA CONSUMER FOR ANALYTICS EVENTS
 * ===========================================
 * 
 * MULTI-TOPIC SUBSCRIPTION:
 * This consumer subscribes to TWO topics to receive events from different services:
 * 
 * 1. qr.events - Events from QR Service
 *    - qr.scanned: When a QR code is scanned
 * 
 * 2. analytics.events - Events from Microsite Service  
 *    - button.clicked: When a CTA button is clicked
 *    - lead.captured: When a contact form is submitted
 * 
 * EVENT ROUTING STRATEGY:
 * - Check eventType field to determine which handler to use
 * - Each event type stores to different table (scans, button_clicks, leads)
 * - Failed events are logged but don't crash the consumer (graceful degradation)
 * 
 * ERROR HANDLING:
 * - Database errors are caught and logged per event
 * - Consumer continues processing even if one event fails
 * - Critical errors are sent to analytics.errors topic for monitoring
 */
async function createConsumerInstance() {
  try {
    consumer = await createConsumer("analytics-group");
    if (!consumer) throw new Error("Consumer not initialized");
    
    // Subscribe to BOTH topics to receive all analytics events
    await consumer.subscribe({ 
      topics: ["qr.events", "analytics.events"], 
      fromBeginning: true 
    });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          // Parse the event payload
          const rawValue = JSON.parse(message.value!.toString());
          
          // Route based on event type
          await handleAnalyticsEvent(rawValue, topic);
          
          logger.info({ 
            event: "mq.message.received", 
            topic, 
            partition,
            eventType: rawValue.eventType 
          }, "Message processed successfully");
          
        } catch (err) {
          logger.error({ err, topic, partition }, "Failed to process message");
          
          // Send error event to DLQ topic for monitoring
          if (producer) {
            await producer.send({
              topic: "analytics.errors",
              messages: [
                {
                  key: "analytics.processing.error",
                  value: JSON.stringify({ 
                    error: err instanceof Error ? err.message : String(err),
                    originalMessage: message.value?.toString(),
                    topic,
                    partition,
                    timestamp: new Date().toISOString() 
                  }),
                  headers: {
                    "x-event-type": "analytics.processing.error",
                  },
                },
              ],
            });
          }
        }
      }
    });
    
    logger.info("Consumer created and subscribed to qr.events and analytics.events");
  } catch (err) {
    logger.error({ err }, "Failed to create consumer");
    if (producer) {
      await producer.send({
        topic: "analytics.errors",
        messages: [
          {
            key: "analytics.error",
            value: JSON.stringify({ 
              error: err instanceof Error ? err.message : String(err), 
              ts: new Date().toISOString() 
            }),
            headers: {
              "x-event-type": "analytics.error",
            },
          },
        ],
      });
    }
  }
}

/**
 * HANDLE ANALYTICS EVENT ROUTING
 * ===============================
 * 
 * Routes incoming events to appropriate storage handlers based on eventType.
 * 
 * EVENT TYPE MAPPING:
 * - qr.scanned → handleScanEvent() → scans table
 * - button.clicked → handleButtonClickEvent() → (future: button_clicks table)
 * - lead.captured → handleLeadCapturedEvent() → (future: leads table)
 * 
 * EXTENSIBILITY:
 * Add new event types here as the system grows (e.g., video.viewed, file.downloaded)
 */
async function handleAnalyticsEvent(event: any, topic: string) {
  const eventType = event.eventType || event.event;
  
  switch (eventType) {
    case "qr.scanned":
      await handleScanEvent(event);
      break;
      
    case "microsite.viewed":
      await handleMicrositeViewEvent(event);
      break;
      
    case "button.clicked":
      await handleButtonClickEvent(event);
      break;
      
    case "lead.captured":
      await handleLeadCapturedEvent(event);
      break;
      
    default:
      logger.warn({ eventType, topic }, "Unknown event type received");
  }
}

/**
 * HANDLE QR SCAN EVENTS
 * ======================
 * Store QR code scan events in the unified events table.
 * Includes device tracking metadata for analytics.
 */
async function handleScanEvent(value: any) {
  try {
    // Validate against schema if coming from qr.events topic
    const validatedValue = value.event === "qr.scanned" 
      ? QREventSchema.parse(value) 
      : value;
    
    await db.insert(events).values({
      qrId: validatedValue.qrId,
      timestamp: new Date(validatedValue.timestamp),
      eventType: validatedValue.event || validatedValue.eventType,
      
      // Device tracking fields from metadata
      deviceType: validatedValue.metadata?.deviceType || null,
      os: validatedValue.metadata?.os || null,
      browser: validatedValue.metadata?.browser || null,
      
      // Geo-location fields from metadata (NEW!)
      country: validatedValue.metadata?.country || null,
      city: validatedValue.metadata?.city || null,
      
      // User journey tracking
      referrer: validatedValue.metadata?.referrer || null,
      sessionId: validatedValue.metadata?.sessionId || validatedValue.userId || null,
      
      // Store full event in rawPayload for flexibility
      rawPayload: {
        userId: validatedValue.userId,
        ...validatedValue.metadata,
      },
    });
    
    logger.info({ 
      qrId: validatedValue.qrId, 
      userId: validatedValue.userId,
      country: validatedValue.metadata?.country,
      city: validatedValue.metadata?.city
    }, "Scan event stored in DB");
    
  } catch (err) {
    logger.error({ err }, "Failed to store scan event");
    throw err; // Re-throw to trigger error handling in consumer
  }
}

/**
 * HANDLE MICROSITE VIEW EVENTS
 * =============================
 * Store microsite view events from the microsite service.
 * This is fired when a user scans a QR and views the microsite page.
 * 
 * INCLUDES:
 * - Device metadata (deviceType, vendor, model, os, browser with versions)
 * - Geo-location data (country, city) from IP lookup
 * - UTM campaign parameters for marketing attribution
 * - Session tracking for user journey analysis
 */
async function handleMicrositeViewEvent(event: any) {
  try {
    await db.insert(events).values({
      qrId: event.qrId,
      eventType: "microsite.viewed",
      timestamp: new Date(event.timestamp),
      
      // Device metadata from User-Agent parsing (ENHANCED!)
      deviceType: event.metadata?.deviceType || null,
      deviceVendor: event.metadata?.deviceVendor || null,      // NEW: Apple, Samsung, Google
      deviceModel: event.metadata?.deviceModel || null,        // NEW: iPhone 14 Pro, Galaxy S23
      os: event.metadata?.os || null,
      osVersion: event.metadata?.osVersion || null,            // NEW: iOS 17.2, Android 14
      browser: event.metadata?.browser || null,
      browserVersion: event.metadata?.browserVersion || null,  // NEW: Safari 17.0, Chrome 120
      
      // Geo-location from IP lookup (MaxMind GeoIP2)
      country: event.metadata?.country || null,
      city: event.metadata?.city || null,
      
      // User journey
      referrer: event.metadata?.referrer || null,
      sessionId: event.metadata?.sessionId || null,
      
      // UTM Campaign Parameters (NEW!)
      utmSource: event.metadata?.utmSource || null,            // NEW: facebook, google, newsletter
      utmMedium: event.metadata?.utmMedium || null,            // NEW: cpc, email, social
      utmCampaign: event.metadata?.utmCampaign || null,        // NEW: summer-sale, product-launch
      utmTerm: event.metadata?.utmTerm || null,                // NEW: search keywords
      utmContent: event.metadata?.utmContent || null,          // NEW: A/B test variant
      
      // Store full metadata in rawPayload
      rawPayload: event.metadata || {},
    });
    
    logger.info({ 
      qrId: event.qrId,
      country: event.metadata?.country,
      city: event.metadata?.city,
      deviceType: event.metadata?.deviceType,
      deviceModel: event.metadata?.deviceModel,
      osVersion: event.metadata?.osVersion,
      utmCampaign: event.metadata?.utmCampaign
    }, "Microsite view event stored in DB");
    
  } catch (err) {
    logger.error({ err }, "Failed to store microsite view event");
    throw err;
  }
}

/**
 * HANDLE BUTTON CLICK EVENTS
 * ===========================
 * Store CTA button click events from microsites in unified events table.
 * 
 * STORAGE STRATEGY:
 * - Common fields: qrId, eventType, timestamp, device metadata
 * - Event-specific data in rawPayload: { buttonId, label, url }
 * 
 * ANALYTICS USE CASES:
 * - Track which buttons get the most clicks
 * - Calculate click-through rate (scans → button clicks)
 * - A/B test different button text and URLs
 * - Measure time between scan and click (user engagement)
 */
async function handleButtonClickEvent(event: any) {
  try {
    await db.insert(events).values({
      qrId: event.qrId,
      eventType: "button.clicked",
      timestamp: new Date(event.timestamp),
      
      // Device metadata (if provided by microsite service in future)
      deviceType: event.deviceType || null,
      os: event.os || null,
      browser: event.browser || null,
      
      // User journey
      referrer: event.referrer || null,
      sessionId: event.sessionId || null,
      
      // Button-specific data in rawPayload
      rawPayload: {
        buttonId: event.buttonId,
        label: event.label,
        url: event.url,
      },
    });
    
    logger.info({ 
      qrId: event.qrId, 
      buttonId: event.buttonId,
      label: event.label,
      url: event.url 
    }, "Button click event stored in DB");
    
  } catch (err) {
    logger.error({ err }, "Failed to store button click event");
    throw err;
  }
}

/**
 * HANDLE LEAD CAPTURED EVENTS
 * ============================
 * Store contact form submission METADATA in unified events table.
 * 
 * ⚠️ CRITICAL PRIVACY RULE:
 * This analytics service stores ONLY metadata, NEVER actual PII.
 * The microsite-service is the source of truth for lead data (with GDPR consent).
 * 
 * WHAT WE STORE:
 * ✅ leadId (reference to microsite-service)
 * ✅ qrId, micrositeId (campaign tracking)
 * ✅ hasEmail, hasPhone (boolean flags for analytics)
 * ✅ timestamp, device metadata (for conversion analysis)
 * 
 * WHAT WE NEVER STORE:
 * ❌ name, email, phone, message (PII belongs in microsite-service)
 * 
 * WHY THIS SEPARATION?
 * 1️⃣ GDPR Compliance: Analytics = non-personal, Microsite = personal with consent
 * 2️⃣ Scalability: Events table (millions of rows) separate from leads (thousands)
 * 3️⃣ Right to Deletion: User data deleted from microsite, analytics metadata stays
 * 
 * ANALYTICS USE CASES:
 * - Track lead conversion rate (scans → leads)
 * - Identify high-converting QR codes
 * - Measure time from scan to lead submission
 * - Analyze which campaigns generate the most leads
 */
async function handleLeadCapturedEvent(event: any) {
  try {
    await db.insert(events).values({
      qrId: event.qrId,
      eventType: "lead.captured",
      timestamp: new Date(event.timestamp),
      
      // Device metadata (if provided)
      deviceType: event.deviceType || null,
      os: event.os || null,
      browser: event.browser || null,
      
      // User journey
      referrer: event.referrer || null,
      sessionId: event.sessionId || null,
      
      // Lead metadata ONLY (no PII)
      rawPayload: {
        leadId: event.leadId || null,           // Reference to lead in microsite-service
        micrositeId: event.micrositeId || null,  // Which microsite form was submitted
        source: event.source || "form",          // How lead was captured
        hasEmail: !!event.email,                 // Boolean flag only
        hasPhone: !!event.phone,                 // Boolean flag only
        // DO NOT store: name, email, phone, message
      },
    });
    
    logger.info({ 
      qrId: event.qrId,
      micrositeId: event.micrositeId,
      hasEmail: !!event.email,
      hasPhone: !!event.phone 
    }, "Lead captured event stored in DB (metadata only)");
    
  } catch (err) {
    logger.error({ err }, "Failed to store lead captured event");
    throw err;
  }
}

  initProducer();
  createConsumerInstance();

  // Graceful shutdown
  async function gracefulShutdown(signal: string) {
    logger.info({ signal }, "Received shutdown signal, starting graceful shutdown");
    
    try {
      // Close Fastify server (stop accepting new requests)
      await app.close();
      logger.info("Fastify server closed");
      
      // Disconnect Kafka consumer
      if (consumer) {
        await consumer.disconnect();
        logger.info("Kafka consumer disconnected");
      }
      
      // Disconnect Kafka producer
      if (producer) {
        await producer.disconnect();
        logger.info("Kafka producer disconnected");
      }
      
      logger.info("Graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during graceful shutdown");
      process.exit(1);
    }
  }

  // Register shutdown handlers
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}