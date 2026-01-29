import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { experimentVariants } from '../schema';
import { eq } from 'drizzle-orm';

const updateVariantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  trafficWeight: z.number().min(0).max(100).optional(),
  targetUrl: z.string().url().optional(),
  changes: z.any().optional(),
});

export const updateVariantRoute: FastifyPluginAsync = async (server) => {
  server.patch<{
    Params: { variantId: string };
    Body: z.infer<typeof updateVariantSchema>;
  }>('/variants/:variantId', async (request, reply) => {
    try {
      const body = updateVariantSchema.parse(request.body);
      
      const [variant] = await db.update(experimentVariants)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(experimentVariants.id, request.params.variantId))
        .returning();
      
      if (!variant) {
        return reply.status(404).send({ error: 'Variant not found' });
      }
      
      return reply.send({ variant });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to update variant' });
    }
  });
};
