import { FastifyPluginAsync } from 'fastify';
import { db } from '../db.js';
import { subdomains } from '../schema.js';
import { eq } from 'drizzle-orm';

/**
 * GET /subdomains/check/:subdomain
 * 
 * Check if a subdomain is available (public endpoint, no auth required)
 */

const checkSubdomainAvailability: FastifyPluginAsync = async (app) => {
  app.get('/subdomains/check/:subdomain', {
    schema: {
      description: 'Check if a subdomain is available to claim',
      tags: ['subdomains'],
      params: {
        type: 'object',
        required: ['subdomain'],
        properties: {
          subdomain: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { subdomain } = request.params as { subdomain: string };
    const normalizedSubdomain = subdomain.toLowerCase();

    // Basic validation
    if (normalizedSubdomain.length < 3 || normalizedSubdomain.length > 30) {
      return reply.code(400).send({
        available: false,
        reason: 'Subdomain must be between 3 and 30 characters',
      });
    }

    if (!/^[a-z0-9-]+$/.test(normalizedSubdomain)) {
      return reply.code(400).send({
        available: false,
        reason: 'Subdomain can only contain lowercase letters, numbers, and hyphens',
      });
    }

    // Check if taken
    const existing = await db
      .select()
      .from(subdomains)
      .where(eq(subdomains.subdomain, normalizedSubdomain))
      .limit(1);

    const available = existing.length === 0;

    return reply.send({
      subdomain: normalizedSubdomain,
      available,
      url: available ? `https://${normalizedSubdomain}.${process.env.SUBDOMAIN_BASE || 'scanly.io'}` : null,
      message: available 
        ? 'This subdomain is available!' 
        : 'This subdomain is already taken',
    });
  });
};

export default checkSubdomainAvailability;
