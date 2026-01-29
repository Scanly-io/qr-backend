/**
 * Multi-Armed Bandit Algorithms for A/B Testing
 * 
 * Implements:
 * - Thompson Sampling (Bayesian approach)
 * - Upper Confidence Bound (UCB)
 * - Epsilon-Greedy
 * - Bayesian Winner Probability
 * 
 * Benefits over traditional A/B testing:
 * - Dynamically allocates traffic to better-performing variants
 * - Minimizes regret (lost conversions)
 * - Can be used for continuous optimization
 */

/**
 * Variant statistics for bandit algorithms
 */
export interface BanditVariant {
  id: string;
  name: string;
  successes: number; // Conversions
  failures: number;  // Non-conversions
  total: number;
  isControl: boolean;
}

/**
 * Thompson Sampling using Beta distribution
 * 
 * Algorithm:
 * 1. For each variant, sample from Beta(successes + 1, failures + 1)
 * 2. Select the variant with the highest sampled value
 * 
 * This naturally balances exploration and exploitation.
 */
export function thompsonSampling(variants: BanditVariant[]): string {
  let maxSample = -1;
  let selectedVariant = variants[0].id;
  
  for (const variant of variants) {
    // Sample from Beta distribution
    const alpha = variant.successes + 1;
    const beta = variant.failures + 1;
    const sample = sampleBeta(alpha, beta);
    
    if (sample > maxSample) {
      maxSample = sample;
      selectedVariant = variant.id;
    }
  }
  
  return selectedVariant;
}

/**
 * Upper Confidence Bound (UCB1) Algorithm
 * 
 * Formula: UCB = x̄ + sqrt(2 * ln(N) / n)
 * - x̄ = average reward for the arm
 * - N = total number of pulls across all arms
 * - n = number of pulls for this arm
 * 
 * Balances mean reward with uncertainty bonus.
 */
export function ucb1(variants: BanditVariant[]): string {
  const totalPulls = variants.reduce((sum, v) => sum + v.total, 0);
  
  // Ensure each variant is pulled at least once
  for (const variant of variants) {
    if (variant.total === 0) {
      return variant.id;
    }
  }
  
  let maxUCB = -1;
  let selectedVariant = variants[0].id;
  
  for (const variant of variants) {
    const meanReward = variant.successes / variant.total;
    const explorationBonus = Math.sqrt((2 * Math.log(totalPulls)) / variant.total);
    const ucbValue = meanReward + explorationBonus;
    
    if (ucbValue > maxUCB) {
      maxUCB = ucbValue;
      selectedVariant = variant.id;
    }
  }
  
  return selectedVariant;
}

/**
 * Epsilon-Greedy Algorithm
 * 
 * With probability epsilon, explore (random selection)
 * With probability 1-epsilon, exploit (best variant)
 * 
 * @param epsilon - Exploration probability (0 to 1, typically 0.1)
 */
export function epsilonGreedy(variants: BanditVariant[], epsilon: number = 0.1): string {
  // Explore with probability epsilon
  if (Math.random() < epsilon) {
    const randomIndex = Math.floor(Math.random() * variants.length);
    return variants[randomIndex].id;
  }
  
  // Exploit: select variant with highest conversion rate
  let maxRate = -1;
  let selectedVariant = variants[0].id;
  
  for (const variant of variants) {
    const rate = variant.total > 0 ? variant.successes / variant.total : 0;
    if (rate > maxRate) {
      maxRate = rate;
      selectedVariant = variant.id;
    }
  }
  
  return selectedVariant;
}

/**
 * Calculate Bayesian probability that each variant is the winner
 * 
 * Uses Monte Carlo simulation to estimate P(variant_i is best)
 * This is useful for displaying "% chance of winning" to users.
 */
