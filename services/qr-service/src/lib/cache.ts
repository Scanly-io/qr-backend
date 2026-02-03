/**
 * Redis Cache Layer for QR Service
 * 
 * Provides caching utilities to reduce database load for frequently accessed data.
 * 
 * Cache Strategy:
 * - QR Code Lists: Cache for 5 minutes (frequently viewed, changes less often)
 * - Individual QR Codes: Cache for 30 minutes (rarely change after creation)
 * - Scan Counters: Real-time increments, persist async
 * 
 * Cache Invalidation:
 * - Invalidate on CREATE, UPDATE, DELETE operations
 * - Tenant-scoped keys ensure isolation
 */

import Redis from 'ioredis';
import { logger } from '@qr/common';

// Singleton Redis client
let redisClient: Redis | null = null;

/**
 * Initialize Redis connection
 */
export function initializeRedis(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redisClient = new Redis(redisUrl, {
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redisClient.on('connect', () => {
    logger.info('✅ Redis connected successfully');
  });

  redisClient.on('error', (err) => {
    logger.error({ err }, '❌ Redis connection error');
  });

  redisClient.on('close', () => {
    logger.warn('⚠️  Redis connection closed');
  });

  return redisClient;
}

/**
 * Get Redis client (initializes if needed)
 */
export function getRedis(): Redis {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

/**
 * Cache TTLs (in seconds)
 */
export const CACHE_TTL = {
  QR_LIST: 5 * 60,        // 5 minutes - lists change frequently
  QR_SINGLE: 30 * 60,     // 30 minutes - individual QR codes rarely change
  SCAN_COUNT: 24 * 60 * 60, // 24 hours - daily scan counters
  STATS: 10 * 60,         // 10 minutes - aggregated stats
} as const;

/**
 * Cache key builders (tenant-scoped for isolation)
 */
export const CacheKeys = {
  qrList: (tenantId: string) => `qr-service:qr-codes:${tenantId}`,
  qrSingle: (tenantId: string, qrId: string) => `qr-service:qr:${tenantId}:${qrId}`,
  scanCount: (qrId: string) => `qr-service:scan-count:${qrId}`,
  scanCountDaily: (qrId: string, date: string) => `qr-service:scan-count:${qrId}:${date}`,
  tenantStats: (tenantId: string) => `qr-service:stats:${tenantId}`,
} as const;

/**
 * Get cached data with JSON parsing
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  
  try {
    const data = await redis.get(key);
    if (!data) {
      logger.debug({ key }, 'Cache miss');
      return null;
    }
    
    logger.debug({ key }, 'Cache hit');
    return JSON.parse(data) as T;
  } catch (error) {
    logger.error({ error, key }, 'Error reading from cache');
    return null; // Fail open - don't break app if Redis fails
  }
}

/**
 * Set cached data with JSON serialization and TTL
 */
export async function setCache(key: string, value: any, ttl: number): Promise<void> {
  const redis = getRedis();
  
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    logger.debug({ key, ttl }, 'Cache set');
  } catch (error) {
    logger.error({ error, key }, 'Error writing to cache');
    // Fail open - don't throw, just log
  }
}

/**
 * Delete cache key(s)
 */
export async function deleteCache(pattern: string): Promise<void> {
  const redis = getRedis();
  
  try {
    // If it's a simple key (no wildcards), delete directly
    if (!pattern.includes('*')) {
      await redis.del(pattern);
      logger.debug({ key: pattern }, 'Cache invalidated');
      return;
    }
    
    // For wildcard patterns, scan and delete matching keys
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug({ pattern, count: keys.length }, 'Cache invalidated (pattern)');
    }
  } catch (error) {
    logger.error({ error, pattern }, 'Error deleting from cache');
  }
}

/**
 * Increment counter (for scan tracking)
 */
export async function incrementCounter(key: string, ttl?: number): Promise<number> {
  const redis = getRedis();
  
  try {
    const newValue = await redis.incr(key);
    
    // Set TTL if provided and this is the first increment
    if (ttl && newValue === 1) {
      await redis.expire(key, ttl);
    }
    
    logger.debug({ key, value: newValue }, 'Counter incremented');
    return newValue;
  } catch (error) {
    logger.error({ error, key }, 'Error incrementing counter');
    return 0;
  }
}

/**
 * Get counter value
 */
export async function getCounter(key: string): Promise<number> {
  const redis = getRedis();
  
  try {
    const value = await redis.get(key);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    logger.error({ error, key }, 'Error reading counter');
    return 0;
  }
}

/**
 * Invalidate all QR-related cache for a tenant
 */
export async function invalidateTenantCache(tenantId: string): Promise<void> {
  await deleteCache(`qr-service:*:${tenantId}*`);
  logger.info({ tenantId }, 'Invalidated all cache for tenant');
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}
