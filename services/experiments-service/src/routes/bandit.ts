import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { experiments, experimentVariants, variantAssignments } from '../schema';
import { eq, and } from 'drizzle-orm';
import { publishEvent } from '@qr/common';
import { TOPICS } from '../topics';
import {
  thompsonSampling,
  ucb1,
  epsilonGreedy,
  calculateWinnerProbabilities,
  calculateExpectedLoss,
  calculateOptimalAllocation,
  shouldAutoStop,
  getBanditRecommendations,
  experimentToBanditVariants,
  type BanditVariant,
} from '../lib/bandit';

const banditAssignSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().uuid().optional(),
  algorithm: z.enum(['thompson', 'ucb', 'epsilon_greedy']).default('thompson'),
  epsilon: z.number().min(0).max(1).optional().default(0.1),
});

const autoStopSchema = z.object({
  minSampleSize: z.number().min(10).optional().default(100),
  winProbabilityThreshold: z.number().min(0.5).max(0.99).optional().default(0.95),
  expectedLossThreshold: z.number().min(0).max(0.1).optional().default(0.001),
});

/**
 * ML-Enhanced Bandit Routes for Experiments
 * 
 * Provides:
 * - Thompson Sampling assignment
 * - UCB1 assignment
 * - Epsilon-Greedy assignment
 * - Winner probability calculations
 * - Auto-stop recommendations
 * - Optimal traffic allocation
 */