export function calculateWinnerProbabilities(
  variants: BanditVariant[],
  simulations: number = 10000
): Map<string, number> {
  const winCounts = new Map<string, number>();
  variants.forEach(v => winCounts.set(v.id, 0));
  
  for (let i = 0; i < simulations; i++) {
    let maxSample = -1;
    let winner = variants[0].id;
    
    for (const variant of variants) {
      const alpha = variant.successes + 1;
      const beta = variant.failures + 1;
      const sample = sampleBeta(alpha, beta);
      
      if (sample > maxSample) {
        maxSample = sample;
        winner = variant.id;
      }
    }
    
    winCounts.set(winner, (winCounts.get(winner) || 0) + 1);
  }
  
  // Convert counts to probabilities
  const probabilities = new Map<string, number>();
  for (const [id, count] of winCounts) {
    probabilities.set(id, count / simulations);
  }
  
  return probabilities;
}

/**
 * Calculate expected loss (regret) for stopping the experiment now
 * 
 * If we stop now and pick the current best, what's the expected loss
 * compared to if we could know the true best?
 */
export function calculateExpectedLoss(variants: BanditVariant[]): Map<string, number> {
  const winProbs = calculateWinnerProbabilities(variants);
  const losses = new Map<string, number>();
  
  // For each variant, calculate expected loss if we DON'T pick it
  // Loss = sum of (P(other is better) * (other_rate - this_rate))
  for (const variant of variants) {
    const thisRate = variant.total > 0 ? variant.successes / variant.total : 0;
    let loss = 0;
    
    for (const other of variants) {
      if (other.id !== variant.id) {
        const otherRate = other.total > 0 ? other.successes / other.total : 0;
        const probOtherBetter = winProbs.get(other.id) || 0;
        if (otherRate > thisRate) {
          loss += probOtherBetter * (otherRate - thisRate);
        }
      }
    }
    
    losses.set(variant.id, loss);
  }
  
  return losses;
}

/**
 * Determine if experiment should auto-stop
 * 
 * Conditions for auto-stop:
 * 1. Winner probability > threshold (e.g., 95%)
 * 2. Expected loss of stopping < threshold
 * 3. Minimum sample size reached
 */
export function shouldAutoStop(
  variants: BanditVariant[],
  options: {
    minSampleSize?: number;
    winProbabilityThreshold?: number;
    expectedLossThreshold?: number;
  } = {}
): {
  shouldStop: boolean;
  reason: string;
  recommendedWinner: string | null;
  winnerProbability: number;
  expectedLoss: number;
} {
  const {
    minSampleSize = 100,
    winProbabilityThreshold = 0.95,
    expectedLossThreshold = 0.001, // 0.1% expected loss
  } = options;
  
  // Check minimum sample size
  const hasEnoughData = variants.every(v => v.total >= minSampleSize);
  if (!hasEnoughData) {
    return {
      shouldStop: false,
      reason: `Minimum sample size not reached (need ${minSampleSize} per variant)`,
      recommendedWinner: null,
      winnerProbability: 0,
      expectedLoss: 1,
    };
  }
  
  // Calculate probabilities
  const winProbs = calculateWinnerProbabilities(variants);
  const losses = calculateExpectedLoss(variants);
  
  // Find variant with highest win probability
  let maxProb = 0;
  let likelyWinner: string | null = null;
  for (const [id, prob] of winProbs) {
    if (prob > maxProb) {
      maxProb = prob;
      likelyWinner = id;
    }
  }
  
  const expectedLoss = likelyWinner ? losses.get(likelyWinner) || 0 : 1;
  
  // Check if winner probability exceeds threshold
  if (maxProb >= winProbabilityThreshold) {
    return {
      shouldStop: true,
      reason: `Winner has ${(maxProb * 100).toFixed(1)}% probability (threshold: ${(winProbabilityThreshold * 100).toFixed(0)}%)`,
      recommendedWinner: likelyWinner,
      winnerProbability: maxProb,
      expectedLoss,
    };
  }
  
  // Check if expected loss is below threshold
  if (expectedLoss <= expectedLossThreshold) {
    return {
      shouldStop: true,
      reason: `Expected loss is only ${(expectedLoss * 100).toFixed(3)}% (threshold: ${(expectedLossThreshold * 100).toFixed(2)}%)`,
      recommendedWinner: likelyWinner,
      winnerProbability: maxProb,
      expectedLoss,
    };
  }
  
  return {
    shouldStop: false,
    reason: `Winner probability: ${(maxProb * 100).toFixed(1)}%, Expected loss: ${(expectedLoss * 100).toFixed(3)}%`,
    recommendedWinner: likelyWinner,
    winnerProbability: maxProb,
    expectedLoss,
  };
}

