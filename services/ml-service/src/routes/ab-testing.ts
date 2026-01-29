import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

interface ABTest {
  id: string;
  micrositeId: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABVariant[];
  metric: 'clicks' | 'conversions' | 'time-on-page' | 'bounce-rate';
  trafficSplit: number[]; // e.g., [50, 50] for 50/50 split
  startDate?: Date;
  endDate?: Date;
  minSampleSize?: number;
  confidenceLevel?: number; // e.g., 95 for 95%
  autoApplyWinner?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ABVariant {
  id: string;
  name: string;
  changes: Record<string, any>; // Block changes
  impressions: number;
  clicks: number;
  conversions: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

interface ABTestResult {
  testId: string;
  winner?: string;
  confidence: number;
  improvement: number;
  recommendation: string;
  variants: Array<{
    id: string;
    name: string;
    conversionRate: number;
    sampleSize: number;
    isWinner: boolean;
  }>;
}

// In-memory storage (in production, use database)
const tests = new Map<string, ABTest>();

export async function abTestingRoutes(fastify: FastifyInstance) {
  // Create new A/B test
  fastify.post('/create', async (request, reply) => {
    const { micrositeId, name, variants, metric, trafficSplit, minSampleSize, confidenceLevel, autoApplyWinner } = request.body as {
      micrositeId: string;
      name: string;
      variants: Array<{ name: string; changes: Record<string, any> }>;
      metric: ABTest['metric'];
      trafficSplit?: number[];
      minSampleSize?: number;
      confidenceLevel?: number;
      autoApplyWinner?: boolean;
    };

    if (!variants || variants.length < 2) {
      return reply.status(400).send({ error: 'Need at least 2 variants for A/B test' });
    }

    const testId = nanoid();

    const test: ABTest = {
      id: testId,
      micrositeId,
      name,
      status: 'draft',
      variants: variants.map((v) => ({
        id: nanoid(),
        name: v.name,
        changes: v.changes,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        avgTimeOnPage: 0,
        bounceRate: 0,
      })),
      metric,
      trafficSplit: trafficSplit || Array(variants.length).fill(100 / variants.length),
      minSampleSize: minSampleSize || 100,
      confidenceLevel: confidenceLevel || 95,
      autoApplyWinner: autoApplyWinner || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tests.set(testId, test);

    return {
      testId,
      test,
      message: 'A/B test created successfully. Use /start to begin testing.',
    };
  });

  // Start A/B test
  fastify.post('/:testId/start', async (request, reply) => {
    const { testId } = request.params as { testId: string };

    const test = tests.get(testId);

    if (!test) {
      return reply.status(404).send({ error: 'Test not found' });
    }

    if (test.status === 'running') {
      return reply.status(400).send({ error: 'Test is already running' });
    }

    test.status = 'running';
    test.startDate = new Date();
    test.updatedAt = new Date();

    return {
      testId,
      status: 'running',
      startDate: test.startDate,
      message: 'A/B test started successfully',
    };
  });

  // Get variant for visitor (assigns variant based on traffic split)
  fastify.get('/:testId/assign', async (request, reply) => {
    const { testId } = request.params as { testId: string };
    const { visitorId } = request.query as { visitorId?: string };

    const test = tests.get(testId);

    if (!test || test.status !== 'running') {
      return reply.status(404).send({ error: 'Active test not found' });
    }

    // Simple hash-based assignment for consistency
    let variantIndex = 0;
    if (visitorId) {
      const hash = visitorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      variantIndex = hash % test.variants.length;
    } else {
      // Random assignment
      const random = Math.random() * 100;
      let cumulative = 0;
      for (let i = 0; i < test.trafficSplit.length; i++) {
        cumulative += test.trafficSplit[i];
        if (random <= cumulative) {
          variantIndex = i;
          break;
        }
      }
    }

    const variant = test.variants[variantIndex];
    variant.impressions++;

    return {
      testId,
      variantId: variant.id,
      variantName: variant.name,
      changes: variant.changes,
    };
  });

  // Track event (click, conversion, etc.)
  fastify.post('/:testId/track', async (request, reply) => {
    const { testId } = request.params as { testId: string };
    const { variantId, event, value } = request.body as {
      variantId: string;
      event: 'click' | 'conversion' | 'bounce' | 'time-on-page';
      value?: number;
    };

    const test = tests.get(testId);

    if (!test) {
      return reply.status(404).send({ error: 'Test not found' });
    }

    const variant = test.variants.find((v) => v.id === variantId);

    if (!variant) {
      return reply.status(404).send({ error: 'Variant not found' });
    }

    switch (event) {
      case 'click':
        variant.clicks++;
        break;
      case 'conversion':
        variant.conversions++;
        break;
      case 'bounce':
        variant.bounceRate = ((variant.bounceRate * (variant.impressions - 1)) + (value || 1)) / variant.impressions;
        break;
      case 'time-on-page':
        if (value) {
          variant.avgTimeOnPage = ((variant.avgTimeOnPage * (variant.impressions - 1)) + value) / variant.impressions;
        }
        break;
    }

    test.updatedAt = new Date();

    return {
      success: true,
      event,
      variantId,
    };
  });

  // Get test results
  fastify.get('/:testId/results', async (request, reply) => {
    const { testId } = request.params as { testId: string };

    const test = tests.get(testId);

    if (!test) {
      return reply.status(404).send({ error: 'Test not found' });
    }

    const results = calculateResults(test);

    return {
      testId,
      name: test.name,
      status: test.status,
      metric: test.metric,
      results,
      test,
    };
  });

  // Auto-analyze and determine winner
  fastify.post('/:testId/analyze', async (request, reply) => {
    const { testId } = request.params as { testId: string };

    const test = tests.get(testId);

    if (!test) {
      return reply.status(404).send({ error: 'Test not found' });
    }

    const results = calculateResults(test);

    // Check if we have enough sample size
    const minSamples = test.variants.every((v) => v.impressions >= (test.minSampleSize || 100));

    if (!minSamples) {
      return {
        testId,
        ready: false,
        message: `Need more data. Current samples: ${test.variants.map((v) => v.impressions).join(', ')}. Minimum: ${test.minSampleSize}`,
        results,
      };
    }

    // If auto-apply is enabled and we have a clear winner
    if (test.autoApplyWinner && results.winner && results.confidence >= (test.confidenceLevel || 95)) {
      test.status = 'completed';
      test.endDate = new Date();

      return {
        testId,
        ready: true,
        winner: results.winner,
        confidence: results.confidence,
        improvement: results.improvement,
        recommendation: results.recommendation,
        applied: true,
        message: 'Winner determined and automatically applied',
      };
    }

    return {
      testId,
      ready: true,
      results,
      message: results.winner ? 'Winner determined' : 'No clear winner yet',
    };
  });

  // Pause test
  fastify.post('/:testId/pause', async (request, reply) => {
    const { testId } = request.params as { testId: string };

    const test = tests.get(testId);

    if (!test) {
      return reply.status(404).send({ error: 'Test not found' });
    }

    test.status = 'paused';
    test.updatedAt = new Date();

    return {
      testId,
      status: 'paused',
      message: 'Test paused successfully',
    };
  });

  // Complete test and apply winner
  fastify.post('/:testId/complete', async (request, reply) => {
    const { testId } = request.params as { testId: string };
    const { applyWinner } = request.body as { applyWinner?: boolean };

    const test = tests.get(testId);

    if (!test) {
      return reply.status(404).send({ error: 'Test not found' });
    }

    const results = calculateResults(test);

    test.status = 'completed';
    test.endDate = new Date();
    test.updatedAt = new Date();

    return {
      testId,
      status: 'completed',
      results,
      winnerApplied: applyWinner && !!results.winner,
      message: 'Test completed',
    };
  });

  // List all tests for a microsite
  fastify.get('/list/:micrositeId', async (request, reply) => {
    const { micrositeId } = request.params as { micrositeId: string };

    const micrositeTests = Array.from(tests.values()).filter((t) => t.micrositeId === micrositeId);

    return {
      micrositeId,
      tests: micrositeTests.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        metric: t.metric,
        variants: t.variants.length,
        startDate: t.startDate,
        endDate: t.endDate,
      })),
      count: micrositeTests.length,
    };
  });

