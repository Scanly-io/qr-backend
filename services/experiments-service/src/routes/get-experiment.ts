import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { experiments, variantAssignments, experimentResults } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getExperimentRoute: FastifyPluginAsync = async (server) => {
  server.get<{
    Params: {
      id: string;
    };
  }>('/experiments/:id', async (request, reply) => {
    try {
      const userId = request.headers['x-user-id'] as string;
      
      if (!userId) {
        return reply.status(401).send({ error: 'User ID required in headers' });
      }
      
      const { id } = request.params;
      
      // Get experiment with all related data
      const experiment = await db.query.experiments.findFirst({
        where: and(
          eq(experiments.id, id),
          eq(experiments.userId, userId)
        ),
        with: {
          variants: true,
          results: true,
        },
      });
      
      if (!experiment) {
        return reply.status(404).send({ error: 'Experiment not found' });
      }
      
      // Get assignment count for each variant
      const assignmentCounts = await db.select({
        variantId: variantAssignments.variantId,
      }).from(variantAssignments)
        .where(eq(variantAssignments.experimentId, id));
      
      // Enhance variants with assignment counts
      const variantsWithStats = experiment.variants.map(variant => ({
        ...variant,
        assignmentCount: assignmentCounts.filter(a => a.variantId === variant.id).length,
      }));
      
      return reply.send({
        experiment: {
          ...experiment,
          variants: variantsWithStats,
        },
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to get experiment' });
    }
  });
};
