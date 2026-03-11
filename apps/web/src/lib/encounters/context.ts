import {
  encounterContextKey,
  encounterFinalizeKey,
  negotiationKey,
  replayGuardKey,
  replayGuardTtlSeconds
} from "@comtouz/cache";
import { type EncounterContext } from "@comtouz/domain";
import { ensureRedisConnection, getRedis } from "@/lib/data/redis";
import { getEncounterClaim } from "@/lib/encounters/claims";
import { getEncounterOffer, getOfferTimeToLive } from "@/lib/encounters/offers";
import { finalizeEncounter } from "@/lib/repositories/encounters";
import type { SessionUser } from "@/lib/auth/types";

async function maybeReadFinalizedEncounter(nonce: string) {
  const redis = getRedis();
  const finalized = await redis.get(encounterFinalizeKey(nonce));

  if (!finalized) {
    return null;
  }

  return JSON.parse(finalized) as {
    encounterId: string;
    status: string;
    resolvedContext: string;
    channel: string;
    finalizedAt: string;
    initiatorEntitlementId: string;
    claimantEntitlementId: string;
  };
}

async function finalizeFromAgreement(nonce: string, resolvedContext: EncounterContext) {
  const redis = getRedis();
  const existingEncounter = await maybeReadFinalizedEncounter(nonce);

  if (existingEncounter) {
    return existingEncounter;
  }

  const offer = await getEncounterOffer(nonce);
  const claim = await getEncounterClaim(nonce);

  if (!offer || !claim) {
    throw new Error("Encounter offer must exist and be claimed before finalization.");
  }

  const encounter = await finalizeEncounter({
    encounterId: crypto.randomUUID(),
    nonce,
    initiatorUserId: offer.initiatorUserId,
    claimantUserId: claim.claimantUserId,
    channel: offer.channel,
    resolvedContext,
    initiatedAt: offer.createdAt,
    finalizedAt: new Date().toISOString(),
    initiatorEntitlementId: crypto.randomUUID(),
    claimantEntitlementId: crypto.randomUUID()
  });

  await redis.set(encounterFinalizeKey(nonce), JSON.stringify(encounter), "EX", replayGuardTtlSeconds);
  await redis.set(replayGuardKey(nonce), new Date().toISOString(), "EX", replayGuardTtlSeconds);

  return encounter;
}

export async function submitEncounterContext(user: SessionUser, nonce: string, selectedContext: EncounterContext) {
  const redis = getRedis();

  await ensureRedisConnection();

  const offer = await getEncounterOffer(nonce);
  const claim = await getEncounterClaim(nonce);

  if (!offer || !claim) {
    throw new Error("Encounter offer must exist and be claimed before contexts can be submitted.");
  }

  const participantIds = [offer.initiatorUserId, claim.claimantUserId];
  if (!participantIds.includes(user.userId)) {
    throw new Error("Only encounter participants can submit context.");
  }

  const ttl = await getOfferTimeToLive(nonce);
  if (ttl <= 0) {
    throw new Error("Encounter offer expired before context submission.");
  }

  await redis.hmset(encounterContextKey(nonce, user.userId), {
    selectedContext,
    submittedAt: new Date().toISOString()
  });
  await redis.expire(encounterContextKey(nonce, user.userId), ttl);

  const [initiatorContext, claimantContext] = await Promise.all([
    redis.hgetall(encounterContextKey(nonce, offer.initiatorUserId)),
    redis.hgetall(encounterContextKey(nonce, claim.claimantUserId))
  ]);

  if (!initiatorContext.selectedContext || !claimantContext.selectedContext) {
    return {
      status: "waiting_for_counterparty" as const,
      nonce
    };
  }

  if (initiatorContext.selectedContext !== claimantContext.selectedContext) {
    const negotiationState = {
      state: "negotiation_required",
      initiatorContext: initiatorContext.selectedContext,
      claimantContext: claimantContext.selectedContext,
      updatedAt: new Date().toISOString()
    };

    await redis.hmset(negotiationKey(nonce), negotiationState);
    await redis.expire(negotiationKey(nonce), ttl);

    return {
      status: "negotiation_required" as const,
      nonce,
      negotiation: negotiationState
    };
  }

  const encounter = await finalizeFromAgreement(nonce, initiatorContext.selectedContext as EncounterContext);

  return {
    status: "finalized" as const,
    nonce,
    encounter
  };
}

export async function negotiateEncounterContext(user: SessionUser, nonce: string, proposedContext: EncounterContext) {
  const redis = getRedis();

  await ensureRedisConnection();

  const offer = await getEncounterOffer(nonce);
  const claim = await getEncounterClaim(nonce);

  if (!offer || !claim) {
    throw new Error("Encounter offer must exist and be claimed before negotiation.");
  }

  const negotiation = await redis.hgetall(negotiationKey(nonce));
  if (negotiation.state !== "negotiation_required") {
    throw new Error("Negotiation is not active for this encounter.");
  }

  const participantIds = [offer.initiatorUserId, claim.claimantUserId];
  if (!participantIds.includes(user.userId)) {
    throw new Error("Only encounter participants can negotiate context.");
  }

  const ttl = await getOfferTimeToLive(nonce);
  if (ttl <= 0) {
    throw new Error("Encounter offer expired before negotiation completed.");
  }

  await redis.hset(negotiationKey(nonce), `proposal:${user.userId}`, proposedContext);
  await redis.hset(negotiationKey(nonce), "updatedAt", new Date().toISOString());
  await redis.expire(negotiationKey(nonce), ttl);

  const [initiatorProposal, claimantProposal] = await Promise.all([
    redis.hget(negotiationKey(nonce), `proposal:${offer.initiatorUserId}`),
    redis.hget(negotiationKey(nonce), `proposal:${claim.claimantUserId}`)
  ]);

  if (!initiatorProposal || !claimantProposal) {
    return {
      status: "waiting_for_negotiation" as const,
      nonce,
      negotiation: {
        state: negotiation.state,
        initiatorProposal,
        claimantProposal,
        updatedAt: new Date().toISOString()
      }
    };
  }

  if (initiatorProposal !== claimantProposal) {
    return {
      status: "negotiation_required" as const,
      nonce,
      negotiation: {
        state: negotiation.state,
        initiatorProposal,
        claimantProposal,
        updatedAt: new Date().toISOString()
      }
    };
  }

  const encounter = await finalizeFromAgreement(nonce, initiatorProposal as EncounterContext);

  return {
    status: "finalized" as const,
    nonce,
    encounter
  };
}