export const banditRoutes: FastifyPluginAsync = async (server) => {
  
  /**
   * Assign variant using multi-armed bandit algorithm
   * POST /experiments/:id/bandit/assign
   */
  server.post<{
    Params: { id: string };
    Body: z.infer<typeof banditAssignSchema>;
  }>('/experiments/:id/bandit/assign', async (request, reply) => {
    try {
      const { id } = request.params;
      const { sessionId, userId, algorithm, epsilon } = banditAssignSchema.parse(request.body);
      
      // Get experiment with variants and their stats
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
      
      // Check for existing assignment
      const existingAssignment = await db.query.variantAssignments.findFirst({
        where: and(
          eq(variantAssignments.experimentId, id),
          eq(variantAssignments.sessionId, sessionId)
        ),
        with: { variant: true },
      });
      
      if (existingAssignment) {
        return reply.send({
          assignment: existingAssignment,
          variant: existingAssignment.variant,
          message: 'Existing assignment returned',
          algorithm: 'cached',
        });
      }
      
      // Convert to bandit variants
      const banditVariants: BanditVariant[] = experiment.variants.map(v => ({
        id: v.id,
        name: v.name,
        successes: v.totalConversions,
        failures: v.totalAssignments - v.totalConversions,
        total: v.totalAssignments,
        isControl: v.isControl,
      }));
      
      // Select variant using bandit algorithm
      let selectedVariantId: string;
      switch (algorithm) {
        case 'thompson':
          selectedVariantId = thompsonSampling(banditVariants);
          break;
        case 'ucb':
          selectedVariantId = ucb1(banditVariants);
          break;
        case 'epsilon_greedy':
          selectedVariantId = epsilonGreedy(banditVariants, epsilon);
          break;
        default:
          selectedVariantId = thompsonSampling(banditVariants);
      }
      
      const selectedVariant = experiment.variants.find(v => v.id === selectedVariantId);
      if (!selectedVariant) {
        return reply.status(500).send({ error: 'Failed to select variant' });
      }
      
      // Create assignment
      const [assignment] = await db.insert(variantAssignments).values({
        experimentId: id,
        variantId: selectedVariant.id,
        userId,
        sessionId,
      }).returning();
      
      // Update variant assignment count
      await db.update(experimentVariants)
        .set({
          totalAssignments: selectedVariant.totalAssignments + 1,
          updatedAt: new Date(),
        })
        .where(eq(experimentVariants.id, selectedVariant.id));
      
      // Publish event
      await publishEvent(TOPICS.VARIANT_ASSIGNED, {
        experimentId: id,
        variantId: selectedVariant.id,
        variantName: selectedVariant.name,
        sessionId,
        userId,
        algorithm,
      });
      
      return reply.status(201).send({
        assignment,
        variant: selectedVariant,
        targetUrl: selectedVariant.targetUrl,
        algorithm,
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to assign variant' });
    }
  });
  
  /**
   * Get ML recommendations for experiment
   * GET /experiments/:id/bandit/recommendations
   */
  server.get<{
    Params: { id: string };
  }>('/experiments/:id/bandit/recommendations', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const experiment = await db.query.experiments.findFirst({
        where: eq(experiments.id, id),
        with: { variants: true },
      });
      
      if (!experiment) {
        return reply.status(404).send({ error: 'Experiment not found' });
      }
      
      // Convert to bandit variants
      const banditVariants = experimentToBanditVariants(
        experiment.variants.map(v => ({
          id: v.id,
          name: v.name,
          conversions: v.totalConversions,
          total: v.totalAssignments,
          isControl: v.isControl,
        }))
      );
      
      const recommendations = getBanditRecommendations(banditVariants);
      
      // Convert Maps to objects for JSON response
      return reply.send({
        experimentId: id,
        experimentStatus: experiment.status,
        recommendations: {
          algorithm: recommendations.algorithm,
          nextVariant: recommendations.nextVariant,
          trafficAllocation: Object.fromEntries(recommendations.trafficAllocation),
          winnerProbabilities: Object.fromEntries(recommendations.winnerProbabilities),
          expectedLosses: Object.fromEntries(recommendations.expectedLosses),
          autoStop: recommendations.autoStopRecommendation,
        },
        variants: experiment.variants.map(v => ({
          id: v.id,
          name: v.name,
          isControl: v.isControl,
          totalAssignments: v.totalAssignments,
          totalConversions: v.totalConversions,
          conversionRate: v.totalAssignments > 0 
            ? (v.totalConversions / v.totalAssignments * 100).toFixed(2) + '%'
            : '0%',
          winProbability: ((recommendations.winnerProbabilities.get(v.id) || 0) * 100).toFixed(1) + '%',
          recommendedTraffic: ((recommendations.trafficAllocation.get(v.id) || 0) * 100).toFixed(1) + '%',
        })),
      });
      
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to get recommendations' });
    }
  });
  
  /**
   * Check if experiment should auto-stop
   * POST /experiments/:id/bandit/auto-stop-check
   */
  server.post<{
    Params: { id: string };
    Body: z.infer<typeof autoStopSchema>;
  }>('/experiments/:id/bandit/auto-stop-check', async (request, reply) => {
    try {
      const { id } = request.params;
      const options = autoStopSchema.parse(request.body);
      
      const experiment = await db.query.experiments.findFirst({
        where: eq(experiments.id, id),
        with: { variants: true },
      });
      
      if (!experiment) {
        return reply.status(404).send({ error: 'Experiment not found' });
      }
      
      const banditVariants = experimentToBanditVariants(
        experiment.variants.map(v => ({
          id: v.id,
          name: v.name,
          conversions: v.totalConversions,
          total: v.totalAssignments,
          isControl: v.isControl,
        }))
      );
      
      const result = shouldAutoStop(banditVariants, options);
      
      // If should stop and experiment is still running, optionally stop it
      const shouldStopExperiment = result.shouldStop && experiment.status === 'active';
      
      return reply.send({
        experimentId: id,
        currentStatus: experiment.status,
        ...result,
        actionRequired: shouldStopExperiment,
        recommendation: shouldStopExperiment
          ? `Experiment can be stopped. Recommended winner: ${result.recommendedWinner}`
          : result.reason,
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to check auto-stop' });
    }
  });
  
  /**
   * Get winner probabilities for each variant
   * GET /experiments/:id/bandit/probabilities
   */
  server.get<{
    Params: { id: string };
  }>('/experiments/:id/bandit/probabilities', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const experiment = await db.query.experiments.findFirst({
        where: eq(experiments.id, id),
        with: { variants: true },
      });
      
      if (!experiment) {
        return reply.status(404).send({ error: 'Experiment not found' });
      }
      
      const banditVariants = experimentToBanditVariants(
        experiment.variants.map(v => ({
          id: v.id,
          name: v.name,
          conversions: v.totalConversions,
          total: v.totalAssignments,
          isControl: v.isControl,
        }))
      );
      
      const probabilities = calculateWinnerProbabilities(banditVariants);
      const losses = calculateExpectedLoss(banditVariants);
      
      // Find most likely winner
      let maxProb = 0;
      let likelyWinner: string | null = null;
      for (const [id, prob] of probabilities) {
        if (prob > maxProb) {
          maxProb = prob;
          likelyWinner = id;
        }
      }
      
      const likelyWinnerVariant = experiment.variants.find(v => v.id === likelyWinner);
      
      return reply.send({
        experimentId: id,
        probabilities: experiment.variants.map(v => ({
          variantId: v.id,
          variantName: v.name,
          isControl: v.isControl,
          probability: probabilities.get(v.id) || 0,
          probabilityPercent: ((probabilities.get(v.id) || 0) * 100).toFixed(2) + '%',
          expectedLoss: losses.get(v.id) || 0,
          expectedLossPercent: ((losses.get(v.id) || 0) * 100).toFixed(4) + '%',
        })),
        likelyWinner: likelyWinnerVariant ? {
          id: likelyWinnerVariant.id,
          name: likelyWinnerVariant.name,
          probability: maxProb,
          probabilityPercent: (maxProb * 100).toFixed(2) + '%',
        } : null,
        confidence: maxProb >= 0.95 ? 'high' : maxProb >= 0.8 ? 'medium' : 'low',
      });
      
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to calculate probabilities' });
    }
  });
  
  /**
   * Get optimal traffic allocation
   * GET /experiments/:id/bandit/allocation
   */
  server.get<{
    Params: { id: string };
  }>('/experiments/:id/bandit/allocation', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const experiment = await db.query.experiments.findFirst({
        where: eq(experiments.id, id),
        with: { variants: true },
      });
      
      if (!experiment) {
        return reply.status(404).send({ error: 'Experiment not found' });
      }
      
      const banditVariants = experimentToBanditVariants(
        experiment.variants.map(v => ({
          id: v.id,
          name: v.name,
          conversions: v.totalConversions,
          total: v.totalAssignments,
          isControl: v.isControl,
        }))
      );
      
      const allocation = calculateOptimalAllocation(banditVariants);
      
      return reply.send({
        experimentId: id,
        allocation: experiment.variants.map(v => ({
          variantId: v.id,
          variantName: v.name,
          isControl: v.isControl,
          currentTrafficWeight: v.trafficWeight,
          recommendedAllocation: allocation.get(v.id) || 0,
          recommendedPercent: ((allocation.get(v.id) || 0) * 100).toFixed(1) + '%',
          currentStats: {
            assignments: v.totalAssignments,
            conversions: v.totalConversions,
            conversionRate: v.totalAssignments > 0 
              ? (v.totalConversions / v.totalAssignments * 100).toFixed(2) + '%'
              : '0%',
          },
        })),
        note: 'Allocation is based on Thompson Sampling and balances exploration (trying underexplored variants) with exploitation (favoring better performers).',
      });
      
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to calculate allocation' });
    }
  });
};
