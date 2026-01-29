import { db } from '../db';
import { integrations } from '../schema';
import { eq, and } from 'drizzle-orm';
import { verifyJWT } from '@qr/common';

export default async function disconnectIntegrationRoute(server: any) {
  server.delete('/integrations/:id', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      await db.delete(integrations)
        .where(and(
          eq(integrations.id, id),
          eq(integrations.userId, userId)
        ));

      return reply.status(204).send();
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to disconnect integration' });
    }
  });
}
