import { db } from '@qr-platform/common/db';
import { sql } from 'drizzle-orm';
import { dashboardMetrics, aggregatedAnalytics } from '../schema';
import { logger } from '@qr-platform/common/logger';
import { subDays, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface MetricCalculationInput {
  organizationId: string;
  userId: string;
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all_time';
  filters?: Record<string, any>;
}

export interface DashboardMetricResult {
  metricType: string;
  metricValue: number;
  previousValue?: number;
  changePercentage?: number;
  period: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Calculate date range for a given period
 */
function getDateRange(period: string): { start: Date; end: Date; previousStart: Date; previousEnd: Date } {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        previousStart: startOfDay(subDays(now, 1)),
        previousEnd: endOfDay(subDays(now, 1)),
      };
    
    case 'week':
      return {
        start: startOfWeek(now),
        end: endOfWeek(now),
        previousStart: startOfWeek(subDays(now, 7)),
        previousEnd: endOfWeek(subDays(now, 7)),
      };
    
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        previousStart: startOfMonth(subMonths(now, 1)),
        previousEnd: endOfMonth(subMonths(now, 1)),
      };
    
    case 'quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
      const prevQuarterStart = subMonths(quarterStart, 3);
      const prevQuarterEnd = subMonths(quarterEnd, 3);
      return {
        start: quarterStart,
        end: quarterEnd,
        previousStart: prevQuarterStart,
        previousEnd: prevQuarterEnd,
      };
    
    case 'year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31),
        previousStart: new Date(now.getFullYear() - 1, 0, 1),
        previousEnd: new Date(now.getFullYear() - 1, 11, 31),
      };
    
    case 'all_time':
      return {
        start: new Date('2020-01-01'),
        end: now,
        previousStart: new Date('2020-01-01'),
        previousEnd: subDays(now, 365),
      };
    
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        previousStart: startOfDay(subDays(now, 1)),
        previousEnd: endOfDay(subDays(now, 1)),
      };
  }
}

/**
 * Calculate total QR code scans
 */
export async function calculateTotalScans(input: MetricCalculationInput): Promise<DashboardMetricResult> {
  const { start, end, previousStart, previousEnd } = getDateRange(input.period);
  
  try {
    // Query from qr-service analytics table (cross-service query)
    const currentResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM qr_analytics
      WHERE organization_id = ${input.organizationId}
      AND scanned_at >= ${start}
      AND scanned_at <= ${end}
    `);
    
    const previousResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM qr_analytics
      WHERE organization_id = ${input.organizationId}
      AND scanned_at >= ${previousStart}
      AND scanned_at <= ${previousEnd}
    `);
    
    const currentValue = Number(currentResult.rows[0]?.total || 0);
    const previousValue = Number(previousResult.rows[0]?.total || 0);
    const changePercentage = previousValue > 0 
      ? ((currentValue - previousValue) / previousValue) * 100 
      : 0;
    
    return {
      metricType: 'total_scans',
      metricValue: currentValue,
      previousValue,
      changePercentage: Math.round(changePercentage * 100) / 100,
      period: input.period,
      startDate: start,
      endDate: end,
    };
  } catch (error) {
    logger.error({ error, input }, 'Failed to calculate total scans');
    throw error;
  }
}

/**
 * Calculate unique visitors (unique devices)
 */
export async function calculateUniqueVisitors(input: MetricCalculationInput): Promise<DashboardMetricResult> {
  const { start, end, previousStart, previousEnd } = getDateRange(input.period);
  
  try {
    const currentResult = await db.execute(sql`
      SELECT COUNT(DISTINCT device_id) as total
      FROM qr_analytics
      WHERE organization_id = ${input.organizationId}
      AND scanned_at >= ${start}
      AND scanned_at <= ${end}
    `);
    
    const previousResult = await db.execute(sql`
      SELECT COUNT(DISTINCT device_id) as total
      FROM qr_analytics
      WHERE organization_id = ${input.organizationId}
      AND scanned_at >= ${previousStart}
      AND scanned_at <= ${previousEnd}
    `);
    
    const currentValue = Number(currentResult.rows[0]?.total || 0);
    const previousValue = Number(previousResult.rows[0]?.total || 0);
    const changePercentage = previousValue > 0 
      ? ((currentValue - previousValue) / previousValue) * 100 
      : 0;
    
    return {
      metricType: 'unique_visitors',
      metricValue: currentValue,
      previousValue,
      changePercentage: Math.round(changePercentage * 100) / 100,
      period: input.period,
      startDate: start,
      endDate: end,
    };
  } catch (error) {
    logger.error({ error, input }, 'Failed to calculate unique visitors');
    throw error;
  }
}

