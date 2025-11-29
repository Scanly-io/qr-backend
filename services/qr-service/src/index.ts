import { buildServer, logger, createProducer } from "@qr/common";
import { QREventSchema } from "@qr/common";
import type { Producer } from "kafkajs";

console.log("starting qr-service...");
process.env.SERVICE_NAME = "qr-service";

const app = buildServer();
const port = Number(process.env.PORT || 3002);
let producer: Producer | null = null;

app.get("/qr", async () => ({ service: "qr-service", ok: true }));

app.listen({ port })
  .then(() => logger.info(`QR service running on :${port} <- QR service`))
  .catch(err => {
    // Print the full error to stderr first so we always see the stack
    // even if the logger transport swallows details.
    console.error("Failed to start server", err && err.stack ? err.stack : err);
    logger.error("Failed to start server", err);
    process.exit(1);
  });

// Example of creating a Kafka producer (not used yet)
async function initMQ() {
  try {
    producer = await createProducer();
    const payload = {
        event: "qr.scanned" as const,
        qrId: "qr_abc",
        userId: "user_123",
        timestamp: new Date().toISOString(),
    };

    QREventSchema.parse(payload);
    // Produce (send) a sample message to Redpanda
    if (!producer) throw new Error("Producer not initialized");
    await producer.send({
    topic: "qr.events",
    messages: [
      {
        key: "qr.scanned",
        value: JSON.stringify({ payload }),
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


initMQ();

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal, starting graceful shutdown");
  
  try {
    // Close Fastify server (stop accepting new requests)
    await app.close();
    logger.info("Fastify server closed");
    
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
