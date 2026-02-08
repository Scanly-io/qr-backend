import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { retargetingPixels } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { publishEvent } from '@qr/common';

/**
 * DELETE /pixels/:id
 * 
 * Remove a pixel.
 */
export default async function deletePixelRoute(app: FastifyInstance) {
  app.delete('/pixels/:id', {
    schema: {
      description: 'Delete a pixel',
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

      // Delete pixel
      await db
        .delete(retargetingPixels)
        .where(eq(retargetingPixels.id, id));

      // Publish event
      await publishEvent('pixel.deleted', {
        eventType: 'pixel.deleted',
        pixelId: id,
        userId,
        platform: pixel.platform,
      });

      return reply.send({ 
        success: true,
        message: `Pixel ${pixel.name} removed successfully`,
      });
    } catch (error: any) {
      req.log.error(error, 'Error deleting pixel');
      return reply.code(500).send({ error: 'Failed to delete pixel' });
    }
  });
}
