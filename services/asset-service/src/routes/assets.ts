import { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { assets, assetTypes, assetAuditLog } from '../schema.js';
import QRCode from 'qrcode';
import { z } from 'zod';

const createAssetSchema = z.object({
  assetTypeId: z.string().uuid(),
  assetTag: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  purchasePrice: z.number().optional(),
  warrantyExpiry: z.coerce.date().optional(),
  locationId: z.string().uuid().optional(),
  locationName: z.string().optional(),
  assignedTo: z.string().optional(),
  status: z.enum(['active', 'inactive', 'in_maintenance', 'retired']).default('active'),
});

export default async function assetRoutes(fastify: FastifyInstance) {
  
  // List assets
  fastify.get('/', async (request, reply) => {
    const { status, assetTypeId, locationId, search, limit = 50, offset = 0 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(assets.organizationId, organizationId)];
    
    if (status) {
      conditions.push(eq(assets.status, status));
    }
    
    if (assetTypeId) {
      conditions.push(eq(assets.assetTypeId, assetTypeId));
    }
    
    if (locationId) {
      conditions.push(eq(assets.locationId, locationId));
    }
    
    if (search) {
      conditions.push(
        sql`(${assets.name} ILIKE ${`%${search}%`} OR ${assets.assetTag} ILIKE ${`%${search}%`})`
      );
    }
    
    const results = await db.select({
      asset: assets,
      assetType: assetTypes,
    })
      .from(assets)
      .leftJoin(assetTypes, eq(assets.assetTypeId, assetTypes.id))
      .where(and(...conditions))
      .orderBy(sql`${assets.createdAt} DESC`)
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    const total = await db.select({ count: sql<number>`count(*)` })
      .from(assets)
      .where(and(...conditions));
    
    return {
      assets: results,
      pagination: {
        total: total[0]?.count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }
    };
  });

  // Create asset
  fastify.post('/', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const userId = (request.user as any)?.id || 'system';
    const validatedData = createAssetSchema.parse(request.body);
    
    const [newAsset] = await db.insert(assets).values({
      ...validatedData,
      organizationId,
      createdBy: userId,
    }).returning();
    
    reply.code(201).send(newAsset);
  });

  // Get asset by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [result] = await db.select()
      .from(assets)
      .where(and(
        eq(assets.id, id),
        eq(assets.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!result) {
      return reply.code(404).send({ error: 'Asset not found' });
    }
    
    return result;
  });

  // Update asset
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const updateData = request.body as Record<string, any>;
    
    const [updated] = await db.update(assets)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(assets.id, id),
        eq(assets.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Asset not found' });
    }
    
    return updated;
  });

  // Delete asset
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    await db.delete(assets)
      .where(and(
        eq(assets.id, id),
        eq(assets.organizationId, organizationId)
      ));
    
    reply.code(204).send();
  });

  // Assign QR code
  fastify.post('/:id/assign-qr', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { qrCodeId } = request.body as { qrCodeId: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const qrCodeUrl = `https://app.scanly.io/track/${qrCodeId}`;
    
    const [updated] = await db.update(assets)
      .set({ qrCodeId, qrCodeUrl, updatedAt: new Date() })
      .where(and(
        eq(assets.id, id),
        eq(assets.organizationId, organizationId)
      ))
      .returning();
    
    return { asset: updated, qrCodeUrl };
  });

  // Generate QR code image
  fastify.get('/:id/qr', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { size = '300' } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [asset] = await db.select()
      .from(assets)
      .where(and(
        eq(assets.id, id),
        eq(assets.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!asset || !asset.qrCodeUrl) {
      return reply.code(404).send({ error: 'Asset not found or QR code not assigned' });
    }
    
    const png = await QRCode.toBuffer(asset.qrCodeUrl, {
      width: parseInt(size),
      margin: 2,
    });
    
    reply.type('image/png').send(png);
  });

  // Get asset history
  fastify.get('/:id/history', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const history = await db.select()
      .from(assetAuditLog)
      .where(and(
        eq(assetAuditLog.assetId, id),
        eq(assetAuditLog.organizationId, organizationId)
      ))
      .orderBy(sql`${assetAuditLog.timestamp} DESC`)
      .limit(50);
    
    return { history };
  });

  // Transfer asset
  fastify.post('/:id/transfer', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { locationId, locationName, assignedTo } = request.body as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [updated] = await db.update(assets)
      .set({
        locationId,
        locationName,
        assignedTo,
        updatedAt: new Date(),
      })
      .where(and(
        eq(assets.id, id),
        eq(assets.organizationId, organizationId)
      ))
      .returning();
    
    return updated;
  });
}
