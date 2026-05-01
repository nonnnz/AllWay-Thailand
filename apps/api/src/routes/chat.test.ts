import { describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";

const chatWithGuardMock = mock(async () => "mocked-reply");

mock.module("../lib/claude", () => ({
  chatWithGuard: chatWithGuardMock,
}));

import { chatRoutes } from "./chat";

describe("chat route", () => {
  const app = new Elysia().use(chatRoutes);

  it("accepts page-aware context and returns reply", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "help me" }],
          context: {
            destination: "Bangkok",
            currentPlaceId: "dest:tat:33896",
            pagePath: "/place/dest:tat:33896",
          },
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.reply).toBe("mocked-reply");
    expect(chatWithGuardMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid role payload", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: "invalid" }],
        }),
      }),
    );

    expect(res.status).toBe(422);
  });
});

