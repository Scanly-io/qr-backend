import { createConsumer, logger } from "@qr/common";
import type { Consumer } from "kafkajs";

let consumer: Consumer | null = null;

async function startDLQProcessor() {
  consumer = await createConsumer("dlq-processor-group");
  if (!consumer) throw new Error("Consumer not initialized");

  // Subscribe to all error/DLQ topics from different services
  await consumer.subscribe({ 
    topics: [
      "qr.errors",            // QR service errors
      "analytics.errors",     // Analytics service errors
      "microsite.errors",     // Microsite service errors
    ], 
    fromBeginning: true 
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const failedMessage = message.value?.toString();
      const errorType = message.headers?.["x-event-type"]?.toString() || "unknown";
      
      logger.warn({ 
        topic,
        partition,
        errorType,
        failedMessage 
      }, "DLQ message received");
      
      // TODO: Implement retry logic, save to DB, or send alerts
      // Example actions:
      // - Parse error and determine if retryable
      // - Store in error database for investigation
      // - Send Slack/email alert for critical errors
      // - Trigger manual review workflow
    },
  });
  
  logger.info("DLQ Processor started and subscribed to error topics: qr.errors, analytics.errors, microsite.errors");
}

startDLQProcessor().catch((err) => {
  logger.error(err, "DLQ Processor crashed");
  process.exit(1);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal, starting graceful shutdown");
  
  try {
    // Disconnect Kafka consumer
    if (consumer) {
      await consumer.disconnect();
      logger.info("Kafka consumer disconnected");
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
