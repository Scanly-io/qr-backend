import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { experimentVariants } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteVariantRoute: FastifyPluginAsync = async (server) => {
  server.delete<{ Params: { variantId: string } }>('/variants/:variantId', async (request, reply) => {
    try {
      await db.delete(experimentVariants)
        .where(eq(experimentVariants.id, request.params.variantId));
      
      return reply.send({ message: 'Variant deleted successfully' });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete variant' });
    }
  });
};
