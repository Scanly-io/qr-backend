import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';

import templateRoutes from './routes/templates.js';
import batchRoutes from './routes/batch.js';
import libraryRoutes from './routes/library.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
});

// Register plugins
await fastify.register(cors, {
  origin: true,
  credentials: true,
});

await fastify.register(helmet, {
  contentSecurityPolicy: false,
});

await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Health check
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    service: 'print-studio',
    timestamp: new Date().toISOString(),
  };
});

// Register routes
await fastify.register(templateRoutes, { prefix: '/api/templates' });
await fastify.register(batchRoutes, { prefix: '/api/batch' });
await fastify.register(libraryRoutes, { prefix: '/api/library' });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3022');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    fastify.log.info(`🖨️  Print Studio running on http://${host}:${port}`);
    fastify.log.info(`📋 Templates API: http://${host}:${port}/api/templates`);
    fastify.log.info(`📦 Batch API: http://${host}:${port}/api/batch`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
