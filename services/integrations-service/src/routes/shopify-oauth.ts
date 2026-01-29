import axios from 'axios';
import crypto from 'crypto';
import { db } from '../db';
import { integrations, oauthTokens } from '../schema';
import { publishEvent, TOPICS } from '../kafka';
import { eq } from 'drizzle-orm';
import { verifyJWT } from '@qr/common';

/**
 * SHOPIFY OAUTH INTEGRATION
 * 
 * Complete OAuth flow for Shopify:
 * 1. /shopify/install - User clicks "Connect Shopify"
 * 2. Redirect to Shopify OAuth page
 * 3. /shopify/callback - Shopify redirects back with code
 * 4. Exchange code for access token
 * 5. Store token and shop info
 */

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || '';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || '';
const SHOPIFY_SCOPES = 'read_products,write_products,read_orders,read_inventory';
const REDIRECT_URI = process.env.APP_URL + '/api/integrations/shopify/callback';

export default async function shopifyOAuthRoute(server: any) {
  
  // Step 1: Initiate OAuth
  server.get('/shopify/install', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { shop } = request.query as { shop?: string };
    if (!shop) {
      return reply.status(400).send({ error: 'Shop parameter required' });
    }

    // Validate shop domain
    if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/)) {
      return reply.status(400).send({ error: 'Invalid shop domain' });
    }

    // Generate nonce for security and encode userId in state
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = JSON.stringify({ nonce, userId });
    const encodedState = Buffer.from(state).toString('base64');

    const installUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${SHOPIFY_API_KEY}&` +
      `scope=${SHOPIFY_SCOPES}&` +
      `redirect_uri=${REDIRECT_URI}&` +
      `state=${encodedState}&` +
      `grant_options[]=per-user`;

    return reply.redirect(installUrl);
  });

  // Step 2: OAuth Callback (no auth - callback from Shopify)
  server.get('/shopify/callback', async (request: any, reply: any) => {
    const { code, shop, state, hmac } = request.query as {
      code?: string;
      shop?: string;
      state?: string;
      hmac?: string;
    };

    if (!code || !shop || !state) {
      return reply.status(400).send({ error: 'Missing required parameters' });
    }

    // Decode state to get userId
    let userId: string;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decodedState.userId;
      if (!userId) {
        throw new Error('No userId in state');
      }
    } catch (error) {
      return reply.status(400).send({ error: 'Invalid state parameter' });
    }

    // Verify HMAC (security check)
    const queryParams: Record<string, string | string[] | undefined> = { ...request.query as Record<string, string | string[]> };
    delete queryParams.hmac;
    const message = Object.keys(queryParams)
      .sort()
      .map(key => `${key}=${queryParams[key]}`)
      .join('&');
    
    const generatedHmac = crypto
      .createHmac('sha256', SHOPIFY_API_SECRET)
      .update(message)
      .digest('hex');

    if (generatedHmac !== hmac) {
      return reply.status(403).send({ error: 'HMAC validation failed' });
    }

    try {
      // Exchange code for access token
      const tokenResponse = await axios.post(
        `https://${shop}/admin/oauth/access_token`,
        {
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code,
        }
      );

      const { access_token, scope } = tokenResponse.data;

      // Get shop info
      const shopInfoResponse = await axios.get(
        `https://${shop}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': access_token,
          },
        }
      );

      const shopInfo = shopInfoResponse.data.shop;

      // Store integration
      const [integration] = await db.insert(integrations).values({
        userId,
        type: 'shopify',
        name: shopInfo.name,
        authType: 'oauth',
        credentials: {
          shop,
          accessToken: access_token,
        },
        config: {
          domain: shopInfo.domain,
          email: shopInfo.email,
          currency: shopInfo.currency,
          timezone: shopInfo.timezone,
        },
        isActive: true,
      }).returning();

      // Store OAuth token
      await db.insert(oauthTokens).values({
        userId,
        integrationId: integration.id,
        provider: 'shopify',
        accessToken: access_token,
        scope,
      });

      // Publish event
      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        userId,
        integrationId: integration.id,
        type: 'shopify',
        shopName: shopInfo.name,
        timestamp: new Date().toISOString(),
      });

      // Redirect to success page
      return reply.redirect(`${process.env.FRONTEND_URL}/integrations?success=shopify`);

    } catch (error) {
      server.log.error(error, 'Shopify OAuth error');
      return reply.status(500).send({ error: 'Failed to connect Shopify' });
    }
  });

  // Get Shopify products
  server.get('/shopify/:integrationId/products', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };

    const [integration] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, integrationId))
      .limit(1);

    if (!integration) {
      return reply.status(404).send({ error: 'Integration not found' });
    }

    const { shop, accessToken } = integration.credentials as any;

    try {
      const response = await axios.get(
        `https://${shop}/admin/api/2024-01/products.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
          },
        }
      );

      return reply.send({ products: response.data.products });
    } catch (error) {
      server.log.error(error, 'Failed to fetch Shopify products');
      return reply.status(500).send({ error: 'Failed to fetch products' });
    }
  });
}
