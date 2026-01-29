import { pgTable, uuid, text, timestamp, integer, decimal, jsonb, boolean, index } from 'drizzle-orm/pg-core';

/**
 * Dashboard Metrics - Real-time metrics for dashboards
 */
export const dashboardMetrics = pgTable('dashboard_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  userId: uuid('user_id').notNull(),
  
  // Metric details
  metricType: text('metric_type').notNull(), // 'qr_scans', 'conversion_rate', 'engagement_rate', etc.
  metricValue: decimal('metric_value', { precision: 15, scale: 4 }).notNull(),
  previousValue: decimal('previous_value', { precision: 15, scale: 4 }),
  changePercentage: decimal('change_percentage', { precision: 10, scale: 2 }),
  
  // Time period
  period: text('period').notNull(), // 'today', 'week', 'month', 'quarter', 'year', 'all_time'
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  
  // Metadata
  filters: jsonb('filters'), // Applied filters for this metric
  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('dashboard_metrics_org_idx').on(table.organizationId),
  typeIdx: index('dashboard_metrics_type_idx').on(table.metricType),
  periodIdx: index('dashboard_metrics_period_idx').on(table.period),
}));

/**
 * Custom Reports - User-defined reports
 */
export const customReports = pgTable('custom_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  userId: uuid('user_id').notNull(),
  
  // Report details
  name: text('name').notNull(),
  description: text('description'),
  reportType: text('report_type').notNull(), // 'qr_performance', 'engagement', 'conversion', 'revenue', 'custom'
  
  // Configuration
  dataSource: jsonb('data_source').notNull(), // Services and tables to query
  metrics: jsonb('metrics').notNull(), // Metrics to calculate
  dimensions: jsonb('dimensions'), // Grouping dimensions
  filters: jsonb('filters'), // Filter conditions
  dateRange: jsonb('date_range').notNull(), // Date range configuration
  
  // Scheduling
  schedule: text('schedule'), // 'daily', 'weekly', 'monthly', null for manual
  scheduleConfig: jsonb('schedule_config'), // Cron config, recipients, etc.
  isActive: boolean('is_active').default(true).notNull(),
  
  // Export settings
  exportFormat: text('export_format').default('pdf'), // 'pdf', 'csv', 'excel', 'json'
  emailRecipients: jsonb('email_recipients'), // Array of email addresses
  
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('custom_reports_org_idx').on(table.organizationId),
  typeIdx: index('custom_reports_type_idx').on(table.reportType),
  scheduleIdx: index('custom_reports_schedule_idx').on(table.schedule),
}));

/**
 * Report Executions - History of report runs
 */
export const reportExecutions = pgTable('report_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id').notNull(),
  organizationId: uuid('organization_id').notNull(),
  
  // Execution details
  status: text('status').notNull(), // 'pending', 'running', 'completed', 'failed'
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  
  // Results
  resultData: jsonb('result_data'), // Report data/findings
  resultFileUrl: text('result_file_url'), // S3 URL for exported file
  rowCount: integer('row_count'),
  
  // Error handling
  error: text('error'),
  retryCount: integer('retry_count').default(0).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  reportIdx: index('report_executions_report_idx').on(table.reportId),
  statusIdx: index('report_executions_status_idx').on(table.status),
  createdAtIdx: index('report_executions_created_at_idx').on(table.createdAt),
}));

/**
 * Data Exports - Manual data exports
 */
export const dataExports = pgTable('data_exports', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  userId: uuid('user_id').notNull(),
  
  // Export details
  exportType: text('export_type').notNull(), // 'qr_codes', 'scans', 'users', 'analytics', 'full_backup'
  format: text('format').notNull(), // 'csv', 'json', 'excel', 'sql'
  
  // Query configuration
  filters: jsonb('filters'),
  dateRange: jsonb('date_range'),
  includedFields: jsonb('included_fields'), // Array of field names
  
  // Processing
  status: text('status').notNull(), // 'pending', 'processing', 'completed', 'failed'
  fileUrl: text('file_url'),
  fileSize: integer('file_size'), // Bytes
  rowCount: integer('row_count'),
  
  // Expiration
  expiresAt: timestamp('expires_at'), // Auto-delete after 7 days
  
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  orgIdx: index('data_exports_org_idx').on(table.organizationId),
  statusIdx: index('data_exports_status_idx').on(table.status),
  expiresIdx: index('data_exports_expires_idx').on(table.expiresAt),
}));

/**
 * Aggregated Analytics - Pre-calculated aggregations
 */