/**
 * Calculate conversion rate (CTA clicks / total scans)
 */
export async function calculateConversionRate(input: MetricCalculationInput): Promise<DashboardMetricResult> {
  const { start, end, previousStart, previousEnd } = getDateRange(input.period);
  
  try {
    // Get total scans
    const totalScansResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM qr_analytics
      WHERE organization_id = ${input.organizationId}
      AND scanned_at >= ${start}
      AND scanned_at <= ${end}
    `);
    
    // Get CTA clicks from microsite engagement
    const ctaClicksResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM microsite_engagement
      WHERE organization_id = ${input.organizationId}
      AND event_type = 'cta_click'
      AND created_at >= ${start}
      AND created_at <= ${end}
    `);
    
    // Previous period
    const prevTotalScansResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM qr_analytics
      WHERE organization_id = ${input.organizationId}
      AND scanned_at >= ${previousStart}
      AND scanned_at <= ${previousEnd}
    `);
    
    const prevCtaClicksResult = await db.execute(sql`
      SELECT COUNT(*) as total
      FROM microsite_engagement
      WHERE organization_id = ${input.organizationId}
      AND event_type = 'cta_click'
      AND created_at >= ${previousStart}
      AND created_at <= ${previousEnd}
    `);
    
    const totalScans = Number(totalScansResult.rows[0]?.total || 0);
    const ctaClicks = Number(ctaClicksResult.rows[0]?.total || 0);
    const currentValue = totalScans > 0 ? (ctaClicks / totalScans) * 100 : 0;
    
    const prevTotalScans = Number(prevTotalScansResult.rows[0]?.total || 0);
    const prevCtaClicks = Number(prevCtaClicksResult.rows[0]?.total || 0);
    const previousValue = prevTotalScans > 0 ? (prevCtaClicks / prevTotalScans) * 100 : 0;
    
    const changePercentage = previousValue > 0 
      ? ((currentValue - previousValue) / previousValue) * 100 
      : 0;
    
    return {
      metricType: 'conversion_rate',
      metricValue: Math.round(currentValue * 100) / 100,
      previousValue: Math.round(previousValue * 100) / 100,
      changePercentage: Math.round(changePercentage * 100) / 100,
      period: input.period,
      startDate: start,
      endDate: end,
    };
  } catch (error) {
    logger.error({ error, input }, 'Failed to calculate conversion rate');
    throw error;
  }
}

/**
 * Calculate average engagement time
 */
export async function calculateEngagementTime(input: MetricCalculationInput): Promise<DashboardMetricResult> {
  const { start, end, previousStart, previousEnd } = getDateRange(input.period);
  
  try {
    const currentResult = await db.execute(sql`
      SELECT AVG(engagement_duration) as avg_duration
      FROM microsite_engagement
      WHERE organization_id = ${input.organizationId}
      AND created_at >= ${start}
      AND created_at <= ${end}
      AND engagement_duration IS NOT NULL
    `);
    
    const previousResult = await db.execute(sql`
      SELECT AVG(engagement_duration) as avg_duration
      FROM microsite_engagement
      WHERE organization_id = ${input.organizationId}
      AND created_at >= ${previousStart}
      AND created_at <= ${previousEnd}
      AND engagement_duration IS NOT NULL
    `);
    
    const currentValue = Number(currentResult.rows[0]?.avg_duration || 0);
    const previousValue = Number(previousResult.rows[0]?.avg_duration || 0);
    const changePercentage = previousValue > 0 
      ? ((currentValue - previousValue) / previousValue) * 100 
      : 0;
    
    return {
      metricType: 'avg_engagement_time',
      metricValue: Math.round(currentValue),
      previousValue: Math.round(previousValue),
      changePercentage: Math.round(changePercentage * 100) / 100,
      period: input.period,
      startDate: start,
      endDate: end,
    };
  } catch (error) {
    logger.error({ error, input }, 'Failed to calculate engagement time');
    throw error;
  }
}

/**
 * Calculate top performing QR codes
 */
export async function getTopQRCodes(
  organizationId: string,
  period: string,
  limit: number = 5
): Promise<any[]> {
  const { start, end } = getDateRange(period);
  
  try {
    const result = await db.execute(sql`
      SELECT 
        qa.qr_code_id,
        qc.name as qr_name,
        COUNT(*) as scan_count,
        COUNT(DISTINCT qa.device_id) as unique_visitors
      FROM qr_analytics qa
      JOIN qr_codes qc ON qa.qr_code_id = qc.id
      WHERE qa.organization_id = ${organizationId}
      AND qa.scanned_at >= ${start}
      AND qa.scanned_at <= ${end}
      GROUP BY qa.qr_code_id, qc.name
      ORDER BY scan_count DESC
      LIMIT ${limit}
    `);
    
    return result.rows;
  } catch (error) {
    logger.error({ error, organizationId, period }, 'Failed to get top QR codes');
    throw error;
  }
}

/**
 * Calculate geographic distribution
 */
export async function getGeographicDistribution(
  organizationId: string,
  period: string,
  limit: number = 10
): Promise<any[]> {
  const { start, end } = getDateRange(period);
  
  try {
    const result = await db.execute(sql`
      SELECT 
        country,
        city,
        COUNT(*) as scan_count,
        COUNT(DISTINCT device_id) as unique_visitors
      FROM qr_analytics
      WHERE organization_id = ${organizationId}
      AND scanned_at >= ${start}
      AND scanned_at <= ${end}
      AND country IS NOT NULL
      GROUP BY country, city
      ORDER BY scan_count DESC
      LIMIT ${limit}
    `);
    
    return result.rows;
  } catch (error) {
    logger.error({ error, organizationId, period }, 'Failed to get geographic distribution');
    throw error;
  }
}

/**
 * Calculate device type breakdown
 */
export async function getDeviceBreakdown(
  organizationId: string,
  period: string
): Promise<any[]> {
  const { start, end } = getDateRange(period);
  
  try {
    const result = await db.execute(sql`
      SELECT 
        device_type,
        COUNT(*) as scan_count,
        COUNT(DISTINCT device_id) as unique_visitors,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM qr_analytics
      WHERE organization_id = ${organizationId}
      AND scanned_at >= ${start}
      AND scanned_at <= ${end}
      GROUP BY device_type
      ORDER BY scan_count DESC
    `);
    
    return result.rows;
  } catch (error) {
    logger.error({ error, organizationId, period }, 'Failed to get device breakdown');
    throw error;
  }
}

/**
 * Get scan trend over time
 */
export async function getScanTrend(
  organizationId: string,
  period: string,
  granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<any[]> {
  const { start, end } = getDateRange(period);
  
  const dateFormat = granularity === 'hour' 
    ? 'YYYY-MM-DD HH24:00:00'
    : granularity === 'day'
    ? 'YYYY-MM-DD'
    : granularity === 'week'
    ? 'IYYY-IW'
    : 'YYYY-MM';
  
  try {
    const result = await db.execute(sql`
      SELECT 
        TO_CHAR(scanned_at, ${dateFormat}) as period,
        COUNT(*) as scan_count,
        COUNT(DISTINCT device_id) as unique_visitors
      FROM qr_analytics
      WHERE organization_id = ${organizationId}
      AND scanned_at >= ${start}
      AND scanned_at <= ${end}
      GROUP BY TO_CHAR(scanned_at, ${dateFormat})
      ORDER BY period ASC
    `);
    
    return result.rows;
  } catch (error) {
    logger.error({ error, organizationId, period }, 'Failed to get scan trend');
    throw error;
  }
}

/**
 * Save dashboard metric to database
 */
export async function saveDashboardMetric(
  input: MetricCalculationInput,
  result: DashboardMetricResult
): Promise<void> {
  try {
    await db.insert(dashboardMetrics).values({
      organizationId: input.organizationId,
      userId: input.userId,
      metricType: result.metricType,
      metricValue: result.metricValue.toString(),
      previousValue: result.previousValue?.toString(),
      changePercentage: result.changePercentage?.toString(),
      period: result.period,
      startDate: result.startDate,
      endDate: result.endDate,
      filters: input.filters || null,
    });
    
    logger.info({ metricType: result.metricType, value: result.metricValue }, 'Dashboard metric saved');
  } catch (error) {
    logger.error({ error, result }, 'Failed to save dashboard metric');
    throw error;
  }
}

/**
 * Calculate all dashboard metrics at once
 */
export async function calculateAllMetrics(input: MetricCalculationInput): Promise<DashboardMetricResult[]> {
  try {
    const [totalScans, uniqueVisitors, conversionRate, engagementTime] = await Promise.all([
      calculateTotalScans(input),
      calculateUniqueVisitors(input),
      calculateConversionRate(input),
      calculateEngagementTime(input),
    ]);
    
    const results = [totalScans, uniqueVisitors, conversionRate, engagementTime];
    
    // Save all metrics
    await Promise.all(results.map(result => saveDashboardMetric(input, result)));
    
    return results;
  } catch (error) {
    logger.error({ error, input }, 'Failed to calculate all metrics');
    throw error;
  }
}
