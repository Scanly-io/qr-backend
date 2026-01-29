import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { customDomains } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { publishEvent } from '../kafka.js';

/**
 * DELETE /domains/:id
 * 
 * Remove a custom domain.
 * This will stop routing traffic from that domain.
 */
export default async function deleteDomainRoute(app: FastifyInstance) {
  app.delete('/domains/:id', {
    schema: {
      description: 'Delete a custom domain',
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

      // Delete domain (cascades to routes and logs)
      await db
        .delete(customDomains)
        .where(eq(customDomains.id, id));

      // Publish event: domain deleted
      await publishEvent('domain.deleted', {
        eventType: 'domain.deleted',
        domainId: id,
        domain: domain.domain,
        userId: domain.userId,
      });

      return reply.send({ 
        success: true,
        message: `Domain ${domain.domain} removed successfully`,
      });
    } catch (error: any) {
      req.log.error(error, 'Error deleting custom domain');
      return reply.code(500).send({ error: 'Failed to delete custom domain' });
    }
  });
}
