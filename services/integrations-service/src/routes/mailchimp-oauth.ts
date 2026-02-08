import axios from 'axios';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { integrations, oauthTokens } from '../schema';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics';
import { verifyJWT } from '@qr/common';

/**
 * MAILCHIMP OAUTH INTEGRATION
 * 
 * Email marketing integration:
 * - Create lists
 * - Add subscribers from QR scans
 * - Tag users based on behavior
 * - Trigger campaigns
 */

const MAILCHIMP_CLIENT_ID = process.env.MAILCHIMP_CLIENT_ID || '';
const MAILCHIMP_CLIENT_SECRET = process.env.MAILCHIMP_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.APP_URL + '/api/integrations/mailchimp/callback';

export default async function mailchimpOAuthRoute(server: any) {
  
  // Step 1: Initiate OAuth
  server.get('/mailchimp/install', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const authUrl = 'https://login.mailchimp.com/oauth2/authorize?' +
      `response_type=code&` +
      `client_id=${MAILCHIMP_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    return reply.redirect(authUrl);
  });

  // Step 2: OAuth Callback (no auth - callback from Mailchimp)
  server.get('/mailchimp/callback', async (request: any, reply: any) => {
    const { code } = request.query as { code?: string };
    if (!code) {
      return reply.status(400).send({ error: 'Missing authorization code' });
    }

    // TODO: In production, use state parameter to track userId
    const userId = 'pending'; // Will need to get from state param

    try {
      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://login.mailchimp.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: MAILCHIMP_CLIENT_ID,
          client_secret: MAILCHIMP_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          code,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token } = tokenResponse.data;

      // Get metadata (includes datacenter)
      const metadataResponse = await axios.get(
        'https://login.mailchimp.com/oauth2/metadata',
        {
          headers: {
            Authorization: `OAuth ${access_token}`,
          },
        }
      );

      const { dc, accountname } = metadataResponse.data;

      // Store integration
      const [integration] = await db.insert(integrations).values({
        userId,
        type: 'mailchimp',
        name: accountname,
        authType: 'oauth',
        credentials: {
          accessToken: access_token,
          datacenter: dc,
        },
        config: {
          accountName: accountname,
          apiEndpoint: `https://${dc}.api.mailchimp.com/3.0`,
        },
        isActive: true,
      }).returning();

      // Store OAuth token
      await db.insert(oauthTokens).values({
        userId,
        integrationId: integration.id,
        provider: 'mailchimp',
        accessToken: access_token,
      });

      // Publish event
      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        userId,
        integrationId: integration.id,
        type: 'mailchimp',
        accountName: accountname,
        timestamp: new Date().toISOString(),
      });

      return reply.redirect(`${process.env.FRONTEND_URL}/integrations?success=mailchimp`);

    } catch (error) {
      server.log.error(error, 'Mailchimp OAuth error');
      return reply.status(500).send({ error: 'Failed to connect Mailchimp' });
    }
  });

  // Get Mailchimp lists
  server.get('/mailchimp/:integrationId/lists', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };

    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, userId)
      ))
      .limit(1);

    if (!integration) {
      return reply.status(404).send({ error: 'Integration not found' });
    }

    const { accessToken, datacenter } = integration.credentials as any;

    try {
      const response = await axios.get(
        `https://${datacenter}.api.mailchimp.com/3.0/lists`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return reply.send({ lists: response.data.lists });
    } catch (error) {
      server.log.error(error, 'Failed to fetch Mailchimp lists');
      return reply.status(500).send({ error: 'Failed to fetch lists' });
    }
  });

  // Add subscriber to list
  server.post('/mailchimp/:integrationId/lists/:listId/members', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId, listId } = request.params as { integrationId: string; listId: string };
    const { email, firstName, lastName, tags } = request.body as any;

    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(
        eq(integrations.id, integrationId),
        eq(integrations.userId, userId)
      ))
      .limit(1);

    if (!integration) {
      return reply.status(404).send({ error: 'Integration not found' });
    }

    const { accessToken, datacenter } = integration.credentials as any;

    try {
      const response = await axios.post(
        `https://${datacenter}.api.mailchimp.com/3.0/lists/${listId}/members`,
        {
          email_address: email,
          status: 'subscribed',
          merge_fields: {
            FNAME: firstName,
            LNAME: lastName,
          },
          tags: tags || [],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return reply.send({ member: response.data });
    } catch (error) {
      server.log.error(error, 'Failed to add Mailchimp member');
      return reply.status(500).send({ error: 'Failed to add member' });
    }
  });
}
