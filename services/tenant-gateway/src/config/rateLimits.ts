/**
 * Rate Limiting Configuration for Free Tier
 * 
 * Simple configuration for initial free launch
 * Can be expanded later for paid tiers
 */

export const RATE_LIMITS = {
  // Global gateway protection (per IP)
  GATEWAY: {
    max: 100,           // 100 requests
    timeWindow: 60000,  // per 1 minute (in ms)
    message: 'Too many requests, please try again later',
  },

  // Authentication endpoints (stricter limits)
  AUTH: {
    LOGIN: {
      max: 5,           // 5 attempts
      timeWindow: 900000, // per 15 minutes
      message: 'Too many login attempts, please try again in 15 minutes',
    },
    SIGNUP: {
      max: 3,           // 3 attempts
      timeWindow: 3600000, // per 1 hour
      message: 'Too many signup attempts, please try again later',
    },
    PASSWORD_RESET: {
      max: 3,           // 3 requests
      timeWindow: 3600000, // per 1 hour
      message: 'Too many password reset requests, please try again later',
    },
  },

  // Business service limits
  QR_SERVICE: {
    CREATE: {
      max: 10,          // 10 QR codes
      timeWindow: 86400000, // per 1 day
      message: 'Daily QR code limit reached (10/day for free users)',
    },
    SCAN: {
      max: 1000,        // 1000 scans
      timeWindow: 3600000, // per 1 hour
      message: 'Too many QR scans from your IP, please try again later',
    },
  },

  MICROSITE_SERVICE: {
    LEAD_SUBMISSION: {
      max: 5,           // 5 submissions
      timeWindow: 3600000, // per 1 hour
      message: 'Too many form submissions, please try again later',
    },
  },
} as const;

/**
 * Redis key generator for rate limiting
 * Creates unique keys based on endpoint and identifier (IP/userId)
 */
export function getRateLimitKey(endpoint: string, identifier: string): string {
  return `rate-limit:${endpoint}:${identifier}`;
}

/**
 * Get rate limit config by route
 * Used by services to apply specific limits
 */
export function getRateLimitConfig(route: string) {
  // Map routes to specific limits
  const routeMap: Record<string, typeof RATE_LIMITS.GATEWAY> = {
    '/api/auth/login': RATE_LIMITS.AUTH.LOGIN,
    '/api/auth/signup': RATE_LIMITS.AUTH.SIGNUP,
    '/api/auth/password-reset': RATE_LIMITS.AUTH.PASSWORD_RESET,
    '/api/qr/create': RATE_LIMITS.QR_SERVICE.CREATE,
    '/api/qr/scan': RATE_LIMITS.QR_SERVICE.SCAN,
    '/api/microsites/leads': RATE_LIMITS.MICROSITE_SERVICE.LEAD_SUBMISSION,
  };

  return routeMap[route] || RATE_LIMITS.GATEWAY;
}
