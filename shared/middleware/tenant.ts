/**
 * MULTI-TENANCY MIDDLEWARE
 * 
 * Ensures complete data isolation between agencies.
 * Every request must include tenant context to prevent cross-agency data leaks.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';

export interface TenantContext {
  agencyId: string | null;      // null = individual user (not in agency)
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer' | 'user';
  permissions: {
    createMicrosites: boolean;
    editMicrosites: boolean;
    deleteMicrosites: boolean;
    manageBilling: boolean;
    manageTeam: boolean;
    viewAnalytics: boolean;
  };
  isAgencyContext: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant: TenantContext;
  }
}

interface TenantMiddlewareDeps {
  db: any;
  users: any;
  agencies: any;
  agencyMembers: any;
}

/**
 * Create tenant middleware with database dependencies
 * Usage: const middleware = createTenantMiddleware({ db, users, agencies, agencyMembers })
 */
export function createTenantMiddleware(deps: TenantMiddlewareDeps) {
  const { db, users, agencies, agencyMembers } = deps;

  /**
   * Extract tenant context from JWT or session
   * This should be called AFTER authentication middleware
   */
  return async function tenantMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    // Get userId from authenticated session (set by auth middleware)
    const userId = (request as any).userId;
    
    if (!userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required',
      });
    }
  
  // Get user details
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  if (!user) {
    return reply.code(401).send({
      success: false,
      error: 'User not found',
    });
  }
  
  let tenantContext: TenantContext;
  
  if (user.organizationId) {
    // User belongs to an agency - load agency context
    const membership = await db.query.agencyMembers.findFirst({
      where: and(
        eq(agencyMembers.agencyId, user.organizationId),
        eq(agencyMembers.userId, userId),
        eq(agencyMembers.status, 'active')
      ),
    });
    
    if (!membership) {
      return reply.code(403).send({
        success: false,
        error: 'Agency membership not found or inactive',
      });
    }
    
    tenantContext = {
      agencyId: user.organizationId,
      userId,
      role: membership.role as any,
      permissions: membership.permissions as any,
      isAgencyContext: true,
    };
  } else {
    // Individual user (no agency)
    tenantContext = {
      agencyId: null,
      userId,
      role: 'user',
      permissions: {
        createMicrosites: true,
        editMicrosites: true,
        deleteMicrosites: true,
        manageBilling: true,
        manageTeam: false,
        viewAnalytics: true,
      },
      isAgencyContext: false,
    };
  }
  
  // Attach tenant context to request
  request.tenant = tenantContext;
  };
}

/**
 * Require specific permission
 */
export function requirePermission(permission: keyof TenantContext['permissions']) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.tenant) {
      return reply.code(401).send({
        success: false,
        error: 'Tenant context not found',
      });
    }
    
    if (!request.tenant.permissions[permission]) {
      return reply.code(403).send({
        success: false,
        error: `Permission denied: ${permission} required`,
      });
    }
  };
}

/**
 * Require agency owner or admin role
 */
export async function requireAgencyAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.tenant) {
    return reply.code(401).send({
      success: false,
      error: 'Tenant context not found',
    });
  }
  
  if (!request.tenant.isAgencyContext) {
    return reply.code(403).send({
      success: false,
      error: 'Agency context required',
    });
  }
  
  if (request.tenant.role !== 'owner' && request.tenant.role !== 'admin') {
    return reply.code(403).send({
      success: false,
      error: 'Agency owner or admin role required',
    });
  }
}

/**
 * Verify resource belongs to tenant's agency
 * Prevents cross-tenant data access
 */
export async function verifyResourceOwnership(
  resourceAgencyId: string | null,
  tenantContext: TenantContext
): Promise<boolean> {
  // If resource has no agency, only individual users can access
  if (!resourceAgencyId) {
    return !tenantContext.isAgencyContext;
  }
  
  // If resource belongs to an agency, tenant must be in that agency
  return resourceAgencyId === tenantContext.agencyId;
}

/**
 * Build tenant-scoped WHERE clause for queries
 * Use this to automatically filter queries by tenant
 */
export function buildTenantScope(tenantContext: TenantContext) {
  if (tenantContext.isAgencyContext) {
    return {
      agencyId: tenantContext.agencyId,
    };
  } else {
    return {
      agencyId: null,
      createdBy: tenantContext.userId,
    };
  }
}
