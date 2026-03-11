import type { EncounterContext } from "@comtouz/domain";

export interface EncounterOfferRecord {
  nonce: string;
  initiatorUserId: string;
  counterpartUserId: string | null;
  channel: "qr" | "ble" | "nfc";
  offeredContexts: EncounterContext[];
  createdAt: string;
  expiresAt: string;
  cloudflareRayId: string | null;
  ipHash: string | null;
  countryCode: string | null;
}

export interface EncounterClaimRecord {
  claimantUserId: string;
  claimedAt: string;
}