import { db } from '@qr-platform/common/db';
import { sql, eq } from 'drizzle-orm';
import { dataExports, NewDataExport } from '../schema';
import { logger } from '@qr-platform/common/logger';
import { addDays } from 'date-fns';

export interface ExportConfig {
  organizationId: string;
  userId: string;
  exportType: 'qr_codes' | 'scans' | 'users' | 'analytics' | 'full_backup';
  format: 'csv' | 'json' | 'excel' | 'sql';
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includedFields?: string[];
}

/**
 * Create a data export request
 */
export async function createDataExport(config: ExportConfig): Promise<string> {
  try {
    const [exportRecord] = await db.insert(dataExports).values({
      organizationId: config.organizationId,
      userId: config.userId,
      exportType: config.exportType,
      format: config.format,
      filters: config.filters || null,
      dateRange: config.dateRange || null,
      includedFields: config.includedFields || null,
      status: 'pending',
      expiresAt: addDays(new Date(), 7), // Expire after 7 days
    }).returning({ id: dataExports.id });
    
    logger.info({ exportId: exportRecord.id, type: config.exportType }, 'Data export created');
    
    // Process export asynchronously (in production, this would be a background job)
    processExport(exportRecord.id, config).catch(error => {
      logger.error({ error, exportId: exportRecord.id }, 'Export processing failed');
    });
    
    return exportRecord.id;
  } catch (error) {
    logger.error({ error, config }, 'Failed to create data export');
    throw error;
  }
}

/**
 * Process data export
 */
async function processExport(exportId: string, config: ExportConfig): Promise<void> {
  try {
    // Update status to processing
    await db.update(dataExports)
      .set({ status: 'processing' })
      .where(eq(dataExports.id, exportId));
    
    // Fetch data based on export type
    let data: any[];
    
    switch (config.exportType) {
      case 'qr_codes':
        data = await exportQRCodes(config);
        break;
      case 'scans':
        data = await exportScans(config);
        break;
      case 'analytics':
        data = await exportAnalytics(config);
        break;
      case 'users':
        data = await exportUsers(config);
        break;
      case 'full_backup':
        data = await exportFullBackup(config);
        break;
      default:
        throw new Error(`Unknown export type: ${config.exportType}`);
    }
    
    // Convert data to requested format
    const formattedData = formatExportData(data, config.format);
    
    // In production: Upload to S3 and get URL
    // For now, we'll simulate this
    const fileUrl = `https://exports.example.com/${exportId}.${config.format}`;
    const fileSize = Buffer.byteLength(JSON.stringify(formattedData));
    
    // Update export record with results
    await db.update(dataExports)
      .set({
        status: 'completed',
        fileUrl,
        fileSize,
        rowCount: data.length,
        completedAt: new Date(),
      })
      .where(eq(dataExports.id, exportId));
    
    logger.info({ exportId, rowCount: data.length, fileSize }, 'Export completed');
    
  } catch (error) {
    // Update export record with error
    await db.update(dataExports)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      })
      .where(eq(dataExports.id, exportId));
    
    throw error;
  }
}

/**
 * Export QR codes
 */
