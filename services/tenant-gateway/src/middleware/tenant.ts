import { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { users, agencyMembers } from '../schema.js';

export interface TenantContext {
  agencyId: string | null;
  userId: string;
  role: string;
  permissions: Record<string, boolean>;
  isAgencyContext: boolean;
}

/**
 * Extract tenant context and add as headers for downstream services
 */
export async function addTenantHeaders(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Extract userId from JWT (assume auth middleware already validated)
  const userId = (request as any).userId;

  if (!userId) {
    // Skip for unauthenticated routes
    return;
  }

  try {
    // Query user from auth database
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      request.log.warn({ userId }, 'User not found in tenant lookup');
      return;
    }

    let tenantHeaders: Record<string, string> = {
      'X-Tenant-User-Id': userId,
      'X-Tenant-Role': 'user',
      'X-Tenant-Is-Agency': 'false',
    };

    if (user.organizationId) {
      // Load agency membership
      const membership = await db.query.agencyMembers.findFirst({
        where: and(
          eq(agencyMembers.agencyId, user.organizationId),
          eq(agencyMembers.userId, userId)
        ),
      });

      if (membership) {
        tenantHeaders = {
          'X-Tenant-Agency-Id': user.organizationId,
          'X-Tenant-User-Id': userId,
          'X-Tenant-Role': membership.role,
          'X-Tenant-Permissions': JSON.stringify(membership.permissions),
          'X-Tenant-Is-Agency': 'true',
        };
      }
    }

    // Store tenant headers for proxy to forward
    (request as any).tenantHeaders = tenantHeaders;

    request.log.info(
      {
        userId,
        agencyId: tenantHeaders['X-Tenant-Agency-Id'],
        role: tenantHeaders['X-Tenant-Role'],
      },
      'Tenant context resolved'
    );
  } catch (error) {
    request.log.error({ error, userId }, 'Error resolving tenant context');
  }
}
