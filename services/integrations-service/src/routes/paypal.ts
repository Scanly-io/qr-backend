import axios from 'axios';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { integrations } from '../schema';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics';
import { verifyJWT } from '@qr/common';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_API_BASE = process.env.PAYPAL_SANDBOX === 'true' 
  ? 'https://api-m.sandbox.paypal.com' 
  : 'https://api-m.paypal.com';

export default async function paypalRoute(server: any) {
  
  // PayPal uses client credentials OAuth
  server.post('/paypal/connect', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { clientId, clientSecret, sandbox } = request.body as any;

    const apiBase = sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

    try {
      // Get access token using client credentials
      const authResponse = await axios.post(`${apiBase}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          auth: { username: clientId, password: clientSecret },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { access_token, expires_in } = authResponse.data;

      const [integration] = await db.insert(integrations).values({
        userId, type: 'paypal', name: 'PayPal', authType: 'oauth',
        credentials: { clientId, clientSecret, accessToken: access_token },
        config: { sandbox, apiBase, expiresAt: Date.now() + expires_in * 1000 },
        isActive: true,
      }).returning();

      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        userId, integrationId: integration.id, type: 'paypal', sandbox, timestamp: new Date().toISOString(),
      });

      return reply.send({ integration });
    } catch (error) {
      server.log.error(error, 'PayPal connection error');
      return reply.status(400).send({ error: 'Failed to connect PayPal. Check your credentials.' });
    }
  });

  server.post('/paypal/:integrationId/create-order', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };
    const { amount, currency, description } = request.body as any;

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId))).limit(1);

    if (!integration) return reply.status(404).send({ error: 'Integration not found' });

    const { clientId, clientSecret, accessToken } = integration.credentials as any;
    const { apiBase } = integration.config as any;

    try {
      const response = await axios.post(`${apiBase}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: currency || 'USD', value: amount.toString() },
            description,
          }],
        },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );

      return reply.send({ order: response.data });
    } catch (error) {
      server.log.error(error, 'Failed to create PayPal order');
      return reply.status(500).send({ error: 'Failed to create order' });
    }
  });

  server.post('/paypal/:integrationId/capture/:orderId', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId, orderId } = request.params as { integrationId: string; orderId: string };

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId))).limit(1);

    if (!integration) return reply.status(404).send({ error: 'Integration not found' });

    const { accessToken } = integration.credentials as any;
    const { apiBase } = integration.config as any;

    try {
      const response = await axios.post(`${apiBase}/v2/checkout/orders/${orderId}/capture`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );

      return reply.send({ capture: response.data });
    } catch (error) {
      server.log.error(error, 'Failed to capture PayPal order');
      return reply.status(500).send({ error: 'Failed to capture order' });
    }
  });
}
