import { FastifyInstance } from 'fastify';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { maintenanceRecords, assets } from '../schema.js';
import { z } from 'zod';

const createMaintenanceSchema = z.object({
  assetId: z.string().uuid(),
  type: z.enum(['preventive', 'corrective', 'inspection', 'calibration']),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledDate: z.string(),
  performedBy: z.string().optional(),
  vendor: z.string().optional(),
});

const completeMaintenanceSchema = z.object({
  completedDate: z.string().optional(),
  hoursSpent: z.string().optional(),
  cost: z.string().optional(),
  notes: z.string().optional(),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
  partsReplaced: z.array(z.object({
    partName: z.string(),
    partNumber: z.string(),
    quantity: z.number(),
    cost: z.number(),
  })).optional(),
});

export default async function maintenanceRoutes(fastify: FastifyInstance) {
  
  // List maintenance records
  fastify.get('/', async (request, reply) => {
    const { assetId, status, type, from, to, limit = 50, offset = 0 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(maintenanceRecords.organizationId, organizationId)];
    
    if (assetId) {
      conditions.push(eq(maintenanceRecords.assetId, assetId));
    }
    
    if (status) {
      conditions.push(eq(maintenanceRecords.status, status));
    }
    
    if (type) {
      conditions.push(eq(maintenanceRecords.type, type));
    }
    
    if (from) {
      conditions.push(gte(maintenanceRecords.scheduledDate, new Date(from)));
    }
    
    if (to) {
      conditions.push(lte(maintenanceRecords.scheduledDate, new Date(to)));
    }
    
    const records = await db.select({
      maintenance: maintenanceRecords,
      asset: assets,
    })
      .from(maintenanceRecords)
      .leftJoin(assets, eq(maintenanceRecords.assetId, assets.id))
      .where(and(...conditions))
      .orderBy(sql`${maintenanceRecords.scheduledDate} DESC`)
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    const total = await db.select({ count: sql<number>`count(*)` })
      .from(maintenanceRecords)
      .where(and(...conditions));
    
    return {
      records,
      pagination: {
        total: total[0]?.count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }
    };
  });

  // Create maintenance record
  fastify.post('/', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const validatedData = createMaintenanceSchema.parse(request.body);
    
    const [record] = await db.insert(maintenanceRecords).values({
      ...validatedData,
      organizationId,
      scheduledDate: new Date(validatedData.scheduledDate),
      status: 'scheduled',
    }).returning();
    
    reply.code(201).send(record);
  });

  // Get maintenance record
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [record] = await db.select({
      maintenance: maintenanceRecords,
      asset: assets,
    })
      .from(maintenanceRecords)
      .leftJoin(assets, eq(maintenanceRecords.assetId, assets.id))
      .where(and(
        eq(maintenanceRecords.id, id),
        eq(maintenanceRecords.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!record) {
      return reply.code(404).send({ error: 'Maintenance record not found' });
    }
    
    return record;
  });

  // Update maintenance record
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const updateData = request.body as Record<string, any>;
    
    const [updated] = await db.update(maintenanceRecords)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(maintenanceRecords.id, id),
        eq(maintenanceRecords.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Maintenance record not found' });
    }
    
    return updated;
  });

  // Complete maintenance
  fastify.post('/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const validatedData = completeMaintenanceSchema.parse(request.body);
    
    const [updated] = await db.update(maintenanceRecords)
      .set({
        completedDate: validatedData.completedDate ? new Date(validatedData.completedDate) : new Date(),
        status: 'completed',
        hoursSpent: validatedData.hoursSpent,
        cost: validatedData.cost,
        notes: validatedData.notes,
        findings: validatedData.findings,
        recommendations: validatedData.recommendations,
        partsReplaced: validatedData.partsReplaced,
        updatedAt: new Date(),
      })
      .where(and(
        eq(maintenanceRecords.id, id),
        eq(maintenanceRecords.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Maintenance record not found' });
    }
    
    // Update asset's last maintenance date
    await db.update(assets)
      .set({
        lastMaintenanceDate: updated.completedDate,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, updated.assetId));
    
    return updated;
  });

  // Get upcoming maintenance (due soon)
  fastify.get('/upcoming', async (request, reply) => {
    const { days = 30 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    
    const upcoming = await db.select({
      maintenance: maintenanceRecords,
      asset: assets,
    })
      .from(maintenanceRecords)
      .leftJoin(assets, eq(maintenanceRecords.assetId, assets.id))
      .where(and(
        eq(maintenanceRecords.organizationId, organizationId),
        eq(maintenanceRecords.status, 'scheduled'),
        lte(maintenanceRecords.scheduledDate, futureDate),
        gte(maintenanceRecords.scheduledDate, new Date())
      ))
      .orderBy(maintenanceRecords.scheduledDate);
    
    return { upcoming, count: upcoming.length };
  });

  // Get overdue maintenance
  fastify.get('/overdue', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const overdue = await db.select({
      maintenance: maintenanceRecords,
      asset: assets,
    })
      .from(maintenanceRecords)
      .leftJoin(assets, eq(maintenanceRecords.assetId, assets.id))
      .where(and(
        eq(maintenanceRecords.organizationId, organizationId),
        eq(maintenanceRecords.status, 'scheduled'),
        lte(maintenanceRecords.scheduledDate, new Date())
      ))
      .orderBy(maintenanceRecords.scheduledDate);
    
    return { overdue, count: overdue.length };
  });

  // Get maintenance stats
  fastify.get('/stats', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const stats = await db.select({
      status: maintenanceRecords.status,
      count: sql<number>`count(*)`,
      totalCost: sql<number>`sum(CAST(${maintenanceRecords.cost} AS DECIMAL))`,
    })
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.organizationId, organizationId))
      .groupBy(maintenanceRecords.status);
    
    return { stats };
  });
}
