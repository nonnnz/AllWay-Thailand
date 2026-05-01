// apps/api/src/routes/partners.ts
import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";
import { generateVideoScript } from "../lib/claude";

export const partnerRoutes = new Elysia({ prefix: "/api/partners" })

  // POST /api/partners/packages - create a package (partner user)
  // add JWT auth middleware in production to verify PARTNER role
  .post(
    "/packages",
    async ({ body }) => {
      // TODO: extract partnerId from JWT in production
      const pkg = await prisma.package.create({
        data: {
          businessId: body.businessId,
          destinationId: body.destinationId,
          title: body.title,
          description: body.description,
          includedServices: body.includedServices,
          priceMin: body.priceMin,
          priceMax: body.priceMax,
          languageSupported: body.languageSupported || ["en", "th"],
          accessibilityTags: body.accessibilityTags || [],
          cancellationPolicy: body.cancellationPolicy,
          verificationStatus: "PENDING_REVIEW",
        },
      });
      return { package: pkg, message: "Package submitted for partner review." };
    },
    {
      body: t.Object({
        businessId: t.String(),
        destinationId: t.String(),
        title: t.String(),
        description: t.Optional(t.String()),
        includedServices: t.Array(t.String()),
        priceMin: t.Number(),
        priceMax: t.Number(),
        languageSupported: t.Optional(t.Array(t.String())),
        accessibilityTags: t.Optional(t.Array(t.String())),
        cancellationPolicy: t.Optional(t.String()),
      }),
      detail: { tags: ["partners"], summary: "Create a package (pending review)" },
    }
  )

  // POST /api/partners/ai-video-script
  .post(
    "/ai-video-script",
    async ({ body }) => {
      const script = await generateVideoScript({
        packageTitle: body.packageTitle,
        destination: body.destination,
        services: body.services,
        priceRange: body.priceRange,
        targetAudience: body.targetAudience || "foreign travelers",
        mood: body.mood || "warm, trustworthy",
      });
      return { script };
    },
    {
      body: t.Object({
        packageTitle: t.String(),
        destination: t.String(),
        services: t.Array(t.String()),
        priceRange: t.String(),
        targetAudience: t.Optional(t.String()),
        mood: t.Optional(t.String()),
      }),
      detail: { tags: ["partners"], summary: "Generate AI video script for a package" },
    }
  );
