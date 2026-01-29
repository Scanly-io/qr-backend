import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'experiments-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.ERROR,
});

export const producer: Producer = kafka.producer();
export const consumer: Consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || 'experiments-service-group',
});

/**
 * Experiment Event Topics
 */
export const TOPICS = {
  // Published by this service
  EXPERIMENT_CREATED: 'experiment.created',
  EXPERIMENT_STARTED: 'experiment.started',
  EXPERIMENT_PAUSED: 'experiment.paused',
  EXPERIMENT_RESUMED: 'experiment.resumed',
  EXPERIMENT_COMPLETED: 'experiment.completed',
  VARIANT_ASSIGNED: 'variant.assigned',
  CONVERSION_TRACKED: 'conversion.tracked',
  WINNER_DECLARED: 'experiment.winner_declared',
  
  // Subscribed topics
  QR_SCANNED: 'qr.scanned', // Listen for QR scans to trigger assignments
  USER_ACTION: 'user.action', // Listen for user actions (conversions)
};

/**
 * Connect to Kafka
 */
export async function connectKafka() {
  try {
    await producer.connect();
    console.log('✅ Kafka producer connected');
    
    await consumer.connect();
    console.log('✅ Kafka consumer connected');
    
    // Subscribe to relevant topics
    await consumer.subscribe({ 
      topics: [TOPICS.QR_SCANNED, TOPICS.USER_ACTION], 
      fromBeginning: false 
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to Kafka:', error);
    throw error;
  }
}

/**
 * Disconnect from Kafka
 */
export async function disconnectKafka() {
  await producer.disconnect();
  await consumer.disconnect();
  console.log('🔌 Kafka disconnected');
}

/**
 * Publish event to Kafka
 */
export async function publishEvent(topic: string, event: any) {
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: event.id || event.experimentId,
          value: JSON.stringify({
            ...event,
            timestamp: new Date().toISOString(),
            service: 'experiments-service',
          }),
        },
      ],
    });
  } catch (error) {
    console.error(`❌ Failed to publish event to ${topic}:`, error);
    throw error;
  }
}
