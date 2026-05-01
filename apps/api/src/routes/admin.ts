// apps/api/src/routes/admin.ts
import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";

export const adminRoutes = new Elysia({ prefix: "/api/admin" })

  // GET /api/admin/pending-partners
  .get("/pending-partners", async () => {
    const partners = await prisma.business.findMany({
      where: { verificationStatus: "PENDING_REVIEW" },
      include: { user: { select: { email: true } } },
    });
    return { partners };
  })

  // PATCH /api/admin/partners/:id/verification
  .patch(
    "/partners/:id/verification",
    async ({ params, body }) => {
      const partner = await prisma.business.update({
        where: { id: params.id },
        data: { verificationStatus: body.status as any },
      });
      return { partner };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        status: t.Union([
          t.Literal("PENDING_REVIEW"),
          t.Literal("CURATED"),
          t.Literal("REJECTED"),
          t.Literal("FLAGGED"),
        ]),
      }),
      detail: { tags: ["admin"], summary: "Approve or reject partner verification (HITL)" },
    }
  )

  // GET /api/admin/ai-logs
  .get(
    "/ai-logs",
    async ({ query }) => {
      const logs = await prisma.aiLog.findMany({
        where: { flagged: query.flaggedOnly === "true" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return { logs };
    },
    {
      query: t.Object({ flaggedOnly: t.Optional(t.String()) }),
    }
  )

  // GET /api/admin/dashboard - crowd + local value summary
  .get("/dashboard", async () => {
    const destinations = await prisma.destination.findMany({
      select: {
        nameEn: true,
        province: true,
        crowdScore: true,
        trustScore: true,
        localValueScore: true,
        _count: { select: { packages: true } },
      },
      orderBy: { localValueScore: "desc" },
    });

    const pendingCount = await prisma.business.count({
      where: { verificationStatus: "PENDING_REVIEW" },
    });

    const flaggedLogs = await prisma.aiLog.count({ where: { flagged: true } });

    return { destinations, pendingPartners: pendingCount, flaggedAiLogs: flaggedLogs };
  });
