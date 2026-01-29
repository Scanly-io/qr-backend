import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { workflows } from '../schema.js';
import { z } from 'zod';
import { WorkflowEngine } from '../engine/executor.js';

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  definition: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }),
  trigger: z.object({
    type: z.enum(['qr-scan', 'webhook', 'schedule', 'manual', 'database-event']),
    config: z.record(z.any()),
  }),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export default async function workflowRoutes(fastify: FastifyInstance) {
  const engine = new WorkflowEngine();
  
  // List workflows
  fastify.get('/', async (request, reply) => {
    const { status, category, limit = 50, offset = 0 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(workflows.organizationId, organizationId)];
    
    if (status) {
      conditions.push(eq(workflows.status, status));
    }
    
    if (category) {
      conditions.push(eq(workflows.category, category));
    }
    
    const workflowList = await db.select()
      .from(workflows)
      .where(and(...conditions))
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    return { workflows: workflowList };
  });
  
  // Create workflow
  fastify.post('/', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const userId = (request.user as any)?.id || 'system';
    const validatedData = createWorkflowSchema.parse(request.body);
    
    const [workflow] = await db.insert(workflows).values({
      organizationId,
      name: validatedData.name,
      description: validatedData.description,
      definition: validatedData.definition,
      trigger: validatedData.trigger,
      category: validatedData.category,
      tags: validatedData.tags,
      status: 'draft',
      createdBy: userId,
    }).returning();
    
    reply.code(201).send(workflow);
  });
  
  // Get workflow
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [workflow] = await db.select()
      .from(workflows)
      .where(and(
        eq(workflows.id, id),
        eq(workflows.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!workflow) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }
    
    return workflow;
  });
  
  // Update workflow
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const updateData = request.body as Record<string, any>;
    
    const [updated] = await db.update(workflows)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(workflows.id, id),
        eq(workflows.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }
    
    return updated;
  });
  
  // Delete workflow
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    await db.delete(workflows)
      .where(and(
        eq(workflows.id, id),
        eq(workflows.organizationId, organizationId)
      ));
    
    reply.code(204).send();
  });
  
  // Publish workflow (activate)
  fastify.post('/:id/publish', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [updated] = await db.update(workflows)
      .set({
        status: 'active',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(workflows.id, id),
        eq(workflows.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }
    
    return { message: 'Workflow published successfully', workflow: updated };
  });
  
  // Pause workflow
  fastify.post('/:id/pause', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [updated] = await db.update(workflows)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(and(
        eq(workflows.id, id),
        eq(workflows.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }
    
    return { message: 'Workflow paused', workflow: updated };
  });
  
  // Execute workflow manually
  fastify.post('/:id/execute', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { triggerData } = request.body as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    // Verify workflow exists and belongs to organization
    const [workflow] = await db.select()
      .from(workflows)
      .where(and(
        eq(workflows.id, id),
        eq(workflows.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!workflow) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }
    
    // Execute workflow asynchronously
    engine.execute(id, triggerData || {}).catch(err => {
      fastify.log.error(`Workflow execution failed: ${err.message}`);
    });
    
    return { message: 'Workflow execution started', workflowId: id };
  });
  
  // Duplicate workflow
  fastify.post('/:id/duplicate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const userId = (request.user as any)?.id || 'system';
    
    const [original] = await db.select()
      .from(workflows)
      .where(and(
        eq(workflows.id, id),
        eq(workflows.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!original) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }
    
    const [duplicate] = await db.insert(workflows).values({
      organizationId,
      name: `${original.name} (Copy)`,
      description: original.description,
      definition: original.definition,
      trigger: original.trigger,
      category: original.category,
      tags: original.tags,
      status: 'draft',
      createdBy: userId,
    }).returning();
    
    return duplicate;
  });
  
  // Get workflow statistics
  fastify.get('/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [workflow] = await db.select()
      .from(workflows)
      .where(and(
        eq(workflows.id, id),
        eq(workflows.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!workflow) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }
    
    const successRate = workflow.totalExecutions && workflow.totalExecutions > 0
      ? ((workflow.successfulExecutions || 0) / workflow.totalExecutions * 100).toFixed(2)
      : '0';
    
    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: workflow.status,
      totalExecutions: workflow.totalExecutions || 0,
      successfulExecutions: workflow.successfulExecutions || 0,
      failedExecutions: workflow.failedExecutions || 0,
      successRate: `${successRate}%`,
      lastExecutedAt: workflow.lastExecutedAt,
    };
  });
}
