export const platformName = "Comtouz";

export const encounterContexts = ["business", "social", "academic"] as const;
export type EncounterContext = (typeof encounterContexts)[number];

export const ratingResolutionHours = 24;
export const lowRatingThreshold = 3;
export const jurySize = 7;
export const ratingStars = [1, 2, 3, 4, 5] as const;
export type RatingStar = (typeof ratingStars)[number];
export const ratingStates = ["draft", "active", "pending_resolution", "disputed", "resolved"] as const;
export type RatingState = (typeof ratingStates)[number];
export const disputeStates = ["pending_reply", "replied", "resolved_direct", "jury_review", "jury_upheld", "jury_rejected"] as const;
export type DisputeState = (typeof disputeStates)[number];
export const juryDecisions = ["uphold", "reject"] as const;
export type JuryDecision = (typeof juryDecisions)[number];

export type ReputationWeightState = "zero-weight" | "warming-up" | "active" | "penalized";

export interface WorldPassBinding {
  worldPassSubjectId: string;
  verifiedAt: string;
  issuer: string;
}

export interface EncounterDraft {
  encounterId: string;
  initiatorUserId: string;
  counterpartyUserId?: string;
  channel: "qr" | "ble" | "nfc";
  offeredContexts: EncounterContext[];
  expiresAt: string;
}

export interface RatingPolicy {
  lowRatingThreshold: number;
  rightOfReplyHours: number;
  splitRatingRequired: boolean;
}

export interface RatingEntitlement {
  entitlementId: string;
  encounterId: string;
  authorUserId: string;
  targetUserId: string;
  context: EncounterContext;
  status: "open" | "used";
  createdAt: string;
}

export interface RatingSubmission {
  entitlementId: string;
  stars: RatingStar;
  comment?: string;
}

export interface DisputeRecord {
  disputeId: string;
  ratingId: string;
  status: DisputeState;
  category: EncounterContext;
  authorUserId: string;
  targetUserId: string;
  openedAt: string;
  resolutionDeadline: string;
  replyMessage?: string;
}

export interface JuryCaseRecord {
  juryCaseId: string;
  disputeId: string;
  category: EncounterContext;
  status: "voting" | "decided";
  finalDecision?: JuryDecision;
  votesCast: number;
  assignedJurors: number;
}

export interface BusinessRecord {
  businessId: string;
  legalName: string;
  displayName: string;
  categories: string[];
  founderUserId: string;
}

export const defaultRatingPolicy: RatingPolicy = {
  lowRatingThreshold,
  rightOfReplyHours: ratingResolutionHours,
  splitRatingRequired: true
};