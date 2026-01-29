import { z } from 'zod';
import { db } from '../db';
import { integrations } from '../schema';
import { verifyJWT } from '@qr/common';

const connectIntegrationSchema = z.object({
  type: z.string(),
  name: z.string(),
  authType: z.enum(['none', 'api_key', 'oauth', 'basic']),
  credentials: z.record(z.any()),
  config: z.record(z.any()).optional(),
});

export default async function connectIntegrationRoute(server: any) {
  server.post('/integrations', { preHandler: [verifyJWT] }, async (request: any, reply: any) => {
    try {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const data = connectIntegrationSchema.parse(request.body);

      const [integration] = await db.insert(integrations).values({
        userId,
        ...data,
      }).returning();

      return reply.status(201).send({ integration });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to connect integration' });
    }
  });
}
