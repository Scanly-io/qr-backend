import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import pino from 'pino';

const logger = pino({ name: 'ml-service:kafka' });

const kafka = new Kafka({
  clientId: 'ml-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export const producer: Producer = kafka.producer();
export const consumer: Consumer = kafka.consumer({ groupId: 'ml-service-group' });

// Kafka Topics
export const TOPICS = {
  // Subscribe to these events
  MICROSITE_CREATED: 'microsite.created',
  MICROSITE_UPDATED: 'microsite.updated',
  QR_CREATED: 'qr.created',
  QR_SCANNED: 'qr.scanned',
  USER_REGISTERED: 'user.registered',
  CONVERSION_TRACKED: 'conversion.tracked',
  INTEGRATION_CONNECTED: 'integration.connected',
  
  // Publish these events
  AI_GENERATION_STARTED: 'ai.generation.started',
  AI_GENERATION_COMPLETED: 'ai.generation.completed',
  AI_GENERATION_FAILED: 'ai.generation.failed',
  ACCESSIBILITY_SCAN_COMPLETED: 'accessibility.scan.completed',
  CTA_IMPRESSION: 'cta.impression',
  CTA_CLICK: 'cta.click',
  ML_PREDICTION_GENERATED: 'ml.prediction.generated',
  PERSONALIZATION_APPLIED: 'personalization.applied',
} as const;

export async function initKafka() {
  try {
    await producer.connect();
    logger.info('Kafka producer connected');

    await consumer.connect();
    logger.info('Kafka consumer connected');

    // Subscribe to topics
    await consumer.subscribe({
      topics: [
        TOPICS.MICROSITE_CREATED,
        TOPICS.MICROSITE_UPDATED,
        TOPICS.QR_CREATED,
        TOPICS.QR_SCANNED,
        TOPICS.USER_REGISTERED,
        TOPICS.CONVERSION_TRACKED,
        TOPICS.INTEGRATION_CONNECTED,
      ],
      fromBeginning: false,
    });

    logger.info('Subscribed to Kafka topics');
  } catch (error) {
    logger.error(error, 'Failed to initialize Kafka');
    throw error;
  }
}

export async function publishEvent(topic: string, message: any) {
  // Skip Kafka in HTTP-only mode
  if (process.env.HTTP_ONLY === 'true') {
    logger.debug({ topic, messageId: message.id }, 'Event publishing skipped (HTTP-only mode)');
    return;
  }
  
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: message.id || Date.now().toString(),
          value: JSON.stringify(message),
          timestamp: Date.now().toString(),
        },
      ],
    });
    logger.info({ topic, messageId: message.id }, 'Event published');
  } catch (error) {
    logger.error(error, 'Failed to publish event');
    throw error;
  }
}

export type KafkaHandler = (payload: EachMessagePayload) => Promise<void>;
