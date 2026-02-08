import axios from 'axios';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { integrations, oauthTokens } from '../schema';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics';
import { verifyJWT } from '@qr/common';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.APP_URL + '/api/integrations/google-sheets/callback';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

export default async function googleSheetsOAuthRoute(server: any) {
  
  server.get('/google-sheets/install', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${userId}`;

    return reply.redirect(authUrl);
  });

  server.get('/google-sheets/callback', async (request: any, reply: any) => {
    const { code, state } = request.query as { code?: string; state?: string };
    if (!code) return reply.status(400).send({ error: 'Missing authorization code' });
    if (!state) return reply.status(400).send({ error: 'Missing state parameter' });

    const userId = state;

    try {
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token',
        new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo',
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const { email, name } = userInfoResponse.data;

      const [integration] = await db.insert(integrations).values({
        userId, type: 'google-sheets', name: name || email, authType: 'oauth',
        credentials: { accessToken: access_token, refreshToken: refresh_token },
        config: { email }, isActive: true,
      } as any).returning();

      await db.insert(oauthTokens).values({
        userId, integrationId: integration.id, provider: 'google-sheets',
        accessToken: access_token, refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000), scope: SCOPES,
      } as any);

      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        userId, integrationId: integration.id, type: 'google-sheets', email, timestamp: new Date().toISOString(),
      });

      return reply.redirect(`${process.env.FRONTEND_URL}/integrations?success=google-sheets`);
    } catch (error) {
      server.log.error(error, 'Google Sheets OAuth error');
      return reply.status(500).send({ error: 'Failed to connect Google Sheets' });
    }
  });

  server.get('/google-sheets/:integrationId/spreadsheets', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId))).limit(1);

    if (!integration) return reply.status(404).send({ error: 'Integration not found' });

    try {
      const response = await axios.get('https://www.googleapis.com/drive/v3/files?q=mimeType=\'application/vnd.google-apps.spreadsheet\'',
        { headers: { Authorization: `Bearer ${(integration.credentials as any).accessToken}` } }
      );
      return reply.send({ spreadsheets: response.data.files });
    } catch (error) {
      server.log.error(error, 'Failed to fetch spreadsheets');
      return reply.status(500).send({ error: 'Failed to fetch spreadsheets' });
    }
  });

  server.post('/google-sheets/:integrationId/append', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };
    const { spreadsheetId, range, values } = request.body as any;

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId))).limit(1);

    if (!integration) return reply.status(404).send({ error: 'Integration not found' });

    try {
      const response = await axios.post(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
        { values },
        { headers: { Authorization: `Bearer ${(integration.credentials as any).accessToken}`, 'Content-Type': 'application/json' } }
      );
      return reply.send({ result: response.data });
    } catch (error) {
      server.log.error(error, 'Failed to append to spreadsheet');
      return reply.status(500).send({ error: 'Failed to append data' });
    }
  });
}
