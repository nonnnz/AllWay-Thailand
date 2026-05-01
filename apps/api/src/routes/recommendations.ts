// apps/api/src/routes/recommendations.ts
import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";
import { runQuery } from "../lib/neo4j";
import {
  extractPreferences,
  generateDetourRecommendations,
} from "../lib/claude";

export const recommendationsRoutes = new Elysia({ prefix: "/api/recommendations" })

  // ─── POST /api/recommendations/detour ─────────────────────
  // Core feature: given current destination + prefs, return safe detours
  .post(
    "/detour",
    async ({ body }) => {
      // Step 1: Extract structured preferences (with AI or direct body)
      let prefs;
      if (body.rawMessage) {
        prefs = await extractPreferences(body.rawMessage);
      } else {
        prefs = {
          currentDestination: body.currentDestination || "Bangkok",
          days: body.days || 1,
          budgetTHB: body.budget || 3000,
          groupSize: body.groupSize || 1,
          vibePrefs: body.preferences || [],
          accessibilityNeeds: body.accessibility || [],
          crowdTolerance: "low" as const,
        };
      }

      // Step 2: Get candidate destinations from PostgreSQL
      // Exclude current destination, filter by province scope
      const SCOPE_PROVINCES = [
        "Bangkok", "Nonthaburi", "Pathum Thani", "Samut Prakan",
        "Nakhon Pathom", "Ayutthaya", "Chachoengsao", "Ratchaburi",
      ];

      const candidates = await prisma.destination.findMany({
        where: {
          province: { in: SCOPE_PROVINCES },
          nameEn: { not: prefs.currentDestination },
        },
        take: 15, // send top 15 to AI for ranking
      });

      if (candidates.length === 0) {
        return { recommendations: [], message: "No destinations found in scope." };
      }

      // Step 3: Get graph relationships from Neo4j (detour paths)
      // <!-- DEEP DIVE: this query finds destinations reachable from the current one -->
      let graphRelations: unknown[] = [];
      try {
        const currentDest = await prisma.destination.findFirst({
          where: {
            OR: [
              { nameEn: prefs.currentDestination },
              { name: prefs.currentDestination },
            ],
          },
          select: { id: true },
        });

        if (!currentDest) throw new Error("Current destination not found");

        graphRelations = await runQuery(
          `MATCH (p:Place {destinationId: $destinationId})-[r:DETOUR_TO|SIMILAR_TO]-(target:Place)
           RETURN target.name as name, type(r) as relation, r.distanceKm as distance
           LIMIT 10`,
          { destinationId: currentDest.id }
        );
      } catch {
        // Neo4j may not have data yet — fallback to PostgreSQL only
        console.warn("Neo4j query failed, falling back to PostgreSQL candidates only");
      }

      // Step 4: AI ranks and explains recommendations
      const recommendations = await generateDetourRecommendations(prefs, candidates);

      // Step 5: Attach packages to each recommendation
      const enriched = await Promise.all(
        recommendations.map(async (rec) => {
          const packages = await prisma.package.findMany({
            where: {
              destinationId: rec.destinationId,
              verificationStatus: "CURATED",
            },
            take: 3,
            select: {
              id: true,
              title: true,
              priceMin: true,
              priceMax: true,
              trustScore: true,
              includedServices: true,
              business: { select: { name: true, verificationStatus: true } },
            },
          });
          return { ...rec, packages, graphRelations };
        })
      );

      return { recommendations: enriched };
    },
    {
      body: t.Object({
        // Option A: raw natural language
        rawMessage: t.Optional(t.String()),
        // Option B: structured
        currentDestination: t.Optional(t.String()),
        days: t.Optional(t.Number()),
        budget: t.Optional(t.Number()),
        groupSize: t.Optional(t.Number()),
        preferences: t.Optional(t.Array(t.String())),
        accessibility: t.Optional(t.Array(t.String())),
      }),
      detail: { tags: ["recommendations"], summary: "Get AI-powered detour recommendations" },
    }
  );
