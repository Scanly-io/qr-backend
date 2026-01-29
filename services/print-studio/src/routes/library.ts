import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { templateLibrary, printTemplates } from '../schema.js';

export default async function libraryRoutes(fastify: FastifyInstance) {
  
  // Browse template library
  fastify.get('/', async (request, reply) => {
    const { category, limit = 20, offset = 0 } = request.query as any;
    
    const conditions = [eq(templateLibrary.isActive, true)];
    
    if (category) {
      conditions.push(eq(templateLibrary.category, category));
    }
    
    const templates = await db.select()
      .from(templateLibrary)
      .where(and(...conditions))
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    return { templates };
  });
  
  // Get library template details
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const [template] = await db.select()
      .from(templateLibrary)
      .where(eq(templateLibrary.id, id))
      .limit(1);
    
    if (!template) {
      return reply.code(404).send({ error: 'Template not found' });
    }
    
    return template;
  });
  
  // Clone library template to user's templates
  fastify.post('/:id/clone', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const userId = (request.user as any)?.id || 'system';
    
    const [libraryTemplate] = await db.select()
      .from(templateLibrary)
      .where(eq(templateLibrary.id, id))
      .limit(1);
    
    if (!libraryTemplate) {
      return reply.code(404).send({ error: 'Template not found' });
    }
    
    // Create user's own copy
    const [userTemplate] = await db.insert(printTemplates).values({
      organizationId,
      name: libraryTemplate.name,
      description: libraryTemplate.description,
      labelFormat: libraryTemplate.labelFormat,
      design: libraryTemplate.design as any,
      createdBy: userId,
      // Set default dimensions based on format
      pageWidth: 215,
      pageHeight: 279,
      labelWidth: 66,
      labelHeight: 25,
      columns: 3,
      rows: 10,
    }).returning();
    
    // Increment usage count
    await db.update(templateLibrary)
      .set({ usageCount: (libraryTemplate.usageCount || 0) + 1 })
      .where(eq(templateLibrary.id, id));
    
    return userTemplate;
  });
  
  // Get template categories
  fastify.get('/categories/list', async (request, reply) => {
    return {
      categories: [
        { id: 'asset-labels', name: 'Asset Labels', description: 'QR labels for equipment and assets' },
        { id: 'product-labels', name: 'Product Labels', description: 'Product packaging and inventory' },
        { id: 'shipping', name: 'Shipping Labels', description: 'Shipping and logistics' },
        { id: 'inventory', name: 'Inventory Tags', description: 'Warehouse and stock management' },
        { id: 'event', name: 'Event Badges', description: 'Event tickets and name badges' },
        { id: 'custom', name: 'Custom Templates', description: 'User-created templates' },
      ],
    };
  });
}
