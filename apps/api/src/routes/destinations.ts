// apps/api/src/routes/destinations.ts
import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";
import { runQuery } from "../lib/neo4j";

export const destinationsRoutes = new Elysia({ prefix: "/api/destinations" })

  // GET /api/destinations - list all in scope
  .get("/", async () => {
    const destinations = await prisma.destination.findMany({
      orderBy: { localValueScore: "desc" },
      select: {
        id: true,
        name: true,
        nameEn: true,
        province: true,
        latitude: true,
        longitude: true,
        category: true,
        vibeTags: true,
        crowdScore: true,
        trustScore: true,
        localValueScore: true,
        imageUrl: true,
      },
    });
    return { destinations };
  })

  // GET /api/destinations/:id - destination detail
  .get(
    "/:id",
    async ({ params }) => {
      const dest = await prisma.destination.findUnique({
        where: { id: params.id },
        include: {
          attractions: { take: 10 },
          events: {
            where: { endDate: { gte: new Date() } },
            take: 5,
            orderBy: { startDate: "asc" },
          },
          packages: {
            where: { verificationStatus: "CURATED" },
            take: 5,
            orderBy: { trustScore: "desc" },
            include: {
              business: { select: { name: true } },
            },
          },
          complaints: { take: 3, orderBy: { reportedAt: "desc" } },
        },
      });
      if (!dest) return new Response("Not found", { status: 404 });
      return { destination: dest };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  // GET /api/destinations/:id/graph
  // Returns nodes + edges for graph visualization in frontend
  // Frontend uses this with react-force-graph or vis.js
  .get(
    "/:id/graph",
    async ({ params }) => {
      const dest = await prisma.destination.findUnique({
        where: { id: params.id },
        select: { id: true, nameEn: true },
      });
      if (!dest) return new Response("Not found", { status: 404 });

      // <!-- DEEP DIVE: enrich this query as Neo4j data grows -->
      let nodes: unknown[] = [];
      let edges: unknown[] = [];

      try {
        const records = await runQuery<{
          source: string;
          sourceId: string;
          relation: string;
          target: string;
          targetId: string;
          props: Record<string, unknown>;
        }>(
          `MATCH (p:Place {destinationId: $destinationId})-[r:DETOUR_TO|SIMILAR_TO]-(other:Place)
           RETURN p.name as source, p.uid as sourceId, 
                  type(r) as relation, 
                  other.name as target, other.uid as targetId,
                  properties(r) as props
           LIMIT 20`,
          { destinationId: dest.id }
        );

        // Convert to graph format expected by frontend visualization library
        const nodeSet = new Map<string, object>();
        const edgeList: object[] = [];

        for (const r of records) {
          nodeSet.set(r.sourceId, { id: r.sourceId, label: r.source, type: "destination" });
          nodeSet.set(r.targetId, { id: r.targetId, label: r.target, type: "destination" });
          edgeList.push({
            source: r.sourceId,
            target: r.targetId,
            label: r.relation,
            ...r.props,
          });
        }

        nodes = Array.from(nodeSet.values());
        edges = edgeList;
      } catch {
        // Fallback: return simple 2-node graph from PostgreSQL
        const dest2 = await prisma.destination.findUnique({
          where: { id: params.id },
          select: { id: true, nameEn: true },
        });
        nodes = [dest2];
        edges = [];
      }

      return { nodes, edges };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );
