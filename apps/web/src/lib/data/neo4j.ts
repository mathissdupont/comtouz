import neo4j, { type Driver, type Record as Neo4jRecord } from "neo4j-driver";
import { getEnv } from "@/lib/env";

declare global {
  var __comtouzNeo4jDriver__: Driver | undefined;
}

function createDriver() {
  const env = getEnv();
  return neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USERNAME, env.NEO4J_PASSWORD));
}

export function getNeo4jDriver() {
  const env = getEnv();
  const driver = globalThis.__comtouzNeo4jDriver__ ?? createDriver();

  if (env.NODE_ENV !== "production") {
    globalThis.__comtouzNeo4jDriver__ = driver;
  }

  return driver;
}

export async function runNeo4jWrite<T>(query: string, params: Record<string, unknown>, mapper: (record: Neo4jRecord) => T) {
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });

  try {
    const result = await session.executeWrite((transaction) => transaction.run(query, params));
    return result.records.map(mapper);
  } finally {
    await session.close();
  }
}

export async function runNeo4jRead<T>(query: string, params: Record<string, unknown>, mapper: (record: Neo4jRecord) => T) {
  const session = getNeo4jDriver().session({ defaultAccessMode: neo4j.session.READ });

  try {
    const result = await session.executeRead((transaction) => transaction.run(query, params));
    return result.records.map(mapper);
  } finally {
    await session.close();
  }
}