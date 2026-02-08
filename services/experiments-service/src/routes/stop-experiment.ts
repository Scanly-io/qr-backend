import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { experiments } from '../schema';
import { eq, and } from 'drizzle-orm';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics';

export const stopExperimentRoute: FastifyPluginAsync = async (server) => {
  server.post<{ Params: { id: string } }>('/experiments/:id/stop', async (request, reply) => {
    try {
      const userId = request.headers['x-user-id'] as string;
      if (!userId) {
        return reply.status(401).send({ error: 'User ID required' });
      }
      
      const [updated] = await db.update(experiments)
        .set({ status: 'completed', endedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(experiments.id, request.params.id), eq(experiments.userId, userId)))
        .returning();
      
      if (!updated) {
        return reply.status(404).send({ error: 'Experiment not found' });
      }
      
      await publishEvent(TOPICS.EXPERIMENT_COMPLETED, {
        experimentId: updated.id,
        userId,
        name: updated.name,
      });
      
      return reply.send({ experiment: updated, message: 'Experiment stopped' });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to stop experiment' });
    }
  });
};
