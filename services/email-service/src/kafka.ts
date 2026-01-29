import { Kafka, Producer, Consumer } from 'kafkajs';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const KAFKA_CLIENT_ID = 'email-service';

// Kafka client
const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: [KAFKA_BROKER],
  retry: {
    retries: 3,
    initialRetryTime: 100,
    multiplier: 2,
  },
});

// Producer
export const producer: Producer = kafka.producer();

// Consumer
export const consumer: Consumer = kafka.consumer({
  groupId: `${KAFKA_CLIENT_ID}-group`,
});

// Topics
export const TOPICS = {
  // Subscribe to these events
  USER_REGISTERED: 'user.registered',
  USER_PASSWORD_RESET: 'user.password_reset',
  QR_CREATED: 'qr.created',
  QR_SCANNED: 'qr.scanned',
  CONVERSION_TRACKED: 'conversion.tracked',
  EXPERIMENT_COMPLETED: 'experiment.completed',
  INTEGRATION_CONNECTED: 'integration.connected',
  
  // Publish these events
  EMAIL_SENT: 'email.sent',
  EMAIL_DELIVERED: 'email.delivered',
  EMAIL_OPENED: 'email.opened',
  EMAIL_CLICKED: 'email.clicked',
  EMAIL_BOUNCED: 'email.bounced',
  EMAIL_FAILED: 'email.failed',
  CAMPAIGN_STARTED: 'campaign.started',
  CAMPAIGN_COMPLETED: 'campaign.completed',
};

// Helper to publish events
export async function publishEvent(topic: string, message: any) {
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: message.id || message.userId,
          value: JSON.stringify(message),
          timestamp: Date.now().toString(),
        },
      ],
    });
  } catch (error) {
    console.error(`Failed to publish to ${topic}:`, error);
    throw error;
  }
}
