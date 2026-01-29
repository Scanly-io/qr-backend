import { consumer, TOPICS } from '../kafka';
import { triggerWebhooks } from './webhook-executor';

export async function handleKafkaMessages() {
  await consumer.connect();
  
  // Subscribe to all events that might trigger webhooks
  await consumer.subscribe({
    topics: [
      TOPICS.QR_SCANNED,
      TOPICS.QR_CREATED,
      TOPICS.CONVERSION_TRACKED,
      TOPICS.EXPERIMENT_COMPLETED,
    ],
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const data = JSON.parse(message.value?.toString() || '{}');
        
        // Trigger webhooks for this event
        await triggerWebhooks(topic, data);
        
      } catch (error) {
        console.error('Kafka message processing error:', error);
      }
    },
  });
}
