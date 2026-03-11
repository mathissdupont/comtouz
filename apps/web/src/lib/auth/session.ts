import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getEnv, isProduction } from "@/lib/env";
import type { SessionPayload, SessionUser } from "@/lib/auth/types";

const cookieName = "comtouz_session";
const sessionDurationSeconds = 60 * 60 * 12;

function getSessionSecret() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export async function createSessionToken(user: SessionUser) {
  const env = getEnv();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + sessionDurationSeconds;

  return new SignJWT({ ...user, issuedAt, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .setIssuer(env.NEXT_PUBLIC_API_BASE_URL)
    .setAudience(env.WORLDPASS_AUDIENCE)
    .sign(getSessionSecret());
}

export async function persistSession(user: SessionUser) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();

  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: sessionDurationSeconds
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function readSession(): Promise<SessionPayload | null> {
  const env = getEnv();
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify<SessionPayload>(token, getSessionSecret(), {
      issuer: env.NEXT_PUBLIC_API_BASE_URL,
      audience: env.WORLDPASS_AUDIENCE
    });

    return verified.payload;
  } catch {
    return null;
  }
}