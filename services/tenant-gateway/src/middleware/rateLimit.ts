import Redis from 'ioredis';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Redis-based Rate Limiter
 * 
 * Uses Redis for distributed rate limiting across multiple gateway instances
 * Implements sliding window algorithm for accurate rate limiting
 */

let redisClient: Redis | null = null;

export function initializeRedis() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redisClient.on('error', (err) => {
    console.error('Redis rate limiter error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis rate limiter connected');
  });

  return redisClient;
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

/**
 * Check rate limit using Redis
 * 
 * @param key - Unique identifier (e.g., "rate-limit:login:192.168.1.1")
 * @param max - Maximum number of requests
 * @param windowMs - Time window in milliseconds
 * @returns { allowed: boolean, remaining: number, resetTime: number }
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const client = getRedisClient();
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis sorted set to implement sliding window
    const multi = client.multi();

    // Remove old entries outside the window
    multi.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    multi.zcard(key);

    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry on the key
    multi.expire(key, Math.ceil(windowMs / 1000));

    const results = await multi.exec();

    if (!results) {
      throw new Error('Redis multi exec failed');
    }

    // Count is the second command result
    const count = (results[1][1] as number) || 0;

    const allowed = count < max;
    const remaining = Math.max(0, max - count - 1);
    const resetTime = now + windowMs;

    return { allowed, remaining, resetTime };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if Redis fails
    return { allowed: true, remaining: max, resetTime: now + windowMs };
  }
}

/**
 * Rate limit middleware factory
 * Creates a Fastify middleware with custom rate limit config
 */
export function createRateLimiter(config: {
  max: number;
  timeWindow: number;
  message?: string;
  keyGenerator?: (req: FastifyRequest) => string;
}) {
  const { max, timeWindow, message = 'Too many requests', keyGenerator } = config;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Generate key (default to IP address)
    const identifier = keyGenerator 
      ? keyGenerator(request)
      : request.ip || 'unknown';

    const key = `rate-limit:${request.url}:${identifier}`;

    const { allowed, remaining, resetTime } = await checkRateLimit(
      key,
      max,
      timeWindow
    );

    // Add rate limit headers
    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', new Date(resetTime).toISOString());

    if (!allowed) {
      return reply.status(429).send({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      });
    }
  };
}
