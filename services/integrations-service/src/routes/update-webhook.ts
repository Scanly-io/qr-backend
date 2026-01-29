import { z } from 'zod';
import { db } from '../db';
import { webhooks } from '../schema';
import { eq, and } from 'drizzle-orm';
import { verifyJWT } from '@qr/common';

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  triggers: z.array(z.string()).min(1).optional(),
  filters: z.record(z.any()).optional(),
  headers: z.record(z.string()).optional(),
  bodyTemplate: z.string().optional(),
  isActive: z.boolean().optional(),
});

export default async function updateWebhookRoute(server: any) {
  server.patch('/webhooks/:id', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };
      const data = updateWebhookSchema.parse(request.body);

      const [updated] = await db.update(webhooks)
        .set({ ...data, updatedAt: new Date() })
        .where(and(
          eq(webhooks.id, id),
          eq(webhooks.userId, userId)
        ))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }

      return reply.send({ webhook: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to update webhook' });
    }
  });
}
