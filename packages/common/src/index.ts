// packages/common/src/index.ts

import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { logger } from "./logger";
import { httpRequestDurationMicroseconds, register } from "./metrics";
import { getRedisClient } from "./cache";


dotenv.config();

/**
 * buildServer()
 * - Creates a Fastify app with:
 *   - our shared logger
 *   - CORS enabled (allow all origins in dev)
 *   - /health route
 *   - request lifecycle logs with a requestId
 */
export function buildServer(serviceName?: string) {
  // Fastify expects a logger configuration object (or enabled boolean),
  // not a Pino instance. Pass a minimal config here and re-export the
  // shared `logger` for consumers who want to log directly.
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  // CORS: allow all in dev (customize later)
  app.register(cors, { origin: true });

  // Add a simple /health endpoint for all services
  app.get("/health", async () => ({
    ok: true,
    service: serviceName || "unknown",
    ts: new Date().toISOString()
  }));

  /**
   * onRequest hook:
   * - runs at the very beginning of every request
   * - we attach a requestId (from Fastify or generate) and log a start line
   */
  app.addHook("onRequest", async (req) => {
    const requestId = req.id; // Fastify auto-generates this
    req.log.info(
      {
        event: "request:start",
        requestId,
        method: req.method,
        url: req.url
      },
      `${serviceName || "service"} → request start`
    );
  });

  /**
   * onResponse hook:
   * - runs at the very end of every request
   * - we log status code and timing
   */
  app.addHook("onResponse", async (req, reply) => {
    const requestId = req.id;
    const timing = reply.elapsedTime; // ms since request started
    req.log.info(
      {
        event: "request:end",
        requestId,
        statusCode: reply.statusCode,
        duration_ms: timing
      },
      `${serviceName || "service"} ← request end`
    );
    // Record the request duration in our Prometheus histogram
    httpRequestDurationMicroseconds
      .labels(serviceName || "unknown", req.method, String(reply.statusCode))
      .observe(timing / 1000); // convert ms to seconds
  });

  // Prometheus metrics endpoint
  app.get("/metrics", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const metrics = await register.metrics();
      reply.header("Content-Type", register.contentType);
      return reply.send(metrics);
    } catch (ex) {
      reply.status(500).send(ex);
    }
  });

  return app;
}

// Re-export logger for convenience
export { logger } from "./logger";

// Re-export MQ helpers so consumers can import from the package root.
import * as _mq from "./mq";
// Common package root exports

// Interop: depending on how TS/tsx loads the module, the exports from
// `./mq` may appear under a `default` object. Normalize here and
// export named helpers for consumers.
const mq: any = (_mq as any).default && Object.keys((_mq as any).default).length
  ? ((_mq as any).default)
  : _mq;

export const createProducer = mq.createProducer;
export const createConsumer = mq.createConsumer;

// Re-export event schemas
import * as _event from "./event";

const event: any = (_event as any).default && Object.keys((_event as any).default).length
  ? ((_event as any).default)
  : _event;

export const QREventSchema = event.QREventSchema;
export type { QREvent } from "./event";

// Re-export cache helper
export { getRedisClient } from "./cache";

export {generateJwtToken, verifyJwtToken} from "./jwthelper";
// Re-export authGuard supporting both named & default forms
export { authGuard } from "./authguard";