/**
 * Calculate optimal traffic allocation
 * 
 * Returns the recommended percentage of traffic for each variant
 * based on their current performance and uncertainty.
 */
export function calculateOptimalAllocation(variants: BanditVariant[]): Map<string, number> {
  const totalPulls = variants.reduce((sum, v) => sum + v.total, 0);
  const allocation = new Map<string, number>();
  
  if (totalPulls === 0) {
    // Equal allocation when no data
    const equalShare = 1 / variants.length;
    variants.forEach(v => allocation.set(v.id, equalShare));
    return allocation;
  }
  
  // Use Thompson Sampling to determine allocation
  // Run many simulations and count how often each variant is selected
  const selections = new Map<string, number>();
  variants.forEach(v => selections.set(v.id, 0));
  
  const simulations = 10000;
  for (let i = 0; i < simulations; i++) {
    const selected = thompsonSampling(variants);
    selections.set(selected, (selections.get(selected) || 0) + 1);
  }
  
  // Convert to percentages
  for (const [id, count] of selections) {
    allocation.set(id, count / simulations);
  }
  
  return allocation;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Sample from Beta distribution using inverse transform sampling
 * Approximation using the Jöhnk algorithm
 */
function sampleBeta(alpha: number, beta: number): number {
  // Use gamma distribution method for accuracy
  const x = sampleGamma(alpha);
  const y = sampleGamma(beta);
  return x / (x + y);
}

/**
 * Sample from Gamma distribution
 * Marsaglia and Tsang's method
 */
function sampleGamma(shape: number): number {
  if (shape < 1) {
    return sampleGamma(shape + 1) * Math.pow(Math.random(), 1 / shape);
  }
  
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  
  while (true) {
    let x: number, v: number;
    do {
      x = gaussianRandom();
      v = 1 + c * x;
    } while (v <= 0);
    
    v = v * v * v;
    const u = Math.random();
    
    if (u < 1 - 0.0331 * x * x * x * x) {
      return d * v;
    }
    
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/**
 * Generate standard normal random number using Box-Muller transform
 */
function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Convert experiment variants to bandit variants
 */
export function experimentToBanditVariants(
  variants: Array<{
    id: string;
    name: string;
    conversions: number;
    total: number;
    isControl: boolean;
  }>
): BanditVariant[] {
  return variants.map(v => ({
    id: v.id,
    name: v.name,
    successes: v.conversions,
    failures: v.total - v.conversions,
    total: v.total,
    isControl: v.isControl,
  }));
}

/**
 * Get bandit algorithm recommendations
 * Returns comprehensive analysis for experiment dashboard
 */
export function getBanditRecommendations(variants: BanditVariant[]): {
  algorithm: 'thompson' | 'ucb' | 'epsilon_greedy';
  nextVariant: string;
  trafficAllocation: Map<string, number>;
  winnerProbabilities: Map<string, number>;
  expectedLosses: Map<string, number>;
  autoStopRecommendation: ReturnType<typeof shouldAutoStop>;
} {
  return {
    algorithm: 'thompson',
    nextVariant: thompsonSampling(variants),
    trafficAllocation: calculateOptimalAllocation(variants),
    winnerProbabilities: calculateWinnerProbabilities(variants),
    expectedLosses: calculateExpectedLoss(variants),
    autoStopRecommendation: shouldAutoStop(variants),
  };
}
