import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { subdomains, subdomainRoutes } from '../schema.js';
import { eq } from 'drizzle-orm';

/**
 * GET /subdomains/routes
 * 
 * List all routes on your subdomain
 */

const listSubdomainRoutes: FastifyPluginAsync = async (app) => {
  app.get('/subdomains/routes', {
    schema: {
      description: 'List all routes on your subdomain',
      tags: ['subdomains'],
    },
  }, async (request, reply) => {
    const userId = (request as any).userId;
    
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Find user's subdomain
    const [userSubdomain] = await db
      .select()
      .from(subdomains)
      .where(eq(subdomains.userId, userId))
      .limit(1);

    if (!userSubdomain) {
      return reply.code(404).send({ error: 'You have not claimed a subdomain yet' });
    }

    // Get all routes for this subdomain
    const routes = await db
      .select()
      .from(subdomainRoutes)
      .where(eq(subdomainRoutes.subdomainId, userSubdomain.id))
      .orderBy(subdomainRoutes.displayOrder);

    const subdomainBase = process.env.SUBDOMAIN_BASE || 'scanly.io';

    return reply.send({
      subdomain: userSubdomain.subdomain,
      url: `https://${userSubdomain.subdomain}.${subdomainBase}`,
      routes: routes.map(route => ({
        ...route,
        url: `https://${userSubdomain.subdomain}.${subdomainBase}/${route.slug}`,
      })),
      totalRoutes: routes.length,
    });
  });
};

export default listSubdomainRoutes;
