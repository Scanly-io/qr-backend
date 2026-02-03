# Multi-Tenancy Implementation Guide

## Overview

Multi-tenancy ensures complete data isolation between agencies on the white-label platform. Every agency gets a logically separate environment while sharing the same infrastructure.

## Architecture

### Tenant Types

1. **Agency Tenant** (`isAgencyContext: true`)
   - All team members share access to agency resources
   - Data filtered by `agencyId`
   - Permissions controlled by role (owner, admin, member, viewer)

2. **Individual User** (`isAgencyContext: false`)
   - No agency affiliation
   - Data filtered by `createdBy` + `agencyId IS NULL`
   - Full permissions for own resources

### Tenant Context Structure

```typescript
interface TenantContext {
  agencyId: string | null;      // null = individual user
  userId: string;                // Current user ID
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
```

## Implementation Steps

### 1. Add Tenant Context to Request

**Add to each service's middleware:**

```typescript
// services/*/src/middleware/tenant.ts
import { FastifyRequest, FastifyReply } from 'fastify';

export async function addTenantContext(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Assume userId is set by auth middleware
  const userId = (request as any).userId;
  
  if (!userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  
  // Query user to get organizationId
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  if (!user) {
    return reply.code(401).send({ error: 'User not found' });
  }
  
  let tenantContext: TenantContext;
  
  if (user.organizationId) {
    // Load agency membership
    const membership = await db.query.agencyMembers.findFirst({
      where: and(
        eq(agencyMembers.agencyId, user.organizationId),
        eq(agencyMembers.userId, userId)
      ),
    });
    
    tenantContext = {
      agencyId: user.organizationId,
      userId,
      role: membership.role,
      permissions: membership.permissions,
      isAgencyContext: true,
    };
  } else {
    // Individual user
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
  
  (request as any).tenant = tenantContext;
}
```

**Register middleware:**

```typescript
// services/*/src/index.ts
import { addTenantContext } from './middleware/tenant.js';

// After auth middleware
server.addHook('preHandler', addTenantContext);
```

### 2. Tenant-Scoped Queries

**Always filter queries by tenant:**

```typescript
// ✅ CORRECT: Tenant-scoped query
server.get('/microsites', async (request, reply) => {
  const { tenant } = request as any;
  
  let where;
  if (tenant.isAgencyContext) {
    // Show all agency microsites
    where = eq(microsites.agencyId, tenant.agencyId);
  } else {
    // Show only user's own microsites
    where = and(
      isNull(microsites.agencyId),
      eq(microsites.createdBy, tenant.userId)
    );
  }
  
  const results = await db.query.microsites.findMany({ where });
  
  return { success: true, data: results };
});

// ❌ WRONG: No tenant filtering (security vulnerability!)
server.get('/microsites', async (request, reply) => {
  const results = await db.query.microsites.findMany();
  return { success: true, data: results };
});
```

### 3. Ownership Verification

**Always verify ownership before read/update/delete:**

```typescript
server.get('/microsites/:id', async (request, reply) => {
  const { id } = request.params;
  const { tenant } = request as any;
  
  const microsite = await db.query.microsites.findFirst({
    where: eq(microsites.id, id),
  });
  
  if (!microsite) {
    return reply.code(404).send({ error: 'Not found' });
  }
  
  // Verify ownership
  const hasAccess = tenant.isAgencyContext
    ? microsite.agencyId === tenant.agencyId
    : microsite.agencyId === null && microsite.createdBy === tenant.userId;
  
  if (!hasAccess) {
    return reply.code(403).send({ error: 'Access denied' });
  }
  
  return { success: true, data: microsite };
});
```

### 4. Automatic Tenant Assignment on Create

**Always set tenant fields when creating resources:**

```typescript
server.post('/microsites', async (request, reply) => {
  const { tenant } = request as any;
  const { title, description } = request.body;
  
  const [microsite] = await db.insert(microsites).values({
    // Automatically scope to tenant
    agencyId: tenant.agencyId,
    createdBy: tenant.userId,
    
    // User-provided fields
    title,
    description,
  }).returning();
  
  return { success: true, data: microsite };
});
```

### 5. Prevent Tenant Tampering

**Never allow changing ownership via API:**

```typescript
server.patch('/microsites/:id', async (request, reply) => {
  const { id } = request.params;
  const updateData = request.body;
  
  // Remove tenant fields to prevent tampering
  delete updateData.agencyId;
  delete updateData.createdBy;
  
  const [updated] = await db.update(microsites)
    .set(updateData)
    .where(eq(microsites.id, id))
    .returning();
  
  return { success: true, data: updated };
});
```

## Database-Level Security (Row-Level Security)

For defense-in-depth, implement PostgreSQL RLS:

