import 'dotenv/config';
import { buildServer, logger, createConsumer, publishEvent, subscribeToEvents } from '@qr/common';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import { db } from './db.js';
import { retargetingPixels } from './schema.js';
import { eq } from 'drizzle-orm';

// Import individual route handlers
import createPixelRoute from './routes/create-pixel.js';
import listPixelsRoute from './routes/list-pixels.js';
import getPixelRoute from './routes/get-pixel.js';
import updatePixelRoute from './routes/update-pixel.js';
import deletePixelRoute from './routes/delete-pixel.js';
import listTemplatesRoute from './routes/list-templates.js';

/**
 * ==========================================
 * PIXELS SERVICE
 * ==========================================
 * 
 * Manages retargeting pixels for QR code microsites.
 * Enables users to track QR scanners with Facebook Pixel, Google Ads, TikTok, etc.
 * 
 * Event-Driven Architecture:
 * - Publishes: pixel.created, pixel.fired, pixel.deleted
 * - Subscribes: qr.deleted, user.deleted, microsite.viewed
 */

async function buildApp() {
  const app = buildServer();

  // Register Swagger documentation
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Pixels Service API',
        description: 'Retargeting pixel management for QR codes',
        version: '1.0.0',
      },
      tags: [
        { name: 'pixels', description: 'Pixel management endpoints' },
        { name: 'templates', description: 'Pixel template endpoints' },
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

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'healthy', service: 'pixels-service' };
  });

  // Register route handlers
  await app.register(createPixelRoute);
  await app.register(listPixelsRoute);
  await app.register(getPixelRoute);
  await app.register(updatePixelRoute);
  await app.register(deletePixelRoute);
  await app.register(listTemplatesRoute);

  return app;
}

/**
 * Event Handlers
 * Handle events from other microservices
 */
const eventHandlers = {
  // When a QR code is deleted, remove associated pixels
  'qr.deleted': async (event: any) => {
    logger.info({ event }, 'Received qr.deleted event');
    
    try {
      const { qrId } = event;
      
      // Delete pixels linked to this QR code
      const deleted = await db
        .delete(retargetingPixels)
        .where(eq(retargetingPixels.qrId, qrId))
        .returning();
      
      if (deleted.length > 0) {
        logger.info({ qrId, count: deleted.length }, 'Deleted pixels for QR code');
        
        // Publish events for each deleted pixel
        for (const pixel of deleted) {
          await publishEvent('pixel.deleted', {
            eventType: 'pixel.deleted',
            pixelId: pixel.id,
            qrId,
            reason: 'qr_deleted',
          });
        }
      }
    } catch (error) {
      logger.error({ error, event }, 'Error handling qr.deleted event');
    }
  },

  // When a user is deleted, remove all their pixels
  'user.deleted': async (event: any) => {
    logger.info({ event }, 'Received user.deleted event');
    
    try {
      const { userId } = event;
      
      // Delete all pixels for this user
      const deleted = await db
        .delete(retargetingPixels)
        .where(eq(retargetingPixels.userId, userId))
        .returning();
      
      logger.info({ userId, count: deleted.length }, 'Deleted pixels for user');
      
      // Publish events for each deleted pixel
      for (const pixel of deleted) {
        await publishEvent('pixel.deleted', {
          eventType: 'pixel.deleted',
          pixelId: pixel.id,
          userId,
          reason: 'user_deleted',
        });
      }
    } catch (error) {
      logger.error({ error, event }, 'Error handling user.deleted event');
    }
  },

  // When a microsite is viewed, log pixel fires
  'microsite.viewed': async (event: any) => {
    logger.info({ event }, 'Received microsite.viewed event');
    
    // Future: Automatically log pixel fires when microsites are viewed
    // This would track which pixels actually fired on the page
  },
};

/**
 * Start Service
 */
async function start() {
  try {
    // Initialize Kafka consumer and subscribe to events
    logger.info('Initializing Kafka...');
    const consumer = await createConsumer('pixels-service-group');
    
    // Subscribe to events from other services
    logger.info('Subscribing to events...');
    await subscribeToEvents(consumer, ['qr.deleted', 'user.deleted', 'microsite.viewed'], eventHandlers);
    
    // Build and start HTTP server
    logger.info('Building HTTP server...');
    const app = await buildApp();
    
    const port = parseInt(process.env.PORT || '3011', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    
    logger.info(`🚀 Pixels Service running on http://${host}:${port}`);
    logger.info(`📚 API docs available at http://${host}:${port}/docs`);
    logger.info(`📊 Health check at http://${host}:${port}/health`);
  } catch (error) {
    logger.error({ error }, 'Failed to start Pixels Service');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

start();
