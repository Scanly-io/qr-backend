import axios from 'axios';
import { db } from '../db';
import { webhooks, webhookLogs } from '../schema';
import { eq, and } from 'drizzle-orm';
import { verifyJWT } from '@qr/common';

export default async function testWebhookRoute(server: any) {
  server.post('/webhooks/:id/test', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params as { id: string };

      const [webhook] = await db.select()
        .from(webhooks)
        .where(and(
          eq(webhooks.id, id),
          eq(webhooks.userId, userId)
        ));

      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }

      // Test payload
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from your QR platform',
        },
      };

      const startTime = Date.now();

      try {
        const response = await axios({
          method: webhook.method as any,
          url: webhook.url,
          headers: webhook.headers as any || {},
          data: testPayload,
          timeout: 10000,
        });

        const duration = Date.now() - startTime;

        // Log successful test
        await db.insert(webhookLogs).values({
          webhookId: webhook.id,
          triggerEvent: 'test',
          requestUrl: webhook.url,
          requestMethod: webhook.method || 'POST',
          requestHeaders: webhook.headers || {},
          requestBody: testPayload,
          responseStatus: response.status,
          responseHeaders: response.headers as Record<string, any>,
          responseBody: JSON.stringify(response.data),
          success: true,
          duration,
        });

        return reply.send({
          success: true,
          status: response.status,
          duration,
          response: response.data,
        });
      } catch (error: any) {
        const duration = Date.now() - startTime;

        // Log failed test
        await db.insert(webhookLogs).values({
          webhookId: webhook.id,
          triggerEvent: 'test',
          requestUrl: webhook.url,
          requestMethod: webhook.method || 'POST',
          requestHeaders: webhook.headers || {},
          requestBody: testPayload,
          responseStatus: error.response?.status || 0,
          success: false,
          error: error.message,
          duration,
        });

        return reply.status(400).send({
          success: false,
          error: error.message,
          duration,
        });
      }
    } catch (error) {
      server.log.error(error);
        return reply.status(500).send({ error: 'Failed to test webhook' });
    }
  });
}