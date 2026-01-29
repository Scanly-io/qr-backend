import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';

// Routes
import assetRoutes from './routes/assets.js';
import maintenanceRoutes from './routes/maintenance.js';
import serviceRequestRoutes from './routes/service-requests.js';
import inspectionRoutes from './routes/inspections.js';
import locationRoutes from './routes/locations.js';
import reportingRoutes from './routes/reporting.js';

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

async function start() {
  try {
    // Register plugins
    await server.register(cors, {
      origin: true, // Allow all origins in dev, restrict in production
    });

    await server.register(helmet, {
      contentSecurityPolicy: false, // Disable for API
    });

    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'supersecretkey-change-in-production',
    });

    // Health check
    server.get('/health', async () => {
      return { 
        status: 'healthy', 
        service: 'asset-service',
        timestamp: new Date().toISOString() 
      };
    });

    // Register routes
    await server.register(assetRoutes, { prefix: '/api/assets' });
    await server.register(maintenanceRoutes, { prefix: '/api/maintenance' });
    await server.register(serviceRequestRoutes, { prefix: '/api/service-requests' });
    await server.register(inspectionRoutes, { prefix: '/api/inspections' });
    await server.register(locationRoutes, { prefix: '/api/locations' });
    await server.register(reportingRoutes, { prefix: '/api/reports' });

    const port = parseInt(process.env.PORT || '3021', 10);
    await server.listen({ port, host: '0.0.0.0' });

    server.log.info(`🏭 Asset Management Service running on port ${port}`);
    server.log.info(`📋 Routes registered:`);
    server.log.info(`   - /api/assets - Asset CRUD & QR assignment`);
    server.log.info(`   - /api/maintenance - Maintenance tracking`);
    server.log.info(`   - /api/service-requests - Service tickets`);
    server.log.info(`   - /api/inspections - Compliance & inspections`);
    server.log.info(`   - /api/locations - Location management`);
    server.log.info(`   - /api/reports - Analytics & reporting`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