async function exportQRCodes(config: ExportConfig): Promise<any[]> {
  const whereConditions = [`organization_id = '${config.organizationId}'`];
  
  if (config.dateRange) {
    whereConditions.push(`created_at >= '${config.dateRange.start.toISOString()}'`);
    whereConditions.push(`created_at <= '${config.dateRange.end.toISOString()}'`);
  }
  
  if (config.filters) {
    for (const [key, value] of Object.entries(config.filters)) {
      whereConditions.push(`${key} = '${value}'`);
    }
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  const fields = config.includedFields && config.includedFields.length > 0
    ? config.includedFields.join(', ')
    : '*';
  
  const query = `
    SELECT ${fields}
    FROM qr_codes
    WHERE ${whereClause}
    ORDER BY created_at DESC
  `;
  
  const result = await db.execute(sql.raw(query));
  return result.rows;
}

/**
 * Export scans data
 */
async function exportScans(config: ExportConfig): Promise<any[]> {
  const whereConditions = [`organization_id = '${config.organizationId}'`];
  
  if (config.dateRange) {
    whereConditions.push(`scanned_at >= '${config.dateRange.start.toISOString()}'`);
    whereConditions.push(`scanned_at <= '${config.dateRange.end.toISOString()}'`);
  }
  
  if (config.filters) {
    for (const [key, value] of Object.entries(config.filters)) {
      whereConditions.push(`${key} = '${value}'`);
    }
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  const fields = config.includedFields && config.includedFields.length > 0
    ? config.includedFields.join(', ')
    : '*';
  
  const query = `
    SELECT ${fields}
    FROM qr_analytics
    WHERE ${whereClause}
    ORDER BY scanned_at DESC
  `;
  
  const result = await db.execute(sql.raw(query));
  return result.rows;
}

/**
 * Export analytics data
 */
async function exportAnalytics(config: ExportConfig): Promise<any[]> {
  const whereConditions = [`organization_id = '${config.organizationId}'`];
  
  if (config.dateRange) {
    whereConditions.push(`created_at >= '${config.dateRange.start.toISOString()}'`);
    whereConditions.push(`created_at <= '${config.dateRange.end.toISOString()}'`);
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  // Join multiple analytics tables
  const query = `
    SELECT 
      qa.id,
      qa.qr_code_id,
      qa.scanned_at,
      qa.device_type,
      qa.browser,
      qa.os,
      qa.country,
      qa.city,
      qa.ip_address,
      me.event_type,
      me.engagement_duration,
      me.metadata as engagement_metadata
    FROM qr_analytics qa
    LEFT JOIN microsite_engagement me ON qa.qr_code_id = me.qr_code_id
    WHERE ${whereClause}
    ORDER BY qa.scanned_at DESC
  `;
  
  const result = await db.execute(sql.raw(query));
  return result.rows;
}

/**
 * Export users data
 */
async function exportUsers(config: ExportConfig): Promise<any[]> {
  const whereConditions = [`organization_id = '${config.organizationId}'`];
  
  if (config.dateRange) {
    whereConditions.push(`created_at >= '${config.dateRange.start.toISOString()}'`);
    whereConditions.push(`created_at <= '${config.dateRange.end.toISOString()}'`);
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  const query = `
    SELECT 
      id,
      email,
      name,
      role,
      status,
      created_at,
      last_login_at
    FROM users
    WHERE ${whereClause}
    ORDER BY created_at DESC
  `;
  
  const result = await db.execute(sql.raw(query));
  return result.rows;
}

/**
 * Export full backup (all tables)
 */
async function exportFullBackup(config: ExportConfig): Promise<any[]> {
  const tables = ['qr_codes', 'qr_analytics', 'microsites', 'microsite_engagement', 'users', 'organizations'];
  const backupData: any = {};
  
  for (const table of tables) {
    const query = `
      SELECT *
      FROM ${table}
      WHERE organization_id = '${config.organizationId}'
    `;
    
    const result = await db.execute(sql.raw(query));
    backupData[table] = result.rows;
  }
  
  return [backupData]; // Return as single object
}

/**
 * Format export data based on requested format
 */
function formatExportData(data: any[], format: string): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    
    case 'csv':
      return convertToCSV(data);
    
    case 'excel':
      // In production, use a library like exceljs
      return convertToCSV(data); // Fallback to CSV for now
    
    case 'sql':
      return convertToSQL(data);
    
    default:
      return JSON.stringify(data, null, 2);
  }
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Convert data to SQL INSERT statements
 */
function convertToSQL(data: any[]): string {
  if (data.length === 0) return '';
  
  // This is a simplified version - in production, would need proper escaping
  const tableName = 'exported_data';
  const sqlStatements: string[] = [];
  
  for (const row of data) {
    const columns = Object.keys(row).join(', ');
    const values = Object.values(row).map(v => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
      if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
      return v;
    }).join(', ');
    
    sqlStatements.push(`INSERT INTO ${tableName} (${columns}) VALUES (${values});`);
  }
  
  return sqlStatements.join('\n');
}

/**
 * Get export status
 */
export async function getExportStatus(exportId: string): Promise<any> {
  try {
    const [exportRecord] = await db.select()
      .from(dataExports)
      .where(eq(dataExports.id, exportId));
    
    if (!exportRecord) {
      throw new Error(`Export ${exportId} not found`);
    }
    
    return exportRecord;
  } catch (error) {
    logger.error({ error, exportId }, 'Failed to get export status');
    throw error;
  }
}

/**
 * Get all exports for an organization
 */
export async function getOrganizationExports(organizationId: string, limit: number = 20): Promise<any[]> {
  try {
    const exports = await db.select()
      .from(dataExports)
      .where(eq(dataExports.organizationId, organizationId))
      .orderBy(sql`${dataExports.createdAt} DESC`)
      .limit(limit);
    
    return exports;
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to get organization exports');
    throw error;
  }
}

/**
 * Delete expired exports
 */
export async function deleteExpiredExports(): Promise<number> {
  try {
    const now = new Date();
    const result = await db.delete(dataExports)
      .where(sql`${dataExports.expiresAt} < ${now}`)
      .returning({ id: dataExports.id });
    
    logger.info({ count: result.length }, 'Deleted expired exports');
    return result.length;
  } catch (error) {
    logger.error({ error }, 'Failed to delete expired exports');
    throw error;
  }
}
