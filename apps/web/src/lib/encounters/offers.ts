import { encounterOfferKey, encounterRateLimitKey, encounterTokenTtlSeconds } from "@comtouz/cache";
import { encounterContexts, type EncounterContext } from "@comtouz/domain";
import { readCloudflareHeaders } from "@comtouz/security";
import { ensureRedisConnection, getRedis } from "@/lib/data/redis";
import type { SessionUser } from "@/lib/auth/types";
import type { EncounterOfferRecord } from "@/lib/encounters/types";

export interface EncounterOfferInput {
  channel: "qr" | "ble" | "nfc";
  counterpartUserId?: string;
  offeredContexts?: EncounterContext[];
  requestHeaders: Headers;
}

export async function createEncounterOffer(user: SessionUser, input: EncounterOfferInput) {
  const nonce = crypto.randomUUID();
  const cloudflare = readCloudflareHeaders(input.requestHeaders);
  const rateLimitKey = encounterRateLimitKey(user.userId);
  const redis = getRedis();

  await ensureRedisConnection();

  const currentCount = await redis.incr(rateLimitKey);
  if (currentCount === 1) {
    await redis.expire(rateLimitKey, encounterTokenTtlSeconds);
  }

  if (currentCount > 5) {
    throw new Error("Encounter offer rate limit exceeded.");
  }

  const payload = {
    nonce,
    initiatorUserId: user.userId,
    counterpartUserId: input.counterpartUserId ?? null,
    channel: input.channel,
    offeredContexts: (input.offeredContexts?.length ? input.offeredContexts : encounterContexts).join(","),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + encounterTokenTtlSeconds * 1000).toISOString(),
    cloudflareRayId: cloudflare.rayId,
    ipHash: cloudflare.ip,
    countryCode: cloudflare.country
  };

  await redis.hmset(encounterOfferKey(nonce), payload);
  await redis.expire(encounterOfferKey(nonce), encounterTokenTtlSeconds);

  return payload;
}

export async function getEncounterOffer(nonce: string): Promise<EncounterOfferRecord | null> {
  const redis = getRedis();

  await ensureRedisConnection();

  const offer = await redis.hgetall(encounterOfferKey(nonce));

  if (!offer.nonce) {
    return null;
  }

  return {
    nonce: offer.nonce,
    initiatorUserId: offer.initiatorUserId,
    counterpartUserId: offer.counterpartUserId || null,
    channel: offer.channel as EncounterOfferRecord["channel"],
    offeredContexts: offer.offeredContexts.split(",") as EncounterOfferRecord["offeredContexts"],
    createdAt: offer.createdAt,
    expiresAt: offer.expiresAt,
    cloudflareRayId: offer.cloudflareRayId || null,
    ipHash: offer.ipHash || null,
    countryCode: offer.countryCode || null
  };
}

export async function getOfferTimeToLive(nonce: string) {
  const redis = getRedis();

  await ensureRedisConnection();

  return redis.ttl(encounterOfferKey(nonce));
}