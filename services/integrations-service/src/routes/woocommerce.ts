import axios from 'axios';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { integrations } from '../schema';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics';
import { verifyJWT } from '@qr/common';

export default async function woocommerceRoute(server: any) {
  
  // WooCommerce uses API key/secret auth
  server.post('/woocommerce/connect', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const { storeUrl, consumerKey, consumerSecret } = request.body as any;

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return reply.status(400).send({ error: 'Store URL, consumer key, and consumer secret are required' });
    }

    try {
      // Verify credentials by fetching store info
      const verifyResponse = await axios.get(`${storeUrl}/wp-json/wc/v3/system_status`,
        { auth: { username: consumerKey, password: consumerSecret } }
      );

      const storeInfo = verifyResponse.data;

      const [integration] = await db.insert(integrations).values({
        userId, type: 'woocommerce', name: storeInfo.environment?.site_title || 'WooCommerce Store', authType: 'api_key',
        credentials: { storeUrl, consumerKey, consumerSecret },
        config: {
          wooVersion: storeInfo.environment?.version,
          wpVersion: storeInfo.environment?.wp_version,
          currency: storeInfo.settings?.currency,
        },
        isActive: true,
      }).returning();

      await publishEvent(TOPICS.INTEGRATION_CONNECTED, {
        userId, integrationId: integration.id, type: 'woocommerce', storeUrl, timestamp: new Date().toISOString(),
      });

      return reply.send({ integration });
    } catch (error) {
      server.log.error(error, 'WooCommerce connection error');
      return reply.status(400).send({ error: 'Failed to connect to WooCommerce store. Check your credentials.' });
    }
  });

  server.get('/woocommerce/:integrationId/products', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId))).limit(1);

    if (!integration) return reply.status(404).send({ error: 'Integration not found' });

    const { storeUrl, consumerKey, consumerSecret } = integration.credentials as any;

    try {
      const response = await axios.get(`${storeUrl}/wp-json/wc/v3/products`,
        { auth: { username: consumerKey, password: consumerSecret } }
      );
      return reply.send({ products: response.data });
    } catch (error) {
      server.log.error(error, 'Failed to fetch WooCommerce products');
      return reply.status(500).send({ error: 'Failed to fetch products' });
    }
  });

  server.get('/woocommerce/:integrationId/orders', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    const userId = request.user?.id;
    const { integrationId } = request.params as { integrationId: string };

    const [integration] = await db.select().from(integrations)
      .where(and(eq(integrations.id, integrationId), eq(integrations.userId, userId))).limit(1);

    if (!integration) return reply.status(404).send({ error: 'Integration not found' });

    const { storeUrl, consumerKey, consumerSecret } = integration.credentials as any;

    try {
      const response = await axios.get(`${storeUrl}/wp-json/wc/v3/orders`,
        { auth: { username: consumerKey, password: consumerSecret } }
      );
      return reply.send({ orders: response.data });
    } catch (error) {
      server.log.error(error, 'Failed to fetch WooCommerce orders');
      return reply.status(500).send({ error: 'Failed to fetch orders' });
    }
  });
}
