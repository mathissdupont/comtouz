export interface SessionUser {
  userId: string;
  worldPassSubjectId: string;
  displayName?: string | null;
  countryCode?: string | null;
  reputationScore: number;
  effectiveWeight: number;
}

export interface SessionPayload extends SessionUser {
  issuedAt: number;
  expiresAt: number;
}

export interface WorldPassProfile {
  subject: string;
  issuer: string;
  email?: string;
  displayName?: string;
  countryCode?: string;
}