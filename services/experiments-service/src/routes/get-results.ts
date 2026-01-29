import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { experimentResults } from '../schema';
import { eq } from 'drizzle-orm';

export const getExperimentResultsRoute: FastifyPluginAsync = async (server) => {
  server.get<{
    Params: {
      id: string;
    };
  }>('/experiments/:id/results', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const results = await db.query.experimentResults.findFirst({
        where: eq(experimentResults.experimentId, id),
        with: {
          experiment: {
            with: {
              variants: true,
            },
          },
        },
      });
      
      if (!results) {
        return reply.status(404).send({
          error: 'No results found for this experiment',
          hint: 'Run analysis first using POST /experiments/:id/analyze',
        });
      }
      
      return reply.send({
        results,
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to get experiment results' });
    }
  });
};
