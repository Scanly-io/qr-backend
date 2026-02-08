import axios from 'axios';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { integrations, oauthTokens } from '../schema';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics';
import { verifyJWT } from '@qr/common';

const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID || '';
const SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.APP_URL + '/api/integrations/salesforce/callback';

export default async function salesforceOAuthRoute(server: any) {
  
  server.get('/salesforce/install', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const authUrl = 'https://login.salesforce.com/services/oauth2/authorize?' +
      `response_type=code&` +
      `client_id=${SALESFORCE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `state=${userId}`;

    return reply.redirect(authUrl);
  });

  server.get('/salesforce/callback', async (request: any, reply: any) => {
    const { code, state } = request.query as { code?: string; state?: string };
    if (!code) return reply.status(400).send({ error: 'Missing authorization code' });
    if (!state) return reply.status(400).send({ error: 'Missing state parameter' });

    const userId = state;

    try {
      const tokenResponse = await axios.post('https://login.salesforce.com/services/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: SALESFORCE_CLIENT_ID,
          client_secret: SALESFORCE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          code,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token, refresh_token, instance_url } = tokenResponse.data;

      const userInfoResponse = await axios.get(`${instance_url}/services/oauth2/userinfo`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const { organization_id, name } = userInfoResponse.data;

      const [integration] = await db.insert(integrations).values({
        userId, type: 'salesforce', name: name || 'Salesforce', authType: 'oauth',
        credentials: { accessToken: access_token, refreshToken: refresh_token, instanceUrl: instance_url },
        config: { organizationId: organization_id }, isActive: true,
      } as any).returning();

      await db.insert(oauthTokens).values({
        userId, integrationId: integration.id, provider: 'salesforce',
        accessToken: access_token, refreshToken: refresh_token,
      } as any);

      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        userId, integrationId: integration.id, type: 'salesforce', timestamp: new Date().toISOString(),
      });

      return reply.redirect(`${process.env.FRONTEND_URL}/integrations?success=salesforce`);
    } catch (error) {
      server.log.error(error, 'Salesforce OAuth error');
      return reply.status(500).send({ error: 'Failed to connect Salesforce' });
    }
  });

  server.post('/salesforce/:integrationId/leads', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };
    const leadData = request.body as any;

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId))).limit(1);

    if (!integration) return reply.status(404).send({ error: 'Integration not found' });

    const { accessToken, instanceUrl } = integration.credentials as any;

    try {
      const response = await axios.post(`${instanceUrl}/services/data/v58.0/sobjects/Lead`,
        leadData,
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );
      return reply.send({ lead: response.data });
    } catch (error) {
      server.log.error(error, 'Failed to create Salesforce lead');
      return reply.status(500).send({ error: 'Failed to create lead' });
    }
  });
}
