import axios from 'axios';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { integrations, oauthTokens } from '../schema';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics';
import { verifyJWT } from '@qr/common';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.APP_URL + '/api/integrations/slack/callback';
const SCOPES = 'chat:write,channels:read,users:read';

export default async function slackOAuthRoute(server: any) {
  
  server.get('/slack/install', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const authUrl = 'https://slack.com/oauth/v2/authorize?' +
      `client_id=${SLACK_CLIENT_ID}&` +
      `scope=${encodeURIComponent(SCOPES)}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `state=${userId}`;

    return reply.redirect(authUrl);
  });

  server.get('/slack/callback', async (request: any, reply: any) => {
    const { code, state } = request.query as { code?: string; state?: string };
    if (!code) return reply.status(400).send({ error: 'Missing authorization code' });
    if (!state) return reply.status(400).send({ error: 'Missing state parameter' });

    const userId = state;

    try {
      const tokenResponse = await axios.post('https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: SLACK_CLIENT_ID,
          client_secret: SLACK_CLIENT_SECRET,
          code,
          redirect_uri: REDIRECT_URI,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token, team, bot_user_id } = tokenResponse.data;

      const [integration] = await db.insert(integrations).values({
        userId, type: 'slack', name: team?.name || 'Slack Workspace', authType: 'oauth',
        credentials: { accessToken: access_token, botUserId: bot_user_id },
        config: { teamId: team?.id, teamName: team?.name }, isActive: true,
      } as any).returning();

      await db.insert(oauthTokens).values({
        userId, integrationId: integration.id, provider: 'slack',
        accessToken: access_token, scope: SCOPES,
      } as any);

      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        userId, integrationId: integration.id, type: 'slack', teamName: team?.name, timestamp: new Date().toISOString(),
      });

      return reply.redirect(`${process.env.FRONTEND_URL}/integrations?success=slack`);
    } catch (error) {
      server.log.error(error, 'Slack OAuth error');
      return reply.status(500).send({ error: 'Failed to connect Slack' });
    }
  });

  server.post('/slack/:integrationId/message', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };
    const { channel, text, blocks } = request.body as any;

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId))).limit(1);

    if (!integration) return reply.status(404).send({ error: 'Integration not found' });

    try {
      const response = await axios.post('https://slack.com/api/chat.postMessage',
        { channel, text, blocks },
        { headers: { Authorization: `Bearer ${(integration.credentials as any).accessToken}`, 'Content-Type': 'application/json' } }
      );
      return reply.send({ message: response.data });
    } catch (error) {
      server.log.error(error, 'Failed to send Slack message');
      return reply.status(500).send({ error: 'Failed to send message' });
    }
  });

  server.get('/slack/:integrationId/channels', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId))).limit(1);

    if (!integration) return reply.status(404).send({ error: 'Integration not found' });

    try {
      const response = await axios.get('https://slack.com/api/conversations.list',
        { headers: { Authorization: `Bearer ${(integration.credentials as any).accessToken}` } }
      );
      return reply.send({ channels: response.data.channels });
    } catch (error) {
      server.log.error(error, 'Failed to fetch Slack channels');
      return reply.status(500).send({ error: 'Failed to fetch channels' });
    }
  });
}
