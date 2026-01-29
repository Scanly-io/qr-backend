import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import proxy from '@fastify/http-proxy';
import 'dotenv/config';
import { extractAuth } from './middleware/auth.js';
import { addTenantHeaders } from './middleware/tenant.js';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

const PORT = parseInt(process.env.PORT || '3000', 10);

// Service routing map
const SERVICE_ROUTES: Record<string, string> = {
  '/api/auth': process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  '/api/qr': process.env.QR_SERVICE_URL || 'http://qr-service:3002',
  '/api/microsites': process.env.MICROSITE_SERVICE_URL || 'http://microsite-service:3003',
  '/api/analytics': process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3004',
  '/api/domains': process.env.DOMAINS_SERVICE_URL || 'http://domains-service:3005',
  '/api/pixels': process.env.PIXELS_SERVICE_URL || 'http://pixels-service:3006',
  '/api/routing': process.env.ROUTING_SERVICE_URL || 'http://routing-service:3007',
};

// Global middleware
server.addHook('onRequest', extractAuth);
server.addHook('onRequest', addTenantHeaders);

// Health check
server.get('/health', async () => {
  return { status: 'ok', service: 'tenant-gateway' };
});

// Register proxy routes for each service
for (const [prefix, upstream] of Object.entries(SERVICE_ROUTES)) {
  server.register(proxy as any, {
    upstream,
    prefix,
    rewritePrefix: '/api',
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      // Add tenant headers to proxied request
      const tenantHeaders = (request as any).tenantHeaders || {};
      
      for (const [key, value] of Object.entries(tenantHeaders)) {
        request.headers[key.toLowerCase()] = value as string;
      }
    },
    replyOptions: {
      rewriteRequestHeaders: (originalReq: any, headers: Record<string, any>) => {
        // Forward tenant headers
        const tenantHeaders = (originalReq as any).tenantHeaders || {};
        return { ...headers, ...tenantHeaders };
      },
    },
  });

  server.log.info({ prefix, upstream }, 'Registered proxy route');
}

// Start server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(`Tenant Gateway listening on port ${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
