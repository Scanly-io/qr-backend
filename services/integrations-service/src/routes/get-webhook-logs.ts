import { db } from '../db';
import { webhooks, webhookLogs } from '../schema';
import { eq, and } from 'drizzle-orm';
import { verifyJWT } from '@qr/common';

export default async function getWebhookLogsRoute(server: any) {
  server.get('/webhooks/:id/logs', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      // Verify webhook ownership
      const [webhook] = await db.select()
        .from(webhooks)
        .where(and(
          eq(webhooks.id, id),
          eq(webhooks.userId, userId)
        ));

      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }

      // Get logs
      const logs = await db.select()
        .from(webhookLogs)
        .where(eq(webhookLogs.webhookId, id))
        .orderBy(webhookLogs.createdAt)
        .limit(100);

      return reply.send({ logs });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch logs' });
    }
  });
}
