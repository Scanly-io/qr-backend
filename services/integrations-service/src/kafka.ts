import { Kafka, logLevel } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'integrations-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.INFO,
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'integrations-service-group' });

export { kafka, producer, consumer };

// Kafka topics
export const TOPICS = {
  // Subscribe to these events
  QR_SCANNED: 'qr.scanned',
  QR_CREATED: 'qr.created',
  CONVERSION_TRACKED: 'analytics.conversion',
  EXPERIMENT_COMPLETED: 'experiments.completed',
  
  // Publish these events
  WEBHOOK_TRIGGERED: 'integrations.webhook.triggered',
  WEBHOOK_FAILED: 'integrations.webhook.failed',
  INTEGRATION_CONNECTED: 'integrations.connected',
  INTEGRATION_ERROR: 'integrations.error',
};

export async function publishEvent(topic: string, message: any) {
  await producer.connect();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
}
