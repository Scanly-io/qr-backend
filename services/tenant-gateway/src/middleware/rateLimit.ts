import { getRedisClient, logger } from '@qr/common';import Redis from 'ioredis';

import { FastifyRequest, FastifyReply } from 'fastify';import { FastifyRequest, FastifyReply } from 'fastify';



/**/**

 * Redis-based Rate Limiter * Redis-based Rate Limiter

 *  * 

 * Uses @qr/common Redis client for distributed rate limiting across * Uses Redis for distributed rate limiting across multiple gateway instances

 * multiple gateway instances. Implements sliding window algorithm. * Implements sliding window algorithm for accurate rate limiting

 */ */



/**let redisClient: Redis | null = null;

 * Check rate limit using Redis

 * export function initializeRedis() {

 * @param key - Unique identifier (e.g., "rate-limit:login:192.168.1.1")  if (redisClient) return redisClient;

 * @param max - Maximum number of requests

 * @param windowMs - Time window in milliseconds  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

 * @returns { allowed: boolean, remaining: number, resetTime: number }  

 */  redisClient = new Redis(redisUrl, {

export async function checkRateLimit(    maxRetriesPerRequest: 3,

  key: string,    enableReadyCheck: true,

  max: number,    lazyConnect: true,

  windowMs: number  });

): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {

  const now = Date.now();  redisClient.on('error', (err) => {

  const windowStart = now - windowMs;    console.error('Redis rate limiter error:', err);

  });

  try {

    const client = await getRedisClient();  redisClient.on('connect', () => {

    console.log('✅ Redis rate limiter connected');

    // Use Redis sorted set to implement sliding window  });

    // node-redis multi() returns a chainable builder

    const results = await client  return redisClient;

      .multi()}

      .zRemRangeByScore(key, 0, windowStart)       // Remove old entries outside the window

      .zCard(key)                                    // Count current requests in windowexport function getRedisClient(): Redis {

      .zAdd(key, { score: now, value: `${now}-${Math.random()}` })  // Add current request  if (!redisClient) {

      .expire(key, Math.ceil(windowMs / 1000))       // Set expiry on the key    return initializeRedis();

      .exec();  }

  return redisClient;

    if (!results) {}

      throw new Error('Redis multi exec failed');

    }/**

 * Check rate limit using Redis

    // Count is the second command result * 

    const count = (results[1] as number) || 0; * @param key - Unique identifier (e.g., "rate-limit:login:192.168.1.1")

 * @param max - Maximum number of requests

    const allowed = count < max; * @param windowMs - Time window in milliseconds

    const remaining = Math.max(0, max - count - 1); * @returns { allowed: boolean, remaining: number, resetTime: number }

    const resetTime = now + windowMs; */

export async function checkRateLimit(

    return { allowed, remaining, resetTime };  key: string,

  } catch (error) {  max: number,

    logger.error({ err: error }, 'Rate limit check failed');  windowMs: number

    // Fail open - allow request if Redis fails): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {

    return { allowed: true, remaining: max, resetTime: now + windowMs };  const client = getRedisClient();

  }  const now = Date.now();

}  const windowStart = now - windowMs;



/**  try {

 * Rate limit middleware factory    // Use Redis sorted set to implement sliding window

 * Creates a Fastify middleware with custom rate limit config    const multi = client.multi();

 */

export function createRateLimiter(config: {    // Remove old entries outside the window

  max: number;    multi.zremrangebyscore(key, 0, windowStart);

  timeWindow: number;

  message?: string;    // Count current requests in window

  keyGenerator?: (req: FastifyRequest) => string;    multi.zcard(key);

}) {

  const { max, timeWindow, message = 'Too many requests', keyGenerator } = config;    // Add current request

    multi.zadd(key, now, `${now}-${Math.random()}`);

  return async (request: FastifyRequest, reply: FastifyReply) => {

    // Generate key (default to IP address)    // Set expiry on the key

    const identifier = keyGenerator     multi.expire(key, Math.ceil(windowMs / 1000));

      ? keyGenerator(request)

      : request.ip || 'unknown';    const results = await multi.exec();



    const key = `rate-limit:${request.url}:${identifier}`;    if (!results) {

      throw new Error('Redis multi exec failed');

    const { allowed, remaining, resetTime } = await checkRateLimit(    }

      key,

      max,    // Count is the second command result

      timeWindow    const count = (results[1][1] as number) || 0;

    );

    const allowed = count < max;

    // Add rate limit headers    const remaining = Math.max(0, max - count - 1);

    reply.header('X-RateLimit-Limit', max);    const resetTime = now + windowMs;

    reply.header('X-RateLimit-Remaining', remaining);

    reply.header('X-RateLimit-Reset', new Date(resetTime).toISOString());    return { allowed, remaining, resetTime };

  } catch (error) {

    if (!allowed) {    console.error('Rate limit check failed:', error);

      return reply.status(429).send({    // Fail open - allow request if Redis fails

        error: 'Too Many Requests',    return { allowed: true, remaining: max, resetTime: now + windowMs };

        message,  }

        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),}

      });

    }/**

  }; * Rate limit middleware factory

} * Creates a Fastify middleware with custom rate limit config

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
