export interface RedisConfig {
  url: string;
}

const redisConfig: RedisConfig = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

export { redisConfig };
export default redisConfig;
