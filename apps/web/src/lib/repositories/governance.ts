import { jurySize, ratingResolutionHours, type JuryDecision } from "@comtouz/domain";
import { runNeo4jRead, runNeo4jWrite } from "@/lib/data/neo4j";

const createDisputeFromRatingQuery = `
  MATCH (rating:Rating {ratingId: $ratingId})-[:TARGETS]->(target:User)
  MATCH (author:User {userId: rating.authorUserId})
  MERGE (dispute:Dispute {ratingId: $ratingId})
  ON CREATE SET
    dispute.disputeId = $disputeId,
    dispute.status = 'pending_reply',
    dispute.category = rating.category,
    dispute.authorUserId = rating.authorUserId,
    dispute.targetUserId = rating.targetUserId,
    dispute.openedAt = datetime(),
    dispute.resolutionDeadline = datetime($resolutionDeadline)
  MERGE (rating)-[:HAS_DISPUTE]->(dispute)
  RETURN dispute.disputeId AS disputeId,
         dispute.ratingId AS ratingId,
         dispute.status AS status,
         dispute.category AS category,
         dispute.authorUserId AS authorUserId,
         dispute.targetUserId AS targetUserId,
         toString(dispute.openedAt) AS openedAt,
         toString(dispute.resolutionDeadline) AS resolutionDeadline,
         author.displayName AS authorDisplayName,
         target.displayName AS targetDisplayName
`;

const listUserDisputesQuery = `
  MATCH (dispute:Dispute)
  WHERE dispute.authorUserId = $userId OR dispute.targetUserId = $userId
  OPTIONAL MATCH (rating:Rating {ratingId: dispute.ratingId})
  OPTIONAL MATCH (author:User {userId: dispute.authorUserId})
  OPTIONAL MATCH (target:User {userId: dispute.targetUserId})
  OPTIONAL MATCH (dispute)-[:ESCALATED_TO]->(jury:JuryCase)
  RETURN dispute.disputeId AS disputeId,
         dispute.ratingId AS ratingId,
         dispute.status AS status,
         dispute.category AS category,
         dispute.authorUserId AS authorUserId,
         dispute.targetUserId AS targetUserId,
         toString(dispute.openedAt) AS openedAt,
         toString(dispute.resolutionDeadline) AS resolutionDeadline,
         dispute.replyMessage AS replyMessage,
         toString(dispute.replySubmittedAt) AS replySubmittedAt,
         rating.stars AS stars,
         rating.comment AS comment,
         author.displayName AS authorDisplayName,
         target.displayName AS targetDisplayName,
         jury.juryCaseId AS juryCaseId,
         jury.status AS juryStatus
  ORDER BY dispute.openedAt DESC
  LIMIT 12
`;

const listAssignedJuryCasesQuery = `
  MATCH (:User {userId: $userId})-[:ASSIGNED_TO]->(jury:JuryCase)
  MATCH (dispute:Dispute {disputeId: jury.disputeId})
  OPTIONAL MATCH (author:User {userId: dispute.authorUserId})
  OPTIONAL MATCH (target:User {userId: dispute.targetUserId})
  OPTIONAL MATCH (jury)<-[:ON]-(vote:JuryVote)
  WITH jury, dispute, author, target, count(vote) AS votesCast
  OPTIONAL MATCH (jury)<-[:ASSIGNED_TO]-(assigned:User)
  RETURN jury.juryCaseId AS juryCaseId,
         jury.disputeId AS disputeId,
         jury.category AS category,
         jury.status AS status,
         jury.finalDecision AS finalDecision,
         votesCast AS votesCast,
         count(assigned) AS assignedJurors,
         author.displayName AS authorDisplayName,
         target.displayName AS targetDisplayName
  ORDER BY jury.openedAt DESC
  LIMIT 12
`;

const replyToDisputeQuery = `
  MATCH (dispute:Dispute {disputeId: $disputeId})
  WHERE dispute.targetUserId = $userId AND dispute.status IN ['pending_reply', 'replied']
  SET dispute.replyMessage = $replyMessage,
      dispute.replySubmittedAt = datetime(),
      dispute.status = 'replied'
  RETURN dispute.disputeId AS disputeId,
         dispute.status AS status,
         dispute.replyMessage AS replyMessage,
         toString(dispute.replySubmittedAt) AS replySubmittedAt
`;

