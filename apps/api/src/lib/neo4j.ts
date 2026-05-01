// apps/api/src/lib/neo4j.ts
// Neo4j AuraDB Free Tier
// Used for: destination graph, detour paths, relationship queries
// NOT for: user data, packages (that's PostgreSQL / Prisma)

import neo4j, { type Driver, type Session } from "neo4j-driver";

let _driver: Driver | null = null;

export function getDriver(): Driver {
  if (!_driver) {
    _driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
    );
  }
  return _driver;
}

export async function runQuery<T = unknown>(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const driver = getDriver();
  const session: Session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject() as T);
  } finally {
    await session.close();
  }
}

// ─── Seed graph schema reference ──────────────────────────
// Run these once to set up constraints:
//
// CREATE CONSTRAINT FOR (d:Destination) REQUIRE d.id IS UNIQUE;
// CREATE CONSTRAINT FOR (b:Business) REQUIRE b.id IS UNIQUE;
// CREATE CONSTRAINT FOR (p:Package) REQUIRE p.id IS UNIQUE;
//
// Key relationships:
// (:Destination)-[:DETOUR_FROM {distance_km, travel_time_min}]->(:Destination)
// (:Destination)-[:SIMILAR_TO {reason}]->(:Destination)
// (:Destination)-[:HAS_VIBE {tag}]->(:VibeTag)
// (:Business)-[:LOCATED_IN]->(:Destination)
// (:Package)-[:OFFERED_BY]->(:Business)
// (:Package)-[:COVERS]->(:Destination)
