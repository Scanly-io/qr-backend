import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createDataExport,
  getExportStatus,
  getOrganizationExports,
} from '../lib/data-exporter';

const CreateExportSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  exportType: z.enum(['qr_codes', 'scans', 'users', 'analytics', 'full_backup']),
  format: z.enum(['csv', 'json', 'excel', 'sql']),
  filters: z.record(z.any()).optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  includedFields: z.array(z.string()).optional(),
});

export default async function exportsRoutes(fastify: FastifyInstance) {
  /**
   * Create a new data export
   */
  fastify.post('/exports', async (request, reply) => {
    const exportConfig = CreateExportSchema.parse(request.body);
    
    const config = {
      ...exportConfig,
      dateRange: exportConfig.dateRange ? {
        start: new Date(exportConfig.dateRange.start),
        end: new Date(exportConfig.dateRange.end),
      } : undefined,
    };
    
    const exportId = await createDataExport(config);
    
    return {
      success: true,
      data: { exportId },
      message: 'Export created. Processing in background.',
    };
  });
  
  /**
   * Get export status
   */
  fastify.get('/exports/:exportId', async (request, reply) => {
    const { exportId } = request.params as { exportId: string };
    
    const exportStatus = await getExportStatus(exportId);
    
    return {
      success: true,
      data: exportStatus,
    };
  });
  
  /**
   * Get all exports for an organization
   */
  fastify.get('/exports', async (request, reply) => {
    const { organizationId, limit } = request.query as {
      organizationId: string;
      limit?: number;
    };
    
    const exports = await getOrganizationExports(organizationId, limit);
    
    return {
      success: true,
      data: exports,
    };
  });
}