const resolveDisputeDirectlyQuery = `
  MATCH (dispute:Dispute {disputeId: $disputeId})
  WHERE dispute.authorUserId = $userId AND dispute.status IN ['pending_reply', 'replied', 'jury_review']
  MATCH (rating:Rating {ratingId: dispute.ratingId})
  SET dispute.status = 'resolved_direct',
      dispute.resolvedAt = datetime(),
      dispute.resolutionNote = $resolutionNote,
      rating.state = 'resolved'
  RETURN dispute.disputeId AS disputeId,
         dispute.status AS status,
         rating.state AS ratingState
`;

const findDisputeForEscalationQuery = `
  MATCH (dispute:Dispute {disputeId: $disputeId})
  WHERE dispute.authorUserId = $userId OR dispute.targetUserId = $userId
  OPTIONAL MATCH (dispute)-[:ESCALATED_TO]->(jury:JuryCase)
  RETURN dispute.disputeId AS disputeId,
         dispute.ratingId AS ratingId,
         dispute.category AS category,
         dispute.status AS status,
         dispute.authorUserId AS authorUserId,
         dispute.targetUserId AS targetUserId,
         jury.juryCaseId AS existingJuryCaseId
  LIMIT 1
`;

const selectEligibleJurorsQuery = `
  MATCH (dispute:Dispute {disputeId: $disputeId})
  MATCH (candidate:User)
  WHERE candidate.userId <> dispute.authorUserId
    AND candidate.userId <> dispute.targetUserId
    AND coalesce(candidate.status, 'active') = 'active'
  WITH candidate, rand() AS randomness
  ORDER BY coalesce(candidate.reputationScore, 0) DESC, randomness
  LIMIT $jurySize
  RETURN candidate.userId AS userId,
         candidate.displayName AS displayName,
         toFloat(coalesce(candidate.reputationScore, 0)) AS reputationScore
`;

const createJuryCaseQuery = `
  MATCH (dispute:Dispute {disputeId: $disputeId})
  MATCH (rating:Rating {ratingId: dispute.ratingId})
  CREATE (jury:JuryCase {
    juryCaseId: $juryCaseId,
    disputeId: dispute.disputeId,
    ratingId: dispute.ratingId,
    category: dispute.category,
    status: 'voting',
    requiredJurors: $requiredJurors,
    assignedJurors: $assignedJurors,
    votesCast: 0,
    openedAt: datetime()
  })
  MERGE (dispute)-[:ESCALATED_TO]->(jury)
  SET dispute.status = 'jury_review',
      rating.state = 'disputed'
  WITH jury
  UNWIND $jurorIds AS jurorId
  MATCH (juror:User {userId: jurorId})
  MERGE (juror)-[:ASSIGNED_TO]->(jury)
  WITH DISTINCT jury
  RETURN jury.juryCaseId AS juryCaseId,
         jury.disputeId AS disputeId,
         jury.category AS category,
         jury.status AS status,
         jury.assignedJurors AS assignedJurors,
         jury.votesCast AS votesCast
`;

const getJuryCaseSummaryQuery = `
  MATCH (jury:JuryCase {juryCaseId: $juryCaseId})
  OPTIONAL MATCH (jury)<-[:ON]-(vote:JuryVote)
  WITH jury, count(vote) AS votesCast
  OPTIONAL MATCH (jury)<-[:ASSIGNED_TO]-(juror:User)
  RETURN jury.juryCaseId AS juryCaseId,
         jury.disputeId AS disputeId,
         jury.category AS category,
         jury.status AS status,
         jury.finalDecision AS finalDecision,
         votesCast AS votesCast,
         count(juror) AS assignedJurors
  LIMIT 1
`;

const createJuryVoteQuery = `
  MATCH (juror:User {userId: $userId})-[:ASSIGNED_TO]->(jury:JuryCase {juryCaseId: $juryCaseId})
  WHERE NOT EXISTS {
    MATCH (juror)-[:CAST]->(:JuryVote)-[:ON]->(jury)
  }
  CREATE (vote:JuryVote {
    voteId: $voteId,
    decision: $decision,
    rationale: $rationale,
    submittedAt: datetime()
  })
  CREATE (juror)-[:CAST]->(vote)
  CREATE (vote)-[:ON]->(jury)
  RETURN vote.voteId AS voteId,
         vote.decision AS decision,
         toString(vote.submittedAt) AS submittedAt
`;

