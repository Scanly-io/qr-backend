import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { geoFences } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { publishEvent } from '@qr/common';

/**
 * DELETE /geo-fences/:id
 * 
 * Remove a geo-fence.
 */
export default async function deleteGeoFenceRoute(app: FastifyInstance) {
  app.delete('/geo-fences/:id', {
    schema: {
      description: 'Delete a geo-fence',
      tags: ['geo-fences'],
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

      const [fence] = await db
        .select()
        .from(geoFences)
        .where(and(
          eq(geoFences.id, id),
          eq(geoFences.userId, userId)
        ))
        .limit(1);

      if (!fence) {
        return reply.code(404).send({ error: 'Geo-fence not found' });
      }

      await db.delete(geoFences).where(eq(geoFences.id, id));

      await publishEvent('geo_fence.deleted', {
        eventType: 'geo_fence.deleted',
        geoFenceId: id,
        qrId: fence.qrId,
        userId,
      });

      return reply.send({ 
        success: true,
        message: `Geo-fence ${fence.name} removed successfully`,
      });
    } catch (error: any) {
      req.log.error(error, 'Error deleting geo-fence');
      return reply.code(500).send({ error: 'Failed to delete geo-fence' });
    }
  });
}
