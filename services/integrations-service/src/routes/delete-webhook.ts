import { db } from '../db';
import { webhooks } from '../schema';
import { eq, and } from 'drizzle-orm';
import { verifyJWT } from '@qr/common';

export default async function deleteWebhookRoute(server: any) {
  server.delete('/webhooks/:id', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      const [deleted] = await db.delete(webhooks)
        .where(and(
          eq(webhooks.id, id),
          eq(webhooks.userId, userId)
        ))
        .returning();

      if (!deleted) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }

      return reply.status(204).send();
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete webhook' });
    }
  });
}
