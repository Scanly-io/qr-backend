import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { subdomains, subdomainRoutes } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { publishEvent } from '../kafka.js';

/**
 * DELETE /subdomains/routes/:slug
 * 
 * Delete a route from your subdomain
 */

const deleteSubdomainRoute: FastifyPluginAsync = async (app) => {
  app.delete('/subdomains/routes/:slug', {
    schema: {
      description: 'Delete a route from your subdomain',
      tags: ['subdomains'],
      params: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request as any).userId;
    
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const { slug } = request.params as { slug: string };

    // Find user's subdomain
    const [userSubdomain] = await db
      .select()
      .from(subdomains)
      .where(eq(subdomains.userId, userId))
      .limit(1);

    if (!userSubdomain) {
      return reply.code(404).send({ error: 'You have not claimed a subdomain yet' });
    }

    // Delete the route
    const [deletedRoute] = await db
      .delete(subdomainRoutes)
      .where(
        and(
          eq(subdomainRoutes.subdomainId, userSubdomain.id),
          eq(subdomainRoutes.slug, slug.toLowerCase())
        )
      )
      .returning();

    if (!deletedRoute) {
      return reply.code(404).send({ error: 'Route not found' });
    }

    // Publish event
    await publishEvent('subdomain.route.deleted', {
      routeId: deletedRoute.id,
      subdomainId: userSubdomain.id,
      userId,
      subdomain: userSubdomain.subdomain,
      slug,
      deletedAt: new Date().toISOString(),
    });

    return reply.send({
      message: 'Route deleted successfully',
      deletedRoute,
    });
  });
};

export default deleteSubdomainRoute;
