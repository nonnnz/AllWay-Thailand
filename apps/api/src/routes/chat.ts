// apps/api/src/routes/chat.ts
import { Elysia, t } from "elysia";
import { chatWithGuard } from "../lib/claude";

export const chatRoutes = new Elysia({ prefix: "/api/chat" }).post(
  "/",
  async ({ body }) => {
    const reply = await chatWithGuard(body.messages, body.context);
    return { reply };
  },
  {
    body: t.Object({
      messages: t.Array(
        t.Object({
          role: t.Union([t.Literal("user"), t.Literal("assistant")]),
          content: t.String(),
        }),
      ),
      context: t.Optional(
        t.Object({
          destination: t.Optional(t.String()),
          currentPlaceId: t.Optional(t.String()),
          pagePath: t.Optional(t.String()),
          preferences: t.Optional(t.Any()),
        }),
      ),
    }),
    detail: { tags: ["chat"], summary: "Chat with AllWay AI" },
  },
);
