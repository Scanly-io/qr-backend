import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createProducer, createConsumer } from '@qr/common';
import { handleKafkaMessages } from './lib/kafka-handler';
import { testRoutes } from './routes/test';

const PORT = parseInt(process.env.PORT || '3015');
const HOST = process.env.HOST || '0.0.0.0';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register CORS
server.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
});

// Health check
server.get('/health', async () => {
  return { 
    status: 'healthy',
    service: 'email-service',
    timestamp: new Date().toISOString(),
  };
});

// Register routes
server.register(testRoutes, { prefix: '/api/test' });

// Graceful shutdown
async function gracefulShutdown() {
  server.log.info('Shutting down gracefully...');
  
  try {
    await server.close();
    server.log.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    server.log.error(error, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function start() {
  try {
    // Connect to Kafka via @qr/common (auto-connects with fallback)
    const producer = await createProducer();
    server.log.info('Kafka producer connected');
    
    // Start consuming messages
    handleKafkaMessages();
    server.log.info('Kafka consumer started');
    
    // Start HTTP server
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Email service listening on ${HOST}:${PORT}`);
    
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

start();
