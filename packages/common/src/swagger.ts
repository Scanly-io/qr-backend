/**
 * Swagger Registration Helper
 * 
 * Reduces ~25 lines of Swagger boilerplate per service to a single function call.
 * 
 * USAGE:
 *   import { registerSwagger } from '@qr/common';
 *   await registerSwagger(app, {
 *     title: 'Analytics Service API',
 *     description: 'QR code scan analytics',
 *     version: '1.0.0',
 *     port: 3004,
 *     tags: [{ name: 'Analytics', description: 'Analytics operations' }],
 *   });
 */

import type { FastifyInstance } from 'fastify';

export interface SwaggerOptions {
  title: string;
  description?: string;
  version?: string;
  port?: number;
  tags?: Array<{ name: string; description: string }>;
  routePrefix?: string;
}

/**
 * Register @fastify/swagger and @fastify/swagger-ui with sensible defaults.
 * 
 * Services must still install @fastify/swagger and @fastify/swagger-ui in
 * their own package.json since they're Fastify plugins, not @qr/common deps.
 */
export async function registerSwagger(
  app: FastifyInstance,
  options: SwaggerOptions
): Promise<void> {
  const {
    title,
    description = '',
    version = '1.0.0',
    port = 3000,
    tags = [],
    routePrefix = '/docs',
  } = options;

  // Dynamically import to avoid requiring these as @qr/common dependencies
  const [{ default: fastifySwagger }, { default: fastifySwaggerUi }] = await Promise.all([
    import('@fastify/swagger'),
    import('@fastify/swagger-ui'),
  ]);

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title,
        description,
        version,
      },
      servers: [
        {
          url: `http://localhost:${port}`,
          description: 'Development server',
        },
      ],
      tags,
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });
}
