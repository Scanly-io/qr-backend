import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { customDomains, domainVerificationLogs, domainRoutes } from '../schema.js';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /domains/:id
 * 
 * Get detailed information about a specific custom domain.
 * Includes verification logs for debugging.
 */
export default async function getDomainRoute(app: FastifyInstance) {
  app.get('/domains/:id', {
    schema: {
      description: 'Get domain details with verification logs',
      tags: ['domains'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { id } = req.params as any;
      const userId = (req as any).userId || 'user-demo'; // From auth middleware

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

      // Get verification logs
      const logs = await db
        .select()
        .from(domainVerificationLogs)
        .where(eq(domainVerificationLogs.domainId, id))
        .orderBy(desc(domainVerificationLogs.attemptedAt))
        .limit(10);

      // Get routing rules
      const routes = await db
        .select()
        .from(domainRoutes)
        .where(eq(domainRoutes.domainId, id))
        .orderBy(desc(domainRoutes.priority));

      return reply.send({ 
        domain,
        verificationLogs: logs,
        routes,
      });
    } catch (error: any) {
      req.log.error(error, 'Error fetching custom domain');
      return reply.code(500).send({ error: 'Failed to fetch custom domain' });
    }
  });
}
