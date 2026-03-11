import { encounterClaimKey, encounterFinalizeKey, encounterOfferKey } from "@comtouz/cache";
import { ensureRedisConnection, getRedis } from "@/lib/data/redis";
import { getEncounterOffer, getOfferTimeToLive } from "@/lib/encounters/offers";
import type { SessionUser } from "@/lib/auth/types";
import type { EncounterClaimRecord } from "@/lib/encounters/types";

export async function claimEncounterOffer(user: SessionUser, nonce: string) {
  const redis = getRedis();

  await ensureRedisConnection();

  const offer = await getEncounterOffer(nonce);
  if (!offer) {
    throw new Error("Encounter offer not found or expired.");
  }

  if (offer.initiatorUserId === user.userId) {
    throw new Error("The initiator cannot claim their own encounter offer.");
  }

  if (offer.counterpartUserId && offer.counterpartUserId !== user.userId) {
    throw new Error("This encounter offer is reserved for a different counterparty.");
  }

  const finalizeState = await redis.get(encounterFinalizeKey(nonce));
  if (finalizeState) {
    throw new Error("This encounter is already finalized.");
  }

  const ttl = await getOfferTimeToLive(nonce);
  if (ttl <= 0) {
    throw new Error("Encounter offer expired before claim.");
  }

  const payload = {
    claimantUserId: user.userId,
    claimedAt: new Date().toISOString()
  };

  await redis.hmset(encounterClaimKey(nonce), payload);
  await redis.expire(encounterClaimKey(nonce), ttl);

  if (!offer.counterpartUserId) {
    await redis.hset(encounterOfferKey(nonce), "counterpartUserId", user.userId);
  }

  return {
    ...payload,
    offer
  };
}

export async function getEncounterClaim(nonce: string): Promise<EncounterClaimRecord | null> {
  const redis = getRedis();

  await ensureRedisConnection();

  const claim = await redis.hgetall(encounterClaimKey(nonce));

  if (!claim.claimantUserId) {
    return null;
  }

  return {
    claimantUserId: claim.claimantUserId,
    claimedAt: claim.claimedAt
  };
}