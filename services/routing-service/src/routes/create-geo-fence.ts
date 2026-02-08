import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { geoFences } from '../schema.js';
import { publishEvent } from '@qr/common';

/**
 * POST /geo-fences
 * 
 * Create a new geo-fence for location-based routing.
 */
export default async function createGeoFenceRoute(app: FastifyInstance) {
  app.post('/geo-fences', {
    schema: {
      description: 'Create a new geo-fence',
      tags: ['geo-fences'],
      body: {
        type: 'object',
        required: ['qrId', 'name', 'fenceType', 'targetUrl'],
        properties: {
          qrId: { type: 'string' },
          name: { type: 'string' },
          fenceType: { type: 'string', enum: ['country', 'region', 'city', 'radius'] },
          targetUrl: { type: 'string' },
          countries: { type: 'array', items: { type: 'string' } },
          regions: { type: 'array', items: { type: 'string' } },
          cities: { type: 'array', items: { type: 'string' } },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radiusKm: { type: 'number' },
          priority: { type: 'number', default: 100 }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const userId = (req as any).userId || 'user-demo';
      const { qrId, name, fenceType, targetUrl, countries, regions, cities, latitude, longitude, radiusKm, priority } = req.body as any;

      const [fence] = await db
        .insert(geoFences)
        .values({
          userId,
          qrId,
          name,
          fenceType,
          targetUrl,
          countries: countries || null,
          regions: regions || null,
          cities: cities || null,
          latitude: latitude?.toString() || null,
          longitude: longitude?.toString() || null,
          radiusKm: radiusKm?.toString() || null,
          priority: priority?.toString() || '100',
          isActive: true,
        })
        .returning();

      await publishEvent('geo_fence.created', {
        eventType: 'geo_fence.created',
        geoFenceId: fence.id,
        qrId,
        userId,
        fenceType,
      });

      return reply.code(201).send({ fence });
    } catch (error: any) {
      req.log.error(error, 'Error creating geo-fence');
      return reply.code(500).send({ error: 'Failed to create geo-fence' });
    }
  });
}
