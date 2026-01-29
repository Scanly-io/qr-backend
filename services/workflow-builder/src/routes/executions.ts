import { FastifyInstance } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db.js';
import { workflowExecutions, workflows } from '../schema.js';

export default async function executionRoutes(fastify: FastifyInstance) {
  
  // List executions
  fastify.get('/', async (request, reply) => {
    const { workflowId, status, limit = 50, offset = 0 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(workflowExecutions.organizationId, organizationId)];
    
    if (workflowId) {
      conditions.push(eq(workflowExecutions.workflowId, workflowId));
    }
    
    if (status) {
      conditions.push(eq(workflowExecutions.status, status));
    }
    
    const executions = await db.select({
      execution: workflowExecutions,
      workflow: workflows,
    })
      .from(workflowExecutions)
      .leftJoin(workflows, eq(workflowExecutions.workflowId, workflows.id))
      .where(and(...conditions))
      .orderBy(desc(workflowExecutions.startedAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    return { executions };
  });
  
  // Get execution details
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [execution] = await db.select()
      .from(workflowExecutions)
      .where(and(
        eq(workflowExecutions.id, id),
        eq(workflowExecutions.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!execution) {
      return reply.code(404).send({ error: 'Execution not found' });
    }
    
    return execution;
  });
  
  // Cancel execution
  fastify.post('/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [updated] = await db.update(workflowExecutions)
      .set({ status: 'cancelled', completedAt: new Date() })
      .where(and(
        eq(workflowExecutions.id, id),
        eq(workflowExecutions.organizationId, organizationId),
        eq(workflowExecutions.status, 'running')
      ))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Execution not found or not running' });
    }
    
    return { message: 'Execution cancelled', execution: updated };
  });
  
  // Get execution trace (for visualization)
  fastify.get('/:id/trace', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [execution] = await db.select()
      .from(workflowExecutions)
      .where(and(
        eq(workflowExecutions.id, id),
        eq(workflowExecutions.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!execution) {
      return reply.code(404).send({ error: 'Execution not found' });
    }
    
    return {
      executionId: execution.id,
      status: execution.status,
      trace: execution.executionTrace || [],
      variables: execution.variables,
      duration: execution.duration,
    };
  });
}
