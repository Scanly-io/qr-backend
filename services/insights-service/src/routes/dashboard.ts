import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  calculateAllMetrics,
  calculateTotalScans,
  calculateUniqueVisitors,
  calculateConversionRate,
  calculateEngagementTime,
  getTopQRCodes,
  getGeographicDistribution,
  getDeviceBreakdown,
  getScanTrend,
} from '../lib/dashboard-aggregator';

const MetricQuerySchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  period: z.enum(['today', 'week', 'month', 'quarter', 'year', 'all_time']),
  filters: z.record(z.any()).optional(),
});

export default async function dashboardRoutes(fastify: FastifyInstance) {
  /**
   * Get all dashboard metrics
   */
  fastify.get('/dashboard/metrics', async (request, reply) => {
    const { organizationId, userId, period, filters } = MetricQuerySchema.parse(request.query);
    
    const metrics = await calculateAllMetrics({
      organizationId,
      userId,
      period,
      filters,
    });
    
    return {
      success: true,
      data: metrics,
    };
  });
  
  /**
   * Get specific metric
   */
  fastify.get('/dashboard/metrics/:metricType', async (request, reply) => {
    const { metricType } = request.params as { metricType: string };
    const { organizationId, userId, period, filters } = MetricQuerySchema.parse(request.query);
    
    const input = { organizationId, userId, period, filters };
    
    let metric;
    switch (metricType) {
      case 'total_scans':
        metric = await calculateTotalScans(input);
        break;
      case 'unique_visitors':
        metric = await calculateUniqueVisitors(input);
        break;
      case 'conversion_rate':
        metric = await calculateConversionRate(input);
        break;
      case 'engagement_time':
        metric = await calculateEngagementTime(input);
        break;
      default:
        return reply.code(400).send({
          success: false,
          error: `Unknown metric type: ${metricType}`,
        });
    }
    
    return {
      success: true,
      data: metric,
    };
  });
  
  /**
   * Get top performing QR codes
   */
  fastify.get('/dashboard/top-qr-codes', async (request, reply) => {
    const { organizationId, period, limit } = request.query as {
      organizationId: string;
      period: string;
      limit?: number;
    };
    
    const topQRCodes = await getTopQRCodes(organizationId, period, limit);
    
    return {
      success: true,
      data: topQRCodes,
    };
  });
  
  /**
   * Get geographic distribution
   */
  fastify.get('/dashboard/geographic', async (request, reply) => {
    const { organizationId, period, limit } = request.query as {
      organizationId: string;
      period: string;
      limit?: number;
    };
    
    const geoData = await getGeographicDistribution(organizationId, period, limit);
    
    return {
      success: true,
      data: geoData,
    };
  });
  
  /**
   * Get device breakdown
   */
  fastify.get('/dashboard/devices', async (request, reply) => {
    const { organizationId, period } = request.query as {
      organizationId: string;
      period: string;
    };
    
    const deviceData = await getDeviceBreakdown(organizationId, period);
    
    return {
      success: true,
      data: deviceData,
    };
  });
  
  /**
   * Get scan trend over time
   */
  fastify.get('/dashboard/trend', async (request, reply) => {
    const { organizationId, period, granularity } = request.query as {
      organizationId: string;
      period: string;
      granularity?: 'hour' | 'day' | 'week' | 'month';
    };
    
    const trendData = await getScanTrend(organizationId, period, granularity);
    
    return {
      success: true,
      data: trendData,
    };
  });
}
