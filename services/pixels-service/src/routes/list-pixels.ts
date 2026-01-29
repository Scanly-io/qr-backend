import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { retargetingPixels } from '../schema.js';
import { eq, desc, and } from 'drizzle-orm';

/**
 * GET /pixels
 * 
 * List all pixels for authenticated user.
 */
export default async function listPixelsRoute(app: FastifyInstance) {
  app.get('/pixels', {
    schema: {
      description: 'List all retargeting pixels',
      tags: ['pixels'],
      querystring: {
        type: 'object',
        properties: {
          qrId: { type: 'string', description: 'Filter by QR code ID' },
          platform: { type: 'string', description: 'Filter by platform' }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const userId = (req as any).userId || 'user-demo';
      const { qrId, platform } = req.query as any;

      // Build conditions
      const conditions = [eq(retargetingPixels.userId, userId)];
      if (qrId) conditions.push(eq(retargetingPixels.qrId, qrId));
      if (platform) conditions.push(eq(retargetingPixels.platform, platform));

      const pixels = await db
        .select()
        .from(retargetingPixels)
        .where(and(...conditions))
        .orderBy(desc(retargetingPixels.createdAt));

      return reply.send({ pixels });
    } catch (error: any) {
      req.log.error(error, 'Error fetching pixels');
      return reply.code(500).send({ error: 'Failed to fetch pixels' });
    }
  });
}
