import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import proxy from '@fastify/http-proxy';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import 'dotenv/config';
import { extractAuth } from './middleware/auth.js';
import { addTenantHeaders } from './middleware/tenant.js';
import { initializeRedis, createRateLimiter } from './middleware/rateLimit.js';
import { RATE_LIMITS } from './config/rateLimits.js';
import { validateBody, validateQuery, validateJsonSize, sanitizeJsonb } from './middleware/validation.js';
import { authSchemas } from './schemas/auth.schemas.js';
import { qrSchemas } from './schemas/qr.schemas.js';
import { micrositeSchemas } from './schemas/microsite.schemas.js';

// Helper to forward requests to backend services
async function forwardToService(
  request: FastifyRequest,
  reply: FastifyReply,
  serviceUrl: string,
  path: string
) {
  const tenantHeaders = (request as any).tenantHeaders || {};
  
  // Sanitize request body if it contains JSONB-like data
  if (request.body && typeof request.body === 'object') {
    request.body = sanitizeJsonb(request.body);
  }
  
  try {
    const response = await fetch(`${serviceUrl}${path}`, {
      method: request.method,
      headers: {
        ...request.headers,
        ...tenantHeaders,
        'content-type': 'application/json',
      } as any,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    
    reply.status(response.status).send(data);
  } catch (error: any) {
    reply.status(500).send({
      error: 'Service unavailable',
      message: error.message,
    });
  }
}

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  trustProxy: true, // Important for getting real IP addresses behind proxies
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

// Initialize server
const init = async () => {
  // Initialize Redis for rate limiting
  initializeRedis();

  // Security: Register Helmet for security headers
  // @ts-ignore - Type mismatch in Fastify plugin system
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for now
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'], // Allow images from HTTPS and data URLs
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"], // Prevent iframe embedding
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for QR codes
  });

  server.log.info('✅ Security headers (Helmet) registered');

  // Security: Configure CORS (Cross-Origin Resource Sharing)
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173', // Local frontend dev
    'http://localhost:3000', // Local gateway
    'http://localhost:4173', // Vite preview
  ];

  // @ts-ignore - Type mismatch in Fastify plugin system
  await server.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in whitelist
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Check for subdomain pattern (*.yourdomain.com)
      const isDomainAllowed = allowedOrigins.some((allowed) => {
        if (allowed.startsWith('*.')) {
          const domain = allowed.slice(2); // Remove *.
          return origin.endsWith(domain);
        }
        return false;
      });

      if (isDomainAllowed) {
        callback(null, true);
        return;
      }

      // Reject
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true, // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  server.log.info('✅ CORS configured');

  // Global middleware
  // 1. Rate limiting first (protect against DDoS)
  server.addHook('onRequest', createRateLimiter(RATE_LIMITS.GATEWAY));

  // 2. Extract auth token
  server.addHook('onRequest', extractAuth);

  // 3. Add tenant context headers
  server.addHook('onRequest', addTenantHeaders);

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', service: 'tenant-gateway' };
  });

  // Register validation routes BEFORE proxy routes
  // This allows us to validate requests before they reach backend services
  
  // Auth service routes with validation
  server.post('/api/auth/signup', {
    preHandler: [
      validateJsonSize(100), // Max 100KB
      validateBody(authSchemas.signup),
    ]
  }, async (request, reply) => {
    await forwardToService(request, reply, SERVICE_ROUTES['/api/auth'], '/api/signup');
  });

  server.post('/api/auth/login', {
    preHandler: [
      createRateLimiter(RATE_LIMITS.AUTH.LOGIN), // 5 attempts per 15 min
      validateJsonSize(50),
      validateBody(authSchemas.login),
    ]
  }, async (request, reply) => {
    await forwardToService(request, reply, SERVICE_ROUTES['/api/auth'], '/api/login');
  });

  server.post('/api/auth/password-reset', {
    preHandler: [
      createRateLimiter(RATE_LIMITS.AUTH.PASSWORD_RESET),
      validateBody(authSchemas.passwordResetRequest),
    ]
  }, async (request, reply) => {
    await forwardToService(request, reply, SERVICE_ROUTES['/api/auth'], '/api/password-reset');
  });

  server.patch('/api/auth/agencies/:agencyId/white-label', {
    preHandler: [
      validateJsonSize(100),
      validateBody(authSchemas.updateWhiteLabel),
    ]
  }, async (request, reply) => {
    const { agencyId } = request.params as { agencyId: string };
    await forwardToService(request, reply, SERVICE_ROUTES['/api/auth'], `/api/agencies/${agencyId}/white-label`);
  });

  // QR service routes with validation
  server.post('/api/qr', {
    preHandler: [
      createRateLimiter(RATE_LIMITS.QR_SERVICE.CREATE), // 10 per day
      validateJsonSize(200),
      validateBody(qrSchemas.createQR),
    ]
  }, async (request, reply) => {
    await forwardToService(request, reply, SERVICE_ROUTES['/api/qr'], '/api');
  });

  server.post('/api/qr/bulk', {
    preHandler: [
      validateJsonSize(500), // Larger for bulk
      validateBody(qrSchemas.bulkCreate),
    ]
  }, async (request, reply) => {
    await forwardToService(request, reply, SERVICE_ROUTES['/api/qr'], '/api/bulk');
  });

  server.post('/api/qr/:qrId/track', {
    preHandler: [
      createRateLimiter(RATE_LIMITS.QR_SERVICE.SCAN),
      validateBody(qrSchemas.trackScan),
    ]
  }, async (request, reply) => {
    const { qrId } = request.params as { qrId: string };
    await forwardToService(request, reply, SERVICE_ROUTES['/api/qr'], `/api/${qrId}/track`);
  });

  // Microsite service routes with validation
  server.post('/api/microsites', {
    preHandler: [
      validateJsonSize(100),
      validateBody(micrositeSchemas.createMicrosite),
    ]
  }, async (request, reply) => {
    await forwardToService(request, reply, SERVICE_ROUTES['/api/microsites'], '/api');
  });

  server.post('/api/microsites/:micrositeId/blocks', {
    preHandler: [
      validateJsonSize(200),
      validateBody(micrositeSchemas.block),
    ]
  }, async (request, reply) => {
    const { micrositeId } = request.params as { micrositeId: string };
    await forwardToService(request, reply, SERVICE_ROUTES['/api/microsites'], `/api/${micrositeId}/blocks`);
  });

  server.post('/api/microsites/:micrositeId/leads', {
    preHandler: [
      createRateLimiter(RATE_LIMITS.MICROSITE_SERVICE.LEAD_SUBMISSION),
      validateJsonSize(100),
      validateBody(micrositeSchemas.submitLead),
    ]
  }, async (request, reply) => {
    const { micrositeId } = request.params as { micrositeId: string };
    await forwardToService(request, reply, SERVICE_ROUTES['/api/microsites'], `/api/${micrositeId}/leads`);
  });

  server.post('/api/microsites/:micrositeId/track', {
    preHandler: [
      validateBody(micrositeSchemas.trackEvent),
    ]
  }, async (request, reply) => {
    const { micrositeId } = request.params as { micrositeId: string };
    await forwardToService(request, reply, SERVICE_ROUTES['/api/microsites'], `/api/${micrositeId}/track`);
  });

  server.log.info('✅ Validation routes registered');

  // Register proxy routes for remaining (non-validated) services
  // Only proxy analytics, domains, pixels, routing which don't have validation yet
  const proxyOnlyServices = {
    '/api/analytics': SERVICE_ROUTES['/api/analytics'],
    '/api/domains': SERVICE_ROUTES['/api/domains'],
    '/api/pixels': SERVICE_ROUTES['/api/pixels'],
    '/api/routing': SERVICE_ROUTES['/api/routing'],
  };

  for (const [prefix, upstream] of Object.entries(proxyOnlyServices)) {
    await server.register(proxy as any, {
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
};

// Start server
const start = async () => {
  try {
    await init(); // Initialize security and routes
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(`✅ Tenant Gateway listening on port ${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};;

start();
