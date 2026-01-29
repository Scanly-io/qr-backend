import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { geoFences } from '../schema.js';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /geo-fences
 * 
 * List all geo-fences for authenticated user.
 */
export default async function listGeoFencesRoute(app: FastifyInstance) {
  app.get('/geo-fences', {
    schema: {
      description: 'List all geo-fences',
      tags: ['geo-fences'],
      querystring: {
        type: 'object',
        properties: {
          qrId: { type: 'string', description: 'Filter by QR code ID' }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const userId = (req as any).userId || 'user-demo';
      const { qrId } = req.query as any;

      const conditions = [eq(geoFences.userId, userId)];
      if (qrId) conditions.push(eq(geoFences.qrId, qrId));

      const fences = await db
        .select()
        .from(geoFences)
        .where(and(...conditions))
        .orderBy(desc(geoFences.priority), desc(geoFences.createdAt));

      return reply.send({ fences });
    } catch (error: any) {
      req.log.error(error, 'Error fetching geo-fences');
      return reply.code(500).send({ error: 'Failed to fetch geo-fences' });
    }
  });
}
