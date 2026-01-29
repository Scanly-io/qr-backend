import { db } from '@qr-platform/common/db';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { customReports, reportExecutions, NewCustomReport, NewReportExecution } from '../schema';
import { logger } from '@qr-platform/common/logger';
import { addDays, addWeeks, addMonths } from 'date-fns';

export interface ReportQueryConfig {
  dataSource: {
    services: string[]; // ['qr-service', 'analytics-service', 'microsite-service']
    tables: string[];
  };
  metrics: {
    name: string;
    calculation: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct_count';
    field: string;
  }[];
  dimensions?: string[]; // Grouping fields
  filters?: {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
    value: any;
  }[];
  dateRange: {
    type: 'relative' | 'absolute';
    start?: Date;
    end?: Date;
    relativePeriod?: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'this_month' | 'last_month';
  };
}

/**
 * Create a new custom report
 */
export async function createCustomReport(
  organizationId: string,
  userId: string,
  reportConfig: {
    name: string;
    description?: string;
    reportType: string;
    dataSource: any;
    metrics: any;
    dimensions?: any;
    filters?: any;
    dateRange: any;
    schedule?: string;
    scheduleConfig?: any;
    exportFormat?: string;
    emailRecipients?: string[];
  }
): Promise<string> {
  try {
    const [report] = await db.insert(customReports).values({
      organizationId,
      userId,
      name: reportConfig.name,
      description: reportConfig.description,
      reportType: reportConfig.reportType,
      dataSource: reportConfig.dataSource,
      metrics: reportConfig.metrics,
      dimensions: reportConfig.dimensions,
      filters: reportConfig.filters,
      dateRange: reportConfig.dateRange,
      schedule: reportConfig.schedule,
      scheduleConfig: reportConfig.scheduleConfig,
      exportFormat: reportConfig.exportFormat || 'pdf',
      emailRecipients: reportConfig.emailRecipients,
      isActive: true,
      nextRunAt: reportConfig.schedule ? calculateNextRunTime(reportConfig.schedule) : null,
    }).returning({ id: customReports.id });
    
    logger.info({ reportId: report.id, name: reportConfig.name }, 'Custom report created');
    return report.id;
  } catch (error) {
    logger.error({ error, reportConfig }, 'Failed to create custom report');
    throw error;
  }
}

/**
 * Calculate next run time based on schedule
 */
function calculateNextRunTime(schedule: string): Date {
  const now = new Date();
  
  switch (schedule) {
    case 'daily':
      return addDays(now, 1);
    case 'weekly':
      return addWeeks(now, 1);
    case 'monthly':
      return addMonths(now, 1);
    default:
      return addDays(now, 1);
  }
}

/**
 * Execute a custom report
 */
export async function executeReport(reportId: string): Promise<any> {
  try {
    // Get report configuration
    const [report] = await db.select().from(customReports).where(eq(customReports.id, reportId));
    
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }
    
    // Create execution record
    const [execution] = await db.insert(reportExecutions).values({
      reportId: report.id,
      organizationId: report.organizationId,
      status: 'running',
      startedAt: new Date(),
    }).returning({ id: reportExecutions.id });
    
    try {
      // Build and execute query based on report configuration
      const queryResult = await buildAndExecuteQuery(report);
      
      // Update execution with results
      await db.update(reportExecutions)
        .set({
          status: 'completed',
          completedAt: new Date(),
          resultData: queryResult,
          rowCount: queryResult.rows?.length || 0,
        })
        .where(eq(reportExecutions.id, execution.id));
      
      // Update report's last run time
      await db.update(customReports)
        .set({
          lastRunAt: new Date(),
          nextRunAt: report.schedule ? calculateNextRunTime(report.schedule) : null,
        })
        .where(eq(customReports.id, report.id));
      
      logger.info({ reportId, executionId: execution.id }, 'Report executed successfully');
      return queryResult;
      
    } catch (error) {
      // Update execution with error
      await db.update(reportExecutions)
        .set({
          status: 'failed',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(reportExecutions.id, execution.id));
      
      throw error;
    }
  } catch (error) {
    logger.error({ error, reportId }, 'Failed to execute report');
    throw error;
  }
}

/**
 * Build and execute SQL query from report configuration
 */
