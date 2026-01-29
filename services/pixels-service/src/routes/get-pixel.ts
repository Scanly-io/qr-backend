import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { retargetingPixels } from '../schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * GET /pixels/:id
 * 
 * Get detailed information about a specific pixel.
 */
export default async function getPixelRoute(app: FastifyInstance) {
  app.get('/pixels/:id', {
    schema: {
      description: 'Get pixel details',
      tags: ['pixels'],
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
      const userId = (req as any).userId || 'user-demo';

      const [pixel] = await db
        .select()
        .from(retargetingPixels)
        .where(and(
          eq(retargetingPixels.id, id),
          eq(retargetingPixels.userId, userId)
        ))
        .limit(1);

      if (!pixel) {
        return reply.code(404).send({ error: 'Pixel not found' });
      }

      return reply.send({ pixel });
    } catch (error: any) {
      req.log.error(error, 'Error fetching pixel');
      return reply.code(500).send({ error: 'Failed to fetch pixel' });
    }
  });
}
