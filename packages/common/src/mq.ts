// packages/common/src/mq.ts

import { Kafka, Producer, Consumer } from "kafkajs";
import { logger } from "./logger";

const kafka = new Kafka({
  clientId: "qr-backend",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

export async function createProducer(): Promise<Producer> {
  const producer = kafka.producer();
  await producer.connect();
  logger.info("Kafka Producer connected");
  return producer;
}

export async function createConsumer(groupId: string): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  logger.info(`Kafka Consumer connected (group=${groupId})`);
  return consumer;
}


