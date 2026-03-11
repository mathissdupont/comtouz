import { runNeo4jRead, runNeo4jWrite } from "@/lib/data/neo4j";
import type { SessionUser, WorldPassProfile } from "@/lib/auth/types";

const upsertUserQuery = `
  MERGE (u:User {worldPassSubjectId: $worldPassSubjectId})
  ON CREATE SET
    u.userId = $userId,
    u.createdAt = datetime(),
    u.status = 'active',
    u.reputationScore = 0,
    u.effectiveWeight = 0,
    u.justiceScore = 0,
    u.countryCode = $countryCode,
    u.displayName = $displayName,
    u.email = $email
  ON MATCH SET
    u.countryCode = coalesce($countryCode, u.countryCode),
    u.displayName = coalesce($displayName, u.displayName),
    u.email = coalesce($email, u.email),
    u.lastSeenAt = datetime()
  RETURN u.userId AS userId,
         u.worldPassSubjectId AS worldPassSubjectId,
      u.displayName AS displayName,
      u.countryCode AS countryCode,
         toFloat(coalesce(u.reputationScore, 0)) AS reputationScore,
         toFloat(coalesce(u.effectiveWeight, 0)) AS effectiveWeight
`;

const findUserByIdQuery = `
  MATCH (u:User {userId: $userId})
  RETURN u.userId AS userId,
         u.worldPassSubjectId AS worldPassSubjectId,
         u.displayName AS displayName,
         u.countryCode AS countryCode,
         toFloat(coalesce(u.reputationScore, 0)) AS reputationScore,
         toFloat(coalesce(u.effectiveWeight, 0)) AS effectiveWeight
  LIMIT 1
`;

function mapSessionUser(record: { get(key: string): unknown }): SessionUser {
  return {
    userId: String(record.get("userId")),
    worldPassSubjectId: String(record.get("worldPassSubjectId")),
    displayName: (record.get("displayName") as string | null | undefined) ?? null,
    countryCode: (record.get("countryCode") as string | null | undefined) ?? null,
    reputationScore: Number(record.get("reputationScore")),
    effectiveWeight: Number(record.get("effectiveWeight"))
  };
}

export async function upsertWorldPassUser(profile: WorldPassProfile) {
  const users = await runNeo4jWrite(
    upsertUserQuery,
    {
      userId: crypto.randomUUID(),
      worldPassSubjectId: profile.subject,
      countryCode: profile.countryCode ?? null,
      displayName: profile.displayName ?? null,
      email: profile.email ?? null
    },
    mapSessionUser
  );

  return users[0] ?? null;
}

export async function findUserById(userId: string) {
  const users = await runNeo4jRead(findUserByIdQuery, { userId }, mapSessionUser);
  return users[0] ?? null;
}

export async function upsertDevelopmentUser(alias: string) {
  const normalizedAlias = alias.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  return upsertWorldPassUser({
    subject: `dev:${normalizedAlias || crypto.randomUUID()}`,
    issuer: "comtouz-dev",
    displayName: alias.trim() || `Dev ${normalizedAlias}`,
    countryCode: "DEV"
  });
}