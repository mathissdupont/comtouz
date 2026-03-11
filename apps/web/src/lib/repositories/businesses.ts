import { runNeo4jRead, runNeo4jWrite } from "@/lib/data/neo4j";

const createBusinessQuery = `
  MATCH (founder:User {userId: $founderUserId})
  CREATE (business:Business {
    businessId: $businessId,
    legalName: $legalName,
    displayName: $displayName,
    categories: $categories,
    status: 'active',
    createdAt: datetime()
  })
  CREATE (founder)-[:FOUNDED]->(business)
  CREATE (founder)-[:MANAGES {role: 'founder'}]->(business)
  RETURN business.businessId AS businessId,
         business.legalName AS legalName,
         business.displayName AS displayName,
         business.categories AS categories,
         founder.userId AS founderUserId,
         founder.displayName AS founderDisplayName,
         0 AS employeeCount
`;

const listManagedBusinessesQuery = `
  MATCH (manager:User {userId: $userId})-[:MANAGES|FOUNDED]->(business:Business)
  OPTIONAL MATCH (employee:User)-[:WORKS_AT]->(business)
  RETURN business.businessId AS businessId,
         business.legalName AS legalName,
         business.displayName AS displayName,
         business.categories AS categories,
         manager.userId AS founderUserId,
         manager.displayName AS founderDisplayName,
         count(DISTINCT employee) AS employeeCount
  ORDER BY business.createdAt DESC
`;

const linkEmployeeQuery = `
  MATCH (manager:User {userId: $managerUserId})-[:MANAGES|FOUNDED]->(business:Business {businessId: $businessId})
  MATCH (employee:User {userId: $employeeUserId})
  MERGE (employee)-[works:WORKS_AT]->(business)
  ON CREATE SET works.role = $role, works.joinedAt = datetime()
  ON MATCH SET works.role = $role
  RETURN business.businessId AS businessId,
         business.displayName AS displayName,
         employee.userId AS employeeUserId,
         employee.displayName AS employeeDisplayName,
         works.role AS role
`;

function mapBusiness(record: { get(key: string): unknown }) {
  return {
    businessId: String(record.get("businessId")),
    legalName: String(record.get("legalName")),
    displayName: String(record.get("displayName")),
    categories: ((record.get("categories") as string[] | null | undefined) ?? []).map((item) => String(item)),
    founderUserId: String(record.get("founderUserId")),
    founderDisplayName: (record.get("founderDisplayName") as string | null | undefined) ?? null,
    employeeCount: Number(record.get("employeeCount"))
  };
}

export async function createBusiness(founderUserId: string, legalName: string, displayName: string, categories: string[]) {
  const businesses = await runNeo4jWrite(
    createBusinessQuery,
    {
      businessId: crypto.randomUUID(),
      founderUserId,
      legalName,
      displayName,
      categories
    },
    mapBusiness
  );

  return businesses[0] ?? null;
}

export async function listManagedBusinesses(userId: string) {
  return runNeo4jRead(listManagedBusinessesQuery, { userId }, mapBusiness);
}

export async function linkEmployeeToBusiness(managerUserId: string, businessId: string, employeeUserId: string, role: string) {
  const links = await runNeo4jWrite(linkEmployeeQuery, { managerUserId, businessId, employeeUserId, role }, (record) => ({
    businessId: String(record.get("businessId")),
    displayName: String(record.get("displayName")),
    employeeUserId: String(record.get("employeeUserId")),
    employeeDisplayName: (record.get("employeeDisplayName") as string | null | undefined) ?? null,
    role: String(record.get("role"))
  }));

  return links[0] ?? null;
}