import Mixpanel from 'mixpanel';

let mixpanel: Mixpanel.Mixpanel | null = null;

/**
 * Initialize Mixpanel for backend services
 */
export function initializeMixpanel(token?: string): Mixpanel.Mixpanel | null {
  const mixpanelToken = token || process.env.MIXPANEL_TOKEN;
  
  if (!mixpanelToken) {
    console.warn('⚠️  Mixpanel token not found. Analytics disabled.');
    return null;
  }
  
  if (!mixpanel) {
    mixpanel = Mixpanel.init(mixpanelToken, {
      debug: process.env.NODE_ENV !== 'production',
      protocol: 'https',
    });
    console.log('✅ Mixpanel initialized');
  }
  
  return mixpanel;
}

/**
 * Get Mixpanel instance
 */
export function getMixpanel(): Mixpanel.Mixpanel | null {
  return mixpanel;
}

/**
 * Track an event in Mixpanel
 * 
 * @param eventName - Name of the event (e.g., 'qr_created', 'signup_completed')
 * @param userId - User ID or QR ID (distinct_id)
 * @param properties - Event properties
 */
export function trackEvent(
  eventName: string,
  userId: string,
  properties: Record<string, any> = {}
): void {
  if (!mixpanel) {
    console.warn('Mixpanel not initialized. Skipping event:', eventName);
    return;
  }
  
  try {
    mixpanel.track(eventName, {
      distinct_id: userId,
      time: Date.now(),
      timestamp: new Date().toISOString(),
      ...properties,
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 Mixpanel event: ${eventName}`, { userId, ...properties });
    }
  } catch (error) {
    console.error('Mixpanel track error:', error);
  }
}

/**
 * Identify user and set user properties
 * 
 * @param userId - User ID
 * @param properties - User properties (email, name, plan, etc.)
 */
export function identifyUser(
  userId: string,
  properties: Record<string, any> = {}
): void {
  if (!mixpanel) return;
  
  try {
    mixpanel.people.set(userId, {
      $last_seen: new Date().toISOString(),
      ...properties,
    });
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`👤 Mixpanel identify: ${userId}`, properties);
    }
  } catch (error) {
    console.error('Mixpanel identify error:', error);
  }
}

/**
 * Increment a user property
 * 
 * @param userId - User ID
 * @param property - Property to increment (e.g., 'total_qrs_created')
 * @param amount - Amount to increment by (default: 1)
 */
export function incrementUserProperty(
  userId: string,
  property: string,
  amount: number = 1
): void {
  if (!mixpanel) return;
  
  try {
    mixpanel.people.increment(userId, property, amount);
  } catch (error) {
    console.error('Mixpanel increment error:', error);
  }
}

/**
 * Track revenue event
 * 
 * @param userId - User ID
 * @param amount - Revenue amount in USD
 * @param properties - Additional properties (product_id, plan, etc.)
 */
export function trackRevenue(
  userId: string,
  amount: number,
  properties: Record<string, any> = {}
): void {
  if (!mixpanel) return;
  
  try {
    // Track charge for user
    mixpanel.people.track_charge(userId, amount, {
      $time: new Date().toISOString(),
      ...properties,
    });
    
    // Also track as event for reporting
    trackEvent('revenue', userId, {
      amount,
      currency: 'USD',
      ...properties,
    });
    
    console.log(`💰 Revenue tracked: $${amount} for user ${userId}`);
  } catch (error) {
    console.error('Mixpanel revenue tracking error:', error);
  }
}

/**
 * Set user property once (won't overwrite if already set)
 * 
 * @param userId - User ID
 * @param properties - Properties to set once
 */
export function setUserPropertyOnce(
  userId: string,
  properties: Record<string, any>
): void {
  if (!mixpanel) return;
  
  try {
    mixpanel.people.set_once(userId, properties);
  } catch (error) {
    console.error('Mixpanel set_once error:', error);
  }
}

export { mixpanel };
