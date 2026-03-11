export const coreConstraints = [
  "A Rating must derive from exactly one finalized Encounter.",
  "A Business must be linked to a verified founder or manager.",
  "Ratings at or below 3 stars enter pending resolution for 24 hours.",
  "Jury cases must select 7 eligible experts with conflict filtering.",
  "New identities start with zero effective reputation weight."
] as const;

export const neo4jConstraintStatements = [
  "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE",
  "CREATE CONSTRAINT worldpass_subject_unique IF NOT EXISTS FOR (u:User) REQUIRE u.worldPassSubjectId IS UNIQUE",
  "CREATE CONSTRAINT business_id_unique IF NOT EXISTS FOR (b:Business) REQUIRE b.businessId IS UNIQUE",
  "CREATE CONSTRAINT encounter_id_unique IF NOT EXISTS FOR (e:Encounter) REQUIRE e.encounterId IS UNIQUE",
  "CREATE CONSTRAINT rating_id_unique IF NOT EXISTS FOR (r:Rating) REQUIRE r.ratingId IS UNIQUE",
  "CREATE CONSTRAINT dispute_id_unique IF NOT EXISTS FOR (d:Dispute) REQUIRE d.disputeId IS UNIQUE",
  "CREATE CONSTRAINT jury_case_id_unique IF NOT EXISTS FOR (j:JuryCase) REQUIRE j.juryCaseId IS UNIQUE",
  "CREATE CONSTRAINT jury_vote_id_unique IF NOT EXISTS FOR (v:JuryVote) REQUIRE v.voteId IS UNIQUE"
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