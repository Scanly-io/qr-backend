import { FastifyInstance } from 'fastify';
import {
  getMicroInteractionsByCategory,
  getMicroInteractionById,
  searchMicroInteractions,
  incrementUsageCount,
  seedMicroInteractions,
} from '../lib/micro-interactions.js';

export default async function microInteractionsRoutes(server: FastifyInstance) {
  
  // Seed micro-interactions library (one-time setup)
  server.post('/seed', async (request, reply) => {
    try {
      await seedMicroInteractions();
      
      return reply.send({
        success: true,
        message: 'Micro-interactions library seeded successfully',
      });
    } catch (error) {
      server.log.error(error, 'Failed to seed micro-interactions');
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Seeding failed',
      });
    }
  });
  
  // Get micro-interactions by category
  server.get('/category/:category', async (request, reply) => {
    const { category } = request.params as { category: string };
    
    const interactions = await getMicroInteractionsByCategory(category);
    
    return reply.send({
      success: true,
      category,
      count: interactions.length,
      interactions,
    });
  });
  
  // Get single micro-interaction
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const interaction = await getMicroInteractionById(id);
    
    if (!interaction) {
      return reply.status(404).send({
        success: false,
        error: 'Interaction not found',
      });
    }
    
    return reply.send({
      success: true,
      interaction,
    });
  });
  
  // Search by tags
  server.post('/search', async (request, reply) => {
    const { tags } = request.body as { tags: string[] };
    
    if (!Array.isArray(tags)) {
      return reply.status(400).send({
        success: false,
        error: 'Tags must be an array',
      });
    }
    
    const interactions = await searchMicroInteractions(tags);
    
    return reply.send({
      success: true,
      count: interactions.length,
      interactions,
    });
  });
  
  // Track usage
  server.post('/:id/use', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      await incrementUsageCount(id);
      
      return reply.send({
        success: true,
        message: 'Usage tracked',
      });
    } catch (error) {
      server.log.error(error, 'Failed to track usage');
      return reply.status(500).send({
        success: false,
        error: 'Failed to track usage',
      });
    }
  });
}
