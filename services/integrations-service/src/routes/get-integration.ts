import { db } from '../db';
import { integrations } from '../schema';
import { eq, and } from 'drizzle-orm';
import { verifyJWT } from '@qr/common';

export default async function getIntegrationRoute(server: any) {
  server.get('/integrations/:id', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      const [integration] = await db.select()
        .from(integrations)
        .where(and(
          eq(integrations.id, id),
          eq(integrations.userId, userId)
        ));

      if (!integration) {
        return reply.status(404).send({ error: 'Integration not found' });
      }

      return reply.send({ integration });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch integration' });
    }
  });
}
