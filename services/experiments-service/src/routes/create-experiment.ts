import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { experiments, experimentVariants } from '../schema';
import { publishEvent, TOPICS } from '../kafka';

const createExperimentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['ab', 'multivariate', 'split_url']).default('ab'),
  qrId: z.string().uuid().optional(),
  goalType: z.enum(['click', 'conversion', 'engagement', 'revenue']).default('click'),
  goalUrl: z.string().url().optional(),
  goalEventName: z.string().max(100).optional(),
  trafficAllocation: z.number().min(0).max(100).default(100),
  autoSelectWinner: z.boolean().default(true),
  minSampleSize: z.number().min(10).default(100),
  confidenceLevel: z.number().min(0).max(1).default(0.95),
  scheduledEndAt: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  variants: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    isControl: z.boolean().default(false),
    trafficWeight: z.number().min(0).max(100).default(50),
    targetUrl: z.string().url().optional(),
    changes: z.any().optional(),
  })).min(2), // At least 2 variants required
});

export const createExperimentRoute: FastifyPluginAsync = async (server) => {
  server.post<{
    Body: z.infer<typeof createExperimentSchema>;
  }>('/experiments', async (request, reply) => {
    try {
      const userId = request.headers['x-user-id'] as string;
      
      if (!userId) {
        return reply.status(401).send({ error: 'User ID required in headers' });
      }
      
      const body = createExperimentSchema.parse(request.body);
      
      // Validate traffic weights sum to 100
      const totalWeight = body.variants.reduce((sum, v) => sum + v.trafficWeight, 0);
      if (totalWeight !== 100) {
        return reply.status(400).send({
          error: 'Variant traffic weights must sum to 100',
          currentSum: totalWeight,
        });
      }
      
      // Ensure exactly one control variant
      const controlCount = body.variants.filter(v => v.isControl).length;
      if (controlCount !== 1) {
        return reply.status(400).send({
          error: 'Exactly one variant must be marked as control',
          controlCount,
        });
      }
      
      // Create experiment
      const [experiment] = await db.insert(experiments).values({
        userId,
        qrId: body.qrId,
        name: body.name,
        description: body.description,
        type: body.type,
        status: 'draft',
        goalType: body.goalType,
        goalUrl: body.goalUrl,
        goalEventName: body.goalEventName,
        trafficAllocation: body.trafficAllocation,
        autoSelectWinner: body.autoSelectWinner,
        minSampleSize: body.minSampleSize,
        confidenceLevel: body.confidenceLevel.toString(),
        scheduledEndAt: body.scheduledEndAt ? new Date(body.scheduledEndAt) : undefined,
        tags: body.tags,
      }).returning();
      
      // Create variants
      const variants = await db.insert(experimentVariants).values(
        body.variants.map(v => ({
          experimentId: experiment.id,
          name: v.name,
          description: v.description,
          isControl: v.isControl,
          trafficWeight: v.trafficWeight,
          targetUrl: v.targetUrl,
          changes: v.changes,
        }))
      ).returning();
      
      // Publish event
      await publishEvent(TOPICS.EXPERIMENT_CREATED, {
        experimentId: experiment.id,
        userId,
        name: experiment.name,
        type: experiment.type,
        variantCount: variants.length,
      });
      
      return reply.status(201).send({
        experiment: {
          ...experiment,
          variants,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to create experiment' });
    }
  });
};
