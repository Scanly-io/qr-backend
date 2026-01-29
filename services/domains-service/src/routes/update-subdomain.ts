import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db.js';
import { subdomains } from '../schema.js';
import { eq } from 'drizzle-orm';
import { publishEvent } from '../kafka.js';

/**
 * PATCH /subdomains/me
 * 
 * Update your subdomain settings (default QR, metadata, etc.)
 */

const updateSubdomainSchema = z.object({
  defaultQrId: z.string().optional(),
  metadata: z.string().optional(), // JSON string
  isActive: z.boolean().optional(),
});

const updateMySubdomain: FastifyPluginAsync = async (app) => {
  app.patch('/subdomains/me', {
    schema: {
      description: 'Update your subdomain settings',
      tags: ['subdomains'],
      body: {
        type: 'object',
        properties: {
          defaultQrId: { type: 'string' },
          metadata: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request as any).userId;
    
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const body = updateSubdomainSchema.parse(request.body);

    // Find user's subdomain
    const [existingSubdomain] = await db
      .select()
      .from(subdomains)
      .where(eq(subdomains.userId, userId))
      .limit(1);

    if (!existingSubdomain) {
      return reply.code(404).send({ error: 'You have not claimed a subdomain yet' });
    }

    // Update subdomain
    const [updatedSubdomain] = await db
      .update(subdomains)
      .set({
        ...(body.defaultQrId !== undefined && { defaultQrId: body.defaultQrId }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(subdomains.id, existingSubdomain.id))
      .returning();

    // Publish event
    await publishEvent('subdomain.updated', {
      subdomainId: updatedSubdomain.id,
      userId,
      subdomain: updatedSubdomain.subdomain,
      changes: body,
      updatedAt: new Date().toISOString(),
    });

    return reply.send({
      message: 'Subdomain updated successfully',
      subdomain: updatedSubdomain,
      url: `https://${updatedSubdomain.subdomain}.${process.env.SUBDOMAIN_BASE || 'scanly.io'}`,
    });
  });
};

export default updateMySubdomain;
