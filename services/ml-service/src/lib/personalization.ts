import { db } from '../db.js';
import { personalizedCtas, ctaInteractions } from '../schema.js';
import { publishEvent, TOPICS } from '../kafka.js';
import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';
import pino from 'pino';
import { nanoid } from 'nanoid';

const logger = pino({ name: 'ml-service:personalization' });

interface PersonalizationContext {
  visitorId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
  utmParams?: Record<string, string>;
  returningVisitor?: boolean;
  previousVisits?: number;
  currentTime?: Date;
}

interface PersonalizedCTAResult {
  text: string;
  url: string;
  style?: Record<string, any>;
  variantId?: string;
  ruleMatched?: string;
  impressionId: string;
}

/**
 * Get personalized CTA for a visitor
 * 
 * Evaluates rules in priority order:
 * 1. Location-based (geo-targeting)
 * 2. Device-based (mobile vs desktop)
 * 3. Time-based (business hours, urgency)
 * 4. Behavior-based (returning visitor, referrer)
 * 5. UTM parameters
 * 
 * Falls back to A/B testing or default CTA
 */
export async function getPersonalizedCTA(
  ctaId: string,
  context: PersonalizationContext
): Promise<PersonalizedCTAResult> {
  const startTime = Date.now();

  try {
    // Load CTA configuration
    const cta = await db.query.personalizedCtas.findFirst({
      where: (table, { eq, and }) => and(
        eq(table.id, ctaId),
        eq(table.isActive, true)
      ),
    });

    if (!cta) {
      throw new Error('CTA not found or inactive');
    }

    // Parse context
    const parsedContext = parseContext(context);

    // Evaluate rules (sorted by priority)
    const sortedRules = [...(cta.rules || [])].sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      if (evaluateRule(rule, parsedContext)) {
        logger.info({ ctaId, ruleId: rule.id }, 'Rule matched');
        
        const impressionId = await trackImpression(cta.id, cta.micrositeId, context, rule.id);
        
        return {
          text: rule.cta.text,
          url: rule.cta.url,
          style: rule.cta.style || cta.defaultStyle,
          variantId: rule.id,
          ruleMatched: rule.id,
          impressionId,
        };
      }
    }

    // No rules matched - use A/B testing if enabled
    if (cta.abTestEnabled && cta.abVariants && cta.abVariants.length > 0) {
      const variant = selectABVariant(cta.abVariants);
      const impressionId = await trackImpression(cta.id, cta.micrositeId, context, variant.id);
      
      return {
        text: variant.text,
        url: variant.url,
        style: variant.style || cta.defaultStyle,
        variantId: variant.id,
        impressionId,
      };
    }

    // Fallback to default CTA
    const impressionId = await trackImpression(cta.id, cta.micrositeId, context);
    
    return {
      text: cta.defaultText,
      url: cta.defaultUrl,
      style: cta.defaultStyle,
      impressionId,
    };

  } catch (error) {
    logger.error(error, 'Failed to get personalized CTA');
    throw error;
  }
}

function parseContext(context: PersonalizationContext) {
  const parsed: any = {
    ...context,
    currentTime: context.currentTime || new Date(),
  };

  // Parse geo-location from IP
  if (context.ip) {
    const geo = geoip.lookup(context.ip);
    if (geo) {
      parsed.location = {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        latitude: geo.ll[0],
        longitude: geo.ll[1],
      };
    }
  }

  // Parse user agent
  if (context.userAgent) {
    const uaParser = new (UAParser as any)(context.userAgent);
    parsed.device = {
      type: uaParser.getDevice().type || 'desktop',
      os: uaParser.getOS().name || 'unknown',
      browser: uaParser.getBrowser().name || 'unknown',
    };
  }

  return parsed;
}

function evaluateRule(rule: any, context: any): boolean {
  // All conditions must be true (AND logic)
  for (const condition of rule.conditions) {
    if (!evaluateCondition(condition, context)) {
      return false;
    }
  }
  return true;
}

function evaluateCondition(condition: any, context: any): boolean {
  const { type, operator, value } = condition;

  let actualValue: any;

  switch (type) {
    case 'location':
      actualValue = context.location?.country || context.location?.region || context.location?.city;
      break;
    case 'device':
      actualValue = context.device?.type;
      break;
    case 'time':
      actualValue = context.currentTime;
      break;
    case 'behavior':
      actualValue = context.returningVisitor ? 'returning' : 'new';
      break;
    case 'referrer':
      actualValue = context.referrer;
      break;
    case 'returning':
      actualValue = context.returningVisitor;
      break;
    case 'utm':
      actualValue = context.utmParams;
      break;
    default:
      return false;
  }

  switch (operator) {
    case 'equals':
      return actualValue === value;
    case 'contains':
      return typeof actualValue === 'string' && actualValue.includes(value);
    case 'starts_with':
      return typeof actualValue === 'string' && actualValue.startsWith(value);
    case 'in':
      return Array.isArray(value) && value.includes(actualValue);
    case 'not_in':
      return Array.isArray(value) && !value.includes(actualValue);
    case 'between':
      if (type === 'time' && Array.isArray(value) && value.length === 2) {
        const hour = actualValue.getHours();
        return hour >= value[0] && hour <= value[1];
      }
      return false;
    default:
      return false;
  }
}

