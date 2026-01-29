import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { experiments, experimentVariants } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export const listExperimentsRoute: FastifyPluginAsync = async (server) => {
  server.get<{
    Querystring: {
      status?: string;
      type?: string;
      limit?: number;
      offset?: number;
    };
  }>('/experiments', async (request, reply) => {
    try {
      const userId = request.headers['x-user-id'] as string;
      
      if (!userId) {
        return reply.status(401).send({ error: 'User ID required in headers' });
      }
      
      const { status, type, limit = 20, offset = 0 } = request.query;
      
      // Build query conditions
      const conditions = [eq(experiments.userId, userId)];
      
      if (status) {
        conditions.push(eq(experiments.status, status as any));
      }
      
      if (type) {
        conditions.push(eq(experiments.type, type as any));
      }
      
      // Get experiments with variants
      const userExperiments = await db.query.experiments.findMany({
        where: and(...conditions),
        with: {
          variants: true,
        },
        orderBy: [desc(experiments.createdAt)],
        limit,
        offset,
      });
      
      // Get total count
      const totalCount = await db.query.experiments.findMany({
        where: and(...conditions),
      });
      
      return reply.send({
        experiments: userExperiments,
        pagination: {
          total: totalCount.length,
          limit,
          offset,
          hasMore: offset + limit < totalCount.length,
        },
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to list experiments' });
    }
  });
};
