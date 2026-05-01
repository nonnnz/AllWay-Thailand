// apps/api/src/routes/packages.ts
import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";
import { analyzePackageTrust } from "../lib/claude";

export const packagesRoutes = new Elysia({ prefix: "/api/packages" })

  // GET /api/packages - list curated packages (with optional destination filter)
  .get(
    "/",
    async ({ query }) => {
      const packages = await prisma.package.findMany({
        where: {
          verificationStatus: "CURATED",
          ...(query.destinationId && { destinationId: query.destinationId }),
          ...(query.maxPrice && { priceMax: { lte: Number(query.maxPrice) } }),
        },
        include: {
          destination: { select: { name: true, nameEn: true, province: true } },
          business: { select: { name: true, verificationStatus: true, trustScore: true } },
        },
        orderBy: { trustScore: "desc" },
        take: 20,
      });
      return { packages };
    },
    {
      query: t.Object({
        destinationId: t.Optional(t.String()),
        maxPrice: t.Optional(t.String()),
      }),
      detail: { tags: ["packages"], summary: "List curated packages" },
    }
  )

  // GET /api/packages/:id - package detail
  .get(
    "/:id",
    async ({ params }) => {
      const pkg = await prisma.package.findUnique({
        where: { id: params.id },
        include: {
          destination: true,
          business: {
            include: { reviewSignals: { take: 10, orderBy: { createdAt: "desc" } } },
          },
        },
      });
      if (!pkg) return new Response("Not found", { status: 404 });
      return { package: pkg };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { tags: ["packages"], summary: "Get package detail" },
    }
  )

  // GET /api/packages/:id/trust - AI trust analysis
  .get(
    "/:id/trust",
    async ({ params }) => {
      const pkg = await prisma.package.findUnique({
        where: { id: params.id },
        include: {
          business: {
            include: {
              reviewSignals: true,
            },
          },
          destination: {
            include: { complaints: { take: 5 } },
          },
        },
      });

      if (!pkg) return new Response("Not found", { status: 404 });

      // If trust score already cached, return fast
      // Otherwise run AI analysis
      // <!-- DEEP DIVE: consider caching trust analysis in Redis or DB with TTL -->
      const analysis = await analyzePackageTrust({
        package: {
          title: pkg.title,
          priceMin: pkg.priceMin,
          priceMax: pkg.priceMax,
          cancellationPolicy: pkg.cancellationPolicy,
          accessibilityTags: pkg.accessibilityTags,
          verificationStatus: pkg.verificationStatus,
        },
        business: {
          name: pkg.business.name,
          verificationStatus: pkg.business.verificationStatus,
          licenseNumber: pkg.business.licenseNumber,
        },
        reviews: pkg.business.reviewSignals.map((r) => ({
          sentiment: r.sentiment,
          suspiciousScore: r.suspiciousScore,
          source: r.source,
          summary: r.summary,
        })),
        complaints: pkg.destination.complaints.map((c) => ({
          category: c.category,
          severity: c.severity,
        })),
      });

      // Update cached trust score in DB
      await prisma.package.update({
        where: { id: pkg.id },
        data: { trustScore: analysis.score / 100 },
      });

      return { trustAnalysis: analysis };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: { tags: ["packages"], summary: "Get AI trust analysis for a package" },
    }
  );
