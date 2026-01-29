import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import workflowRoutes from './routes/workflows.js';
import executionRoutes from './routes/executions.js';

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

// Health check
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    service: 'workflow-builder',
    timestamp: new Date().toISOString(),
  };
});

// Register routes
await fastify.register(workflowRoutes, { prefix: '/api/workflows' });
await fastify.register(executionRoutes, { prefix: '/api/executions' });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3023');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    fastify.log.info(`⚙️  Workflow Builder running on http://${host}:${port}`);
    fastify.log.info(`🔄 Workflows API: http://${host}:${port}/api/workflows`);
    fastify.log.info(`📊 Executions API: http://${host}:${port}/api/executions`);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
