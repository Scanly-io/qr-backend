import { db } from '../db';
import { integrations } from '../schema';
import { eq } from 'drizzle-orm';
import { verifyJWT } from '@qr/common';

export default async function listIntegrationsRoute(server: any) {
  server.get('/integrations', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const user = request.user;
      const userId = user?.id || user?.sub;
      
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const userIntegrations = await db.select()
        .from(integrations)
        .where(eq(integrations.userId, userId));

      return reply.send({ integrations: userIntegrations });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch integrations' });
    }
  });
}
