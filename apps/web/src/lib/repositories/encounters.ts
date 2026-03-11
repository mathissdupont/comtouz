import { runNeo4jWrite } from "@/lib/data/neo4j";

const finalizeEncounterQuery = `
  MATCH (initiator:User {userId: $initiatorUserId})
  MATCH (claimant:User {userId: $claimantUserId})
  CREATE (encounter:Encounter {
    encounterId: $encounterId,
    status: 'finalized',
    channel: $channel,
    resolvedContext: $resolvedContext,
    initiatedAt: datetime($initiatedAt),
    finalizedAt: datetime($finalizedAt),
    nonce: $nonce,
    createdAt: datetime()
  })
  CREATE (initiator)-[:PARTICIPATED_IN]->(encounter)
  CREATE (claimant)-[:PARTICIPATED_IN]->(encounter)
  CREATE (initiatorEntitlement:RatingEntitlement {
    entitlementId: $initiatorEntitlementId,
    encounterId: $encounterId,
    authorUserId: $initiatorUserId,
    targetUserId: $claimantUserId,
    context: $resolvedContext,
    status: 'open',
    createdAt: datetime()
  })
  CREATE (claimantEntitlement:RatingEntitlement {
    entitlementId: $claimantEntitlementId,
    encounterId: $encounterId,
    authorUserId: $claimantUserId,
    targetUserId: $initiatorUserId,
    context: $resolvedContext,
    status: 'open',
    createdAt: datetime()
  })
  CREATE (initiator)-[:CAN_RATE]->(initiatorEntitlement)
  CREATE (claimant)-[:CAN_RATE]->(claimantEntitlement)
  CREATE (initiatorEntitlement)-[:FOR_ENCOUNTER]->(encounter)
  CREATE (claimantEntitlement)-[:FOR_ENCOUNTER]->(encounter)
  RETURN encounter.encounterId AS encounterId,
         encounter.status AS status,
         encounter.resolvedContext AS resolvedContext,
         encounter.channel AS channel,
         encounter.finalizedAt AS finalizedAt,
         initiatorEntitlement.entitlementId AS initiatorEntitlementId,
         claimantEntitlement.entitlementId AS claimantEntitlementId
`;

export interface FinalizedEncounterRecord {
  encounterId: string;
  status: string;
  resolvedContext: string;
  channel: string;
  finalizedAt: string;
  initiatorEntitlementId: string;
  claimantEntitlementId: string;
}

export async function finalizeEncounter(params: {
  encounterId: string;
  nonce: string;
  initiatorUserId: string;
  claimantUserId: string;
  channel: string;
  resolvedContext: string;
  initiatedAt: string;
  finalizedAt: string;
  initiatorEntitlementId: string;
  claimantEntitlementId: string;
}) {
  const records = await runNeo4jWrite(finalizeEncounterQuery, params, (record) => ({
    encounterId: String(record.get("encounterId")),
    status: String(record.get("status")),
    resolvedContext: String(record.get("resolvedContext")),
    channel: String(record.get("channel")),
    finalizedAt: String(record.get("finalizedAt")),
    initiatorEntitlementId: String(record.get("initiatorEntitlementId")),
    claimantEntitlementId: String(record.get("claimantEntitlementId"))
  }));

  return records[0] ?? null;
}