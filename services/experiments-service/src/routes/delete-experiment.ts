import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { experiments } from '../schema';
import { eq, and } from 'drizzle-orm';

export const deleteExperimentRoute: FastifyPluginAsync = async (server) => {
  server.delete<{ Params: { id: string } }>('/experiments/:id', async (request, reply) => {
    try {
      const userId = request.headers['x-user-id'] as string;
      if (!userId) {
        return reply.status(401).send({ error: 'User ID required' });
      }
      
      await db.delete(experiments)
        .where(and(eq(experiments.id, request.params.id), eq(experiments.userId, userId)));
      
      return reply.send({ message: 'Experiment deleted successfully' });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete experiment' });
    }
  });
};
