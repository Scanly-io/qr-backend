import { createClient } from "redis";
import { redisConfig } from "./config";

let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * getRedisClient()
 * - Returns a singleton Redis client instance
 * - Initializes the client on first call
 */
export async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    url: redisConfig.url,
  });

  redisClient.on("error", (err: Error) => {
    console.error("Redis Client Error", err);
  });

  await redisClient.connect();
  console.log("Connected to Redis");

  return redisClient;
}

/**
 * disconnectRedisClient()
 * - Disconnects the Redis client if initialized
 */
export async function disconnectRedisClient() {
  if (redisClient) {
    await redisClient.disconnect();
    console.log("Disconnected from Redis");
    redisClient = null;
  }
}