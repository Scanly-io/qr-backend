import { z } from 'zod';
import { db } from '../db';
import { webhooks } from '../schema';
import { publishEvent, TOPICS } from '../kafka';
import { verifyJWT } from '@qr/common';

const createWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  triggers: z.array(z.string()).min(1),
  filters: z.record(z.any()).optional(),
  headers: z.record(z.string()).optional(),
  bodyTemplate: z.string().optional(),
  secret: z.string().optional(),
  retryEnabled: z.boolean().default(true),
  maxRetries: z.number().min(0).max(10).default(3),
  retryDelay: z.number().min(0).default(300),
});

export default async function createWebhookRoute(server: any) {
  server.post('/webhooks', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const data = createWebhookSchema.parse(request.body);

      const [webhook] = await db.insert(webhooks).values({
        userId,
        ...data,
      }).returning();

      // Publish event
      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        userId,
        webhookId: webhook.id,
        type: 'webhook',
        timestamp: new Date().toISOString(),
      });

      return reply.status(201).send({ webhook });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to create webhook' });
    }
  });
}
