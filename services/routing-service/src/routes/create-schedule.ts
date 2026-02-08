import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { linkSchedules } from '../schema.js';
import { publishEvent } from '@qr/common';

/**
 * POST /schedules
 * 
 * Create a new link schedule for time-based routing.
 */
export default async function createScheduleRoute(app: FastifyInstance) {
  app.post('/schedules', {
    schema: {
      description: 'Create a new link schedule',
      tags: ['schedules'],
      body: {
        type: 'object',
        required: ['qrId', 'name', 'scheduleType', 'targetUrl'],
        properties: {
          qrId: { type: 'string' },
          name: { type: 'string' },
          scheduleType: { type: 'string', enum: ['once', 'recurring', 'date_range'] },
          targetUrl: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          recurringPattern: { type: 'object' },
          timezone: { type: 'string', default: 'UTC' },
          priority: { type: 'number', default: 100 }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const userId = (req as any).userId || 'user-demo';
      const { qrId, name, scheduleType, targetUrl, startDate, endDate, recurringPattern, timezone, priority } = req.body as any;

      const [schedule] = await db
        .insert(linkSchedules)
        .values({
          userId,
          qrId,
          name,
          scheduleType,
          targetUrl,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          recurringPattern: recurringPattern || null,
          timezone: timezone || 'UTC',
          priority: priority?.toString() || '100',
          isActive: true,
        })
        .returning();

      await publishEvent('schedule.created', {
        eventType: 'schedule.created',
        scheduleId: schedule.id,
        qrId,
        userId,
        scheduleType,
      });

      return reply.code(201).send({ schedule });
    } catch (error: any) {
      req.log.error(error, 'Error creating schedule');
      return reply.code(500).send({ error: 'Failed to create schedule' });
    }
  });
}
