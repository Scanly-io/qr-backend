import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { linkSchedules } from '../schema.js';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /schedules
 * 
 * List all schedules for authenticated user.
 */
export default async function listSchedulesRoute(app: FastifyInstance) {
  app.get('/schedules', {
    schema: {
      description: 'List all link schedules',
      tags: ['schedules'],
      querystring: {
        type: 'object',
        properties: {
          qrId: { type: 'string', description: 'Filter by QR code ID' }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const userId = (req as any).userId || 'user-demo';
      const { qrId } = req.query as any;

      const conditions = [eq(linkSchedules.userId, userId)];
      if (qrId) conditions.push(eq(linkSchedules.qrId, qrId));

      const schedules = await db
        .select()
        .from(linkSchedules)
        .where(and(...conditions))
        .orderBy(desc(linkSchedules.priority), desc(linkSchedules.createdAt));

      return reply.send({ schedules });
    } catch (error: any) {
      req.log.error(error, 'Error fetching schedules');
      return reply.code(500).send({ error: 'Failed to fetch schedules' });
    }
  });
}