```sql
-- Enable RLS on microsites table
ALTER TABLE microsites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their tenant's data
CREATE POLICY tenant_isolation ON microsites
  FOR ALL
  USING (
    -- Agency members see agency resources
    (agency_id = current_setting('app.current_agency_id', true)::UUID)
    OR
    -- Individual users see their own resources
    (agency_id IS NULL AND created_by = current_setting('app.current_user_id', true)::UUID)
  );

-- Set tenant context before each query
-- In your application code:
await db.execute(sql`SET LOCAL app.current_agency_id = ${tenant.agencyId}`);
await db.execute(sql`SET LOCAL app.current_user_id = ${tenant.userId}`);

-- Now all queries automatically filter by tenant
const microsites = await db.query.microsites.findMany();  // Only sees tenant's data
```

## Permission Checks

**Check permissions before actions:**

```typescript
server.post('/microsites', async (request, reply) => {
  const { tenant } = request as any;
  
  if (!tenant.permissions.createMicrosites) {
    return reply.code(403).send({
      error: 'Permission denied: createMicrosites required',
    });
  }
  
  // Proceed with creation...
});

server.delete('/microsites/:id', async (request, reply) => {
  const { tenant } = request as any;
  
  if (!tenant.permissions.deleteMicrosites) {
    return reply.code(403).send({
      error: 'Permission denied: deleteMicrosites required',
    });
  }
  
  // Proceed with deletion...
});
```

## Testing Multi-Tenancy

### Test Cases

```typescript
describe('Multi-Tenancy', () => {
  it('Agency A cannot see Agency B microsites', async () => {
    // Create microsite for Agency A
    const agencyAMicrosite = await createMicrosite({
      tenant: { agencyId: 'agency-a', userId: 'user-1' },
      title: 'Agency A Site',
    });
    
    // Try to access from Agency B
    const response = await request(app)
      .get(`/microsites/${agencyAMicrosite.id}`)
      .set('X-Tenant-Id', 'agency-b')
      .set('X-User-Id', 'user-2');
    
    expect(response.status).toBe(403);
  });
  
  it('Individual users cannot see agency microsites', async () => {
    const agencyMicrosite = await createMicrosite({
      tenant: { agencyId: 'agency-a', userId: 'user-1' },
      title: 'Agency Site',
    });
    
    const response = await request(app)
      .get(`/microsites/${agencyMicrosite.id}`)
      .set('X-Tenant-Id', null)
      .set('X-User-Id', 'individual-user');
    
    expect(response.status).toBe(403);
  });
  
  it('Agency members can see all agency microsites', async () => {
    // Create microsite by user-1
    const microsite = await createMicrosite({
      tenant: { agencyId: 'agency-a', userId: 'user-1' },
    });
    
    // Access by user-2 (same agency)
    const response = await request(app)
      .get(`/microsites/${microsite.id}`)
      .set('X-Tenant-Id', 'agency-a')
      .set('X-User-Id', 'user-2');
    
    expect(response.status).toBe(200);
  });
});
```

## Common Pitfalls

### ❌ Forgetting Tenant Filter

```typescript
// WRONG: Returns ALL microsites (data leak!)
const microsites = await db.query.microsites.findMany();
```

### ❌ Trusting Client Input for Tenant ID

```typescript
// WRONG: Client can specify any tenant
const { agencyId } = request.body;
await db.insert(microsites).values({ agencyId, ... });

// CORRECT: Use tenant from server-side context
const { tenant } = request;
await db.insert(microsites).values({ agencyId: tenant.agencyId, ... });
```

### ❌ Not Verifying Ownership Before Update

```typescript
// WRONG: Updates any microsite
await db.update(microsites).set(data).where(eq(microsites.id, id));

// CORRECT: Verify ownership first
const existing = await db.query.microsites.findFirst({ where: eq(microsites.id, id) });
if (existing.agencyId !== tenant.agencyId) {
  throw new Error('Access denied');
}
await db.update(microsites).set(data).where(eq(microsites.id, id));
```

### ❌ Exposing Tenant Data in Error Messages

```typescript
// WRONG: Leaks tenant existence
if (!microsite) {
  return reply.send({ error: 'Microsite not found' });
}
if (microsite.agencyId !== tenant.agencyId) {
  return reply.send({ error: 'Microsite belongs to different agency' });
}

// CORRECT: Same error for both cases
if (!microsite || microsite.agencyId !== tenant.agencyId) {
  return reply.code(404).send({ error: 'Microsite not found' });
}
```

## Monitoring & Auditing

### Log Tenant Context

```typescript
server.addHook('onRequest', (request, reply, done) => {
  request.log.info({
    tenantId: (request as any).tenant?.agencyId,
    userId: (request as any).tenant?.userId,
    path: request.url,
  }, 'Request received');
  done();
});
```

### Audit Trail

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  user_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Log all creates/updates/deletes
INSERT INTO audit_log (tenant_id, user_id, action, resource_type, resource_id)
VALUES (?, ?, 'UPDATE', 'microsite', ?);
```

## Summary

✅ **Always filter queries by tenant**
✅ **Verify ownership before read/update/delete**
✅ **Set tenant fields automatically on create**
✅ **Never trust client input for tenant ID**
✅ **Check permissions before actions**
✅ **Use RLS for defense-in-depth**
✅ **Test cross-tenant access denial**
✅ **Log tenant context for auditing**

This ensures complete data isolation between agencies while allowing team collaboration within agencies.
