import axios from 'axios';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { integrations, oauthTokens } from '../schema';
import { publishEvent, TOPICS } from '../kafka';
import { verifyJWT } from '@qr/common';

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || '';
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.APP_URL + '/api/integrations/hubspot/callback';
const SCOPES = 'crm.objects.contacts.read crm.objects.contacts.write';

export default async function hubspotOAuthRoute(server: any) {
  
  server.get('/hubspot/install', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const authUrl = 'https://app.hubspot.com/oauth/authorize?' +
      `client_id=${HUBSPOT_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `state=${userId}`;

    return reply.redirect(authUrl);
  });

  server.get('/hubspot/callback', async (request: any, reply: any) => {
    const { code, state } = request.query as { code?: string; state?: string };
    if (!code) return reply.status(400).send({ error: 'Missing authorization code' });
    if (!state) return reply.status(400).send({ error: 'Missing state parameter' });

    const userId = state;

    try {
      const tokenResponse = await axios.post('https://api.hubapi.com/oauth/v1/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: HUBSPOT_CLIENT_ID,
          client_secret: HUBSPOT_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          code,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      const accountResponse = await axios.get('https://api.hubapi.com/account-info/v3/details',
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const { portalId, uiDomain } = accountResponse.data;

      const [integration] = await db.insert(integrations).values({
        userId, type: 'hubspot', name: `HubSpot (${portalId})`, authType: 'oauth',
        credentials: { accessToken: access_token, refreshToken: refresh_token },
        config: { portalId, uiDomain }, isActive: true,
      } as any).returning();

      await db.insert(oauthTokens).values({
        userId, integrationId: integration.id, provider: 'hubspot',
        accessToken: access_token, refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000), scope: SCOPES,
      } as any);

      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        userId, integrationId: integration.id, type: 'hubspot', portalId, timestamp: new Date().toISOString(),
      });

      return reply.redirect(`${process.env.FRONTEND_URL}/integrations?success=hubspot`);
    } catch (error) {
      server.log.error(error, 'HubSpot OAuth error');
      return reply.status(500).send({ error: 'Failed to connect HubSpot' });
    }
  });

  server.post('/hubspot/:integrationId/contacts', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };
    const { email, firstname, lastname, properties } = request.body as any;

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId))).limit(1);

    if (!integration) return reply.status(404).send({ error: 'Integration not found' });

    try {
      const response = await axios.post('https://api.hubapi.com/crm/v3/objects/contacts',
        { properties: { email, firstname, lastname, ...properties } },
        { headers: { Authorization: `Bearer ${(integration.credentials as any).accessToken}`, 'Content-Type': 'application/json' } }
      );
      return reply.send({ contact: response.data });
    } catch (error) {
      server.log.error(error, 'Failed to create HubSpot contact');
      return reply.status(500).send({ error: 'Failed to create contact' });
    }
  });
}
