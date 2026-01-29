import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { retargetingPixels } from '../schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * PATCH /pixels/:id
 * 
 * Update a pixel configuration.
 */
export default async function updatePixelRoute(app: FastifyInstance) {
  app.patch('/pixels/:id', {
    schema: {
      description: 'Update pixel configuration',
      tags: ['pixels'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          isActive: { type: 'boolean' },
          config: { type: 'object' },
          triggerEvent: { type: 'string', enum: ['page_view', 'button_click', 'lead_capture', 'custom'] }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { id } = req.params as any;
      const userId = (req as any).userId || 'user-demo';
      const { name, isActive, config, triggerEvent } = req.body as any;

      // Verify ownership
      const [existing] = await db
        .select()
        .from(retargetingPixels)
        .where(and(
          eq(retargetingPixels.id, id),
          eq(retargetingPixels.userId, userId)
        ))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({ error: 'Pixel not found' });
      }

      // Build update object
      const updates: any = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (isActive !== undefined) updates.isActive = isActive;
      if (config !== undefined) updates.config = config;
      if (triggerEvent !== undefined) updates.triggerEvent = triggerEvent;

      // Update pixel
      const [updated] = await db
        .update(retargetingPixels)
        .set(updates)
        .where(eq(retargetingPixels.id, id))
        .returning();

      return reply.send({ pixel: updated });
    } catch (error: any) {
      req.log.error(error, 'Error updating pixel');
      return reply.code(500).send({ error: 'Failed to update pixel' });
    }
  });
}
