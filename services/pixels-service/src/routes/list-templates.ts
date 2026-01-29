import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { pixelTemplates } from '../schema.js';
import { eq } from 'drizzle-orm';

/**
 * GET /templates
 * 
 * List available pixel templates.
 */
export default async function listTemplatesRoute(app: FastifyInstance) {
  app.get('/templates', {
    schema: {
      description: 'List pixel templates',
      tags: ['templates'],
      querystring: {
        type: 'object',
        properties: {
          platform: { type: 'string', description: 'Filter by platform' },
          category: { type: 'string', description: 'Filter by category' }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { platform, category } = req.query as any;

      // Build query with filters
      const conditions = [eq(pixelTemplates.isPublic, true)];
      if (platform) conditions.push(eq(pixelTemplates.platform, platform));
      if (category) conditions.push(eq(pixelTemplates.category, category));

      const templates = await db
        .select()
        .from(pixelTemplates)
        .where(conditions.length > 1 ? conditions.reduce((a, b) => a && b) : conditions[0]);

      return reply.send({ templates });
    } catch (error: any) {
      req.log.error(error, 'Error fetching templates');
      return reply.code(500).send({ error: 'Failed to fetch templates' });
    }
  });
}
