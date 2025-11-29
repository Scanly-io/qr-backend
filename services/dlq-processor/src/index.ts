import { createConsumer, logger } from "@qr/common";
import type { Consumer } from "kafkajs";

let consumer: Consumer | null = null;

async function startDLQProcessor() {
  consumer = await createConsumer("dlq-processor-group");
  if (!consumer) throw new Error("Consumer not initialized");

  await consumer.subscribe({ topic: "qr.events.dlq", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const failedMessage = message.value?.toString();
      logger.warn({ failedMessage }, "DLQ message received");
      // here you can save to DB, send Slack alert, or trigger retry
    },
  });
  
  logger.info("DLQ Processor started and subscribed to qr.events.dlq");
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
