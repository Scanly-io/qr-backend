/**
 * Redis Cache Layer for QR Service
 * 
 * Provides caching utilities to reduce database load for frequently accessed data.
 * Uses @qr/common's getRedisClient for consistent Redis access across all services.
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

import { getRedisClient, logger } from '@qr/common';
import type { RedisClientType } from 'redis';

/**
 * Get connected Redis client via @qr/common singleton
 */
async function getRedis(): Promise<RedisClientType> {
  return await getRedisClient() as RedisClientType;
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
  try {
    const redis = await getRedis();
    const data = await redis.get(key);
    if (!data) {
      logger.debug({ key }, 'Cache miss');
      return null;
    }
    
    logger.debug({ key }, 'Cache hit');
    return JSON.parse(data) as T;
  } catch (error) {
    logger.error({ err: error, key }, 'Error reading from cache');
    return null; // Fail open - don't break app if Redis fails
  }
}

/**
 * Set cached data with JSON serialization and TTL
 */
export async function setCache(key: string, value: any, ttl: number): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.setEx(key, ttl, JSON.stringify(value));
    logger.debug({ key, ttl }, 'Cache set');
  } catch (error) {
    logger.error({ err: error, key }, 'Error writing to cache');
    // Fail open - don't throw, just log
  }
}

/**
 * Delete cache key(s)
 */
export async function deleteCache(pattern: string): Promise<void> {
  try {
    const redis = await getRedis();
    
    // If it's a simple key (no wildcards), delete directly
    if (!pattern.includes('*')) {
      await redis.del(pattern);
      logger.debug({ key: pattern }, 'Cache invalidated');
      return;
    }
    
    // For wildcard patterns, scan and delete matching keys
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
      logger.debug({ pattern, count: keys.length }, 'Cache invalidated (pattern)');
    }
  } catch (error) {
    logger.error({ err: error, pattern }, 'Error deleting from cache');
  }
}

/**
 * Increment counter (for scan tracking)
 */
export async function incrementCounter(key: string, ttl?: number): Promise<number> {
  try {
    const redis = await getRedis();
    const newValue = await redis.incr(key);
    
    // Set TTL if provided and this is the first increment
    if (ttl && newValue === 1) {
      await redis.expire(key, ttl);
    }
    
    logger.debug({ key, value: newValue }, 'Counter incremented');
    return newValue;
  } catch (error) {
    logger.error({ err: error, key }, 'Error incrementing counter');
    return 0;
  }
}

/**
 * Get counter value
 */
export async function getCounter(key: string): Promise<number> {
  try {
    const redis = await getRedis();
    const value = await redis.get(key);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    logger.error({ err: error, key }, 'Error reading counter');
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
