import { FastifyInstance } from 'fastify';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { inspections, assets } from '../schema.js';
import { z } from 'zod';

const createInspectionSchema = z.object({
  assetId: z.string().uuid(),
  inspectionType: z.enum(['safety', 'regulatory', 'quality', 'environmental']),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledDate: z.string(),
  dueDate: z.string().optional(),
  checklistItems: z.array(z.object({
    item: z.string(),
    checked: z.boolean().default(false),
    status: z.enum(['pass', 'fail', 'na']).default('na'),
    notes: z.string().optional(),
  })).optional(),
});

const completeInspectionSchema = z.object({
  completedDate: z.string().optional(),
  result: z.enum(['pass', 'fail', 'conditional_pass']),
  inspectedBy: z.string(),
  inspectorName: z.string(),
  inspectorCredentials: z.string().optional(),
  checklistItems: z.array(z.object({
    item: z.string(),
    checked: z.boolean(),
    status: z.enum(['pass', 'fail', 'na']),
    notes: z.string().optional(),
  })),
  findings: z.string().optional(),
  correctiveActions: z.string().optional(),
  certificateNumber: z.string().optional(),
  certificateExpires: z.string().optional(),
});

export default async function inspectionRoutes(fastify: FastifyInstance) {
  
  // List inspections
  fastify.get('/', async (request, reply) => {
    const { assetId, status, inspectionType, from, to, limit = 50, offset = 0 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(inspections.organizationId, organizationId)];
    
    if (assetId) {
      conditions.push(eq(inspections.assetId, assetId));
    }
    
    if (status) {
      conditions.push(eq(inspections.status, status));
    }
    
    if (inspectionType) {
      conditions.push(eq(inspections.inspectionType, inspectionType));
    }
    
    if (from) {
      conditions.push(gte(inspections.scheduledDate, new Date(from)));
    }
    
    if (to) {
      conditions.push(lte(inspections.scheduledDate, new Date(to)));
    }
    
    const results = await db.select({
      inspection: inspections,
      asset: assets,
    })
      .from(inspections)
      .leftJoin(assets, eq(inspections.assetId, assets.id))
      .where(and(...conditions))
      .orderBy(sql`${inspections.scheduledDate} DESC`)
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    const total = await db.select({ count: sql<number>`count(*)` })
      .from(inspections)
      .where(and(...conditions));
    
    return {
      inspections: results,
      pagination: {
        total: total[0]?.count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }
    };
  });

  // Create inspection
  fastify.post('/', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const validatedData = createInspectionSchema.parse(request.body);
    
    const [newInspection] = await db.insert(inspections).values({
      ...validatedData,
      organizationId,
      scheduledDate: new Date(validatedData.scheduledDate),
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      status: 'pending',
    }).returning();
    
    reply.code(201).send(newInspection);
  });

  // Get inspection by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [result] = await db.select({
      inspection: inspections,
      asset: assets,
    })
      .from(inspections)
      .leftJoin(assets, eq(inspections.assetId, assets.id))
      .where(and(
        eq(inspections.id, id),
        eq(inspections.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!result) {
      return reply.code(404).send({ error: 'Inspection not found' });
    }
    
    return result;
  });

  // Update inspection
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const updateData = request.body as Record<string, any>;
    
    const [updated] = await db.update(inspections)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(inspections.id, id),
        eq(inspections.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Inspection not found' });
    }
    
    return updated;
  });

  // Complete inspection
  fastify.post('/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const validatedData = completeInspectionSchema.parse(request.body);
    
    const updateData: any = {
      completedDate: validatedData.completedDate ? new Date(validatedData.completedDate) : new Date(),
      status: 'completed',
      result: validatedData.result,
      inspectedBy: validatedData.inspectedBy,
      inspectorName: validatedData.inspectorName,
      inspectorCredentials: validatedData.inspectorCredentials,
      checklistItems: validatedData.checklistItems,
      findings: validatedData.findings,
      correctiveActions: validatedData.correctiveActions,
      certificateNumber: validatedData.certificateNumber,
      certificateExpires: validatedData.certificateExpires ? new Date(validatedData.certificateExpires) : undefined,
      updatedAt: new Date(),
    };
    
    const [updated] = await db.update(inspections)
      .set(updateData)
      .where(and(
        eq(inspections.id, id),
        eq(inspections.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Inspection not found' });
    }
    
    return updated;
  });

  // Get due inspections
  fastify.get('/due', async (request, reply) => {
    const { days = 30 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    
    const due = await db.select({
      inspection: inspections,
      asset: assets,
    })
      .from(inspections)
      .leftJoin(assets, eq(inspections.assetId, assets.id))
      .where(and(
        eq(inspections.organizationId, organizationId),
        eq(inspections.status, 'pending'),
        lte(inspections.scheduledDate, futureDate),
        gte(inspections.scheduledDate, new Date())
      ))
      .orderBy(inspections.scheduledDate);
    
    return { due, count: due.length };
  });

  // Get overdue inspections
  fastify.get('/overdue', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const overdue = await db.select({
      inspection: inspections,
      asset: assets,
    })
      .from(inspections)
      .leftJoin(assets, eq(inspections.assetId, assets.id))
      .where(and(
        eq(inspections.organizationId, organizationId),
        sql`${inspections.status} IN ('pending', 'in_progress')`,
        lte(inspections.dueDate, new Date())
      ))
      .orderBy(inspections.dueDate);
    
    return { overdue, count: overdue.length };
  });

  // Get failed inspections
  fastify.get('/failed', async (request, reply) => {
    const { from, to } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [
      eq(inspections.organizationId, organizationId),
      eq(inspections.result, 'fail'),
    ];
    
    if (from) {
      conditions.push(gte(inspections.completedDate, new Date(from)));
    }
    
    if (to) {
      conditions.push(lte(inspections.completedDate, new Date(to)));
    }
    
    const failed = await db.select({
      inspection: inspections,
      asset: assets,
    })
      .from(inspections)
      .leftJoin(assets, eq(inspections.assetId, assets.id))
      .where(and(...conditions))
      .orderBy(sql`${inspections.completedDate} DESC`);
    
    return { failed, count: failed.length };
  });

  // Get expiring certificates
  fastify.get('/certificates/expiring', async (request, reply) => {
    const { days = 90 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    
    const expiring = await db.select({
      inspection: inspections,
      asset: assets,
    })
      .from(inspections)
      .leftJoin(assets, eq(inspections.assetId, assets.id))
      .where(and(
        eq(inspections.organizationId, organizationId),
        sql`${inspections.certificateExpires} IS NOT NULL`,
        lte(inspections.certificateExpires, futureDate),
        gte(inspections.certificateExpires, new Date())
      ))
      .orderBy(inspections.certificateExpires);
    
    return { expiring, count: expiring.length };
  });

  // Get inspection stats
  fastify.get('/stats', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const statsByType = await db.select({
      inspectionType: inspections.inspectionType,
      count: sql<number>`count(*)`,
    })
      .from(inspections)
      .where(eq(inspections.organizationId, organizationId))
      .groupBy(inspections.inspectionType);
    
    const statsByResult = await db.select({
      result: inspections.result,
      count: sql<number>`count(*)`,
    })
      .from(inspections)
      .where(and(
        eq(inspections.organizationId, organizationId),
        sql`${inspections.result} IS NOT NULL`
      ))
      .groupBy(inspections.result);
    
    const passRate = await db.select({
      total: sql<number>`count(*)`,
      passed: sql<number>`count(*) FILTER (WHERE ${inspections.result} = 'pass')`,
    })
      .from(inspections)
      .where(and(
        eq(inspections.organizationId, organizationId),
        sql`${inspections.result} IS NOT NULL`
      ));
    
    const passRatePercent = passRate[0]?.total > 0 
      ? ((passRate[0]?.passed || 0) / passRate[0].total * 100).toFixed(2)
      : '0';
    
    return {
      byType: statsByType,
      byResult: statsByResult,
      passRate: `${passRatePercent}%`,
      total: passRate[0]?.total || 0,
    };
  });
}
