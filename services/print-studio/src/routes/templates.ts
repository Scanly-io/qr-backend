import { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { printTemplates, templateLibrary } from '../schema.js';
import { z } from 'zod';

// Pre-defined label formats
export const LABEL_FORMATS = {
  'avery-5160': { name: 'Avery 5160', width: 66.675, height: 25.4, cols: 3, rows: 10, pageWidth: 215.9, pageHeight: 279.4 },
  'avery-5163': { name: 'Avery 5163', width: 101.6, height: 50.8, cols: 2, rows: 5, pageWidth: 215.9, pageHeight: 279.4 },
  'avery-5167': { name: 'Avery 5167', width: 44.45, height: 12.7, cols: 4, rows: 20, pageWidth: 215.9, pageHeight: 279.4 },
  'dymo-30252': { name: 'DYMO 30252', width: 28.575, height: 62.738, cols: 1, rows: 1, pageWidth: 28.575, pageHeight: 62.738 },
  'dymo-30336': { name: 'DYMO 30336', width: 25.4, height: 89, cols: 1, rows: 1, pageWidth: 25.4, pageHeight: 89 },
  'custom': { name: 'Custom Size', width: 100, height: 50, cols: 2, rows: 5, pageWidth: 210, pageHeight: 297 },
};

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  labelFormat: z.enum(['avery-5160', 'avery-5163', 'avery-5167', 'dymo-30252', 'dymo-30336', 'custom']),
  pageWidth: z.number().optional(),
  pageHeight: z.number().optional(),
  labelWidth: z.number().optional(),
  labelHeight: z.number().optional(),
  columns: z.number().optional(),
  rows: z.number().optional(),
  design: z.object({
    elements: z.array(z.object({
      type: z.enum(['qr', 'text', 'image', 'barcode']),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      content: z.string().optional(),
      fontSize: z.number().optional(),
      fontFamily: z.string().optional(),
      align: z.enum(['left', 'center', 'right']).optional(),
      bold: z.boolean().optional(),
      dataField: z.string().optional(),
    })),
    qrSize: z.number().optional(),
    qrMargin: z.number().optional(),
  }).optional(),
});

export default async function templateRoutes(fastify: FastifyInstance) {
  
  // List templates
  fastify.get('/', async (request, reply) => {
    const { limit = 50, offset = 0 } = request.query as any;
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const templates = await db.select()
      .from(printTemplates)
      .where(eq(printTemplates.organizationId, organizationId))
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    return { templates };
  });
  
  // Create template
  fastify.post('/', async (request, reply) => {
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const userId = (request.user as any)?.id || 'system';
    const validatedData = createTemplateSchema.parse(request.body);
    
    // Get dimensions from preset or use custom
    const format = LABEL_FORMATS[validatedData.labelFormat];
    
    const [template] = await db.insert(printTemplates).values({
      organizationId,
      name: validatedData.name,
      description: validatedData.description,
      labelFormat: validatedData.labelFormat,
      pageWidth: validatedData.pageWidth || format.pageWidth,
      pageHeight: validatedData.pageHeight || format.pageHeight,
      labelWidth: validatedData.labelWidth || format.width,
      labelHeight: validatedData.labelHeight || format.height,
      columns: validatedData.columns || format.cols,
      rows: validatedData.rows || format.rows,
      design: validatedData.design || { elements: [], qrSize: 150, qrMargin: 1 },
      createdBy: userId,
    }).returning();
    
    reply.code(201).send(template);
  });
  
  // Get template
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    const [template] = await db.select()
      .from(printTemplates)
      .where(and(
        eq(printTemplates.id, id),
        eq(printTemplates.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!template) {
      return reply.code(404).send({ error: 'Template not found' });
    }
    
    return template;
  });
  
  // Update template
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const updateData = request.body as Record<string, any>;
    
    const [updated] = await db.update(printTemplates)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(printTemplates.id, id),
        eq(printTemplates.organizationId, organizationId)
      ))
      .returning();
    
    if (!updated) {
      return reply.code(404).send({ error: 'Template not found' });
    }
    
    return updated;
  });
  
  // Delete template
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    
    await db.delete(printTemplates)
      .where(and(
        eq(printTemplates.id, id),
        eq(printTemplates.organizationId, organizationId)
      ));
    
    reply.code(204).send();
  });
  
  // Get label formats
  fastify.get('/formats/list', async (request, reply) => {
    return { formats: LABEL_FORMATS };
  });
  
  // Duplicate template
  fastify.post('/:id/duplicate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const organizationId = (request.user as any)?.organizationId || 'default-org';
    const userId = (request.user as any)?.id || 'system';
    
    const [original] = await db.select()
      .from(printTemplates)
      .where(and(
        eq(printTemplates.id, id),
        eq(printTemplates.organizationId, organizationId)
      ))
      .limit(1);
    
    if (!original) {
      return reply.code(404).send({ error: 'Template not found' });
    }
    
    const [duplicate] = await db.insert(printTemplates).values({
      organizationId,
      name: `${original.name} (Copy)`,
      description: original.description,
      labelFormat: original.labelFormat,
      pageWidth: original.pageWidth,
      pageHeight: original.pageHeight,
      labelWidth: original.labelWidth,
      labelHeight: original.labelHeight,
      columns: original.columns,
      rows: original.rows,
      marginTop: original.marginTop,
      marginLeft: original.marginLeft,
      gapX: original.gapX,
      gapY: original.gapY,
      design: original.design,
      createdBy: userId,
    }).returning();
    
    return duplicate;
  });
}
