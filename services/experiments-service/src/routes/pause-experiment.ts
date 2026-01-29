import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { experiments } from '../schema';
import { eq, and } from 'drizzle-orm';
import { publishEvent, TOPICS } from '../kafka';

export const pauseExperimentRoute: FastifyPluginAsync = async (server) => {
  server.post<{ Params: { id: string } }>('/experiments/:id/pause', async (request, reply) => {
    try {
      const userId = request.headers['x-user-id'] as string;
      if (!userId) {
        return reply.status(401).send({ error: 'User ID required' });
      }
      
      const [updated] = await db.update(experiments)
        .set({ status: 'paused', updatedAt: new Date() })
        .where(and(eq(experiments.id, request.params.id), eq(experiments.userId, userId)))
        .returning();
      
      if (!updated) {
        return reply.status(404).send({ error: 'Experiment not found' });
      }
      
      await publishEvent(TOPICS.EXPERIMENT_PAUSED, {
        experimentId: updated.id,
        userId,
        name: updated.name,
      });
      
      return reply.send({ experiment: updated, message: 'Experiment paused' });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to pause experiment' });
    }
  });
};
