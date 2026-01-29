import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { experiments, experimentResults } from '../schema';
import { eq, and } from 'drizzle-orm';
import {
  calculateZScore,
  calculatePValue,
  calculateConfidenceInterval,
  calculateImprovement,
  determineWinner,
  type VariantStats,
} from '../lib/statistics';
import { publishEvent, TOPICS } from '../kafka';

/**
 * Analyze experiment and determine winner
 */
export const analyzeExperimentRoute: FastifyPluginAsync = async (server) => {
  server.post<{
    Params: {
      id: string;
    };
  }>('/experiments/:id/analyze', async (request, reply) => {
    try {
      const userId = request.headers['x-user-id'] as string;
      
      if (!userId) {
        return reply.status(401).send({ error: 'User ID required in headers' });
      }
      
      const { id } = request.params;
      
      // Get experiment with variants
      const experiment = await db.query.experiments.findFirst({
        where: and(
          eq(experiments.id, id),
          eq(experiments.userId, userId)
        ),
        with: {
          variants: true,
        },
      });
      
      if (!experiment) {
        return reply.status(404).send({ error: 'Experiment not found' });
      }
      
      if (experiment.status !== 'active' && experiment.status !== 'completed') {
        return reply.status(400).send({ error: 'Can only analyze active or completed experiments' });
      }
      
      // Prepare variant stats for analysis
      const variantStats: VariantStats[] = experiment.variants.map(v => ({
        id: v.id,
        name: v.name,
        conversions: v.totalConversions,
        total: v.totalAssignments,
        conversionRate: parseFloat(v.conversionRate || '0'),
        isControl: v.isControl,
      }));
      
      // Determine winner
      const winnerAnalysis = determineWinner(
        variantStats,
        experiment.minSampleSize,
        parseFloat(experiment.confidenceLevel)
      );
      
      // Calculate detailed stats for each variant
      const variantBreakdown = experiment.variants.map(v => {
        const ci = calculateConfidenceInterval(
          v.totalConversions,
          v.totalAssignments,
          parseFloat(experiment.confidenceLevel)
        );
        
        const control = experiment.variants.find(variant => variant.isControl);
        const controlRate = control ? parseFloat(control.conversionRate || '0') : 0;
        const improvement = calculateImprovement(controlRate, parseFloat(v.conversionRate || '0'));
        
        return {
          variantId: v.id,
          variantName: v.name,
          isControl: v.isControl,
          participants: v.totalAssignments,
          conversions: v.totalConversions,
          conversionRate: parseFloat(v.conversionRate || '0'),
          revenue: parseFloat(v.totalRevenue || '0'),
          confidenceInterval: ci,
          improvementOverControl: v.isControl ? 0 : improvement,
        };
      });
      
      // Generate insights
      const insights = generateInsights(experiment, variantBreakdown, winnerAnalysis);
      
      // Calculate overall stats
      const totalParticipants = experiment.variants.reduce((sum, v) => sum + v.totalAssignments, 0);
      const totalConversions = experiment.variants.reduce((sum, v) => sum + v.totalConversions, 0);
      const totalRevenue = experiment.variants.reduce((sum, v) => sum + parseFloat(v.totalRevenue || '0'), 0);
      const overallConversionRate = totalParticipants > 0 ? totalConversions / totalParticipants : 0;
      
      // Save or update results
      const existingResult = await db.query.experimentResults.findFirst({
        where: eq(experimentResults.experimentId, id),
      });
      
      const resultData = {
        experimentId: id,
        totalParticipants,
        totalConversions,
        overallConversionRate: overallConversionRate.toString(),
        winnerVariantId: winnerAnalysis.winnerId,
        winnerConfidence: winnerAnalysis.confidence.toString(),
        improvementOverControl: winnerAnalysis.improvement.toString(),
        statisticalSignificance: winnerAnalysis.isSignificant,
        pValue: winnerAnalysis.isSignificant ? '0.05' : '1',
        totalRevenue: totalRevenue.toString(),
        revenuePerParticipant: (totalRevenue / totalParticipants).toString(),
        variantBreakdown,
        insights,
        analysisCompletedAt: new Date(),
        updatedAt: new Date(),
      };
      
      if (existingResult) {
        await db.update(experimentResults)
          .set(resultData)
          .where(eq(experimentResults.id, existingResult.id));
      } else {
        await db.insert(experimentResults).values({
          ...resultData,
          analysisStartedAt: new Date(),
        });
      }
      
      // If winner found and auto-select enabled, complete experiment
      if (winnerAnalysis.isSignificant && experiment.autoSelectWinner && experiment.status === 'active') {
        await db.update(experiments)
          .set({
            status: 'completed',
            winnerVariantId: winnerAnalysis.winnerId,
            endedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(experiments.id, id));
        
        // Publish winner event
        await publishEvent(TOPICS.WINNER_DECLARED, {
          experimentId: id,
          winnerId: winnerAnalysis.winnerId,
          winnerName: winnerAnalysis.winnerName,
          improvement: winnerAnalysis.improvement,
          confidence: winnerAnalysis.confidence,
        });
        
        await publishEvent(TOPICS.EXPERIMENT_COMPLETED, {
          experimentId: id,
          userId,
          name: experiment.name,
          status: 'completed',
          winnerId: winnerAnalysis.winnerId,
        });
      }
      
      return reply.send({
        analysis: {
          experimentId: id,
          experimentName: experiment.name,
          status: experiment.status,
          ...winnerAnalysis,
          variantBreakdown,
          insights,
          totalParticipants,
          totalConversions,
          overallConversionRate,
          totalRevenue,
        },
      });
    } catch (error) {
      server.log.error(error);
      return reply.status(500).send({ error: 'Failed to analyze experiment' });
    }
  });
};

/**
 * Generate actionable insights from analysis
 */
function generateInsights(experiment: any, variantBreakdown: any[], winnerAnalysis: any) {
  const insights: Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'success';
  }> = [];
  
  // Check sample size
  const minSampleSize = experiment.minSampleSize;
  const lowSampleVariants = variantBreakdown.filter(v => v.participants < minSampleSize);
  
  if (lowSampleVariants.length > 0) {
    insights.push({
      type: 'sample_size',
      message: `${lowSampleVariants.length} variant(s) have fewer than ${minSampleSize} participants. Continue running for more reliable results.`,
      severity: 'warning',
    });
  }
  
  // Check for clear winner
  if (winnerAnalysis.isSignificant) {
    insights.push({
      type: 'winner_found',
      message: winnerAnalysis.reason,
      severity: 'success',
    });
  } else {
    insights.push({
      type: 'no_winner',
      message: winnerAnalysis.reason,
      severity: 'info',
    });
  }
  
  // Check for high-performing variants
  const bestVariant = variantBreakdown.reduce((best, v) => 
    v.conversionRate > best.conversionRate ? v : best
  , variantBreakdown[0]);
  
  if (bestVariant.improvementOverControl > 20) {
    insights.push({
      type: 'high_performance',
      message: `${bestVariant.variantName} shows ${bestVariant.improvementOverControl.toFixed(1)}% improvement - excellent results!`,
      severity: 'success',
    });
  }
  
  // Check for underperforming variants
  const poorVariants = variantBreakdown.filter(v => 
    !v.isControl && v.improvementOverControl < -10
  );
  
  if (poorVariants.length > 0) {
    insights.push({
      type: 'underperformance',
      message: `${poorVariants.length} variant(s) performing significantly worse than control. Consider stopping these variants.`,
      severity: 'warning',
    });
  }
  
  // Check experiment duration
  if (experiment.startedAt) {
    const daysRunning = Math.floor((Date.now() - new Date(experiment.startedAt).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRunning > 30) {
      insights.push({
        type: 'duration',
        message: `Experiment has been running for ${daysRunning} days. Consider making a decision or adjusting parameters.`,
        severity: 'info',
      });
    }
  }
  
  return insights;
}
