// packages/common/src/logger.ts

import pino from "pino";

/**
 * Create a Pino logger.
 * - In dev, we use pino-pretty so logs are readable.
 * - LOG_LEVEL controls verbosity (info, debug, warn, error).
 */
const resolvedPretty = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require.resolve("pino-pretty");
  } catch (e) {
    return null as null;
  }
})();


const baseConfig: any = { level: process.env.LOG_LEVEL || "info" };
if (resolvedPretty) {
  baseConfig.transport = {
    target: resolvedPretty,
    base: { service: process.env.SERVICE_NAME || "unknown" },
    timestamp: pino.stdTimeFunctions.isoTime,
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      singleLine: false,
    },
  };
}


export const logger = pino(baseConfig);