const finalizeJuryCaseQuery = `
  MATCH (jury:JuryCase {juryCaseId: $juryCaseId})
  MATCH (dispute:Dispute {disputeId: jury.disputeId})
  MATCH (rating:Rating {ratingId: dispute.ratingId})
  MATCH (jury)<-[:ON]-(juryVote:JuryVote)<-[:CAST]-(juror:User)
  WITH jury, dispute, rating, juryVote, juror,
       CASE WHEN $finalDecision = 'uphold' THEN 'jury_upheld' ELSE 'jury_rejected' END AS disputeOutcome,
       CASE WHEN $finalDecision = 'uphold' THEN 'active' ELSE 'resolved' END AS nextRatingState
  SET juror.justiceScore = toFloat(coalesce(juror.justiceScore, 0)) + CASE WHEN juryVote.decision = $finalDecision THEN 1 ELSE -1 END
  WITH DISTINCT jury, dispute, rating, disputeOutcome, nextRatingState
  SET jury.status = 'decided',
      jury.finalDecision = $finalDecision,
      jury.decisionAt = datetime(),
      dispute.status = disputeOutcome,
      dispute.resolvedAt = datetime(),
      rating.state = nextRatingState
  RETURN jury.juryCaseId AS juryCaseId,
         jury.status AS status,
         jury.finalDecision AS finalDecision,
         dispute.status AS disputeStatus,
         rating.state AS ratingState
`;

function mapDispute(record: { get(key: string): unknown }) {
  return {
    disputeId: String(record.get("disputeId")),
    ratingId: String(record.get("ratingId")),
    status: String(record.get("status")),
    category: String(record.get("category")),
    authorUserId: String(record.get("authorUserId")),
    targetUserId: String(record.get("targetUserId")),
    openedAt: String(record.get("openedAt")),
    resolutionDeadline: String(record.get("resolutionDeadline")),
    replyMessage: (record.get("replyMessage") as string | null | undefined) ?? null,
    replySubmittedAt: (record.get("replySubmittedAt") as string | null | undefined) ?? null,
    stars: record.get("stars") == null ? null : Number(record.get("stars")),
    comment: (record.get("comment") as string | null | undefined) ?? null,
    authorDisplayName: (record.get("authorDisplayName") as string | null | undefined) ?? null,
    targetDisplayName: (record.get("targetDisplayName") as string | null | undefined) ?? null,
    juryCaseId: (record.get("juryCaseId") as string | null | undefined) ?? null,
    juryStatus: (record.get("juryStatus") as string | null | undefined) ?? null
  };
}

function mapJuryCase(record: { get(key: string): unknown }) {
  return {
    juryCaseId: String(record.get("juryCaseId")),
    disputeId: String(record.get("disputeId")),
    category: String(record.get("category")),
    status: String(record.get("status")),
    finalDecision: (record.get("finalDecision") as string | null | undefined) ?? null,
    votesCast: Number(record.get("votesCast")),
    assignedJurors: Number(record.get("assignedJurors")),
    authorDisplayName: (record.get("authorDisplayName") as string | null | undefined) ?? null,
    targetDisplayName: (record.get("targetDisplayName") as string | null | undefined) ?? null
  };
}

export async function createDisputeForRating(ratingId: string) {
  const resolutionDeadline = new Date(Date.now() + ratingResolutionHours * 60 * 60 * 1000).toISOString();
  const disputes = await runNeo4jWrite(
    createDisputeFromRatingQuery,
    { disputeId: crypto.randomUUID(), ratingId, resolutionDeadline },
    mapDispute
  );

  return disputes[0] ?? null;
}

export async function listUserDisputes(userId: string) {
  return runNeo4jRead(listUserDisputesQuery, { userId }, mapDispute);
}

export async function listAssignedJuryCases(userId: string) {
  return runNeo4jRead(listAssignedJuryCasesQuery, { userId }, mapJuryCase);
}

