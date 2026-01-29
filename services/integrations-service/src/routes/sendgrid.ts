import axios from 'axios';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { integrations } from '../schema';
import { publishEvent, TOPICS } from '../kafka';
import { verifyJWT } from '@qr/common';

export default async function sendgridRoute(server: any) {
  
  // SendGrid uses API key auth, not OAuth
  server.post('/sendgrid/connect', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { apiKey, senderEmail, senderName } = request.body as any;

    if (!apiKey) return reply.status(400).send({ error: 'API key is required' });

    try {
      // Verify API key
      const verifyResponse = await axios.get('https://api.sendgrid.com/v3/user/profile',
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      const [integration] = await db.insert(integrations).values({
        userId, type: 'sendgrid', name: 'SendGrid', authType: 'api_key',
        credentials: { apiKey },
        config: { senderEmail, senderName, username: verifyResponse.data.username },
        isActive: true,
      }).returning();

      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        userId, integrationId: integration.id, type: 'sendgrid', timestamp: new Date().toISOString(),
      });

      return reply.send({ integration });
    } catch (error) {
      server.log.error(error, 'SendGrid connection error');
      return reply.status(400).send({ error: 'Invalid API key' });
    }
  });

  server.post('/sendgrid/:integrationId/send', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };
    const { to, subject, text, html, templateId, dynamicData } = request.body as any;

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId))).limit(1);

    if (!integration) return reply.status(404).send({ error: 'Integration not found' });

    const { apiKey } = integration.credentials as any;
    const { senderEmail, senderName } = integration.config as any;

    try {
      const emailData: any = {
        personalizations: [{ to: [{ email: to }], dynamic_template_data: dynamicData }],
        from: { email: senderEmail, name: senderName },
      };

      if (templateId) {
        emailData.template_id = templateId;
      } else {
        emailData.subject = subject;
        emailData.content = [
          { type: 'text/plain', value: text },
          ...(html ? [{ type: 'text/html', value: html }] : []),
        ];
      }

      const response = await axios.post('https://api.sendgrid.com/v3/mail/send',
        emailData,
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
      );

      return reply.send({ success: true, statusCode: response.status });
    } catch (error) {
      server.log.error(error, 'Failed to send email via SendGrid');
      return reply.status(500).send({ error: 'Failed to send email' });
    }
  });
}
