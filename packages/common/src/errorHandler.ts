import { logger } from "./logger";
import { createProducer } from "./mq";

/**
 * Error handling wrapper with Dead Letter Queue (DLQ) integration
 * 
 * Wraps async operations with error handling that:
 * 1. Catches errors and logs them with context
 * 2. Sends error details to DLQ topic for monitoring
 * 3. Returns a Result type for safe error handling
 * 
 * @example
 * const result = await withDLQ(
 *   () => db.insert(users).values({ email: "test@example.com" }),
 *   {
 *     service: "auth",
 *     operation: "user.create",
 *     metadata: { email: "test@example.com" }
 *   }
 * );
 * 
 * if (!result.success) {
 *   return reply.code(500).send({ error: result.error });
 * }
 * 
 * return reply.send(result.data);
 */

export interface DLQContext {
  service: string;           // Service name (e.g., "qr", "auth", "microsite")
  operation: string;         // Operation identifier (e.g., "qr.create", "user.login")
  metadata?: Record<string, any>;  // Additional context for debugging
}

export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Execute an async operation with automatic DLQ error handling
 * 
 * @param operation - Async function to execute
 * @param context - Context information for error tracking
 * @returns Result object with success flag and data/error
 */
export async function withDLQ<T>(
  operation: () => Promise<T>,
  context: DLQContext
): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    
    // Log error with full context
    logger.error({ 
      ...context, 
      error: errorMessage,
      stack: errorStack 
    }, `${context.operation} failed`);
    
    // Send error to DLQ topic for monitoring
    try {
      const producer = await createProducer();
      await producer.send({
        topic: `${context.service}.errors`,
        messages: [{
          key: context.operation,
          value: JSON.stringify({
            error: errorMessage,
            stack: errorStack,
            operation: context.operation,
            metadata: context.metadata,
            timestamp: new Date().toISOString(),
          }),
          headers: {
            "x-event-type": `${context.service}.error`,
            "x-operation": context.operation,
          },
        }],
      });
    } catch (dlqError) {
      // Don't let DLQ sending failure crash the service
      logger.error({ dlqError, originalError: errorMessage }, "Failed to send error to DLQ");
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Synchronous version of withDLQ for non-async operations
 * Only logs errors, doesn't send to DLQ (Kafka requires async)
 */
export function withDLQSync<T>(
  operation: () => T,
  context: DLQContext
): Result<T> {
  try {
    const data = operation();
    return { success: true, data };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    logger.error({ 
      ...context, 
      error: errorMessage 
    }, `${context.operation} failed`);
    
    return { success: false, error: errorMessage };
  }
}
