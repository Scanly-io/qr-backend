import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { experimentVariants } from '../schema';

const addVariantSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isControl: z.boolean().default(false),
  trafficWeight: z.number().min(0).max(100).default(50),
  targetUrl: z.string().url().optional(),
  changes: z.any().optional(),
});

export const addVariantRoute: FastifyPluginAsync = async (server) => {
  server.post<{
    Params: { id: string };
    Body: z.infer<typeof addVariantSchema>;
  }>('/experiments/:id/variants', async (request, reply) => {
    try {
      const body = addVariantSchema.parse(request.body);
      
      const [variant] = await db.insert(experimentVariants).values({
        experimentId: request.params.id,
        ...body,
      }).returning();
      
      return reply.status(201).send({ variant });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to add variant' });
    }
  });
};
