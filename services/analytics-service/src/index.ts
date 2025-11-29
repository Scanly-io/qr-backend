import { buildServer, logger, createConsumer, createProducer } from "@qr/common";
import { QREventSchema } from "@qr/common";
import type { Consumer, Producer } from "kafkajs";
import { scans } from "./schema";
import { db } from "./db";

console.log("starting analytics-service...");   
process.env.SERVICE_NAME = "analytics-service";
const app = buildServer();
const port = Number(process.env.PORT || 3004);
let consumer: Consumer | null = null;
let producer: Producer | null = null;

app.get("/analytics", async () => ({ service: "analytics-service", ok: true }));

app.listen({ port }).then(() =>
  logger.info(`Analytics service running on :${port}, analytics-service`)
);

async function initProducer() {
  producer = await createProducer();
}

async function createConsumerInstance() {
  try {
    consumer = await createConsumer("analytics-group");
    if (!consumer) throw new Error("Consumer not initialized");
    // Example of subscribing to a topic (not used yet)
    await consumer.subscribe({ topic: "qr.events", fromBeginning: true });
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = QREventSchema.parse(JSON.parse(message.value!.toString()));
        try{
            // Store scan event in the database
            if(value.event === "qr.scanned"){
        await db.insert(scans).values({
          qrId: value.qrId,
          userId: value.userId,
          timestamp: new Date(value.timestamp),
          eventType: value.event,
          rawPayload: value,
        });
                logger.info({ qrId: value.qrId, userId: value.userId }, "Scan event stored in DB");
            }
        }catch(err){
            logger.error({ err }, "Failed to store scan event");    
        }
        logger.info({ event: "mq.message.received", topic, partition }, "Message received from MQ");
      console.log("Received event from Redpanda:", value); 
      }
    });
    logger.info("Consumer created and subscribed to qr.events");
    if (Math.random() < 0.3) {
      throw new Error("Simulated consumer failure");
    }
  } catch (err) {
    if (producer) {
      await producer.send({
        topic: "analytics.errors",
        messages: [
          {
            key: "analytics.error",
            value: JSON.stringify({ error: err instanceof Error ? err.message : String(err), ts: new Date().toISOString() }),
            headers: {
              "x-event-type": "analytics.error",
            },
          },
        ],
      });
    }
    logger.error("Failed to create consumer");
    // don't crash the service on MQ init failure; continue running
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