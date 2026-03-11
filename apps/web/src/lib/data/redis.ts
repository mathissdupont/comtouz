import Redis from "ioredis";
import { getEnv } from "@/lib/env";

declare global {
  var __comtouzRedis__: Redis | undefined;
}

function createRedisClient() {
  const env = getEnv();
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true
  });
}

export function getRedis() {
  const env = getEnv();
  const client = globalThis.__comtouzRedis__ ?? createRedisClient();

  if (env.NODE_ENV !== "production") {
    globalThis.__comtouzRedis__ = client;
  }

  return client;
}

export async function ensureRedisConnection() {
  const redis = getRedis();

  if (redis.status === "ready" || redis.status === "connecting") {
    return;
  }

  await redis.connect();
}