export const aggregatedAnalytics = pgTable('aggregated_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  
  // Aggregation metadata
  aggregationType: text('aggregation_type').notNull(), // 'qr_scans', 'conversions', 'revenue', 'engagement'
  granularity: text('granularity').notNull(), // 'hour', 'day', 'week', 'month'
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  // Dimensions
  qrCodeId: uuid('qr_code_id'),
  micrositeId: uuid('microsite_id'),
  campaignId: text('campaign_id'),
  country: text('country'),
  deviceType: text('device_type'),
  
  // Metrics
  count: integer('count').default(0).notNull(),
  uniqueCount: integer('unique_count').default(0).notNull(),
  totalValue: decimal('total_value', { precision: 15, scale: 4 }),
  averageValue: decimal('average_value', { precision: 15, scale: 4 }),
  
  // Additional stats
  metrics: jsonb('metrics'), // Additional calculated metrics
  
  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgTypeIdx: index('aggregated_analytics_org_type_idx').on(table.organizationId, table.aggregationType),
  periodIdx: index('aggregated_analytics_period_idx').on(table.periodStart, table.periodEnd),
  qrIdx: index('aggregated_analytics_qr_idx').on(table.qrCodeId),
  micrositeIdx: index('aggregated_analytics_microsite_idx').on(table.micrositeId),
}));

/**
 * Insights Cache - Cached insights and calculations
 */
export const insightsCache = pgTable('insights_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  
  // Cache key
  cacheKey: text('cache_key').notNull().unique(),
  insightType: text('insight_type').notNull(), // 'trend', 'anomaly', 'prediction', 'comparison'
  
  // Cached data
  data: jsonb('data').notNull(),
  metadata: jsonb('metadata'), // Query params, filters, etc.
  
  // Expiration
  ttl: integer('ttl').default(3600).notNull(), // Seconds
  expiresAt: timestamp('expires_at').notNull(),
  
  // Stats
  hitCount: integer('hit_count').default(0).notNull(),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  keyIdx: index('insights_cache_key_idx').on(table.cacheKey),
  expiresIdx: index('insights_cache_expires_idx').on(table.expiresAt),
  orgTypeIdx: index('insights_cache_org_type_idx').on(table.organizationId, table.insightType),
}));

/**
 * Benchmarks - Industry and internal benchmarks
 */
export const benchmarks = pgTable('benchmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Benchmark details
  benchmarkType: text('benchmark_type').notNull(), // 'industry', 'internal', 'competitor'
  category: text('category').notNull(), // 'qr_scan_rate', 'conversion_rate', 'engagement_time'
  industry: text('industry'), // 'retail', 'restaurant', 'real_estate', etc.
  region: text('region'), // 'US', 'EU', 'APAC', 'global'
  
  // Values
  metricValue: decimal('metric_value', { precision: 15, scale: 4 }).notNull(),
  percentile25: decimal('percentile_25', { precision: 15, scale: 4 }),
  percentile50: decimal('percentile_50', { precision: 15, scale: 4 }),
  percentile75: decimal('percentile_75', { precision: 15, scale: 4 }),
  percentile90: decimal('percentile_90', { precision: 15, scale: 4 }),
  
  // Metadata
  sampleSize: integer('sample_size'),
  dataSource: text('data_source'),
  methodology: text('methodology'),
  
  // Time period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('benchmarks_type_idx').on(table.benchmarkType),
  categoryIdx: index('benchmarks_category_idx').on(table.category),
  industryIdx: index('benchmarks_industry_idx').on(table.industry),
}));

export type DashboardMetric = typeof dashboardMetrics.$inferSelect;
export type NewDashboardMetric = typeof dashboardMetrics.$inferInsert;

export type CustomReport = typeof customReports.$inferSelect;
export type NewCustomReport = typeof customReports.$inferInsert;

export type ReportExecution = typeof reportExecutions.$inferSelect;
export type NewReportExecution = typeof reportExecutions.$inferInsert;

export type DataExport = typeof dataExports.$inferSelect;
export type NewDataExport = typeof dataExports.$inferInsert;

export type AggregatedAnalytic = typeof aggregatedAnalytics.$inferSelect;
export type NewAggregatedAnalytic = typeof aggregatedAnalytics.$inferInsert;

export type InsightsCache = typeof insightsCache.$inferSelect;
export type NewInsightsCache = typeof insightsCache.$inferInsert;

export type Benchmark = typeof benchmarks.$inferSelect;
export type NewBenchmark = typeof benchmarks.$inferInsert;