function selectABVariant(variants: any[]): any {
  // Weighted random selection based on variant weights
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;

  for (const variant of variants) {
    random -= variant.weight;
    if (random <= 0) {
      return variant;
    }
  }

  return variants[0]; // Fallback
}

async function trackImpression(
  ctaId: string,
  micrositeId: string,
  context: PersonalizationContext,
  variantId?: string
): Promise<string> {
  const impressionId = nanoid();
  const parsedContext = parseContext(context);

  await db.insert(ctaInteractions).values({
    id: impressionId,
    ctaId,
    micrositeId,
    visitorId: context.visitorId,
    sessionId: context.sessionId,
    eventType: 'impression',
    variantId,
    location: parsedContext.location,
    device: parsedContext.device,
    referrer: context.referrer,
    utmParams: context.utmParams,
  } as any);

  // Update impression count
  await (db as any).execute({
    sql: 'UPDATE personalized_ctas SET impressions = impressions + 1 WHERE id = $1',
    args: [ctaId],
  });

  // Publish event
  await publishEvent(TOPICS.CTA_IMPRESSION, {
    ctaId,
    micrositeId,
    impressionId,
    variantId,
    timestamp: new Date().toISOString(),
  });

  return impressionId;
}

/**
 * Track CTA click
 */
export async function trackCTAClick(impressionId: string, ctaId: string, micrositeId: string) {
  try {
    // Update impression record to mark as clicked
    await db.insert(ctaInteractions).values({
      ctaId,
      micrositeId,
      eventType: 'click',
      timestamp: new Date(),
    } as any);

    // Update click count
    await (db as any).execute({
      sql: 'UPDATE personalized_ctas SET clicks = clicks + 1 WHERE id = $1',
      args: [ctaId],
    });

    // Calculate conversion rate
    await updateConversionRate(ctaId);

    // Publish event
    await publishEvent(TOPICS.CTA_CLICK, {
      ctaId,
      micrositeId,
      impressionId,
      timestamp: new Date().toISOString(),
    });

    logger.info({ ctaId, impressionId }, 'CTA click tracked');

  } catch (error) {
    logger.error(error, 'Failed to track CTA click');
  }
}

async function updateConversionRate(ctaId: string) {
  const cta = await db.query.personalizedCtas.findFirst({
    where: (table, { eq }) => eq(table.id, ctaId),
  });

  if (!cta) return;

  const conversionRate = cta.impressions > 0 
    ? (cta.clicks / cta.impressions) * 100 
    : 0;

  await db.update(personalizedCtas)
    .set({ conversionRate: conversionRate.toFixed(2) } as any)
    .where({ id: ctaId } as any);
}

/**
 * Create personalized CTA configuration
 */
export async function createPersonalizedCTA(data: {
  micrositeId: string;
  userId: string;
  name: string;
  defaultText: string;
  defaultUrl: string;
  rules?: any[];
  abTestEnabled?: boolean;
  abVariants?: any[];
}) {
  const [cta] = await db.insert(personalizedCtas).values({
    micrositeId: data.micrositeId,
    userId: data.userId,
    name: data.name,
    defaultText: data.defaultText,
    defaultUrl: data.defaultUrl,
    rules: data.rules || [],
    abTestEnabled: data.abTestEnabled || false,
    abVariants: data.abVariants || [],
    isActive: true,
  } as any).returning();

  logger.info({ ctaId: cta.id }, 'Personalized CTA created');

  return cta;
}

/**
 * Example: Create location-based CTA
 */
export function createLocationBasedCTA(micrositeId: string, userId: string) {
  return createPersonalizedCTA({
    micrositeId,
    userId,
    name: 'Location-based CTA',
    defaultText: 'Get Started',
    defaultUrl: '/signup',
    rules: [
      {
        id: 'us-customers',
        priority: 10,
        conditions: [
          { type: 'location', operator: 'equals', value: 'US' },
        ],
        cta: {
          text: 'Start Free Trial - US Only Offer! 🇺🇸',
          url: '/signup?region=us',
        },
      },
      {
        id: 'eu-customers',
        priority: 9,
        conditions: [
          { type: 'location', operator: 'in', value: ['GB', 'DE', 'FR', 'ES', 'IT'] },
        ],
        cta: {
          text: 'Start Free Trial - GDPR Compliant 🇪🇺',
          url: '/signup?region=eu',
        },
      },
    ],
  });
}
