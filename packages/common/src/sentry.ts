import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry for backend services
 * 
 * @param serviceName - Name of the service (e.g., 'auth-service', 'qr-service')
 * @param dsn - Sentry DSN (optional, defaults to env var)
 */
export function initializeSentry(serviceName: string, dsn?: string): void {
  const sentryDsn = dsn || process.env.SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('⚠️  Sentry DSN not found. Error tracking disabled.');
    return;
  }
  
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    
    // Service identifier
    serverName: serviceName,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Enable profiling
    integrations: [
      new ProfilingIntegration(),
    ],
    
    // Filter out noise
    beforeSend(event, hint) {
      // Ignore health check endpoints
      if (event.request?.url?.includes('/health')) {
        return null;
      }
      
      // Scrub sensitive data
      if (event.request?.data) {
        const data = event.request.data;
        if (typeof data === 'object') {
          delete data.password;
          delete data.token;
          delete data.creditCard;
          delete data.ssn;
        }
      }
      
      return event;
    },
    
    // Add service tag
    initialScope: {
      tags: {
        service: serviceName,
      },
    },
  });
  
  console.log(`✅ Sentry initialized for ${serviceName}`);
}

/**
 * Capture an exception with context
 * 
 * @param error - Error object
 * @param context - Additional context (userId, qrId, etc.)
 */
export function captureException(
  error: Error,
  context?: Record<string, any>
): void {
  Sentry.captureException(error, {
    extra: context,
    tags: context?.tags,
  });
  
  if (process.env.NODE_ENV !== 'production') {
    console.error('🐛 Sentry error captured:', error.message, context);
  }
}

/**
 * Capture a message (non-error logging)
 * 
 * @param message - Message to log
 * @param level - Severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
): void {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📝 Sentry message (${level}):`, message, context);
  }
}

/**
 * Set user context for Sentry
 * 
 * @param user - User object with id, email, username
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  Sentry.setUser(user);
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 * 
 * @param message - Breadcrumb message
 * @param data - Additional data
 * @param category - Category (navigation, http, etc.)
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  category: string = 'custom'
): void {
  Sentry.addBreadcrumb({
    message,
    data,
    category,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a transaction (for performance monitoring)
 * 
 * @param name - Transaction name
 * @param op - Operation type
 */
export function startTransaction(name: string, op: string = 'http.server') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Set custom tags
 * 
 * @param tags - Key-value pairs of tags
 */
export function setTags(tags: Record<string, string>): void {
  Sentry.setTags(tags);
}

/**
 * Set custom context
 * 
 * @param name - Context name
 * @param context - Context data
 */
export function setContext(name: string, context: Record<string, any>): void {
  Sentry.setContext(name, context);
}

export { Sentry };
