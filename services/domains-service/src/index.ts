import 'dotenv/config';
import { buildServer, logger, createConsumer, publishEvent, subscribeToEvents } from '@qr/common';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import { db } from './db.js';
import { customDomains } from './schema.js';
import { eq } from 'drizzle-orm';

// Import individual route handlers
import createDomainRoute from './routes/create-domain.js';
import listDomainsRoute from './routes/list-domains.js';
import getDomainRoute from './routes/get-domain.js';
import verifyDomainRoute from './routes/verify-domain.js';
import deleteDomainRoute from './routes/delete-domain.js';
import addRouteRoute from './routes/add-route.js';

// Subdomain routes
import claimSubdomainRoute from './routes/claim-subdomain.js';
import checkSubdomainRoute from './routes/check-subdomain.js';
import getMySubdomainRoute from './routes/get-my-subdomain.js';
import updateSubdomainRoute from './routes/update-subdomain.js';
import addSubdomainRouteRoute from './routes/add-subdomain-route.js';
import listSubdomainRoutesRoute from './routes/list-subdomain-routes.js';
import deleteSubdomainRouteRoute from './routes/delete-subdomain-route.js';
import publishSubdomainRoute from './routes/publish-subdomain.js';

/**
 * ==========================================
 * DOMAINS SERVICE
 * ==========================================
 * 
 * Manages custom branded domains for QR codes.
 * Allows users to use their own domains (scan.yourbrand.com) instead of platform domain.
 * 
 * Event-Driven Architecture:
 * - Publishes: domain.created, domain.verified, domain.failed, domain.deleted
 * - Subscribes: qr.created, qr.deleted, user.deleted
 */

async function buildApp() {
  const app = buildServer();

  // Register Swagger documentation
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Domains Service API',
        description: 'Custom domain management for QR codes',
        version: '1.0.0',
      },
      tags: [
        { name: 'domains', description: 'Domain management endpoints' },
        { name: 'routes', description: 'Path-based routing rules' },
        { name: 'subdomains', description: 'Free branded subdomains (Linktree-style)' },
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
    return { status: 'healthy', service: 'domains-service' };
  });

  // Register route handlers
  await app.register(createDomainRoute);
  await app.register(listDomainsRoute);
  await app.register(getDomainRoute);
  await app.register(verifyDomainRoute);
  await app.register(deleteDomainRoute);
  await app.register(addRouteRoute);

  // Register subdomain routes
  await app.register(claimSubdomainRoute);
  await app.register(checkSubdomainRoute);
  await app.register(getMySubdomainRoute);
  await app.register(updateSubdomainRoute);
  await app.register(addSubdomainRouteRoute);
  await app.register(listSubdomainRoutesRoute);
  await app.register(deleteSubdomainRouteRoute);

  return app;
}

/**
 * Event Handlers
 * Handle events from other microservices
 */
const eventHandlers = {
  // When a QR code is created, optionally link it to existing domains
  'qr.created': async (event: any) => {
    logger.info({ event }, 'Received qr.created event');
    
    // Future: Auto-suggest domains based on user's existing domains
    // Future: Auto-create routing rules based on QR metadata
  },

  // When a QR code is deleted, update or remove domain routes
  'qr.deleted': async (event: any) => {
    logger.info({ event }, 'Received qr.deleted event');
    
    try {
      const { qrId } = event;
      
      // Find domains linked to this QR code
      const linkedDomains = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.qrId, qrId));
      
      if (linkedDomains.length > 0) {
        logger.info({ qrId, count: linkedDomains.length }, 'Unlinking domains from deleted QR');
        
        // Unlink domains (set qrId to null instead of deleting domains)
        await db
          .update(customDomains)
          .set({ qrId: null })
          .where(eq(customDomains.qrId, qrId));
      }
    } catch (error) {
      logger.error({ error, event }, 'Error handling qr.deleted event');
    }
  },

  // When a user is deleted, remove all their custom domains
  'user.deleted': async (event: any) => {
    logger.info({ event }, 'Received user.deleted event');
    
    try {
      const { userId } = event;
      
      // Delete all domains for this user (cascades to routes and logs)
      const deleted = await db
        .delete(customDomains)
        .where(eq(customDomains.userId, userId))
        .returning();
      
      logger.info({ userId, count: deleted.length }, 'Deleted domains for user');
      
      // Publish events for each deleted domain
      for (const domain of deleted) {
        await publishEvent('domain.deleted', {
          eventType: 'domain.deleted',
          domainId: domain.id,
          domain: domain.domain,
          userId,
          reason: 'user_deleted',
        });
      }
    } catch (error) {
      logger.error({ error, event }, 'Error handling user.deleted event');
    }
  },
};

/**
 * Handle QR code deletion
 * Clean up associated custom domains
 */
async function handleQRDeleted(event: any) {
  const { qrId } = event;
};

/**
 * Start Service
 */
async function start() {
  try {
    // Initialize Kafka consumer and subscribe to events
    logger.info('Initializing Kafka...');
    const consumer = await createConsumer('domains-service-group');
    
    // Subscribe to events from other services
    logger.info('Subscribing to events...');
    await subscribeToEvents(consumer, ['qr.created', 'qr.deleted', 'user.deleted'], eventHandlers);
    
    // Build and start HTTP server
    logger.info('Building HTTP server...');
    const app = await buildApp();
    
    const port = parseInt(process.env.PORT || '3010', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    
    logger.info(`🚀 Domains Service running on http://${host}:${port}`);
    logger.info(`📚 API docs available at http://${host}:${port}/docs`);
    logger.info(`📊 Health check at http://${host}:${port}/health`);
  } catch (error) {
    logger.error({ error }, 'Failed to start Domains Service');
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