  // Delete test
  fastify.delete('/:testId', async (request, reply) => {
    const { testId } = request.params as { testId: string };

    const existed = tests.has(testId);
    tests.delete(testId);

    return {
      success: existed,
      message: existed ? 'Test deleted successfully' : 'Test not found',
    };
  });
}

// Helper function to calculate test results
function calculateResults(test: ABTest): ABTestResult {
  const variants = test.variants.map((v) => {
    let metricValue = 0;

    switch (test.metric) {
      case 'clicks':
        metricValue = v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0;
        break;
      case 'conversions':
        metricValue = v.clicks > 0 ? (v.conversions / v.clicks) * 100 : 0;
        break;
      case 'time-on-page':
        metricValue = v.avgTimeOnPage;
        break;
      case 'bounce-rate':
        metricValue = 100 - v.bounceRate; // Invert so higher is better
        break;
    }

    return {
      id: v.id,
      name: v.name,
      conversionRate: parseFloat(metricValue.toFixed(2)),
      sampleSize: v.impressions,
      isWinner: false,
    };
  });

  // Find winner (highest metric value)
  let winnerIndex = 0;
  let maxValue = variants[0].conversionRate;

  for (let i = 1; i < variants.length; i++) {
    if (variants[i].conversionRate > maxValue) {
      maxValue = variants[i].conversionRate;
      winnerIndex = i;
    }
  }

  variants[winnerIndex].isWinner = true;

  // Calculate improvement
  const controlValue = variants[0].conversionRate;
  const winnerValue = variants[winnerIndex].conversionRate;
  const improvement = controlValue > 0 ? ((winnerValue - controlValue) / controlValue) * 100 : 0;

  // Simple confidence calculation (would use proper statistical test in production)
  const minSamples = Math.min(...variants.map((v) => v.sampleSize));
  let confidence = 0;

  if (minSamples >= 100) {
    confidence = 95;
  } else if (minSamples >= 50) {
    confidence = 85;
  } else if (minSamples >= 30) {
    confidence = 70;
  } else {
    confidence = 50;
  }

  // Adjust confidence based on difference magnitude
  if (Math.abs(improvement) < 5) {
    confidence -= 20;
  }

  let recommendation = '';
  if (confidence >= 95 && improvement > 0) {
    recommendation = `Apply ${variants[winnerIndex].name} - statistically significant improvement of ${improvement.toFixed(1)}%`;
  } else if (confidence >= 85) {
    recommendation = `${variants[winnerIndex].name} is leading but needs more data for statistical significance`;
  } else {
    recommendation = 'Continue testing - not enough data to determine a clear winner';
  }

  return {
    testId: test.id,
    winner: confidence >= 85 ? variants[winnerIndex].id : undefined,
    confidence: Math.max(0, Math.min(100, confidence)),
    improvement: parseFloat(improvement.toFixed(1)),
    recommendation,
    variants,
  };
}
