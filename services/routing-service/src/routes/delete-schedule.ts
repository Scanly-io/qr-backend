import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { linkSchedules } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { publishEvent } from '@qr/common';

/**
 * DELETE /schedules/:id
 * 
 * Remove a schedule.
 */
export default async function deleteScheduleRoute(app: FastifyInstance) {
  app.delete('/schedules/:id', {
    schema: {
      description: 'Delete a schedule',
      tags: ['schedules'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { id } = req.params as any;
      const userId = (req as any).userId || 'user-demo';

      const [schedule] = await db
        .select()
        .from(linkSchedules)
        .where(and(
          eq(linkSchedules.id, id),
          eq(linkSchedules.userId, userId)
        ))
        .limit(1);

      if (!schedule) {
        return reply.code(404).send({ error: 'Schedule not found' });
      }

      await db.delete(linkSchedules).where(eq(linkSchedules.id, id));

      await publishEvent('schedule.deleted', {
        eventType: 'schedule.deleted',
        scheduleId: id,
        qrId: schedule.qrId,
        userId,
      });

      return reply.send({ 
        success: true,
        message: `Schedule ${schedule.name} removed successfully`,
      });
    } catch (error: any) {
      req.log.error(error, 'Error deleting schedule');
      return reply.code(500).send({ error: 'Failed to delete schedule' });
    }
  });
}
