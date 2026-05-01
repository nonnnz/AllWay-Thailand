// apps/api/src/routes/auth.ts
// <!-- DEEP DIVE: for hackathon, simple email/password or magic link is enough -->
// Consider using Lucia auth or just manual JWT if time is tight

import { Elysia, t } from "elysia";
import { prisma } from "../lib/prisma";
import { isMockMode } from "../lib/mock-data";
import { ensureMockUser } from "../lib/mock-state";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  // Minimal: create or fetch user by email
  // No password hashing for POC — add before demo if needed
  .post(
    "/login",
    async ({ body, jwt }: any) => {
      if (isMockMode()) {
        const user = ensureMockUser(body.email, body.role || "TRAVELER");
        const token = await jwt.sign({ userId: user.id, role: user.role });
        return { token, user: { id: user.id, role: user.role } };
      }
      let user = await prisma.user.findUnique({ where: { email: body.email } });
      if (!user) {
        user = await prisma.user.create({
          data: { email: body.email, role: body.role || "TRAVELER" },
        });
      }
      const token = await jwt.sign({ userId: user.id, role: user.role });
      return { token, user: { id: user.id, role: user.role } };
    },
    {
      body: t.Object({
        email: t.String(),
        role: t.Optional(t.Union([t.Literal("GUEST"), t.Literal("TRAVELER"), t.Literal("PARTNER"), t.Literal("ADMIN")])),
      }),
      detail: { tags: ["auth"], summary: "Login / register by email (POC)" },
    }
  );
