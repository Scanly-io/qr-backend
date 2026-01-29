// packages/common/src/logger.ts

import pino from "pino";

/**
 * Create a Pino logger with structured error tracking.
 * - In dev, we use pino-pretty so logs are readable.
 * - LOG_LEVEL controls verbosity (info, debug, warn, error).
 * - Structured logs include service name, timestamps, and error context.
 * 
 * Error Aggregation:
 * - All errors logged with standardized fields (error, stack, context)
 * - Service name automatically included from SERVICE_NAME env var
 * - Logs can be sent to aggregation services (Datadog, Loki, CloudWatch)
 * 
 * Production Usage:
 * - Set LOG_LEVEL=error to reduce noise
 * - Pipe logs to log aggregation: node app.js | pino-datadog
 * - Or use transport to send to external service
 */
const resolvedPretty = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require.resolve("pino-pretty");
  } catch (e) {
    return null as null;
  }
})();

// Service name for log aggregation and filtering
const serviceName = process.env.SERVICE_NAME || "unknown";

// Base configuration with structured fields
const baseConfig: any = { 
  level: process.env.LOG_LEVEL || "info",
  // Add service name to every log entry
  base: { 
    service: serviceName,
    environment: process.env.NODE_ENV || "development",
  },
  // ISO timestamp for log aggregation tools
  timestamp: pino.stdTimeFunctions.isoTime,
  // Serialize errors with full stack traces
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
};

// Pretty printing for development
if (resolvedPretty && process.env.NODE_ENV !== "production") {
  baseConfig.transport = {
    target: resolvedPretty,
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      singleLine: false,
      ignore: "pid,hostname", // Cleaner output
    },
  };
}

export const logger = pino(baseConfig);

/**
 * Helper function to create child logger with operation context
 * Useful for tracking related logs across a request/operation
 * 
 * @example
 * const reqLogger = createChildLogger({ requestId: req.id, userId: user.id });
 * reqLogger.info("Processing request");
 * reqLogger.error({ err }, "Request failed");
 */
export function createChildLogger(bindings: Record<string, any>) {
  return logger.child(bindings);
}
