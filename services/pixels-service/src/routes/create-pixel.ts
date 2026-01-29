import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { retargetingPixels } from '../schema.js';
import { publishEvent } from '../kafka.js';

/**
 * POST /pixels
 * 
 * Add a new retargeting pixel.
 * 
 * Body:
 * {
 *   platform: "facebook",
 *   pixelId: "1234567890",
 *   name: "Facebook Pixel - Main",
 *   qrId: "qr-abc123",  // optional
 *   config: { events: ["PageView", "Lead"] },
 *   triggerEvent: "page_view"
 * }
 */
export default async function createPixelRoute(app: FastifyInstance) {
  app.post('/pixels', {
    schema: {
      description: 'Add a new retargeting pixel',
      tags: ['pixels'],
      body: {
        type: 'object',
        required: ['platform', 'pixelId', 'name'],
        properties: {
          platform: { 
            type: 'string', 
            enum: ['facebook', 'google_ads', 'tiktok', 'linkedin', 'twitter', 'snapchat', 'pinterest', 'custom'],
            description: 'Pixel platform'
          },
          pixelId: { type: 'string', description: 'Platform pixel ID' },
          name: { type: 'string', description: 'Human-readable name' },
          qrId: { type: 'string', description: 'Optional: Link to specific QR code' },
          config: { type: 'object', description: 'Platform-specific configuration' },
          triggerEvent: { 
            type: 'string', 
            enum: ['page_view', 'button_click', 'lead_capture', 'custom'],
            default: 'page_view'
          }
        }
      }
    }
  }, async (req, reply) => {
    try {
      const { platform, pixelId, name, qrId, config, triggerEvent } = req.body as any;
      const userId = (req as any).userId || 'user-demo';

      // Create pixel
      const [newPixel] = await db
        .insert(retargetingPixels)
        .values({
          userId,
          qrId: qrId || null,
          platform,
          pixelId,
          name,
          config: config || null,
          triggerEvent: triggerEvent || 'page_view',
          isActive: true,
        })
        .returning();

      // Publish event
      await publishEvent('pixel.created', {
        eventType: 'pixel.created',
        pixelId: newPixel.id,
        userId,
        platform,
        qrId: qrId || null,
      });

      return reply.code(201).send({ pixel: newPixel });
    } catch (error: any) {
      req.log.error(error, 'Error creating pixel');
      return reply.code(500).send({ error: 'Failed to create pixel' });
    }
  });
}
