import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { experiments } from '../schema';
import { eq, and } from 'drizzle-orm';

const updateExperimentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  goalUrl: z.string().url().optional(),
  goalEventName: z.string().max(100).optional(),
  trafficAllocation: z.number().min(0).max(100).optional(),
  autoSelectWinner: z.boolean().optional(),
  minSampleSize: z.number().min(10).optional(),
  confidenceLevel: z.number().min(0).max(1).optional(),
  scheduledEndAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateExperimentRoute: FastifyPluginAsync = async (server) => {
  server.patch<{
    Params: { id: string };
    Body: z.infer<typeof updateExperimentSchema>;
  }>('/experiments/:id', async (request, reply) => {
    try {
      const userId = request.headers['x-user-id'] as string;
      if (!userId) {
        return reply.status(401).send({ error: 'User ID required' });
      }
      
      const { id } = request.params;
      const body = updateExperimentSchema.parse(request.body);
      
      // Convert confidenceLevel to string if provided
      const updateData: any = { ...body, updatedAt: new Date() };
      if (body.confidenceLevel !== undefined) {
        updateData.confidenceLevel = body.confidenceLevel.toString();
      }
      
      const [updated] = await db.update(experiments)
        .set(updateData)
        .where(and(eq(experiments.id, id), eq(experiments.userId, userId)))
        .returning();
      
      if (!updated) {
        return reply.status(404).send({ error: 'Experiment not found' });
      }
      
      return reply.send({ experiment: updated });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to update experiment' });
    }
  });
};
