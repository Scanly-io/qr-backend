import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db.js';
import { subdomains, subdomainRoutes } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { publishEvent } from '@qr/common';

/**
 * POST /subdomains/routes
 * 
 * Add a route to your subdomain (e.g., username.scanly.io/menu → QR code)
 */

const addSubdomainRouteSchema = z.object({
  slug: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  qrId: z.string().min(1, 'QR ID is required'),
  title: z.string().max(255).optional(),
  description: z.string().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const addSubdomainRoute: FastifyPluginAsync = async (app) => {
  app.post('/subdomains/routes', {
    schema: {
      description: 'Add a route to your subdomain (e.g., username.scanly.io/menu)',
      tags: ['subdomains'],
      body: {
        type: 'object',
        required: ['slug', 'qrId'],
        properties: {
          slug: { type: 'string' },
          qrId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          displayOrder: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request as any).userId;
    
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const body = addSubdomainRouteSchema.parse(request.body);

    // Find user's subdomain
    const [userSubdomain] = await db
      .select()
      .from(subdomains)
      .where(eq(subdomains.userId, userId))
      .limit(1);

    if (!userSubdomain) {
      return reply.code(404).send({ error: 'You have not claimed a subdomain yet' });
    }

    // Check if slug already exists for this subdomain
    const existingRoute = await db
      .select()
      .from(subdomainRoutes)
      .where(
        and(
          eq(subdomainRoutes.subdomainId, userSubdomain.id),
          eq(subdomainRoutes.slug, body.slug.toLowerCase())
        )
      )
      .limit(1);

    if (existingRoute.length > 0) {
      return reply.code(409).send({ 
        error: 'A route with this slug already exists on your subdomain',
        existingRoute: existingRoute[0],
      });
    }

    // Create the route
    const [newRoute] = await db
      .insert(subdomainRoutes)
      .values({
        subdomainId: userSubdomain.id,
        slug: body.slug.toLowerCase(),
        qrId: body.qrId,
        title: body.title || null,
        description: body.description || null,
        displayOrder: body.displayOrder?.toString() || '0',
        isActive: true,
        clickCount: '0',
      })
      .returning();

    // Publish event
    await publishEvent('subdomain.route.created', {
      routeId: newRoute.id,
      subdomainId: userSubdomain.id,
      userId,
      subdomain: userSubdomain.subdomain,
      slug: body.slug,
      qrId: body.qrId,
      url: `https://${userSubdomain.subdomain}.${process.env.SUBDOMAIN_BASE || 'scanly.io'}/${body.slug}`,
      createdAt: new Date().toISOString(),
    });

    return reply.code(201).send({
      message: 'Route added successfully',
      route: newRoute,
      url: `https://${userSubdomain.subdomain}.${process.env.SUBDOMAIN_BASE || 'scanly.io'}/${body.slug}`,
    });
  });
};

export default addSubdomainRoute;
