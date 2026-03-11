import { NextResponse } from "next/server";
import { encounterTokenTtlSeconds } from "@comtouz/cache";
import { platformName, ratingResolutionHours } from "@comtouz/domain";
import { coreConstraints } from "@comtouz/graph";
import { getEnv } from "@/lib/env";

export function GET() {
  const env = getEnv();

  return NextResponse.json({
    service: platformName,
    status: "ok",
    timestamp: new Date().toISOString(),
    trustModel: {
      encounterTokenTtlSeconds,
      ratingResolutionHours,
      graphConstraints: coreConstraints.length
    },
    infrastructure: {
      neo4jConfigured: Boolean(env.NEO4J_URI),
      redisConfigured: Boolean(env.REDIS_URL),
      worldPassConfigured: Boolean(env.WORLDPASS_ISSUER_URL && env.WORLDPASS_JWKS_URL)
    }
  });
}