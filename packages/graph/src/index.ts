export const coreConstraints = [
  "A Rating must derive from exactly one finalized Encounter.",
  "A Business must be linked to a verified founder or manager.",
  "Ratings at or below 3 stars enter pending resolution for 24 hours.",
  "Jury cases must select 7 eligible experts with conflict filtering.",
  "New identities start with zero effective reputation weight.",
  "Sybil protection compares live identity topology against DeletedIdentitySnapshot nodes."
] as const;

export const neo4jConstraintStatements = [
  "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE",
  "CREATE CONSTRAINT worldpass_subject_unique IF NOT EXISTS FOR (u:User) REQUIRE u.worldPassSubjectId IS UNIQUE",
  "CREATE CONSTRAINT business_id_unique IF NOT EXISTS FOR (b:Business) REQUIRE b.businessId IS UNIQUE",
  "CREATE CONSTRAINT encounter_id_unique IF NOT EXISTS FOR (e:Encounter) REQUIRE e.encounterId IS UNIQUE",
  "CREATE CONSTRAINT rating_id_unique IF NOT EXISTS FOR (r:Rating) REQUIRE r.ratingId IS UNIQUE",
  "CREATE CONSTRAINT dispute_id_unique IF NOT EXISTS FOR (d:Dispute) REQUIRE d.disputeId IS UNIQUE",
  "CREATE CONSTRAINT jury_case_id_unique IF NOT EXISTS FOR (j:JuryCase) REQUIRE j.juryCaseId IS UNIQUE",
  "CREATE CONSTRAINT jury_vote_id_unique IF NOT EXISTS FOR (v:JuryVote) REQUIRE v.voteId IS UNIQUE",
  "CREATE CONSTRAINT deleted_snapshot_id_unique IF NOT EXISTS FOR (s:DeletedIdentitySnapshot) REQUIRE s.snapshotId IS UNIQUE"
] as const;

export function buildEncounterEligibilityQuery(userId: string) {
  return {
    text: `
      MATCH (u:User {userId: $userId})-[:PARTICIPATED_IN]->(e:Encounter {status: 'finalized'})
      RETURN u.userId AS userId, count(e) AS finalizedEncounters
    `,
    params: { userId }
  };
}

/**
 * Sybil protection: compares the live user's ego-network topology
 * (their direct encounter partners and shared interactions) against
 * stored DeletedIdentitySnapshot nodes. Returns candidate snapshots
 * ordered by overlap score so the caller can decide a similarity
 * threshold and flag or block the identity accordingly.
 *
 * Overlap score formula:
 *   sharedNeighbours / (liveNeighbourCount + snapshotNeighbourCount - sharedNeighbours)
 * (Jaccard index on the 1-hop encounter neighbourhood)
 */
export function buildSybilSimilarityQuery(userId: string, overlapThreshold = 0.4) {
  return {
    text: `
      MATCH (u:User {userId: $userId})-[:PARTICIPATED_IN]->(enc:Encounter)<-[:PARTICIPATED_IN]-(neighbour:User)
      WHERE neighbour.userId <> $userId
      WITH u, collect(DISTINCT neighbour.userId) AS liveNeighbours

      MATCH (snapshot:DeletedIdentitySnapshot)
      WITH u, liveNeighbours, snapshot,
           [n IN liveNeighbours WHERE n IN snapshot.neighbourIds] AS sharedNeighbours,
           size(liveNeighbours) AS liveCount,
           size(snapshot.neighbourIds) AS snapCount

      WITH snapshot,
           size(sharedNeighbours) AS shared,
           liveCount,
           snapCount,
           CASE
             WHEN (liveCount + snapCount - size(sharedNeighbours)) = 0 THEN 0.0
             ELSE toFloat(size(sharedNeighbours)) / toFloat(liveCount + snapCount - size(sharedNeighbours))
           END AS jaccardScore

      WHERE jaccardScore >= $overlapThreshold

      RETURN snapshot.snapshotId AS snapshotId,
             snapshot.deletedAt   AS deletedAt,
             snapshot.reason      AS reason,
             jaccardScore         AS similarityScore,
             shared               AS sharedNeighbourCount,
             liveCount            AS liveNeighbourCount,
             snapCount            AS snapshotNeighbourCount
      ORDER BY jaccardScore DESC
      LIMIT 10
    `,
    params: { userId, overlapThreshold }
  };
}