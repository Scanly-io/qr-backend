import { FastifyInstance } from 'fastify';
import { eq, and, sql, lte } from 'drizzle-orm';
import { db } from '../db.js';
import { serviceRequests, assets } from '../schema.js';
import { z } from 'zod';

const createServiceRequestSchema = z.object({
  assetId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['repair', 'malfunction', 'question', 'installation']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  requestedBy: z.string(),
  requestedByEmail: z.string().email().optional(),
  requestedByPhone: z.string().optional(),
});

const updateServiceRequestSchema = z.object({
  status: z.enum(['open', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled']).optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  resolution: z.string().optional(),
  notes: z.string().optional(),
});

export default async function serviceRequestRoutes(fastify: FastifyInstance) {
  
  // List service requests
  fastify.get('/', async (request, reply) => {
    const { status, priority, assetId, assignedTo, limit = 50, offset = 0 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(serviceRequests.organizationId, organizationId)];
    
    if (status) {
      conditions.push(eq(serviceRequests.status, status));
    }
    
    if (priority) {
      conditions.push(eq(serviceRequests.priority, priority));
    }
    
    if (assetId) {
      conditions.push(eq(serviceRequests.assetId, assetId));
    }
    
    if (assignedTo) {
      conditions.push(eq(serviceRequests.assignedTo, assignedTo));
    }
    
    const requests = await db.select({
      request: serviceRequests,
      asset: assets,
    })
      .from(serviceRequests)
      .leftJoin(assets, eq(serviceRequests.assetId, assets.id))
      .where(and(...conditions))
      .orderBy(sql`${serviceRequests.createdAt} DESC`)
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    const total = await db.select({ count: sql<number>`count(*)` })
      .from(serviceRequests)
      .where(and(...conditions));
    
    return {
      requests,
      pagination: {
        total: total[0]?.count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }
    };
  });

  // Create service request
  fastify.post('/', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const validatedData = createServiceRequestSchema.parse(request.body);
    
    // Generate ticket number
    const year = new Date().getFullYear();
    const count = await db.select({ count: sql<number>`count(*)` })
      .from(serviceRequests)
      .where(eq(serviceRequests.organizationId, organizationId));
    
    const ticketNumber = `SR-${year}-${String((count[0]?.count || 0) + 1).padStart(5, '0')}`;
    
    const [newRequest] = await db.insert(serviceRequests).values({
      ...validatedData,
      organizationId,
      ticketNumber,
      status: 'open',
      activityLog: [{
        timestamp: new Date().toISOString(),
        action: 'created',
        user: validatedData.requestedBy,
        notes: 'Service request created',
      }],
    }).returning();
    
    reply.code(201).send(newRequest);
  });

  // Get service request by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [result] = await db.select({
      request: serviceRequests,
      asset: assets,
    })
      .from(serviceRequests)
      .leftJoin(assets, eq(serviceRequests.assetId, assets.id))
      .where(and(
        eq(serviceRequests.id, id),
        eq(serviceRequests.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!result) {
      return reply.code(404).send({ error: 'Service request not found' });
    }
    
    return result;
  });

  // Update service request
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const userId = (request.user as any)?.id || 'system';
    const validatedData = updateServiceRequestSchema.parse(request.body);
    
    // Get existing request
    const [existing] = await db.select()
      .from(serviceRequests)
      .where(and(
        eq(serviceRequests.id, id),
        eq(serviceRequests.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!existing) {
      return reply.code(404).send({ error: 'Service request not found' });
    }
    
    // Build activity log entry
    const activityLog = existing.activityLog || [];
    const logEntry: any = {
      timestamp: new Date().toISOString(),
      user: userId,
    };
    
    if (validatedData.status && validatedData.status !== existing.status) {
      logEntry.action = 'status_changed';
      logEntry.notes = `Status changed from ${existing.status} to ${validatedData.status}`;
    } else if (validatedData.assignedTo && validatedData.assignedTo !== existing.assignedTo) {
      logEntry.action = 'assigned';
      logEntry.notes = `Assigned to ${validatedData.assignedTo}`;
    } else {
      logEntry.action = 'updated';
      logEntry.notes = 'Request updated';
    }
    
    activityLog.push(logEntry);
    
    const updateData: any = {
      ...validatedData,
      activityLog,
      updatedAt: new Date(),
    };
    
    // Set timestamps for status changes
    if (validatedData.status === 'assigned' && !existing.assignedAt) {
      updateData.assignedAt = new Date();
    }
    
    if (validatedData.status === 'resolved' && !existing.resolvedAt) {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = userId;
    }
    
    if (validatedData.status === 'closed' && !existing.closedAt) {
      updateData.closedAt = new Date();
    }
    
    const [updated] = await db.update(serviceRequests)
      .set(updateData)
      .where(eq(serviceRequests.id, id))
      .returning();
    
    return updated;
  });

  // Add comment/note to service request
  fastify.post('/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { comment } = request.body as { comment: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const userId = (request.user as any)?.id || 'system';
    
    const [existing] = await db.select()
      .from(serviceRequests)
      .where(and(
        eq(serviceRequests.id, id),
        eq(serviceRequests.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!existing) {
      return reply.code(404).send({ error: 'Service request not found' });
    }
    
    const activityLog = existing.activityLog || [];
    activityLog.push({
      timestamp: new Date().toISOString(),
      action: 'comment_added',
      user: userId,
      notes: comment,
    });
    
    const [updated] = await db.update(serviceRequests)
      .set({
        activityLog,
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, id))
      .returning();
    
    return updated;
  });

  // Get overdue service requests
  fastify.get('/overdue', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const overdue = await db.select({
      request: serviceRequests,
      asset: assets,
    })
      .from(serviceRequests)
      .leftJoin(assets, eq(serviceRequests.assetId, assets.id))
      .where(and(
        eq(serviceRequests.organizationId, organizationId),
        eq(serviceRequests.isOverdue, true),
        sql`${serviceRequests.status} NOT IN ('resolved', 'closed', 'cancelled')`
      ))
      .orderBy(serviceRequests.dueDate);
    
    return { overdue, count: overdue.length };
  });

  // Get service request stats
  fastify.get('/stats', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const statsByStatus = await db.select({
      status: serviceRequests.status,
      count: sql<number>`count(*)`,
    })
      .from(serviceRequests)
      .where(eq(serviceRequests.organizationId, organizationId))
      .groupBy(serviceRequests.status);
    
    const statsByPriority = await db.select({
      priority: serviceRequests.priority,
      count: sql<number>`count(*)`,
    })
      .from(serviceRequests)
      .where(eq(serviceRequests.organizationId, organizationId))
      .groupBy(serviceRequests.priority);
    
    const overdueCount = await db.select({ count: sql<number>`count(*)` })
      .from(serviceRequests)
      .where(and(
        eq(serviceRequests.organizationId, organizationId),
        eq(serviceRequests.isOverdue, true),
        sql`${serviceRequests.status} NOT IN ('resolved', 'closed', 'cancelled')`
      ));
    
    return {
      byStatus: statsByStatus,
      byPriority: statsByPriority,
      overdue: overdueCount[0]?.count || 0,
    };
  });
}
