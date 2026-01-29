import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { customDomains } from '../schema.js';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /domains
 * 
 * List all custom domains for authenticated user.
 */
export default async function listDomainsRoute(app: FastifyInstance) {
  app.get('/domains', {
    schema: {
      description: 'List all custom domains',
      tags: ['domains']
    }
  }, async (req, reply) => {
    try {
      const userId = (req as any).userId || 'user-demo'; // From auth middleware

      const domains = await db
        .select()
        .from(customDomains)
        .where(eq(customDomains.userId, userId))
        .orderBy(desc(customDomains.createdAt));

      return reply.send({ domains });
    } catch (error: any) {
      req.log.error(error, 'Error fetching custom domains');
      return reply.code(500).send({ error: 'Failed to fetch custom domains' });
    }
  });
}
