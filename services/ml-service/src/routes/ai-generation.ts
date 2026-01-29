import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generateMicrosite, regenerateSection } from '../lib/ai-generator.js';
import { db } from '../db.js';
import { aiGenerations } from '../schema.js';

const generateSchema = z.object({
  prompt: z.string().optional(),
  brandUrl: z.string().url().optional(),
  brandName: z.string().optional(),
  industry: z.string().optional(),
  mobileFirst: z.boolean().optional().default(true),
});

const regenerateSchema = z.object({
  generationId: z.string().uuid(),
  sectionType: z.string(),
  instructions: z.string(),
});

export default async function aiRoutes(server: FastifyInstance) {
  
  // Generate new microsite with AI
  server.post('/generate', async (request, reply) => {
    try {
      const data = generateSchema.parse(request.body);
      
      // TODO: Get userId from auth token
      const userId = request.headers['x-user-id'] as string || '00000000-0000-0000-0000-000000000000';
      
      const result = await generateMicrosite({
        userId,
        ...data,
      });
      
      return reply.send({
        success: true,
        generationId: result.generationId,
        preview: {
          html: result.html.substring(0, 500) + '...',
          css: result.css.substring(0, 500) + '...',
        },
        components: result.components,
        brandAesthetic: result.brandAesthetic,
      });
      
    } catch (error) {
      server.log.error(error, 'Failed to generate microsite');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      });
    }
  });
  
  // Get generation details
  server.get('/generation/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const generation = await db.query.aiGenerations.findFirst({
      where: (table, { eq }) => eq(table.id, id),
    });
    
    if (!generation) {
      return reply.status(404).send({ error: 'Generation not found' });
    }
    
    return reply.send({ generation });
  });
  
  // Regenerate specific section
  server.post('/regenerate', async (request, reply) => {
    try {
      const data = regenerateSchema.parse(request.body);
      
      const result = await regenerateSection(
        data.generationId,
        data.sectionType,
        data.instructions
      );
      
      return reply.send({
        success: true,
        updatedSection: result,
      });
      
    } catch (error) {
      server.log.error(error, 'Failed to regenerate section');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Regeneration failed',
      });
    }
  });
  
  // List user's generations
  server.get('/generations', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string || '00000000-0000-0000-0000-000000000000';
    
    const generations = await db.query.aiGenerations.findMany({
      where: (table, { eq }) => eq(table.userId, userId),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit: 50,
    });
    
    return reply.send({ generations });
  });
}
