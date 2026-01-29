/**
 * MULTI-TENANCY: Tenant-Scoped Query Helpers
 * 
 * Add these methods to safely query data with automatic tenant filtering.
 * Prevents accidental cross-agency data leaks.
 */

import { and, eq, or, SQL } from 'drizzle-orm';

export interface TenantContext {
  agencyId: string | null;
  userId: string;
  role: string;
  isAgencyContext: boolean;
}

/**
 * Build WHERE clause that filters by tenant
 * 
 * Usage:
 *   const microsites = await db.query.microsites.findMany({
 *     where: buildTenantWhere(request.tenant, { status: 'published' })
 *   });
 */
export function buildTenantWhere(
  tenant: TenantContext,
  additionalConditions?: Record<string, any>
): SQL | undefined {
  const conditions: SQL[] = [];
  
  if (tenant.isAgencyContext && tenant.agencyId) {
    // Agency context: only show resources belonging to this agency
    conditions.push(eq('agencyId' as any, tenant.agencyId));
  } else {
    // Individual user: only show their own resources (agencyId = null)
    conditions.push(eq('agencyId' as any, null));
    conditions.push(eq('createdBy' as any, tenant.userId));
  }
  
  // Add any additional conditions
  if (additionalConditions) {
    for (const [key, value] of Object.entries(additionalConditions)) {
      conditions.push(eq(key as any, value));
    }
  }
  
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Verify a resource belongs to the current tenant
 * 
 * Usage:
 *   const microsite = await db.query.microsites.findFirst({ where: eq(microsites.id, id) });
 *   if (!verifyOwnership(microsite, request.tenant)) {
 *     return reply.code(403).send({ error: 'Access denied' });
 *   }
 */
export function verifyOwnership(
  resource: { agencyId?: string | null; createdBy?: string },
  tenant: TenantContext
): boolean {
  if (tenant.isAgencyContext) {
    // Agency member: resource must belong to their agency
    return resource.agencyId === tenant.agencyId;
  } else {
    // Individual user: resource must be theirs (no agency) AND created by them
    return resource.agencyId === null && resource.createdBy === tenant.userId;
  }
}

/**
 * Get default values for creating a new resource
 * Ensures new resources are properly scoped to the tenant
 * 
 * Usage:
 *   await db.insert(microsites).values({
 *     ...getTenantDefaults(request.tenant),
 *     title: 'My Microsite',
 *     // ... other fields
 *   });
 */
export function getTenantDefaults(tenant: TenantContext) {
  return {
    agencyId: tenant.agencyId,
    createdBy: tenant.userId,
  };
}

/**
 * PostgreSQL Row-Level Security (RLS) Policy Examples
 * 
 * For maximum security, implement these policies in your database.
 * This provides defense-in-depth even if application code has bugs.
 */
export const RLS_POLICIES = {
  // Enable RLS on microsites table
  enableRLS: `
    ALTER TABLE microsites ENABLE ROW LEVEL SECURITY;
  `,
  
  // Policy: Users can only see microsites from their agency
  agencyIsolation: `
    CREATE POLICY agency_isolation ON microsites
      FOR ALL
      USING (
        agency_id = current_setting('app.current_agency_id')::UUID
        OR (agency_id IS NULL AND created_by = current_setting('app.current_user_id')::UUID)
      );
  `,
  
  // Policy: Agency admins can manage all agency resources
  adminFullAccess: `
    CREATE POLICY admin_full_access ON microsites
      FOR ALL
      USING (
        agency_id = current_setting('app.current_agency_id')::UUID
        AND current_setting('app.user_role') IN ('owner', 'admin')
      );
  `,
  
  // Policy: Regular members can only edit their own microsites
  memberOwnOnly: `
    CREATE POLICY member_own_only ON microsites
      FOR UPDATE
      USING (
        agency_id = current_setting('app.current_agency_id')::UUID
        AND created_by = current_setting('app.current_user_id')::UUID
      );
  `,
  
  // How to set tenant context before each query:
  setTenantContext: `
    -- In your application, run this before each query:
    SET LOCAL app.current_agency_id = 'uuid-here';
    SET LOCAL app.current_user_id = 'uuid-here';
    SET LOCAL app.user_role = 'admin';
  `,
};

/**
 * Tenant-aware query builder wrapper
 * Automatically adds tenant filtering to all queries
 */
export class TenantQueryBuilder<T> {
  constructor(
    private tenant: TenantContext,
    private baseQuery: any
  ) {}
  
  /**
   * Find all resources for current tenant
   */
  async findMany(options?: { where?: any; limit?: number; offset?: number }): Promise<T[]> {
    const where = buildTenantWhere(this.tenant, options?.where);
    
    return await this.baseQuery.findMany({
      where,
      limit: options?.limit,
      offset: options?.offset,
    });
  }
  
  /**
   * Find one resource, verifying tenant ownership
   */
  async findFirst(options: { where: any }): Promise<T | null> {
    const resource = await this.baseQuery.findFirst({
      where: options.where,
    });
    
    if (!resource || !verifyOwnership(resource, this.tenant)) {
      return null;
    }
    
    return resource;
  }
  
  /**
   * Create resource with tenant defaults
   */
  async create(data: Partial<T>): Promise<T> {
    return await this.baseQuery.insert({
      ...getTenantDefaults(this.tenant),
      ...data,
    }).returning();
  }
  
  /**
   * Update resource, verifying ownership first
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = await this.findFirst({ where: { id } });
    
    if (!existing) {
      throw new Error('Resource not found or access denied');
    }
    
    return await this.baseQuery.update(data).where({ id }).returning();
  }
  
  /**
   * Delete resource, verifying ownership first
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findFirst({ where: { id } });
    
    if (!existing) {
      return false;
    }
    
    await this.baseQuery.delete().where({ id });
    return true;
  }
}
