import { db } from '../db';
import { webhooks } from '../schema';
import { eq } from 'drizzle-orm';
import { verifyJWT } from '@qr/common';

export default async function listWebhooksRoute(server: any) {
  server.get('/webhooks', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const user = request.user;
      const userId = user?.id || user?.sub;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const userWebhooks = await db.select()
        .from(webhooks)
        .where(eq(webhooks.userId, userId))
        .orderBy(webhooks.createdAt);

      return reply.send({ webhooks: userWebhooks });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch webhooks' });
    }
  });
}
