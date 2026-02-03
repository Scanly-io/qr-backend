# Multi-Tenancy Quick Implementation

## Current Status

The multi-tenancy architecture has been designed with these components:

1. ✅ **Tenant Query Helpers** - Created in `/services/microsite-service/src/utils/tenant-queries.ts`
2. ✅ **Multi-Tenancy Guide** - Comprehensive documentation in `/MULTI_TENANCY_GUIDE.md`
3. ⚠️ **Tenant Middleware** - Needs auth-service integration

## Implementation Approach

Since tenant context requires user and agency data from the auth-service database, we have two options:

### Option A: Gateway/API Pattern (Recommended)

The API Gateway adds tenant context to requests before routing to services:

```
Client → Gateway (adds tenant context) → Microsite Service
```

**Advantages:**
- Single source of truth for tenant context
- Services don't need cross-database queries
- Cleaner service boundaries

**Implementation:**
1. Gateway queries auth database for user/agency
2. Gateway adds headers: `X-Tenant-Agency-Id`, `X-Tenant-User-Id`, `X-Tenant-Role`, `X-Tenant-Permissions`
3. Services read tenant context from headers

### Option B: Service-to-Service Calls

Each service calls auth-service API to get tenant context:

```
Microsite Service → Auth Service API → Returns tenant context
```

**Advantages:**
- No gateway dependency
- Services stay independent

**Disadvantages:**
- Extra network call per request
- Potential circular dependencies

## Recommended Next Steps

Since you have an API Gateway (`services/api-gateway`), implement Option A:

### 1. Add Tenant Middleware to Gateway

```typescript
// services/api-gateway/src/middleware/tenant.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';

export async function addTenantHeaders(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = (request as any).userId;
  
  if (!userId) {
    return; // Skip for unauthenticated routes
  }
  
  // Query user from auth database
  const user = await authDb.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  if (!user) {
    return;
  }
  
  let tenantHeaders: Record<string, string> = {
    'X-Tenant-User-Id': userId,
    'X-Tenant-Role': 'user',
    'X-Tenant-Is-Agency': 'false',
  };
  
  if (user.organizationId) {
    const membership = await authDb.query.agencyMembers.findFirst({
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
  
  // Add headers to proxied request
  (request as any).tenantHeaders = tenantHeaders;
}
```

### 2. Extract Tenant Context in Services

```typescript
// services/microsite-service/src/middleware/tenant.ts
import type { FastifyRequest } from 'fastify';
import type { TenantContext } from '../utils/tenant-queries.js';

export function extractTenantFromHeaders(request: FastifyRequest): TenantContext | null {
  const isAgency = request.headers['x-tenant-is-agency'] === 'true';
  const userId = request.headers['x-tenant-user-id'] as string;
  
  if (!userId) {
    return null;
  }
  
  if (isAgency) {
    return {
      agencyId: request.headers['x-tenant-agency-id'] as string,
      userId,
      role: request.headers['x-tenant-role'] as string,
      permissions: JSON.parse(request.headers['x-tenant-permissions'] as string || '{}'),
      isAgencyContext: true,
    };
  } else {
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

export async function addTenantContext(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const tenant = extractTenantFromHeaders(request);
  (request as any).tenant = tenant;
}
```

### 3. Use Tenant-Scoped Queries

Now you can use the tenant query helpers:

```typescript
import { buildTenantWhere, verifyOwnership, getTenantDefaults } from '../utils/tenant-queries.js';
import { eq, isNull } from 'drizzle-orm';

// List microsites (tenant-scoped)
server.get('/microsites', async (request, reply) => {
  const { tenant } = request as any;
  
  if (!tenant) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  
  const where = buildTenantWhere(tenant, microsites);
  const results = await db.query.microsites.findMany({ where });
  
  return { success: true, data: results };
});

// Get single microsite (ownership verified)
server.get('/microsites/:id', async (request, reply) => {
  const { id } = request.params;
  const { tenant } = request as any;
  
  const microsite = await db.query.microsites.findFirst({
    where: eq(microsites.id, id),
  });
  
  if (!microsite || !verifyOwnership(microsite, tenant)) {
    return reply.code(404).send({ error: 'Microsite not found' });
  }
  
  return { success: true, data: microsite };
});

// Create microsite (auto-scoped)
server.post('/microsites', async (request, reply) => {
  const { tenant } = request as any;
  const { title, description } = request.body;
  
  const defaults = getTenantDefaults(tenant);
  
  const [microsite] = await db.insert(microsites).values({
    ...defaults,
    title,
    description,
  }).returning();
  
  return { success: true, data: microsite };
});
```

## Alternative: Direct Auth Service Integration

If you don't want to use the gateway, you can make services call the auth API:

```typescript
// services/microsite-service/src/utils/auth-client.ts
async function getTenantContext(userId: string): Promise<TenantContext> {
  const response = await fetch(`http://auth-service:3001/api/tenant/${userId}`);
  return response.json();
}

// In route handler
const userId = (request as any).userId;
const tenant = await getTenantContext(userId);
```

Then create this endpoint in auth-service:

```typescript
// services/auth-service/src/routes/tenant.ts
server.get('/tenant/:userId', async (request, reply) => {
  const { userId } = request.params;
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  // ... return tenant context
});
```

## Summary

**For your setup:**

1. ✅ Tenant query helpers are ready in `services/microsite-service/src/utils/tenant-queries.ts`
2. ⏭️ Choose Option A (Gateway) or Option B (Service calls)
3. ⏭️ Implement tenant context extraction
4. ⏭️ Update route handlers to use `buildTenantWhere()`, `verifyOwnership()`, `getTenantDefaults()`

The helpers are generic and will work once you provide the tenant context from either source.

**Want me to implement the gateway approach or the service-to-service approach?**
