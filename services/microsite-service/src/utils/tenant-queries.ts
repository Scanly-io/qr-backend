import { eq, and, or, isNull } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export interface TenantContext {
  agencyId: string | null;
  userId: string;
  role: string;
  permissions: Record<string, boolean>;
  isAgencyContext: boolean;
}

/**
 * Build a WHERE clause that filters by tenant (agency or individual user)
 */
export function buildTenantWhere(
  tenant: TenantContext,
  table: { agencyId: any; createdBy: any },
  additionalConditions?: SQL
): SQL {
  let tenantCondition: SQL;

  if (tenant.isAgencyContext) {
    // Agency context: show all agency resources
    tenantCondition = eq(table.agencyId, tenant.agencyId);
  } else {
    // Individual user: show only their resources with null agencyId
    tenantCondition = and(
      isNull(table.agencyId),
      eq(table.createdBy, tenant.userId)
    )!;
  }

  return additionalConditions
    ? and(tenantCondition, additionalConditions)!
    : tenantCondition;
}

/**
 * Verify that a resource belongs to the current tenant
 */
export function verifyOwnership(
  resource: { agencyId: string | null; createdBy: string | null },
  tenant: TenantContext
): boolean {
  if (tenant.isAgencyContext) {
    return resource.agencyId === tenant.agencyId;
  } else {
    return resource.agencyId === null && resource.createdBy === tenant.userId;
  }
}

/**
 * Get default values to set when creating a resource
 */
export function getTenantDefaults(tenant: TenantContext): {
  agencyId: string | null;
  createdBy: string;
} {
  return {
    agencyId: tenant.agencyId,
    createdBy: tenant.userId,
  };
}

/**
 * Query builder that automatically applies tenant scoping
 */
export class TenantQueryBuilder<T extends { id: any; agencyId: any; createdBy: any }> {
  constructor(
    private db: any,
    private table: T,
    private tenant: TenantContext
  ) {}

  async findMany(options?: { where?: SQL; limit?: number; offset?: number }) {
    const where = buildTenantWhere(
      this.tenant,
      this.table,
      options?.where
    );

    return this.db.query[this.table].findMany({
      where,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  async findFirst(options?: { where?: SQL }) {
    const where = buildTenantWhere(
      this.tenant,
      this.table,
      options?.where
    );

    return this.db.query[this.table].findFirst({ where });
  }

  async create(data: any) {
    const defaults = getTenantDefaults(this.tenant);
    return this.db.insert(this.table).values({ ...defaults, ...data }).returning();
  }

  async update(id: string, data: any) {
    // First verify ownership
    const existing = await this.findFirst({ where: eq(this.table.id, id) });
    if (!existing || !verifyOwnership(existing, this.tenant)) {
      throw new Error('Resource not found or access denied');
    }

    // Remove tenant fields to prevent tampering
    const { agencyId, createdBy, ...safeData } = data;

    return this.db
      .update(this.table)
      .set(safeData)
      .where(eq(this.table.id, id))
      .returning();
  }

  async delete(id: string) {
    // First verify ownership
    const existing = await this.findFirst({ where: eq(this.table.id, id) });
    if (!existing || !verifyOwnership(existing, this.tenant)) {
      throw new Error('Resource not found or access denied');
    }

    return this.db.delete(this.table).where(eq(this.table.id, id)).returning();
  }
}
