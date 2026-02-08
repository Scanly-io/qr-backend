import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { experiments } from '../schema';
import { eq, and } from 'drizzle-orm';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics';

export const startExperimentRoute: FastifyPluginAsync = async (server) => {
  server.post<{
    Params: {
      id: string;
    };
  }>('/experiments/:id/start', async (request, reply) => {
    try {
      const userId = request.headers['x-user-id'] as string;
      
      if (!userId) {
        return reply.status(401).send({ error: 'User ID required in headers' });
      }
      
      const { id } = request.params;
      
      // Get experiment
      const experiment = await db.query.experiments.findFirst({
        where: and(
          eq(experiments.id, id),
          eq(experiments.userId, userId)
        ),
        with: {
          variants: true,
        },
      });
      
      if (!experiment) {
        return reply.status(404).send({ error: 'Experiment not found' });
      }
      
      // Validate experiment can be started
      if (experiment.status === 'active') {
        return reply.status(400).send({ error: 'Experiment is already active' });
      }
      
      if (experiment.status === 'completed') {
        return reply.status(400).send({ error: 'Cannot restart completed experiment' });
      }
      
      if (experiment.variants.length < 2) {
        return reply.status(400).send({ error: 'Experiment must have at least 2 variants' });
      }
      
      // Start experiment
      const [updatedExperiment] = await db.update(experiments)
        .set({
          status: 'active',
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(experiments.id, id))
        .returning();
      
      // Publish event
      await publishEvent(TOPICS.EXPERIMENT_STARTED, {
        experimentId: updatedExperiment.id,
        userId,
        name: updatedExperiment.name,
        variantCount: experiment.variants.length,
      });
      
      return reply.send({
        experiment: updatedExperiment,
        message: 'Experiment started successfully',
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to start experiment' });
    }
  });
};
