import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { variantAssignments, experimentVariants } from '../schema';
import { eq, and } from 'drizzle-orm';
import { publishEvent, TOPICS } from '../kafka';

const trackConversionSchema = z.object({
  sessionId: z.string().min(1),
  conversionValue: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Track a conversion for an experiment
 */
export const trackConversionRoute: FastifyPluginAsync = async (server) => {
  server.post<{
    Params: {
      id: string;
    };
    Body: z.infer<typeof trackConversionSchema>;
  }>('/experiments/:id/convert', async (request, reply) => {
    try {
      const { id } = request.params;
      const body = trackConversionSchema.parse(request.body);
      
      // Find assignment
      const assignment = await db.query.variantAssignments.findFirst({
        where: and(
          eq(variantAssignments.experimentId, id),
          eq(variantAssignments.sessionId, body.sessionId)
        ),
        with: {
          variant: true,
          experiment: true,
        },
      });
      
      if (!assignment) {
        return reply.status(404).send({
          error: 'No variant assignment found for this session',
          hint: 'User must be assigned to a variant before tracking conversion',
        });
      }
      
      // Check if already converted
      if (assignment.converted) {
        return reply.status(400).send({
          error: 'Conversion already tracked for this session',
          convertedAt: assignment.convertedAt,
        });
      }
      
      // Update assignment with conversion
      await db.update(variantAssignments)
        .set({
          converted: true,
          convertedAt: new Date(),
          conversionValue: body.conversionValue?.toString(),
          metadata: body.metadata || {},
        })
        .where(eq(variantAssignments.id, assignment.id));
      
      // Update variant stats
      const variant = assignment.variant;
      const newConversions = variant.totalConversions + 1;
      const newConversionRate = newConversions / variant.totalAssignments;
      const newRevenue = parseFloat(variant.totalRevenue || '0') + (body.conversionValue || 0);
      const newAvgRevenue = newRevenue / variant.totalAssignments;
      
      await db.update(experimentVariants)
        .set({
          totalConversions: newConversions,
          conversionRate: newConversionRate.toString(),
          totalRevenue: newRevenue.toString(),
          averageRevenuePerUser: newAvgRevenue.toString(),
          updatedAt: new Date(),
        })
        .where(eq(experimentVariants.id, variant.id));
      
      // Publish event
      await publishEvent(TOPICS.CONVERSION_TRACKED, {
        experimentId: id,
        variantId: variant.id,
        variantName: variant.name,
        sessionId: body.sessionId,
        conversionValue: body.conversionValue,
        newConversionRate,
      });
      
      return reply.send({
        message: 'Conversion tracked successfully',
        experiment: {
          id: assignment.experiment.id,
          name: assignment.experiment.name,
        },
        variant: {
          id: variant.id,
          name: variant.name,
          totalConversions: newConversions,
          totalAssignments: variant.totalAssignments,
          conversionRate: newConversionRate,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to track conversion' });
    }
  });
};
