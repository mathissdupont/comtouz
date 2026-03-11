import { lowRatingThreshold } from "@comtouz/domain";
import { runNeo4jRead, runNeo4jWrite } from "@/lib/data/neo4j";
import { createDisputeForRating } from "@/lib/repositories/governance";

const listOpenEntitlementsQuery = `
  MATCH (:User {userId: $userId})-[:CAN_RATE]->(entitlement:RatingEntitlement {status: 'open'})-[:FOR_ENCOUNTER]->(encounter:Encounter)
  MATCH (target:User {userId: entitlement.targetUserId})
  RETURN entitlement.entitlementId AS entitlementId,
         entitlement.encounterId AS encounterId,
         entitlement.authorUserId AS authorUserId,
         entitlement.targetUserId AS targetUserId,
         entitlement.context AS context,
         entitlement.status AS status,
         toString(entitlement.createdAt) AS createdAt,
         target.displayName AS targetDisplayName
  ORDER BY entitlement.createdAt DESC
`;

const createRatingQuery = `
  MATCH (author:User {userId: $authorUserId})-[:CAN_RATE]->(entitlement:RatingEntitlement {entitlementId: $entitlementId, status: 'open'})-[:FOR_ENCOUNTER]->(encounter:Encounter)
  MATCH (target:User {userId: entitlement.targetUserId})
  CREATE (rating:Rating {
    ratingId: $ratingId,
    stars: $stars,
    comment: $comment,
    state: $state,
    category: entitlement.context,
    createdAt: datetime(),
    encounterId: entitlement.encounterId,
    authorUserId: $authorUserId,
    targetUserId: entitlement.targetUserId
  })
  CREATE (author)-[:RATED]->(rating)
  CREATE (rating)-[:TARGETS]->(target)
  CREATE (rating)-[:DERIVED_FROM]->(encounter)
  SET entitlement.status = 'used',
      entitlement.usedAt = datetime(),
      entitlement.ratingId = $ratingId
  RETURN rating.ratingId AS ratingId,
         rating.stars AS stars,
         rating.state AS state,
         rating.category AS category,
         toString(rating.createdAt) AS createdAt,
         target.displayName AS targetDisplayName,
         target.userId AS targetUserId
`;

const listRecentRatingsQuery = `
  MATCH (author:User {userId: $userId})-[:RATED]->(rating:Rating)-[:TARGETS]->(target:User)
  RETURN rating.ratingId AS ratingId,
         rating.stars AS stars,
         rating.state AS state,
         rating.category AS category,
         rating.comment AS comment,
         toString(rating.createdAt) AS createdAt,
         target.displayName AS targetDisplayName,
         target.userId AS targetUserId
  ORDER BY rating.createdAt DESC
  LIMIT 12
`;

export interface OpenEntitlement {
  entitlementId: string;
  encounterId: string;
  authorUserId: string;
  targetUserId: string;
  context: string;
  status: string;
  createdAt: string;
  targetDisplayName: string | null;
}

export interface UserRatingRecord {
  ratingId: string;
  stars: number;
  state: string;
  category: string;
  comment: string | null;
  createdAt: string;
  targetDisplayName: string | null;
  targetUserId: string;
  disputeId?: string | null;
}

export async function listOpenEntitlements(userId: string) {
  return runNeo4jRead(listOpenEntitlementsQuery, { userId }, (record) => ({
    entitlementId: String(record.get("entitlementId")),
    encounterId: String(record.get("encounterId")),
    authorUserId: String(record.get("authorUserId")),
    targetUserId: String(record.get("targetUserId")),
    context: String(record.get("context")),
    status: String(record.get("status")),
    createdAt: String(record.get("createdAt")),
    targetDisplayName: (record.get("targetDisplayName") as string | null | undefined) ?? null
  }));
}

export async function createRating(params: {
  entitlementId: string;
  authorUserId: string;
  stars: number;
  comment?: string;
}) {
  const state = params.stars <= lowRatingThreshold ? "pending_resolution" : "active";

  const ratings = await runNeo4jWrite(
    createRatingQuery,
    {
      ratingId: crypto.randomUUID(),
      entitlementId: params.entitlementId,
      authorUserId: params.authorUserId,
      stars: params.stars,
      comment: params.comment?.trim() || null,
      state
    },
    (record) => ({
      ratingId: String(record.get("ratingId")),
      stars: Number(record.get("stars")),
      state: String(record.get("state")),
      category: String(record.get("category")),
      createdAt: String(record.get("createdAt")),
      targetDisplayName: (record.get("targetDisplayName") as string | null | undefined) ?? null,
      targetUserId: String(record.get("targetUserId"))
    })
  );

  const rating = ratings[0] ?? null;

  if (!rating) {
    return null;
  }

  if (rating.state === "pending_resolution") {
    const dispute = await createDisputeForRating(rating.ratingId);
    return {
      ...rating,
      disputeId: dispute?.disputeId ?? null
    };
  }

  return rating;
}

export async function listRecentRatings(userId: string) {
  return runNeo4jRead(listRecentRatingsQuery, { userId }, (record) => ({
    ratingId: String(record.get("ratingId")),
    stars: Number(record.get("stars")),
    state: String(record.get("state")),
    category: String(record.get("category")),
    comment: (record.get("comment") as string | null | undefined) ?? null,
    createdAt: String(record.get("createdAt")),
    targetDisplayName: (record.get("targetDisplayName") as string | null | undefined) ?? null,
    targetUserId: String(record.get("targetUserId"))
  }));
}