import 'dotenv/config';
import { buildServer, logger } from '@qr/common';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import { initKafka, subscribeToEvents, publishEvent } from './kafka.js';
import { db } from './db.js';
import { linkSchedules, geoFences } from './schema.js';
import { eq } from 'drizzle-orm';

// Import route handlers
import createScheduleRoute from './routes/create-schedule.js';
import listSchedulesRoute from './routes/list-schedules.js';
import deleteScheduleRoute from './routes/delete-schedule.js';
import createGeoFenceRoute from './routes/create-geo-fence.js';
import listGeoFencesRoute from './routes/list-geo-fences.js';
import deleteGeoFenceRoute from './routes/delete-geo-fence.js';

/**
 * ==========================================
 * ROUTING SERVICE
 * ==========================================
 * 
 * Smart QR code routing based on time and location.
 * 
 * Features:
 * 1. Link Scheduling - Time-based routing (business hours, events, seasons)
 * 2. Geo-Fencing - Location-based routing (country, city, radius)
 * 
 * Event-Driven Architecture:
 * - Publishes: schedule.created, schedule.deleted, geo_fence.created, geo_fence.deleted, route.matched
 * - Subscribes: qr.deleted, user.deleted, qr.scanned
 */

async function buildApp() {
  const app = buildServer();

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Routing Service API',
        description: 'Smart routing - scheduling and geo-fencing for QR codes',
        version: '1.0.0',
      },
      tags: [
        { name: 'schedules', description: 'Time-based routing endpoints' },
        { name: 'geo-fences', description: 'Location-based routing endpoints' },
      ],
    },
  });

  await app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Register route handlers
  await app.register(createScheduleRoute);
  await app.register(listSchedulesRoute);
  await app.register(deleteScheduleRoute);
  await app.register(createGeoFenceRoute);
  await app.register(listGeoFencesRoute);
  await app.register(deleteGeoFenceRoute);

  return app;
}

/**
 * Event Handlers
 */
const eventHandlers = {
  'qr.deleted': async (event: any) => {
    logger.info({ event }, 'Received qr.deleted event');
    
    try {
      const { qrId } = event;
      
      // Delete schedules for this QR
      const deletedSchedules = await db
        .delete(linkSchedules)
        .where(eq(linkSchedules.qrId, qrId))
        .returning();
      
      // Delete geo-fences for this QR
      const deletedFences = await db
        .delete(geoFences)
        .where(eq(geoFences.qrId, qrId))
        .returning();
      
      logger.info({ 
        qrId, 
        schedulesDeleted: deletedSchedules.length,
        fencesDeleted: deletedFences.length 
      }, 'Deleted routing rules for QR code');
    } catch (error) {
      logger.error({ error, event }, 'Error handling qr.deleted event');
    }
  },

  'user.deleted': async (event: any) => {
    logger.info({ event }, 'Received user.deleted event');
    
    try {
      const { userId } = event;
      
      // Delete all schedules for this user
      const deletedSchedules = await db
        .delete(linkSchedules)
        .where(eq(linkSchedules.userId, userId))
        .returning();
      
      // Delete all geo-fences for this user
      const deletedFences = await db
        .delete(geoFences)
        .where(eq(geoFences.userId, userId))
        .returning();
      
      logger.info({ 
        userId, 
        schedulesDeleted: deletedSchedules.length,
        fencesDeleted: deletedFences.length 
      }, 'Deleted routing rules for user');
    } catch (error) {
      logger.error({ error, event }, 'Error handling user.deleted event');
    }
  },

  'qr.scanned': async (event: any) => {
    logger.info({ event }, 'Received qr.scanned event');
    
    // Future: Automatically match schedule/geo-fence and route user
    // This would check active schedules and geo-fences in real-time
    // and return the appropriate target URL
  },
};

async function start() {
  try {
    logger.info('Initializing Kafka...');
    await initKafka();
    
    logger.info('Subscribing to events...');
    await subscribeToEvents(['qr.deleted', 'user.deleted', 'qr.scanned'], eventHandlers);
    
    logger.info('Building HTTP server...');
    const app = await buildApp();
    
    const port = parseInt(process.env.PORT || '3012', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    
    logger.info(`🚀 Routing Service running on http://${host}:${port}`);
    logger.info(`📚 API docs available at http://${host}:${port}/docs`);
    logger.info(`📊 Health check at http://${host}:${port}/health`);
  } catch (error) {
    logger.error({ error }, 'Failed to start Routing Service');
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

start();
