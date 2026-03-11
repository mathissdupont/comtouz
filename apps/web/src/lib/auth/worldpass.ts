import { createRemoteJWKSet, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";
import type { WorldPassProfile } from "@/lib/auth/types";

export async function verifyWorldPassIdToken(idToken: string): Promise<WorldPassProfile> {
  const env = getEnv();
  const jwks = createRemoteJWKSet(new URL(env.WORLDPASS_JWKS_URL));
  const verified = await jwtVerify(idToken, jwks, {
    issuer: env.WORLDPASS_ISSUER_URL,
    audience: env.WORLDPASS_AUDIENCE
  });

  const subject = verified.payload.sub;

  if (!subject) {
    throw new Error("WorldPass token is missing the subject claim.");
  }

  return {
    subject,
    issuer: String(verified.payload.iss ?? env.WORLDPASS_ISSUER_URL),
    email: typeof verified.payload.email === "string" ? verified.payload.email : undefined,
    displayName: typeof verified.payload.name === "string" ? verified.payload.name : undefined,
    countryCode: typeof verified.payload.country === "string" ? verified.payload.country : undefined
  };
}