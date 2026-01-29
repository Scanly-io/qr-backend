import { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { locations } from '../schema.js';
import { z } from 'zod';

const createLocationSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().uuid().optional(),
  type: z.enum(['building', 'floor', 'room', 'zone']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  gpsLatitude: z.string().optional(),
  gpsLongitude: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateLocationSchema = createLocationSchema.partial();

export default async function locationRoutes(fastify: FastifyInstance) {
  
  // List locations
  fastify.get('/', async (request, reply) => {
    const { parentId, type, limit = 100, offset = 0 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const conditions = [eq(locations.organizationId, organizationId)];
    
    if (parentId) {
      conditions.push(eq(locations.parentId, parentId));
    }
    
    if (type) {
      conditions.push(eq(locations.type, type));
    }
    
    const results = await db.select()
      .from(locations)
      .where(and(...conditions))
      .orderBy(locations.name)
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    const total = await db.select({ count: sql<number>`count(*)` })
      .from(locations)
      .where(and(...conditions));
    
    return {
      locations: results,
      pagination: {
        total: total[0]?.count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }
    };
  });

  // Create location
  fastify.post('/', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const validatedData = createLocationSchema.parse(request.body);
    
    // Build full path
    let fullPath = validatedData.name;
    if (validatedData.parentId) {
      const [parent] = await db.select()
        .from(locations)
        .where(eq(locations.id, validatedData.parentId))
        .limit(1);
      
      if (parent) {
        fullPath = `${parent.fullPath} > ${validatedData.name}`;
      }
    }
    
    const [newLocation] = await db.insert(locations).values({
      ...validatedData,
      organizationId,
      fullPath,
    }).returning();
    
    reply.code(201).send(newLocation);
  });

  // Get location by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [location] = await db.select()
      .from(locations)
      .where(and(
        eq(locations.id, id),
        eq(locations.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!location) {
      return reply.code(404).send({ error: 'Location not found' });
    }
    
    return location;
  });

  // Update location
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const validatedData = updateLocationSchema.parse(request.body);
    
    const [updated] = await db.update(locations)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(locations.id, id),
        eq(locations.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Location not found' });
    }
    
    return updated;
  });

  // Delete location
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    // Check if location has children
    const children = await db.select({ count: sql<number>`count(*)` })
      .from(locations)
      .where(and(
        eq(locations.parentId, id),
        eq(locations.organizationId, organizationId)
      ));
    
    if (children[0]?.count > 0) {
      return reply.code(400).send({ 
        error: 'Cannot delete location with child locations. Delete children first.' 
      });
    }
    
    const [deleted] = await db.delete(locations)
      .where(and(
        eq(locations.id, id),
        eq(locations.organizationId, organizationId)
      ))
      .returning();
    
    if (!deleted) {
      return reply.code(404).send({ error: 'Location not found' });
    }
    
    reply.code(204).send();
  });

  // Get location hierarchy (tree structure)
  fastify.get('/tree', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    // Get all locations
    const allLocations = await db.select()
      .from(locations)
      .where(eq(locations.organizationId, organizationId))
      .orderBy(locations.fullPath);
    
    // Build tree structure
    const buildTree = (parentId: string | null = null): any[] => {
      return allLocations
        .filter(loc => loc.parentId === parentId)
        .map(loc => ({
          ...loc,
          children: buildTree(loc.id),
        }));
    };
    
    const tree = buildTree();
    
    return { tree, totalLocations: allLocations.length };
  });

  // Get location with asset count
  fastify.get('/:id/assets/count', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const assetCount = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM assets
      WHERE location_id = ${id}
      AND organization_id = ${organizationId}
    `);
    
    const count = Array.isArray(assetCount) ? Number(assetCount[0]?.count || 0) : 0;
    
    return { 
      locationId: id,
      assetCount: count
    };
  });
}
