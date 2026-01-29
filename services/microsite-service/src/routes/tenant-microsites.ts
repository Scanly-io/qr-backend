import { FastifyInstance } from 'fastify';
import { db } from '../db.js';
import { microsites } from '../schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { verifyOwnership, getTenantDefaults, buildTenantWhere } from '../utils/tenant-queries.js';
import type { TenantContext } from '../utils/tenant-queries.js';

/**
 * MULTI-TENANT MICROSITE ROUTES
 * All routes automatically filter by tenant context
 */
export default async function tenantMicrositeRoutes(server: FastifyInstance) {
  
  /**
   * List microsites for current tenant
   * Agency members see all agency microsites
   * Individual users see only their own
   */
  server.get('/microsites', async (request, reply) => {
    const tenant = (request as any).tenant as TenantContext;
    
    if (!tenant) {
      return reply.code(401).send({
        success: false,
        error: 'Tenant context required',
      });
    }
    
    const where = buildTenantWhere(tenant, microsites);
    
    const results = await db.query.microsites.findMany({
      where,
      orderBy: (microsites, { desc }) => [desc(microsites.createdAt)],
    });
    
    return {
      success: true,
      data: {
        microsites: results,
        count: results.length,
        tenantContext: {
          agencyId: tenant.agencyId,
          isAgency: tenant.isAgencyContext,
        },
      },
    };
  });
  
  /**
   * Get single microsite with ownership verification
   */
  server.get('/microsites/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenant = (request as any).tenant;
    
    const microsite = await db.query.microsites.findFirst({
      where: eq(microsites.id, id),
    });
    
    if (!microsite) {
      return reply.code(404).send({
        success: false,
        error: 'Microsite not found',
      });
    }
    
    // Verify ownership
    if (!verifyOwnership(microsite, tenant)) {
      return reply.code(403).send({
        success: false,
        error: 'Access denied - resource belongs to different tenant',
      });
    }
    
    return {
      success: true,
      data: { microsite },
    };
  });
  
  /**
   * Create microsite with automatic tenant scoping
   */
  server.post('/microsites', async (request, reply) => {
    const tenant = (request as any).tenant;
    
    if (!tenant.permissions.createMicrosites) {
      return reply.code(403).send({
        success: false,
        error: 'Permission denied: createMicrosites required',
      });
    }
    
    const {
      title,
      description,
      type = 'link-in-bio',
      theme,
      layout,
    } = request.body as any;
    
    // Automatically scope to tenant
    const [newMicrosite] = await db.insert(microsites).values({
      ...getTenantDefaults(tenant),  // Sets agencyId and createdBy
      title,
      description,
      type,
      theme,
      layout,
    }).returning();
    
    return {
      success: true,
      data: { microsite: newMicrosite },
      message: 'Microsite created',
    };
  });
  
  /**
   * Update microsite with ownership verification
   */
  server.patch('/microsites/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenant = (request as any).tenant;
    
    if (!tenant.permissions.editMicrosites) {
      return reply.code(403).send({
        success: false,
        error: 'Permission denied: editMicrosites required',
      });
    }
    
    // Verify ownership before update
    const existing = await db.query.microsites.findFirst({
      where: eq(microsites.id, id),
    });
    
    if (!existing) {
      return reply.code(404).send({
        success: false,
        error: 'Microsite not found',
      });
    }
    
    if (!verifyOwnership(existing, tenant)) {
      return reply.code(403).send({
        success: false,
        error: 'Access denied - cannot edit microsites from other tenants',
      });
    }
    
    const updateData = request.body as any;
    
    // Prevent changing tenant ownership
    delete updateData.agencyId;
    delete updateData.createdBy;
    
    const [updated] = await db
      .update(microsites)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(microsites.id, id))
      .returning();
    
    return {
      success: true,
      data: { microsite: updated },
      message: 'Microsite updated',
    };
  });
  
  /**
   * Delete microsite with ownership verification
   */
  server.delete('/microsites/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenant = (request as any).tenant;
    
    if (!tenant.permissions.deleteMicrosites) {
      return reply.code(403).send({
        success: false,
        error: 'Permission denied: deleteMicrosites required',
      });
    }
    
    const existing = await db.query.microsites.findFirst({
      where: eq(microsites.id, id),
    });
    
    if (!existing) {
      return reply.code(404).send({
        success: false,
        error: 'Microsite not found',
      });
    }
    
    if (!verifyOwnership(existing, tenant)) {
      return reply.code(403).send({
        success: false,
        error: 'Access denied - cannot delete microsites from other tenants',
      });
    }
    
    await db.delete(microsites).where(eq(microsites.id, id));
    
    return {
      success: true,
      message: 'Microsite deleted',
    };
  });
  
  /**
   * Get tenant statistics
   * Shows how many microsites the tenant has vs limits
   */
  server.get('/microsites/stats/usage', async (request, reply) => {
    const tenant = (request as any).tenant as TenantContext;
    
    const where = buildTenantWhere(tenant, microsites);
    
    const allMicrosites = await db.query.microsites.findMany({ where });
    
    const byType = allMicrosites.reduce((acc, m) => {
      acc[m.type || 'link-in-bio'] = (acc[m.type || 'link-in-bio'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Note: Agency limits would be fetched from auth-service API in production
    
    return {
      success: true,
      data: {
        totalMicrosites: allMicrosites.length,
        byType,
        tenant: {
          isAgencyContext: tenant.isAgencyContext,
          agencyId: tenant.agencyId,
        },
      },
    };
  });
}
