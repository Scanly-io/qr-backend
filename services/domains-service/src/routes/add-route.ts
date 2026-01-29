import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { customDomains, domainRoutes } from '../schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * POST /domains/:id/routes
 * 
 * Add a routing rule for path-based routing on a custom domain.
 * 
 * Body:
 * {
 *   pathPattern: "/lunch",
 *   matchType: "exact",
 *   qrId: "qr-menu-lunch",
 *   priority: 10
 * }
 */
export default async function addRouteRoute(app: FastifyInstance) {
  app.post('/domains/:id/routes', {
    schema: {
      description: 'Add a routing rule for path-based routing',
      tags: ['routes'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Domain ID' }
        }
      },
      body: {
        type: 'object',
        required: ['pathPattern', 'qrId'],
        properties: {
          pathPattern: { type: 'string', description: 'URL path pattern (e.g., /lunch)' },
          matchType: { type: 'string', enum: ['exact', 'prefix', 'regex'], default: 'exact' },
          qrId: { type: 'string', description: 'QR code ID to route to' },
          priority: { type: 'number', description: 'Priority (higher = checked first)', default: 100 }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { id } = req.params as any;
      const { pathPattern, matchType, qrId, priority } = req.body as any;
      const userId = (req as any).userId || 'user-demo'; // From auth middleware

      // Verify domain ownership
      const [domain] = await db
        .select()
        .from(customDomains)
        .where(and(
          eq(customDomains.id, id),
          eq(customDomains.userId, userId)
        ))
        .limit(1);

      if (!domain) {
        return reply.code(404).send({ error: 'Domain not found' });
      }

      // Create routing rule
      const [route] = await db
        .insert(domainRoutes)
        .values({
          domainId: id,
          pathPattern,
          matchType: matchType || 'exact',
          qrId,
          priority: priority?.toString() || '100',
          isActive: true,
        })
        .returning();

      return reply.code(201).send({ route });
    } catch (error: any) {
      req.log.error(error, 'Error adding domain route');
      return reply.code(500).send({ error: 'Failed to add domain route' });
    }
  });
}
