import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { subdomains } from '../schema.js';
import { eq } from 'drizzle-orm';

/**
 * GET /subdomains/me
 * 
 * Get the authenticated user's subdomain information
 */

const getMySubdomain: FastifyPluginAsync = async (app) => {
  app.get('/subdomains/me', {
    schema: {
      description: 'Get your claimed subdomain',
      tags: ['subdomains'],
    },
  }, async (request, reply) => {
    const userId = (request as any).userId;
    
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const [userSubdomain] = await db
      .select()
      .from(subdomains)
      .where(eq(subdomains.userId, userId))
      .limit(1);

    if (!userSubdomain) {
      return reply.code(404).send({ 
        error: 'You have not claimed a subdomain yet',
        claimed: false,
      });
    }

    return reply.send({
      claimed: true,
      subdomain: userSubdomain,
      url: `https://${userSubdomain.subdomain}.${process.env.SUBDOMAIN_BASE || 'scanly.io'}`,
    });
  });
};

export default getMySubdomain;