async function buildAndExecuteQuery(report: any): Promise<any> {
  const config = report as {
    dataSource: ReportQueryConfig['dataSource'];
    metrics: ReportQueryConfig['metrics'];
    dimensions?: string[];
    filters?: ReportQueryConfig['filters'];
    dateRange: ReportQueryConfig['dateRange'];
  };
  
  // Determine date range
  let startDate: Date;
  let endDate: Date = new Date();
  
  if (config.dateRange.type === 'absolute') {
    startDate = config.dateRange.start!;
    endDate = config.dateRange.end!;
  } else {
    // Relative date range
    const now = new Date();
    switch (config.dateRange.relativePeriod) {
      case 'last_7_days':
        startDate = addDays(now, -7);
        break;
      case 'last_30_days':
        startDate = addDays(now, -30);
        break;
      case 'last_90_days':
        startDate = addDays(now, -90);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        startDate = addDays(now, -30);
    }
  }
  
  // Build SELECT clause
  const selectFields: string[] = [];
  
  // Add dimensions
  if (config.dimensions && config.dimensions.length > 0) {
    selectFields.push(...config.dimensions);
  }
  
  // Add metrics
  for (const metric of config.metrics) {
    const calc = metric.calculation.toUpperCase();
    const field = metric.field;
    
    if (calc === 'DISTINCT_COUNT') {
      selectFields.push(`COUNT(DISTINCT ${field}) as ${metric.name}`);
    } else {
      selectFields.push(`${calc}(${field}) as ${metric.name}`);
    }
  }
  
  const selectClause = selectFields.join(', ');
  
  // Determine primary table (simplified - use first table)
  const primaryTable = config.dataSource.tables[0];
  
  // Build WHERE clause
  const whereConditions: string[] = [`created_at >= '${startDate.toISOString()}'`, `created_at <= '${endDate.toISOString()}'`];
  
  if (config.filters && config.filters.length > 0) {
    for (const filter of config.filters) {
      const { field, operator, value } = filter;
      
      switch (operator) {
        case 'eq':
          whereConditions.push(`${field} = '${value}'`);
          break;
        case 'neq':
          whereConditions.push(`${field} != '${value}'`);
          break;
        case 'gt':
          whereConditions.push(`${field} > ${value}`);
          break;
        case 'gte':
          whereConditions.push(`${field} >= ${value}`);
          break;
        case 'lt':
          whereConditions.push(`${field} < ${value}`);
          break;
        case 'lte':
          whereConditions.push(`${field} <= ${value}`);
          break;
        case 'in':
          const values = Array.isArray(value) ? value : [value];
          whereConditions.push(`${field} IN (${values.map(v => `'${v}'`).join(', ')})`);
          break;
        case 'like':
          whereConditions.push(`${field} LIKE '%${value}%'`);
          break;
      }
    }
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  // Build GROUP BY clause
  const groupByClause = config.dimensions && config.dimensions.length > 0
    ? `GROUP BY ${config.dimensions.join(', ')}`
    : '';
  
  // Build ORDER BY clause (order by first metric descending)
  const orderByClause = config.metrics.length > 0
    ? `ORDER BY ${config.metrics[0].name} DESC`
    : '';
  
  // Construct final query
  const query = `
    SELECT ${selectClause}
    FROM ${primaryTable}
    WHERE ${whereClause}
    ${groupByClause}
    ${orderByClause}
    LIMIT 1000
  `;
  
  logger.info({ query }, 'Executing custom report query');
  
  // Execute query
  const result = await db.execute(sql.raw(query));
  
  return {
    rows: result.rows,
    query,
    startDate,
    endDate,
  };
}

/**
 * Get report execution history
 */
export async function getReportExecutions(reportId: string, limit: number = 10): Promise<any[]> {
  try {
    const executions = await db.select()
      .from(reportExecutions)
      .where(eq(reportExecutions.reportId, reportId))
      .orderBy(sql`${reportExecutions.createdAt} DESC`)
      .limit(limit);
    
    return executions;
  } catch (error) {
    logger.error({ error, reportId }, 'Failed to get report executions');
    throw error;
  }
}

/**
 * Get all custom reports for an organization
 */
export async function getCustomReports(organizationId: string): Promise<any[]> {
  try {
    const reports = await db.select()
      .from(customReports)
      .where(eq(customReports.organizationId, organizationId))
      .orderBy(sql`${customReports.createdAt} DESC`);
    
    return reports;
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to get custom reports');
    throw error;
  }
}

/**
 * Delete a custom report
 */
export async function deleteCustomReport(reportId: string): Promise<void> {
  try {
    await db.delete(customReports).where(eq(customReports.id, reportId));
    logger.info({ reportId }, 'Custom report deleted');
  } catch (error) {
    logger.error({ error, reportId }, 'Failed to delete custom report');
    throw error;
  }
}

/**
 * Update report schedule
 */
export async function updateReportSchedule(
  reportId: string,
  schedule: string | null,
  scheduleConfig?: any
): Promise<void> {
  try {
    await db.update(customReports)
      .set({
        schedule,
        scheduleConfig,
        nextRunAt: schedule ? calculateNextRunTime(schedule) : null,
        updatedAt: new Date(),
      })
      .where(eq(customReports.id, reportId));
    
    logger.info({ reportId, schedule }, 'Report schedule updated');
  } catch (error) {
    logger.error({ error, reportId }, 'Failed to update report schedule');
    throw error;
  }
}

/**
 * Get scheduled reports that need to run
 */
export async function getScheduledReports(): Promise<any[]> {
  try {
    const now = new Date();
    const reports = await db.select()
      .from(customReports)
      .where(sql`${customReports.isActive} = true AND ${customReports.nextRunAt} <= ${now}`);
    
    return reports;
  } catch (error) {
    logger.error({ error }, 'Failed to get scheduled reports');
    throw error;
  }
}
