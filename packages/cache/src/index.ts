export const encounterTokenTtlSeconds = 60;
export const negotiationTtlSeconds = 600;
export const replayGuardTtlSeconds = 900;

export function encounterOfferKey(nonce: string) {
  return `encounter:offer:${nonce}`;
}

export function encounterClaimKey(nonce: string) {
  return `encounter:claim:${nonce}`;
}

export function encounterFinalizeKey(nonce: string) {
  return `encounter:finalize:${nonce}`;
}

export function encounterContextKey(sessionId: string, userId: string) {
  return `encounter:context:${sessionId}:${userId}`;
}

export function negotiationKey(sessionId: string) {
  return `encounter:negotiation:${sessionId}`;
}

export function replayGuardKey(nonce: string) {
  return `encounter:replay:${nonce}`;
}

export function encounterRateLimitKey(userId: string) {
  return `ratelimit:encounter:init:${userId}`;
}