import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";
import { runQuery } from "../lib/neo4j";
import { extractPreferences, generateDetourRecommendations } from "../lib/claude";

type IngestJob = {
  id: string;
  kind: "tat-sync" | "tat-master-import" | "accessibility-sync" | "fair-price-sync";
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  note?: string;
};

const ingestJobs = new Map<string, IngestJob>();

function nowIso() {
  return new Date().toISOString();
}

function enqueueJob(kind: IngestJob["kind"], note?: string): IngestJob {
  const job: IngestJob = {
    id: crypto.randomUUID(),
    kind,
    status: "queued",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    note,
  };
  ingestJobs.set(job.id, job);
  return job;
}

function parseBoolean(raw?: string) {
  if (!raw) return undefined;
  return raw.toLowerCase() === "true";
}

function parseSeasonToCode(raw?: string) {
  if (!raw) return undefined;
  const value = raw.toLowerCase();
  if (value === "hot") return "HOT";
  if (value === "rain") return "RAIN";
  if (value === "cool") return "COOL";
  return undefined;
}

function buildUserReportSource(userId?: string, source?: string) {
  if (source) return source;
  if (!userId) return "user_report";
  return `user_report:${userId}`;
}

async function getPlaceById(placeId: string) {
  const byId = await prisma.tatPoi.findUnique({ where: { id: placeId } });
  if (byId) return byId;
  return prisma.tatPoi.findFirst({ where: { sourceId: placeId } });
}

function estimateCurrentSeason() {
  const month = new Date().getUTCMonth() + 1;
  if (month >= 3 && month <= 5) return "hot";
  if (month >= 6 && month <= 10) return "rain";
  return "cool";
}

type ChatIntentKind =
  | "price"
  | "culture"
  | "report"
  | "discovery"
  | "trust"
  | "detour"
  | "itinerary"
  | "general";

function detectChatIntent(message: string): {
  intent: ChatIntentKind;
  confidence: number;
  suggestedEndpoint: string;
  suggestedActions: string[];
} {
  const text = message.toLowerCase();

  if (/(scam|unsafe|fraud|cheat|overcharg|report|risk|danger)/.test(text)) {
    return {
      intent: "report",
      confidence: 0.88,
      suggestedEndpoint: "/api/v1/reports",
      suggestedActions: ["open_report_flow", "show_risk_context"],
    };
  }

  if (/(price|cost|expensive|cheap|fair|baht|thb|budget)/.test(text)) {
    return {
      intent: "price",
      confidence: 0.86,
      suggestedEndpoint: "/api/v1/fair-price/places/{id}",
      suggestedActions: ["show_fair_price", "open_place_detail"],
    };
  }

  if (/(culture|etiquette|temple|respect|dos|donts|taboo|local custom)/.test(text)) {
    return {
      intent: "culture",
      confidence: 0.84,
      suggestedEndpoint: "/api/v1/cultural-context/places/{id}",
      suggestedActions: ["show_cultural_context", "open_place_detail"],
    };
  }

  if (/(trust|safe|reliable|verified|review|complaint)/.test(text)) {
    return {
      intent: "trust",
      confidence: 0.82,
      suggestedEndpoint: "/api/v1/trust/places/{id}",
      suggestedActions: ["show_trust_breakdown", "open_place_detail"],
    };
  }

  if (/(detour|alternative|instead|quiet|less crowd|another place)/.test(text)) {
    return {
      intent: "detour",
      confidence: 0.83,
      suggestedEndpoint: "/api/v1/recommendations/detour",
      suggestedActions: ["run_detour_recommendation", "show_graph_neighbors"],
    };
  }

  if (/(itinerary|plan|schedule|day 1|day 2|route)/.test(text)) {
    return {
      intent: "itinerary",
      confidence: 0.8,
      suggestedEndpoint: "/api/v1/recommendations/itinerary",
      suggestedActions: ["build_itinerary", "show_routes"],
    };
  }

  if (/(find|recommend|where|go|visit|nearby|discover)/.test(text)) {
    return {
      intent: "discovery",
      confidence: 0.76,
      suggestedEndpoint: "/api/v1/discovery/places",
      suggestedActions: ["search_places", "show_candidates"],
    };
  }

  return {
    intent: "general",
    confidence: 0.55,
    suggestedEndpoint: "/api/chat",
    suggestedActions: ["ask_clarifying_question"],
  };
}

