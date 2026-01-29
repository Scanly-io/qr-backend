import type { FastifyRequest, FastifyReply } from 'fastify';
import type { TenantContext } from '../utils/tenant-queries.js';

/**
 * Extract tenant context from headers (set by tenant-gateway)
 */
export function extractTenantFromHeaders(request: FastifyRequest): TenantContext | null {
  const isAgency = request.headers['x-tenant-is-agency'] === 'true';
  const userId = request.headers['x-tenant-user-id'] as string;

  if (!userId) {
    return null;
  }

  if (isAgency) {
    const agencyId = request.headers['x-tenant-agency-id'] as string;
    const role = request.headers['x-tenant-role'] as string;
    const permissionsStr = request.headers['x-tenant-permissions'] as string;

    let permissions: Record<string, boolean> = {};
    try {
      permissions = JSON.parse(permissionsStr || '{}');
    } catch (error) {
      request.log.warn({ error }, 'Failed to parse tenant permissions');
    }

    return {
      agencyId,
      userId,
      role,
      permissions,
      isAgencyContext: true,
    };
  } else {
    // Individual user
    return {
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
}

/**
 * Middleware to extract and attach tenant context to request
 */
export async function addTenantContext(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const tenant = extractTenantFromHeaders(request);

  if (!tenant) {
    // Allow unauthenticated requests to pass through
    // Individual routes will check for tenant if needed
    return;
  }

  (request as any).tenant = tenant;
}

/**
 * Helper to check if user has specific permission
 */
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant as TenantContext;

    if (!tenant) {
      return reply.code(401).send({ error: 'No tenant context' });
    }

    if (!tenant.permissions[permission]) {
      return reply.code(403).send({
        error: `Permission denied: ${permission} required`,
      });
    }
  };
}

/**
 * Require agency admin role (owner or admin)
 */
export function requireAgencyAdmin() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenant = (request as any).tenant as TenantContext;

    if (!tenant) {
      return reply.code(401).send({ error: 'No tenant context' });
    }

    if (!tenant.isAgencyContext) {
      return reply.code(403).send({ error: 'Agency context required' });
    }

    if (tenant.role !== 'owner' && tenant.role !== 'admin') {
      return reply.code(403).send({
        error: 'Agency admin role required',
      });
    }
  };
}