export async function replyToDispute(userId: string, disputeId: string, replyMessage: string) {
  const replies = await runNeo4jWrite(replyToDisputeQuery, { userId, disputeId, replyMessage }, (record) => ({
    disputeId: String(record.get("disputeId")),
    status: String(record.get("status")),
    replyMessage: String(record.get("replyMessage")),
    replySubmittedAt: String(record.get("replySubmittedAt"))
  }));

  return replies[0] ?? null;
}

export async function resolveDisputeDirectly(userId: string, disputeId: string, resolutionNote: string) {
  const disputes = await runNeo4jWrite(resolveDisputeDirectlyQuery, { userId, disputeId, resolutionNote }, (record) => ({
    disputeId: String(record.get("disputeId")),
    status: String(record.get("status")),
    ratingState: String(record.get("ratingState"))
  }));

  return disputes[0] ?? null;
}

export async function escalateDisputeToJury(userId: string, disputeId: string) {
  const disputes = await runNeo4jRead(findDisputeForEscalationQuery, { userId, disputeId }, (record) => ({
    disputeId: String(record.get("disputeId")),
    ratingId: String(record.get("ratingId")),
    category: String(record.get("category")),
    status: String(record.get("status")),
    authorUserId: String(record.get("authorUserId")),
    targetUserId: String(record.get("targetUserId")),
    existingJuryCaseId: (record.get("existingJuryCaseId") as string | null | undefined) ?? null
  }));

  const dispute = disputes[0];
  if (!dispute) {
    return null;
  }

  if (dispute.existingJuryCaseId) {
    const existing = await runNeo4jRead(getJuryCaseSummaryQuery, { juryCaseId: dispute.existingJuryCaseId }, mapJuryCase);
    return existing[0] ?? null;
  }

  const jurors = await runNeo4jRead(selectEligibleJurorsQuery, { disputeId, jurySize }, (record) => ({
    userId: String(record.get("userId")),
    displayName: (record.get("displayName") as string | null | undefined) ?? null,
    reputationScore: Number(record.get("reputationScore"))
  }));

  const juryCases = await runNeo4jWrite(
    createJuryCaseQuery,
    {
      disputeId,
      juryCaseId: crypto.randomUUID(),
      requiredJurors: jurySize,
      assignedJurors: jurors.length,
      jurorIds: jurors.map((juror) => juror.userId)
    },
    mapJuryCase
  );

  return juryCases[0] ?? null;
}

export async function voteOnJuryCase(userId: string, juryCaseId: string, decision: JuryDecision, rationale?: string) {
  const votes = await runNeo4jWrite(
    createJuryVoteQuery,
    {
      userId,
      juryCaseId,
      voteId: crypto.randomUUID(),
      decision,
      rationale: rationale?.trim() || null
    },
    (record) => ({
      voteId: String(record.get("voteId")),
      decision: String(record.get("decision")),
      submittedAt: String(record.get("submittedAt"))
    })
  );

  const vote = votes[0] ?? null;
  if (!vote) {
    return null;
  }

  const summary = (await runNeo4jRead(getJuryCaseSummaryQuery, { juryCaseId }, mapJuryCase))[0] ?? null;
  if (!summary) {
    return { vote, juryCase: null };
  }

  const decisionThreshold = Math.min(4, Math.max(summary.assignedJurors, 1));
  if (summary.status !== "decided" && summary.votesCast >= decisionThreshold) {
    const upholdVotesQuery = `
      MATCH (jury:JuryCase {juryCaseId: $juryCaseId})<-[:ON]-(vote:JuryVote)
      RETURN size([decision IN collect(vote.decision) WHERE decision = 'uphold']) AS upholdVotes,
             size([decision IN collect(vote.decision) WHERE decision = 'reject']) AS rejectVotes
    `;

    const voteCounts = await runNeo4jRead(upholdVotesQuery, { juryCaseId }, (record) => ({
      upholdVotes: Number(record.get("upholdVotes")),
      rejectVotes: Number(record.get("rejectVotes"))
    }));

    const finalDecision = (voteCounts[0]?.upholdVotes ?? 0) >= (voteCounts[0]?.rejectVotes ?? 0) ? "uphold" : "reject";
    const finalized = await runNeo4jWrite(finalizeJuryCaseQuery, { juryCaseId, finalDecision }, mapJuryCase);
    return {
      vote,
      juryCase: finalized[0] ?? summary
    };
  }

  return {
    vote,
    juryCase: summary
  };
}