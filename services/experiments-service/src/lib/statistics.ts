/**
 * Statistical Analysis Library for A/B Testing
 * 
 * Implements:
 * - Z-test for proportions
 * - Chi-square test
 * - Confidence intervals
 * - P-value calculations
 * - Statistical significance determination
 */

/**
 * Standard normal distribution (Z-score to p-value)
 */
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

/**
 * Calculate Z-score for two proportions
 * Used to compare conversion rates between variants
 */
export function calculateZScore(
  conversions1: number,
  total1: number,
  conversions2: number,
  total2: number
): number {
  const p1 = conversions1 / total1;
  const p2 = conversions2 / total2;
  const pPool = (conversions1 + conversions2) / (total1 + total2);
  
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / total1 + 1 / total2));
  
  if (se === 0) return 0;
  
  return (p1 - p2) / se;
}

/**
 * Calculate p-value from Z-score
 * Two-tailed test
 */
export function calculatePValue(zScore: number): number {
  return 2 * (1 - normalCDF(Math.abs(zScore)));
}

/**
 * Check if result is statistically significant
 */
export function isSignificant(pValue: number, alpha: number = 0.05): boolean {
  return pValue < alpha;
}

/**
 * Calculate confidence interval for a proportion
 */
export function calculateConfidenceInterval(
  conversions: number,
  total: number,
  confidenceLevel: number = 0.95
): { lower: number; upper: number } {
  if (total === 0) {
    return { lower: 0, upper: 0 };
  }
  
  const p = conversions / total;
  const z = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.645;
  const se = Math.sqrt((p * (1 - p)) / total);
  
  return {
    lower: Math.max(0, p - z * se),
    upper: Math.min(1, p + z * se),
  };
}

/**
 * Calculate chi-square statistic
 * Used for multivariate testing
 */
export function calculateChiSquare(observed: number[], expected: number[]): number {
  if (observed.length !== expected.length) {
    throw new Error('Observed and expected arrays must have same length');
  }
  
  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] === 0) continue;
    chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
  }
  
  return chiSquare;
}

/**
 * Calculate degrees of freedom
 */
export function calculateDegreesOfFreedom(numVariants: number): number {
  return numVariants - 1;
}

/**
 * Chi-square critical value lookup
 * Simplified table for common cases
 */
function chiSquareCriticalValue(df: number, alpha: number = 0.05): number {
  const table: Record<number, number> = {
    1: 3.841,
    2: 5.991,
    3: 7.815,
    4: 9.488,
    5: 11.070,
    6: 12.592,
    7: 14.067,
    8: 15.507,
    9: 16.919,
    10: 18.307,
  };
  
  return table[df] || table[10];
}

/**
 * Check if chi-square result is significant
 */
export function isChiSquareSignificant(
  chiSquare: number,
  degreesOfFreedom: number,
  alpha: number = 0.05
): boolean {
  const criticalValue = chiSquareCriticalValue(degreesOfFreedom, alpha);
  return chiSquare > criticalValue;
}

/**
 * Calculate improvement percentage
 */
export function calculateImprovement(baselineRate: number, variantRate: number): number {
  if (baselineRate === 0) return 0;
  return ((variantRate - baselineRate) / baselineRate) * 100;
}

/**
 * Calculate required sample size for experiment
 * Based on desired power and effect size
 */
export function calculateRequiredSampleSize(
  baselineConversionRate: number,
  minimumDetectableEffect: number, // e.g., 0.1 for 10% improvement
  alpha: number = 0.05,
  power: number = 0.8
): number {
  const p1 = baselineConversionRate;
  const p2 = p1 * (1 + minimumDetectableEffect);
  
  const zAlpha = 1.96; // for 95% confidence
  const zBeta = 0.84; // for 80% power
  
  const numerator = Math.pow(zAlpha * Math.sqrt(2 * p1 * (1 - p1)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
  const denominator = Math.pow(p2 - p1, 2);
  
  return Math.ceil(numerator / denominator);
}

/**
 * Determine experiment winner
 * Returns variant ID of winner or null if no clear winner
 */
export interface VariantStats {
  id: string;
  name: string;
  conversions: number;
  total: number;
  conversionRate: number;
  isControl: boolean;
}

export function determineWinner(
  variants: VariantStats[],
  minSampleSize: number,
  confidenceLevel: number = 0.95
): {
  winnerId: string | null;
  winnerName: string | null;
  confidence: number;
  improvement: number;
  isSignificant: boolean;
  reason: string;
} {
  // Check if we have enough data
  const hasEnoughData = variants.every(v => v.total >= minSampleSize);
  if (!hasEnoughData) {
    return {
      winnerId: null,
      winnerName: null,
      confidence: 0,
      improvement: 0,
      isSignificant: false,
      reason: 'Insufficient sample size. Keep running the experiment.',
    };
  }
  
  // Find control variant
  const control = variants.find(v => v.isControl);
  if (!control) {
    return {
      winnerId: null,
      winnerName: null,
      confidence: 0,
      improvement: 0,
      isSignificant: false,
      reason: 'No control variant found.',
    };
  }
  
  // Find best performing variant
  const sortedVariants = [...variants].sort((a, b) => b.conversionRate - a.conversionRate);
  const bestVariant = sortedVariants[0];
  
  // If control is best, no winner
  if (bestVariant.id === control.id) {
    return {
      winnerId: control.id,
      winnerName: control.name,
      confidence: 0,
      improvement: 0,
      isSignificant: false,
      reason: 'Control variant is performing best. No significant improvement found.',
    };
  }
  
  // Calculate statistical significance vs control
  const zScore = calculateZScore(
    bestVariant.conversions,
    bestVariant.total,
    control.conversions,
    control.total
  );
  
  const pValue = calculatePValue(zScore);
  const alpha = 1 - confidenceLevel;
  const significant = isSignificant(pValue, alpha);
  
  const improvement = calculateImprovement(control.conversionRate, bestVariant.conversionRate);
  
  if (significant) {
    return {
      winnerId: bestVariant.id,
      winnerName: bestVariant.name,
      confidence: confidenceLevel,
      improvement,
      isSignificant: true,
      reason: `${bestVariant.name} shows ${improvement.toFixed(2)}% improvement over control with ${(confidenceLevel * 100).toFixed(0)}% confidence.`,
    };
  }
  
  return {
    winnerId: null,
    winnerName: null,
    confidence: 1 - pValue,
    improvement,
    isSignificant: false,
    reason: `Best variant shows ${improvement.toFixed(2)}% improvement, but not statistically significant yet (p-value: ${pValue.toFixed(4)}). Continue running.`,
  };
}

/**
 * Calculate experiment duration estimate
 */
export function estimateExperimentDuration(
  dailyTraffic: number,
  numVariants: number,
  requiredSampleSize: number
): number {
  const trafficPerVariant = dailyTraffic / numVariants;
  const daysRequired = Math.ceil(requiredSampleSize / trafficPerVariant);
  return daysRequired;
}
