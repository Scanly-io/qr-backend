import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { experiments, experimentVariants, variantAssignments } from '../schema';
import { eq, and } from 'drizzle-orm';
import { publishEvent, TOPICS } from '../kafka';
import crypto from 'crypto';

const assignVariantSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().uuid().optional(),
  fingerprint: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  referrer: z.string().optional(),
});

/**
 * Assign a variant to a user/session
 * Uses consistent hashing to ensure same user always gets same variant
 */
export const assignVariantRoute: FastifyPluginAsync = async (server) => {
  server.post<{
    Params: {
      id: string;
    };
    Body: z.infer<typeof assignVariantSchema>;
  }>('/experiments/:id/assign', async (request, reply) => {
    try {
      const { id } = request.params;
      const body = assignVariantSchema.parse(request.body);
      
      // Get experiment with variants
      const experiment = await db.query.experiments.findFirst({
        where: eq(experiments.id, id),
        with: {
          variants: true,
        },
      });
      
      if (!experiment) {
        return reply.status(404).send({ error: 'Experiment not found' });
      }
      
      if (experiment.status !== 'active') {
        return reply.status(400).send({ error: 'Experiment is not active' });
      }
      
      // Check if user/session already has assignment
      const existingAssignment = await db.query.variantAssignments.findFirst({
        where: and(
          eq(variantAssignments.experimentId, id),
          eq(variantAssignments.sessionId, body.sessionId)
        ),
        with: {
          variant: true,
        },
      });
      
      if (existingAssignment) {
        return reply.send({
          assignment: existingAssignment,
          variant: existingAssignment.variant,
          message: 'Existing assignment returned',
        });
      }
      
      // Assign variant using weighted random selection with consistent hashing
      const variant = selectVariant(experiment.variants, body.sessionId);
      
      if (!variant) {
        return reply.status(500).send({ error: 'Failed to select variant' });
      }
      
      // Create assignment
      const [assignment] = await db.insert(variantAssignments).values({
        experimentId: id,
        variantId: variant.id,
        userId: body.userId,
        sessionId: body.sessionId,
        fingerprint: body.fingerprint,
        userAgent: body.userAgent,
        ipAddress: body.ipAddress,
        country: body.country,
        city: body.city,
        referrer: body.referrer,
      }).returning();
      
      // Update variant assignment count
      await db.update(experimentVariants)
        .set({
          totalAssignments: variant.totalAssignments + 1,
          updatedAt: new Date(),
        })
        .where(eq(experimentVariants.id, variant.id));
      
      // Publish event
      await publishEvent(TOPICS.VARIANT_ASSIGNED, {
        experimentId: id,
        variantId: variant.id,
        variantName: variant.name,
        sessionId: body.sessionId,
        userId: body.userId,
      });
      
      return reply.status(201).send({
        assignment,
        variant,
        targetUrl: variant.targetUrl,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to assign variant' });
    }
  });
};

/**
 * Select variant using weighted distribution and consistent hashing
 * Same sessionId will always get same variant
 */
function selectVariant(variants: any[], sessionId: string): any {
  // Create hash from sessionId
  const hash = crypto.createHash('md5').update(sessionId).digest('hex');
  const hashValue = parseInt(hash.substring(0, 8), 16);
  
  // Calculate total weight
  const totalWeight = variants.reduce((sum, v) => sum + v.trafficWeight, 0);
  
  // Map hash to weight range
  const position = hashValue % totalWeight;
  
  // Find variant based on position
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.trafficWeight;
    if (position < cumulative) {
      return variant;
    }
  }
  
  // Fallback to first variant
  return variants[0];
}
