import { Kafka, Producer, Consumer } from 'kafkajs';
import { logger } from '@qr/common';

const kafka = new Kafka({
  clientId: process.env.SERVICE_NAME || 'domains-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

let producer: Producer;
let consumer: Consumer;

/**
 * Initialize Kafka (producer and consumer)
 */
export async function initKafka() {
  producer = kafka.producer();
  await producer.connect();
  logger.info('Kafka producer connected');
  
  consumer = kafka.consumer({ groupId: 'domains-service-group' });
  await consumer.connect();
  logger.info('Kafka consumer connected');
}

/**
 * Publish event to Kafka topic
 */
export async function publishEvent(topic: string, event: any) {
  if (!producer) {
    throw new Error('Kafka producer not initialized. Call initKafka() first.');
  }

  try {
    await producer.send({
      topic,
      messages: [
        {
          key: event.id || event.qrId || null,
          value: JSON.stringify({
            ...event,
            timestamp: new Date().toISOString(),
            service: process.env.SERVICE_NAME,
          }),
        },
      ],
    });
    logger.info({ topic, event: event.eventType }, 'Event published');
  } catch (error) {
    logger.error({ error, topic, event }, 'Failed to publish event');
    throw error;
  }
}

/**
 * Subscribe to multiple events and handle them
 */
export async function subscribeToEvents(
  topics: string[],
  handlers: Record<string, (event: any) => Promise<void>>
) {
  if (!consumer) {
    throw new Error('Kafka consumer not initialized. Call initKafka() first.');
  }

  // Subscribe to all topics
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
    logger.info({ topic }, 'Subscribed to topic');
  }

  // Run consumer with handlers
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value?.toString() || '{}');
        logger.info({ topic, partition, event: event.eventType }, 'Event received');
        
        // Find and call the appropriate handler
        const handler = handlers[topic];
        if (handler) {
          await handler(event);
        } else {
          logger.warn({ topic }, 'No handler found for topic');
        }
      } catch (error) {
        logger.error({ error, topic, partition }, 'Failed to handle event');
      }
    },
  });
}

/**
 * Graceful shutdown
 */
export async function shutdown() {
  if (producer) await producer.disconnect();
  if (consumer) await consumer.disconnect();
  logger.info('Kafka clients disconnected');
}
