import Fastify from 'fastify';
import cors from '@fastify/cors';
import pino from 'pino';
import aiRoutes from './routes/ai-generation.js';
import personalizationRoutes from './routes/personalization.js';
import accessibilityRoutes from './routes/accessibility.js';
import microInteractionsRoutes from './routes/micro-interactions.js';
import predictiveAnalyticsRoutes from './routes/predictive-analytics.js';
import agenticRoutes from './routes/agentic.js';
import { contentWriterRoutes } from './routes/content-writer.js';
import { seoOptimizerRoutes } from './routes/seo-optimizer.js';
import { nlAnalyticsRoutes } from './routes/nl-analytics.js';
import { imageGeneratorRoutes } from './routes/image-generator.js';
import { aiChatRoutes } from './routes/ai-chat.js';
import { abTestingRoutes } from './routes/ab-testing.js';
import { seoAnalyzerRoutes } from './routes/seo-analyzer.js';
import { qrCodeRoutes } from './routes/qr-code.js';
import { accessControlRoutes } from './routes/access-control.js';
import i18nRoutes from './routes/i18n.js';
import templateRoutes from './routes/templates.js';
import geoAnalyticsRoutes from './routes/geo-analytics.js';
import offlineQRRoutes from './routes/offline-qr.js';

const logger = pino({ name: 'ml-service' });

// Make Kafka optional - only import if KAFKA_ENABLED=true
const KAFKA_ENABLED = process.env.KAFKA_ENABLED === 'true';

const server = Fastify({
  logger: logger,
});

// Health check
server.get('/health', async () => {
  return { 
    status: 'healthy', 
    service: 'ml-service',
    kafka: KAFKA_ENABLED ? 'enabled' : 'disabled'
  };
});

// Start server
const start = async () => {
  try {
    // Register plugins
    await server.register(cors, {
      origin: true,
    });

    // Routes
    await server.register(aiRoutes, { prefix: '/ai' });
    await server.register(personalizationRoutes, { prefix: '/personalization' });
    await server.register(accessibilityRoutes, { prefix: '/accessibility' });
    await server.register(microInteractionsRoutes, { prefix: '/interactions' });
    await server.register(predictiveAnalyticsRoutes, { prefix: '/ml' });
    await server.register(agenticRoutes, { prefix: '/agentic' });
    await server.register(contentWriterRoutes, { prefix: '/content-writer' });
    await server.register(seoOptimizerRoutes, { prefix: '/seo' });
    await server.register(nlAnalyticsRoutes, { prefix: '/nl-analytics' });
    await server.register(imageGeneratorRoutes, { prefix: '/image-generator' });
    await server.register(aiChatRoutes, { prefix: '/ai-chat' });
    await server.register(abTestingRoutes, { prefix: '/ab-testing' });
    await server.register(seoAnalyzerRoutes, { prefix: '/seo' });
    await server.register(qrCodeRoutes, { prefix: '/qr-code' });
    await server.register(accessControlRoutes, { prefix: '/access-control' });
    await server.register(i18nRoutes);
    await server.register(templateRoutes);
    await server.register(geoAnalyticsRoutes);
    await server.register(offlineQRRoutes);

    // Initialize Kafka only if enabled
    if (KAFKA_ENABLED) {
      try {
        const { initKafka, consumer } = await import('./kafka.js');
        await initKafka();
        logger.info('Kafka initialized');

        // Start Kafka consumer
        await consumer.run({
          eachMessage: async ({ topic, partition, message }: any) => {
            logger.info({ topic, partition }, 'Received Kafka message');
            // Handle messages if needed
          },
        });
      } catch (kafkaErr) {
        logger.warn({ err: kafkaErr }, 'Kafka initialization failed, continuing without Kafka');
      }
    } else {
      logger.info('Kafka disabled, running HTTP-only mode');
    }

    const port = parseInt(process.env.PORT || '3016', 10);
    await server.listen({ port, host: '0.0.0.0' });
    
    logger.info(`ML Service listening on port ${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  if (KAFKA_ENABLED) {
    try {
      const { consumer } = await import('./kafka.js');
      await consumer.disconnect();
    } catch (err) {
      // Ignore disconnect errors
    }
  }
  await server.close();
  
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
