import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createCustomReport,
  executeReport,
  getReportExecutions,
  getCustomReports,
  deleteCustomReport,
  updateReportSchedule,
} from '../lib/report-generator';

const CreateReportSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  reportType: z.string(),
  dataSource: z.object({
    services: z.array(z.string()),
    tables: z.array(z.string()),
  }),
  metrics: z.array(z.object({
    name: z.string(),
    calculation: z.enum(['sum', 'count', 'avg', 'min', 'max', 'distinct_count']),
    field: z.string(),
  })),
  dimensions: z.array(z.string()).optional(),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'like']),
    value: z.any(),
  })).optional(),
  dateRange: z.object({
    type: z.enum(['relative', 'absolute']),
    start: z.string().optional(),
    end: z.string().optional(),
    relativePeriod: z.enum(['last_7_days', 'last_30_days', 'last_90_days', 'this_month', 'last_month']).optional(),
  }),
  schedule: z.enum(['daily', 'weekly', 'monthly']).optional(),
  scheduleConfig: z.any().optional(),
  exportFormat: z.enum(['pdf', 'csv', 'excel', 'json']).optional(),
  emailRecipients: z.array(z.string().email()).optional(),
});

const UpdateScheduleSchema = z.object({
  schedule: z.enum(['daily', 'weekly', 'monthly']).nullable(),
  scheduleConfig: z.any().optional(),
});

export default async function reportsRoutes(fastify: FastifyInstance) {
  /**
   * Create a new custom report
   */
  fastify.post('/reports', async (request, reply) => {
    const reportConfig = CreateReportSchema.parse(request.body);
    
    const reportId = await createCustomReport(
      reportConfig.organizationId,
      reportConfig.userId,
      reportConfig
    );
    
    return {
      success: true,
      data: { reportId },
    };
  });
  
  /**
   * Get all custom reports for an organization
   */
  fastify.get('/reports', async (request, reply) => {
    const { organizationId } = request.query as { organizationId: string };
    
    const reports = await getCustomReports(organizationId);
    
    return {
      success: true,
      data: reports,
    };
  });
  
  /**
   * Execute a report
   */
  fastify.post('/reports/:reportId/execute', async (request, reply) => {
    const { reportId } = request.params as { reportId: string };
    
    const result = await executeReport(reportId);
    
    return {
      success: true,
      data: result,
    };
  });
  
  /**
   * Get report execution history
   */
  fastify.get('/reports/:reportId/executions', async (request, reply) => {
    const { reportId } = request.params as { reportId: string };
    const { limit } = request.query as { limit?: number };
    
    const executions = await getReportExecutions(reportId, limit);
    
    return {
      success: true,
      data: executions,
    };
  });
  
  /**
   * Update report schedule
   */
  fastify.patch('/reports/:reportId/schedule', async (request, reply) => {
    const { reportId } = request.params as { reportId: string };
    const { schedule, scheduleConfig } = UpdateScheduleSchema.parse(request.body);
    
    await updateReportSchedule(reportId, schedule, scheduleConfig);
    
    return {
      success: true,
      message: 'Report schedule updated',
    };
  });
  
  /**
   * Delete a custom report
   */
  fastify.delete('/reports/:reportId', async (request, reply) => {
    const { reportId } = request.params as { reportId: string };
    
    await deleteCustomReport(reportId);
    
    return {
      success: true,
      message: 'Report deleted',
    };
  });
}