export const v1Routes = new Elysia({ prefix: "/api/v1" })
  .get(
    "/discovery/places",
    async ({ query }) => {
      const limit = Math.min(Number(query.limit || 20), 100);
      const page = Math.max(Number(query.page || 1), 1);
      const skip = (page - 1) * limit;
      const seasonCode = parseSeasonToCode(query.season);
      const accessibleOnly = parseBoolean(query.accessibleOnly) === true;
      const secondaryOnly = parseBoolean(query.secondaryOnly) === true;
      const hasSha = parseBoolean(query.hasSha);
      const updatedAfter = query.updatedAfter ? new Date(query.updatedAfter) : undefined;

      const where: any = {
        ...(query.kind && { kind: query.kind.toUpperCase() }),
        ...(query.keyword && {
          OR: [
            { name: { contains: query.keyword, mode: "insensitive" as const } },
            { nameEn: { contains: query.keyword, mode: "insensitive" as const } },
          ],
        }),
        ...(query.provinceId && { provinceId: Number(query.provinceId) }),
        ...(query.categoryId && { categoryId: Number(query.categoryId) }),
        ...(updatedAfter && { updatedAtSource: { gte: updatedAfter } }),
      };

      if (hasSha === true) where.shaName = { not: null };

      const sortBy = query.sortBy || "updated_desc";
      const orderBy: any =
        sortBy === "viewer_desc"
          ? { viewerCount: "desc" }
          : sortBy === "updated_desc"
            ? { updatedAtSource: "desc" }
            : sortBy === "trust_desc"
              ? { destination: { trustScore: "desc" } }
            : { updatedAtSource: "desc" };

      const places = await prisma.tatPoi.findMany({
        where,
        include: {
          destination: {
            select: {
              id: true,
              province: true,
              trustScore: true,
              crowdScore: true,
              seasonCode: true,
              seasonFitScore: true,
              accessibilityScore: true,
              isSecondaryCity: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip,
      });

      const filtered = places.filter((place) => {
        if (query.region && place.province?.region !== query.region) return false;
        if (seasonCode && place.destination?.seasonCode !== seasonCode) return false;
        if (secondaryOnly && !place.destination?.isSecondaryCity) return false;
        if (accessibleOnly) {
          const score = place.destination?.accessibilityScore ?? 0;
          if (score < 0.5) return false;
        }
        return true;
      });

      const sorted = [...filtered];
      if (sortBy === "season_fit_desc") {
        sorted.sort((a, b) => (b.destination?.seasonFitScore ?? 0) - (a.destination?.seasonFitScore ?? 0));
      } else if (sortBy === "accessibility_desc") {
        sorted.sort((a, b) => (b.destination?.accessibilityScore ?? 0) - (a.destination?.accessibilityScore ?? 0));
      } else if (sortBy === "trust_desc") {
        sorted.sort((a, b) => (b.destination?.trustScore ?? 0) - (a.destination?.trustScore ?? 0));
      } else if (sortBy === "relevance") {
        const kw = (query.keyword || "").toLowerCase().trim();
        const relevance = (place: (typeof sorted)[number]) => {
          if (!kw) return 0;
          const n = (place.name || "").toLowerCase();
          const en = (place.nameEn || "").toLowerCase();
          if (n === kw || en === kw) return 100;
          if (n.startsWith(kw) || en.startsWith(kw)) return 60;
          if (n.includes(kw) || en.includes(kw)) return 30;
          return 0;
        };
        sorted.sort((a, b) => {
          const r = relevance(b) - relevance(a);
          if (r !== 0) return r;
          return (b.viewerCount ?? 0) - (a.viewerCount ?? 0);
        });
      }

      return {
        data: sorted,
        paging: { page, limit, returned: sorted.length },
      };
    },
    {
      query: t.Object({
        kind: t.Optional(
          t.Union([
            t.Literal("attraction"),
            t.Literal("restaurant"),
            t.Literal("accommodation"),
            t.Literal("event"),
          ]),
        ),
        keyword: t.Optional(t.String()),
        provinceId: t.Optional(t.String()),
        region: t.Optional(t.String()),
        categoryId: t.Optional(t.String()),
        season: t.Optional(t.Union([t.Literal("hot"), t.Literal("rain"), t.Literal("cool")])),
        accessibleOnly: t.Optional(t.String()),
        secondaryOnly: t.Optional(t.String()),
        hasSha: t.Optional(t.String()),
        updatedAfter: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        page: t.Optional(t.String()),
        sortBy: t.Optional(
          t.Union([
            t.Literal("relevance"),
            t.Literal("updated_desc"),
            t.Literal("viewer_desc"),
            t.Literal("season_fit_desc"),
            t.Literal("accessibility_desc"),
            t.Literal("trust_desc"),
          ]),
        ),
      }),
    },
  )
  .get(
    "/discovery/places/:id",
    async ({ params }) => {
      const place = await getPlaceById(params.id);
      if (!place) return new Response("Not found", { status: 404 });

      const destination = place.destinationId
        ? await prisma.destination.findUnique({
            where: { id: place.destinationId },
            include: {
              complaints: { orderBy: { reportedAt: "desc" }, take: 5 },
              accessibilitySignals: { take: 5 },
            },
          })
        : null;

      const fairPriceNearby =
        place.latitude && place.longitude
          ? await prisma.$queryRawUnsafe<
              Array<{ avg_min: number | null; avg_max: number | null; sample_count: bigint }>
            >(
              `SELECT AVG("priceMin") AS avg_min, AVG("priceMax") AS avg_max, COUNT(*) AS sample_count
               FROM restaurant_price_points
               WHERE ABS(latitude - $1) <= 0.03 AND ABS(longitude - $2) <= 0.03`,
              place.latitude,
              place.longitude,
            )
          : [];

      return {
        place,
        trustSummary: {
          trustScore: destination?.trustScore ?? null,
          crowdScore: destination?.crowdScore ?? null,
          complaintCount: destination?.complaints.length ?? 0,
        },
        fairPriceGuidance:
          fairPriceNearby.length > 0
            ? {
                avgMin: fairPriceNearby[0].avg_min,
                avgMax: fairPriceNearby[0].avg_max,
                sampleCount: Number(fairPriceNearby[0].sample_count || 0),
                currency: "THB",
              }
            : null,
        culturalContext: destination
          ? {
              context: destination.culturalContext,
              dos: destination.culturalDos,
              donts: destination.culturalDonts,
            }
          : null,
      };
    },
    { params: t.Object({ id: t.String() }) },
  )
  .get("/discovery/provinces", async () => {
    const provinces = await prisma.province.findMany({
      select: {
        id: true,
        nameTh: true,
        nameEn: true,
        region: true,
        isSecondary: true,
        _count: { select: { tatPois: true, destinations: true, accessibilityFacilities: true } },
      },
      orderBy: { id: "asc" },
    });
    return { provinces };
  })
  .get(
    "/discovery/facilities",
    async ({ query }) => {
      const facilities = await prisma.accessibilityFacility.findMany({
        where: {
          ...(query.provinceId && { provinceId: Number(query.provinceId) }),
          ...(query.facilityType && { facilityType: query.facilityType }),
        },
        take: Math.min(Number(query.limit || 200), 500),
      });
      return { facilities };
    },
    {
      query: t.Object({
        provinceId: t.Optional(t.String()),
        facilityType: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )
  .get("/discovery/seasons/current", async () => {
    const season = estimateCurrentSeason();
    const seasonCode = season === "hot" ? "HOT" : season === "rain" ? "RAIN" : "COOL";
    const hints = await prisma.provinceSeasonProfile.findMany({
      where: { seasonCode },
      include: { province: { select: { id: true, nameTh: true, nameEn: true } } },
      orderBy: { seasonFitScore: "desc" },
      take: 20,
    });
    return { season, hints };
  })
  .post(
    "/chat/intent",
    async ({ body }) => {
      const intent = detectChatIntent(body.message);

      const prefs = await extractPreferences(body.message).catch(() => null);
      const structuredQuery = {
        destination: body.context?.destination,
        currentPlaceId: body.context?.currentPlaceId,
        pagePath: body.context?.pagePath,
        preferences: prefs ?? body.context?.preferences ?? null,
      };

      return {
        ...intent,
        structuredQuery,
      };
    },
    {
      body: t.Object({
        message: t.String(),
        context: t.Optional(
          t.Object({
            destination: t.Optional(t.String()),
            currentPlaceId: t.Optional(t.String()),
            pagePath: t.Optional(t.String()),
            preferences: t.Optional(t.Any()),
          }),
        ),
      }),
    },
  )
  .post(
    "/recommendations/detour",
    async ({ body }) => {
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

      const candidates = await prisma.destination.findMany({
        where: {
          nameEn: { not: prefs.currentDestination },
          province: { not: null },
        },
        take: 20,
      });

      const recommendations = await generateDetourRecommendations(prefs, candidates);
      return { recommendations };
    },
    {
      body: t.Object({
        rawMessage: t.Optional(t.String()),
        currentDestination: t.Optional(t.String()),
        days: t.Optional(t.Number()),
        budget: t.Optional(t.Number()),
        groupSize: t.Optional(t.Number()),
        preferences: t.Optional(t.Array(t.String())),
        accessibility: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .post(
    "/recommendations/itinerary",
    async ({ body }) => {
      const days = Math.max(1, Math.min(body.days || 1, 14));
      const province = body.province || "Bangkok";
      const pool = await prisma.destination.findMany({
        where: { province },
        orderBy: [{ trustScore: "desc" }, { localValueScore: "desc" }],
        take: days * 3,
        select: {
          id: true,
          name: true,
          nameEn: true,
          province: true,
          latitude: true,
          longitude: true,
          trustScore: true,
          localValueScore: true,
          crowdScore: true,
        },
      });
      const itinerary = Array.from({ length: days }).map((_, index) => ({
        day: index + 1,
        stops: pool.slice(index * 3, index * 3 + 3),
      }));
      return { days, province, itinerary };
    },
    {
      body: t.Object({
        days: t.Optional(t.Number()),
        province: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/trust/places/:id",
    async ({ params }) => {
      const place = await getPlaceById(params.id);
      if (!place) return new Response("Not found", { status: 404 });
      const destination = place.destinationId
        ? await prisma.destination.findUnique({
            where: { id: place.destinationId },
            include: { complaints: true, reviewSignals: true },
          })
        : null;
      return {
        placeId: params.id,
        trustScore: destination?.trustScore ?? null,
        riskLabels: [
          ...(destination?.complaints.some((entry) => entry.severity >= 4) ? ["high-severity-complaint"] : []),
          ...(place.status !== "approved" ? ["not-approved"] : []),
        ],
        sourceBreakdown: {
          tatStatus: place.status,
          complaintSignals: destination?.complaints.length ?? 0,
          reviewSignals: destination?.reviewSignals.length ?? 0,
        },
      };
    },
    { params: t.Object({ id: t.String() }) },
  )
  .get(
    "/fair-price/places/:id",
    async ({ params }) => {
      const place = await getPlaceById(params.id);
      if (!place) return new Response("Not found", { status: 404 });
      if (!place.latitude || !place.longitude) {
        return { baseline: null, reason: "No coordinates for place" };
      }
      const stats = await prisma.$queryRawUnsafe<
        Array<{ avg_min: number | null; avg_max: number | null; p25_min: number | null; p75_max: number | null; sample_count: bigint }>
      >(
        `SELECT
          AVG("priceMin") AS avg_min,
          AVG("priceMax") AS avg_max,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY "priceMin") AS p25_min,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY "priceMax") AS p75_max,
          COUNT(*) AS sample_count
        FROM restaurant_price_points
        WHERE ABS(latitude - $1) <= 0.03 AND ABS(longitude - $2) <= 0.03`,
        place.latitude,
        place.longitude,
      );
      return {
        placeId: params.id,
        baseline:
          stats.length > 0
            ? {
                avgMin: stats[0].avg_min,
                avgMax: stats[0].avg_max,
                p25Min: stats[0].p25_min,
                p75Max: stats[0].p75_max,
                sampleCount: Number(stats[0].sample_count || 0),
                currency: "THB",
              }
            : null,
      };
    },
    { params: t.Object({ id: t.String() }) },
  )
  .get(
    "/cultural-context/places/:id",
    async ({ params }) => {
      const place = await getPlaceById(params.id);
      if (!place) return new Response("Not found", { status: 404 });
      if (!place.destinationId) {
        return { placeId: params.id, context: null, dos: [], donts: [] };
      }
      const destination = await prisma.destination.findUnique({
        where: { id: place.destinationId },
        select: { culturalContext: true, culturalDos: true, culturalDonts: true },
      });
      return {
        placeId: params.id,
        context: destination?.culturalContext ?? null,
        dos: destination?.culturalDos ?? [],
        donts: destination?.culturalDonts ?? [],
      };
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/reports",
    async ({ body }) => {
      let destinationId = body.destinationId;
      if (!destinationId && body.placeId) {
        const place = await getPlaceById(body.placeId);
        destinationId = place?.destinationId || undefined;
      }
      const signal = await prisma.complaintSignal.create({
        data: {
          destinationId,
          category: body.category,
          severity: body.severity,
          source: buildUserReportSource(body.userId, body.source),
          description: body.description,
        },
      });
      return { report: signal };
    },
    {
      body: t.Object({
        placeId: t.Optional(t.String()),
        destinationId: t.Optional(t.String()),
        category: t.String(),
        severity: t.Number(),
        userId: t.Optional(t.String()),
        source: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/tourist/preferences",
    async ({ query }) => {
      const user = await prisma.user.findUnique({
        where: { id: query.userId },
        select: {
          id: true,
          consentGiven: true,
          preferences: true,
          updatedAt: true,
        },
      });
      if (!user) return new Response("User not found", { status: 404 });
      return {
        userId: user.id,
        consentGiven: user.consentGiven,
        preferences: user.preferences,
        updatedAt: user.updatedAt,
      };
    },
    {
      query: t.Object({
        userId: t.String(),
      }),
    },
  )
  .patch(
    "/tourist/preferences",
    async ({ body }) => {
      const existing = await prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true },
      });
      if (!existing) return new Response("User not found", { status: 404 });

      const user = await prisma.user.update({
        where: { id: body.userId },
        data: {
          ...(body.preferences !== undefined ? { preferences: body.preferences } : {}),
          ...(body.consentGiven !== undefined ? { consentGiven: body.consentGiven } : {}),
        },
        select: {
          id: true,
          consentGiven: true,
          preferences: true,
          updatedAt: true,
        },
      });

      return {
        userId: user.id,
        consentGiven: user.consentGiven,
        preferences: user.preferences,
        updatedAt: user.updatedAt,
      };
    },
    {
      body: t.Object({
        userId: t.String(),
        preferences: t.Optional(t.Any()),
        consentGiven: t.Optional(t.Boolean()),
      }),
    },
  )
  .post(
    "/tourist/itineraries",
    async ({ body }) => {
      const user = await prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true },
      });
      if (!user) return new Response("User not found", { status: 404 });

      const itinerary = await prisma.itinerary.create({
        data: {
          userId: body.userId,
          title: body.title,
          items: body.items,
        },
      });
      return { itinerary };
    },
    {
      body: t.Object({
        userId: t.String(),
        title: t.Optional(t.String()),
        items: t.Array(t.Any()),
      }),
    },
  )
  .get(
    "/tourist/itineraries",
    async ({ query }) => {
      const itineraries = await prisma.itinerary.findMany({
        where: { userId: query.userId },
        orderBy: { updatedAt: "desc" },
        take: Math.max(1, Math.min(Number(query.limit || 50), 200)),
      });
      return { itineraries };
    },
    {
      query: t.Object({
        userId: t.String(),
        limit: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/tourist/itineraries/:id",
    async ({ params, query }) => {
      const itinerary = await prisma.itinerary.findUnique({
        where: { id: params.id },
      });
      if (!itinerary) return new Response("Not found", { status: 404 });
      if (query.userId && itinerary.userId !== query.userId) {
        return new Response("Forbidden", { status: 403 });
      }
      return { itinerary };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({ userId: t.Optional(t.String()) }),
    },
  )
  .patch(
    "/tourist/itineraries/:id",
    async ({ params, body }) => {
      const existing = await prisma.itinerary.findUnique({
        where: { id: params.id },
        select: { id: true, userId: true },
      });
      if (!existing) return new Response("Not found", { status: 404 });
      if (body.userId && existing.userId !== body.userId) {
        return new Response("Forbidden", { status: 403 });
      }

      const itinerary = await prisma.itinerary.update({
        where: { id: params.id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.items !== undefined ? { items: body.items } : {}),
        },
      });
      return { itinerary };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        userId: t.Optional(t.String()),
        title: t.Optional(t.String()),
        items: t.Optional(t.Array(t.Any())),
      }),
    },
  )
  .delete(
    "/tourist/itineraries/:id",
    async ({ params, query }) => {
      const existing = await prisma.itinerary.findUnique({
        where: { id: params.id },
        select: { id: true, userId: true },
      });
      if (!existing) return new Response("Not found", { status: 404 });
      if (query.userId && existing.userId !== query.userId) {
        return new Response("Forbidden", { status: 403 });
      }
      await prisma.itinerary.delete({
        where: { id: params.id },
      });
      return { deleted: true, id: params.id };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({ userId: t.Optional(t.String()) }),
    },
  )
  .get(
    "/tourist/reports",
    async ({ query }) => {
      const signals = await prisma.complaintSignal.findMany({
        where: {
          source: query.userId ? `user_report:${query.userId}` : "user_report",
        },
        orderBy: { reportedAt: "desc" },
        take: Math.max(1, Math.min(Number(query.limit || 50), 200)),
      });
      return { reports: signals };
    },
    {
      query: t.Object({
        userId: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/graph/places/:id",
    async ({ params }) => {
      const place = await getPlaceById(params.id);
      if (!place) return new Response("Not found", { status: 404 });
      const destination = place.destinationId
        ? await prisma.destination.findUnique({ where: { id: place.destinationId }, select: { id: true, nameEn: true } })
        : null;
      if (!destination?.nameEn) return { nodes: [], edges: [] };

      try {
        const relations = await runQuery<{
          sourceId: string;
          source: string;
          targetId: string;
          target: string;
          relation: string;
          props: Record<string, unknown>;
        }>(
          `MATCH (p:Place {destinationId: $destinationId})-[r:DETOUR_TO|SIMILAR_TO]-(other:Place)
           RETURN p.uid as sourceId, p.name as source, other.uid as targetId, other.name as target, type(r) as relation, properties(r) as props
           LIMIT 50`,
          { destinationId: destination.id },
        );
        const nodeMap = new Map<string, { id: string; label: string }>();
        const edges = relations.map((entry) => {
          nodeMap.set(entry.sourceId, { id: entry.sourceId, label: entry.source });
          nodeMap.set(entry.targetId, { id: entry.targetId, label: entry.target });
          return { source: entry.sourceId, target: entry.targetId, relation: entry.relation, ...entry.props };
        });
        return { nodes: Array.from(nodeMap.values()), edges };
      } catch {
        return { nodes: [{ id: destination.id, label: destination.nameEn }], edges: [] };
      }
    },
    { params: t.Object({ id: t.String() }) },
  )
  .get(
    "/routes/smart",
    async ({ query }) => {
      const provinceId = query.provinceId ? Number(query.provinceId) : undefined;
      const days = Math.max(1, Math.min(Number(query.days || 1), 10));

      const routes = await prisma.travelRoute.findMany({
        where: {
          ...(provinceId && { provinceId }),
        },
        include: {
          stops: {
            orderBy: [{ dayIndex: "asc" }, { stopOrder: "asc" }],
            include: {
              destination: {
                select: {
                  id: true,
                  name: true,
                  nameEn: true,
                  province: true,
                  latitude: true,
                  longitude: true,
                  trustScore: true,
                },
              },
              tatPoi: {
                select: {
                  id: true,
                  name: true,
                  kind: true,
                  province: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
          },
        },
        orderBy: [{ isHighlight: "desc" }, { sourceUpdatedAt: "desc" }],
        take: Math.max(1, Math.min(Number(query.limit || 5), 20)),
      });

      return {
        days,
        routes: routes.map((route) => ({
          ...route,
          stops: route.stops.filter((stop) => !stop.dayIndex || stop.dayIndex <= days),
        })),
      };
    },
    {
      query: t.Object({
        provinceId: t.Optional(t.String()),
        days: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/partners/profile",
    async ({ body }) => {
      const profile = await prisma.business.upsert({
        where: { userId: body.userId },
        create: {
          userId: body.userId,
          name: body.name,
          type: body.type,
          destinationId: body.destinationId,
          contact: body.contact,
          licenseNumber: body.licenseNumber,
          verificationDocs: body.verificationDocs || [],
        },
        update: {
          name: body.name,
          type: body.type,
          destinationId: body.destinationId,
          contact: body.contact,
          licenseNumber: body.licenseNumber,
          verificationDocs: body.verificationDocs || [],
        },
      });
      return { profile };
    },
    {
      body: t.Object({
        userId: t.String(),
        name: t.String(),
        type: t.String(),
        destinationId: t.Optional(t.String()),
        contact: t.Optional(t.String()),
        licenseNumber: t.Optional(t.String()),
        verificationDocs: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .post(
    "/partners/experiences",
    async ({ body }) => {
      const experience = await prisma.package.create({
        data: {
          businessId: body.businessId,
          destinationId: body.destinationId,
          title: body.title,
          experienceType: body.experienceType,
          description: body.description,
          includedServices: body.includedServices || [],
          priceMin: body.priceMin,
          priceMax: body.priceMax,
          languageSupported: body.languageSupported || ["en", "th"],
          accessibilityTags: body.accessibilityTags || [],
          cancellationPolicy: body.cancellationPolicy,
          maxGroupSize: body.maxGroupSize,
          durationDays: body.durationDays,
        },
      });
      return { experience };
    },
    {
      body: t.Object({
        businessId: t.String(),
        destinationId: t.String(),
        title: t.String(),
        experienceType: t.Optional(t.String()),
        description: t.Optional(t.String()),
        includedServices: t.Optional(t.Array(t.String())),
        priceMin: t.Number(),
        priceMax: t.Number(),
        languageSupported: t.Optional(t.Array(t.String())),
        accessibilityTags: t.Optional(t.Array(t.String())),
        cancellationPolicy: t.Optional(t.String()),
        maxGroupSize: t.Optional(t.Number()),
        durationDays: t.Optional(t.Number()),
      }),
    },
  )
  .get(
    "/partners/quality-feedback",
    async ({ query }) => {
      const where = query.businessId ? { businessId: query.businessId } : {};
      const signals = await prisma.reviewSignal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      const avgSentiment =
        signals.length > 0
          ? signals.reduce((accumulator, signal) => accumulator + signal.sentiment, 0) / signals.length
          : null;
      const avgSuspicious =
        signals.length > 0
          ? signals.reduce((accumulator, signal) => accumulator + signal.suspiciousScore, 0) / signals.length
          : null;
      return {
        metrics: {
          count: signals.length,
          avgSentiment,
          avgSuspiciousScore: avgSuspicious,
        },
        signals,
      };
    },
    {
      query: t.Object({
        businessId: t.Optional(t.String()),
      }),
    },
  )
  .post("/admin/ingest/tat-sync", () => ({ job: enqueueJob("tat-sync") }))
  .post("/admin/ingest/tat-master-import", () => ({ job: enqueueJob("tat-master-import") }))
  .post("/admin/ingest/accessibility-sync", () => ({ job: enqueueJob("accessibility-sync") }))
  .post("/admin/ingest/fair-price-sync", () => ({ job: enqueueJob("fair-price-sync") }))
  .get(
    "/admin/ingest/jobs/:jobId",
    ({ params }) => {
      const job = ingestJobs.get(params.jobId);
      if (!job) return new Response("Not found", { status: 404 });
      return { job };
    },
    { params: t.Object({ jobId: t.String() }) },
  )
  .get("/admin/risk-flags", async () => {
    const [flaggedAiLogs, complaints] = await Promise.all([
      prisma.aiLog.findMany({
        where: { flagged: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.complaintSignal.findMany({
        where: { severity: { gte: 4 } },
        include: {
          destination: {
            select: {
              id: true,
              name: true,
              nameEn: true,
              province: true,
            },
          },
        },
        orderBy: { reportedAt: "desc" },
        take: 100,
      }),
    ]);
    return { flaggedAiLogs, complaints };
  });
