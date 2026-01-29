import { FastifyInstance } from 'fastify';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { assets, maintenanceRecords, serviceRequests, inspections, assetTypes } from '../schema.js';

export default async function reportingRoutes(fastify: FastifyInstance) {
  
  // Dashboard overview
  fastify.get('/dashboard', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    // Total assets by status
    const assetsByStatus = await db.select({
      status: assets.status,
      count: sql<number>`count(*)`,
    })
      .from(assets)
      .where(eq(assets.organizationId, organizationId))
      .groupBy(assets.status);
    
    // Total assets by criticality
    const assetsByCriticality = await db.select({
      criticality: assets.criticality,
      count: sql<number>`count(*)`,
    })
      .from(assets)
      .where(eq(assets.organizationId, organizationId))
      .groupBy(assets.criticality);
    
    // Upcoming maintenance (next 30 days)
    const upcomingMaintenance = await db.select({ count: sql<number>`count(*)` })
      .from(maintenanceRecords)
      .where(and(
        eq(maintenanceRecords.organizationId, organizationId),
        eq(maintenanceRecords.status, 'scheduled'),
        lte(maintenanceRecords.scheduledDate, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        gte(maintenanceRecords.scheduledDate, new Date())
      ));
    
    // Overdue maintenance
    const overdueMaintenance = await db.select({ count: sql<number>`count(*)` })
      .from(maintenanceRecords)
      .where(and(
        eq(maintenanceRecords.organizationId, organizationId),
        eq(maintenanceRecords.status, 'scheduled'),
        lte(maintenanceRecords.scheduledDate, new Date())
      ));
    
    // Open service requests
    const openServiceRequests = await db.select({ count: sql<number>`count(*)` })
      .from(serviceRequests)
      .where(and(
        eq(serviceRequests.organizationId, organizationId),
        sql`${serviceRequests.status} NOT IN ('resolved', 'closed', 'cancelled')`
      ));
    
    // Pending inspections
    const pendingInspections = await db.select({ count: sql<number>`count(*)` })
      .from(inspections)
      .where(and(
        eq(inspections.organizationId, organizationId),
        eq(inspections.status, 'pending')
      ));
    
    // Total asset value
    const totalValue = await db.select({
      totalValue: sql<number>`sum(CAST(${assets.purchaseCost} AS DECIMAL))`,
    })
      .from(assets)
      .where(eq(assets.organizationId, organizationId));
    
    return {
      assets: {
        byStatus: assetsByStatus,
        byCriticality: assetsByCriticality,
        totalValue: totalValue[0]?.totalValue || 0,
      },
      maintenance: {
        upcoming: upcomingMaintenance[0]?.count || 0,
        overdue: overdueMaintenance[0]?.count || 0,
      },
      serviceRequests: {
        open: openServiceRequests[0]?.count || 0,
      },
      inspections: {
        pending: pendingInspections[0]?.count || 0,
      },
    };
  });

  // Asset utilization report
  fastify.get('/assets/utilization', async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(assets.organizationId, organizationId)];
    
    const utilizationStats = await db.select({
      assetType: assetTypes.name,
      totalAssets: sql<number>`count(*)`,
      active: sql<number>`count(*) FILTER (WHERE ${assets.status} = 'active')`,
      inService: sql<number>`count(*) FILTER (WHERE ${assets.status} = 'in_service')`,
      maintenance: sql<number>`count(*) FILTER (WHERE ${assets.status} = 'maintenance')`,
      outOfService: sql<number>`count(*) FILTER (WHERE ${assets.status} = 'out_of_service')`,
    })
      .from(assets)
      .leftJoin(assetTypes, eq(assets.assetTypeId, assetTypes.id))
      .where(and(...conditions))
      .groupBy(assetTypes.name);
    
    return { utilizationStats };
  });

  // Maintenance cost report
  fastify.get('/maintenance/costs', async (request, reply) => {
    const { from, to, groupBy = 'month' } = request.query as { from?: string; to?: string; groupBy?: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [
      eq(maintenanceRecords.organizationId, organizationId),
      eq(maintenanceRecords.status, 'completed'),
    ];
    
    if (from) {
      conditions.push(gte(maintenanceRecords.completedDate, new Date(from)));
    }
    
    if (to) {
      conditions.push(lte(maintenanceRecords.completedDate, new Date(to)));
    }
    
    let dateGrouping;
    if (groupBy === 'day') {
      dateGrouping = sql`DATE_TRUNC('day', ${maintenanceRecords.completedDate})`;
    } else if (groupBy === 'week') {
      dateGrouping = sql`DATE_TRUNC('week', ${maintenanceRecords.completedDate})`;
    } else if (groupBy === 'year') {
      dateGrouping = sql`DATE_TRUNC('year', ${maintenanceRecords.completedDate})`;
    } else {
      dateGrouping = sql`DATE_TRUNC('month', ${maintenanceRecords.completedDate})`;
    }
    
    const costsByPeriod = await db.select({
      period: dateGrouping,
      totalCost: sql<number>`sum(CAST(${maintenanceRecords.cost} AS DECIMAL))`,
      avgCost: sql<number>`avg(CAST(${maintenanceRecords.cost} AS DECIMAL))`,
      count: sql<number>`count(*)`,
      totalHours: sql<number>`sum(CAST(${maintenanceRecords.hoursSpent} AS DECIMAL))`,
    })
      .from(maintenanceRecords)
      .where(and(...conditions))
      .groupBy(dateGrouping)
      .orderBy(dateGrouping);
    
    const totalCost = await db.select({
      total: sql<number>`sum(CAST(${maintenanceRecords.cost} AS DECIMAL))`,
    })
      .from(maintenanceRecords)
      .where(and(...conditions));
    
    return {
      costsByPeriod,
      totalCost: totalCost[0]?.total || 0,
    };
  });

  // Service request performance report
  fastify.get('/service-requests/performance', async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(serviceRequests.organizationId, organizationId)];
    
    if (from) {
      conditions.push(gte(serviceRequests.createdAt, new Date(from)));
    }
    
    if (to) {
      conditions.push(lte(serviceRequests.createdAt, new Date(to)));
    }
    
    // Average resolution time
    const resolutionTime = await db.select({
      avgResolutionHours: sql<number>`
        AVG(EXTRACT(EPOCH FROM (${serviceRequests.resolvedAt} - ${serviceRequests.createdAt})) / 3600)
        FILTER (WHERE ${serviceRequests.resolvedAt} IS NOT NULL)
      `,
      totalResolved: sql<number>`count(*) FILTER (WHERE ${serviceRequests.status} = 'resolved')`,
      totalClosed: sql<number>`count(*) FILTER (WHERE ${serviceRequests.status} = 'closed')`,
      totalOpen: sql<number>`count(*) FILTER (WHERE ${serviceRequests.status} = 'open')`,
    })
      .from(serviceRequests)
      .where(and(...conditions));
    
    // Requests by priority
    const byPriority = await db.select({
      priority: serviceRequests.priority,
      count: sql<number>`count(*)`,
      avgResolutionHours: sql<number>`
        AVG(EXTRACT(EPOCH FROM (${serviceRequests.resolvedAt} - ${serviceRequests.createdAt})) / 3600)
        FILTER (WHERE ${serviceRequests.resolvedAt} IS NOT NULL)
      `,
    })
      .from(serviceRequests)
      .where(and(...conditions))
      .groupBy(serviceRequests.priority);
    
    return {
      overview: resolutionTime[0],
      byPriority,
    };
  });

  // Inspection compliance report
  fastify.get('/inspections/compliance', async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(inspections.organizationId, organizationId)];
    
    if (from) {
      conditions.push(gte(inspections.completedDate, new Date(from)));
    }
    
    if (to) {
      conditions.push(lte(inspections.completedDate, new Date(to)));
    }
    
    // Pass/fail rates by type
    const complianceByType = await db.select({
      inspectionType: inspections.inspectionType,
      total: sql<number>`count(*)`,
      passed: sql<number>`count(*) FILTER (WHERE ${inspections.result} = 'pass')`,
      failed: sql<number>`count(*) FILTER (WHERE ${inspections.result} = 'fail')`,
      conditionalPass: sql<number>`count(*) FILTER (WHERE ${inspections.result} = 'conditional_pass')`,
    })
      .from(inspections)
      .where(and(...conditions, sql`${inspections.result} IS NOT NULL`))
      .groupBy(inspections.inspectionType);
    
    // Overall compliance rate
    const overallCompliance = await db.select({
      total: sql<number>`count(*)`,
      passed: sql<number>`count(*) FILTER (WHERE ${inspections.result} = 'pass')`,
    })
      .from(inspections)
      .where(and(...conditions, sql`${inspections.result} IS NOT NULL`));
    
    const complianceRate = overallCompliance[0]?.total > 0
      ? ((overallCompliance[0]?.passed || 0) / overallCompliance[0].total * 100).toFixed(2)
      : '0';
    
    return {
      byType: complianceByType,
      overall: {
        ...overallCompliance[0],
        complianceRate: `${complianceRate}%`,
      },
    };
  });

  // Asset lifecycle report
  fastify.get('/assets/lifecycle', async (request, reply) => {
    const { assetTypeId } = request.query as { assetTypeId?: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(assets.organizationId, organizationId)];
    
    if (assetTypeId) {
      conditions.push(eq(assets.assetTypeId, assetTypeId));
    }
    
    // Assets by age
    const assetsByAge = await db.select({
      ageYears: sql<number>`EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${assets.purchaseDate}))`,
      count: sql<number>`count(*)`,
      avgValue: sql<number>`avg(CAST(${assets.purchaseCost} AS DECIMAL))`,
    })
      .from(assets)
      .where(and(...conditions, sql`${assets.purchaseDate} IS NOT NULL`))
      .groupBy(sql`EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${assets.purchaseDate}))`)
      .orderBy(sql`EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${assets.purchaseDate}))`);
    
    // Assets with expiring warranties (next 90 days)
    const expiringWarranties = await db.select({
      asset: assets,
      assetType: assetTypes,
    })
      .from(assets)
      .leftJoin(assetTypes, eq(assets.assetTypeId, assetTypes.id))
      .where(and(
        ...conditions,
        sql`${assets.warrantyExpires} IS NOT NULL`,
        lte(assets.warrantyExpires, new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        gte(assets.warrantyExpires, new Date())
      ))
      .orderBy(assets.warrantyExpires);
    
    return {
      assetsByAge,
      expiringWarranties: {
        count: expiringWarranties.length,
        assets: expiringWarranties,
      },
    };
  });

  // Export data (CSV-like format)
  fastify.get('/export/assets', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const allAssets = await db.select({
      asset: assets,
      assetType: assetTypes,
    })
      .from(assets)
      .leftJoin(assetTypes, eq(assets.assetTypeId, assetTypes.id))
      .where(eq(assets.organizationId, organizationId))
      .orderBy(assets.assetTag);
    
    return {
      assets: allAssets,
      exportDate: new Date().toISOString(),
      totalRecords: allAssets.length,
    };
  });
}
