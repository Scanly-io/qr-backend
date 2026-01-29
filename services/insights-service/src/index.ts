import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { logger } from '@qr-platform/common/logger';

import dashboardRoutes from './routes/dashboard';
import reportsRoutes from './routes/reports';
import exportsRoutes from './routes/exports';

const PORT = parseInt(process.env.PORT || '3017', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = Fastify({
  logger: logger as any,
});

// Register plugins
await server.register(cors, {
  origin: true,
  credentials: true,
});

// Swagger documentation
await server.register(swagger, {
  swagger: {
    info: {
      title: 'Insights Service API',
      description: 'Cross-service analytics, reporting, and data export API',
      version: '1.0.0',
    },
    host: `localhost:${PORT}`,
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'dashboard', description: 'Dashboard metrics and analytics' },
      { name: 'reports', description: 'Custom report management' },
      { name: 'exports', description: 'Data export operations' },
    ],
  },
});

await server.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
});

// Health check
server.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    service: 'insights-service',
    timestamp: new Date().toISOString(),
  };
});

// Register routes
await server.register(dashboardRoutes, { prefix: '/api' });
await server.register(reportsRoutes, { prefix: '/api' });
await server.register(exportsRoutes, { prefix: '/api' });

// Start server
try {
  await server.listen({ port: PORT, host: HOST });
  logger.info(`🚀 Insights Service running on http://${HOST}:${PORT}`);
  logger.info(`📚 API Documentation available at http://${HOST}:${PORT}/docs`);
  logger.info('');
  logger.info('Available endpoints:');
  logger.info('  Dashboard Metrics:');
  logger.info('    GET  /api/dashboard/metrics - Get all dashboard metrics');
  logger.info('    GET  /api/dashboard/metrics/:metricType - Get specific metric');
  logger.info('    GET  /api/dashboard/top-qr-codes - Top performing QR codes');
  logger.info('    GET  /api/dashboard/geographic - Geographic distribution');
  logger.info('    GET  /api/dashboard/devices - Device breakdown');
  logger.info('    GET  /api/dashboard/trend - Scan trend over time');
  logger.info('');
  logger.info('  Custom Reports:');
  logger.info('    POST   /api/reports - Create custom report');
  logger.info('    GET    /api/reports - List all reports');
  logger.info('    POST   /api/reports/:reportId/execute - Execute report');
  logger.info('    GET    /api/reports/:reportId/executions - Get execution history');
  logger.info('    PATCH  /api/reports/:reportId/schedule - Update schedule');
  logger.info('    DELETE /api/reports/:reportId - Delete report');
  logger.info('');
  logger.info('  Data Exports:');
  logger.info('    POST /api/exports - Create data export');
  logger.info('    GET  /api/exports/:exportId - Get export status');
  logger.info('    GET  /api/exports - List organization exports');
} catch (err) {
  logger.error(err);
  process.exit(1);
}

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('🛑 Shutting down Insights Service gracefully...');
  
  try {
    await server.close();
    logger.info('✅ Insights Service shut down successfully');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
