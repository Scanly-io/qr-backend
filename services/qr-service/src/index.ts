// QR Service entrypoint
// Responsibilities:
// - Boot a Fastify HTTP server using our shared common package
// - Register QR-related routes (e.g., POST /qr)
// - Initialize a Kafka producer and emit a sample qr.scanned event on startup
// - Handle graceful shutdown of HTTP and Kafka resources

import { buildServer, logger, createProducer } from "@qr/common"; // shared server builder, logger, Kafka helpers
import { QREventSchema } from "@qr/common"; // Zod schema to validate QR events
import type { Producer } from "kafkajs"; // KafkaJS producer type
import qrRoutes from "./routes/qr.js"; // route module that mounts QR endpoints
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";


console.log("starting qr-service...");
// Tag logs with this service name (our logger reads this env var)
process.env.SERVICE_NAME = "qr-service";

/**
 * Build and configure the Fastify app (exported for testing)
 */
export async function buildApp() {
  // Create a Fastify app with shared logging/CORS/health hooks
  const app = buildServer();

  // Register Swagger documentation
  app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "QR Service API",
      description: "QR code generation and management service",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3002",
        description: "Development server",
      },
    ],
    tags: [
      { name: "QR Codes", description: "QR code operations" },
      { name: "Health", description: "Health check endpoints" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
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

  // Mount QR routes (e.g., POST /qr to create/trigger scans)
  app.register(qrRoutes);

  // Simple probe/info route
  app.get("/qr", async () => ({ service: "qr-service", ok: true }));

  return app;
}

// HTTP port (defaults to 3002 for qr-service)
const port = Number(process.env.PORT || 3002);

// Will hold our Kafka producer instance once initialized
let producer: Producer | null = null;

// Only start the server if this file is being run directly (not imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  // Start the HTTP server
  const app = await buildApp();
  
  app
    .listen({ port, host: '0.0.0.0' })
    .then(() => logger.info(`QR service running on :${port} <- QR service`))
    .catch((err) => {
      // Print the full error to stderr so we always get the stack trace
      console.error("Failed to start server", err && err.stack ? err.stack : err);
      logger.error("Failed to start server", err);
      process.exit(1);
    });

/**
 * Initialize Kafka producer and emit a sample qr.scanned event.
 * In real usage, your route handlers would create and send events instead.
 */
async function initMQ() {
  try {
    producer = await createProducer();
    // A sample event matching our QREventSchema contract
    const payload = {
        event: "qr.scanned" as const,
        qrId: "qr_abc",
        userId: "user_123",
        timestamp: new Date().toISOString(),
    };

    QREventSchema.parse(payload);
    // Produce (send) a sample message to Redpanda
    // Send the raw payload directly (not wrapped) so consumers can parse it directly
    if (!producer) throw new Error("Producer not initialized");
    await producer.send({
    topic: "qr.events",
    messages: [
      {
        key: "qr.scanned",
        value: JSON.stringify(payload),
        headers: {
          "x-event-type": "qr.scanned",
        },
      },
    ],
  });

    logger.info({ event: "qr.scanned", qrId: payload.qrId }, "QR scanned event sent");
    logger.info("MQ initialized (producer connected)");
  } catch (err) {
    console.error("Failed to initialize MQ", err);
    // don't crash the service on MQ init failure; continue running
  }
}


// Kick off producer initialization in the background on startup
initMQ();

// Graceful shutdown: close HTTP server, then Kafka producer
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal, starting graceful shutdown");
  
  try {
    // 1) Close Fastify server (stop accepting new requests)
    const app = await buildApp();
    await app.close();
    logger.info("Fastify server closed");
    
    // 2) Disconnect Kafka producer (flush and close connection)
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

// Register OS signal handlers for Ctrl+C / container stop
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}
