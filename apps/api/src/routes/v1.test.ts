import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";

const mockPrisma = {
  tatPoi: {
    findMany: mock(async () => []),
    findUnique: mock(async () => null),
    findFirst: mock(async () => null),
  },
  user: {
    findUnique: mock(async () => null),
    update: mock(async () => null),
  },
  itinerary: {
    create: mock(async () => null),
    findMany: mock(async () => []),
    findUnique: mock(async () => null),
    update: mock(async () => null),
    delete: mock(async () => null),
  },
  complaintSignal: {
    findMany: mock(async () => []),
  },
  provinceSeasonProfile: {
    findMany: mock(async () => []),
  },
} as any;

mock.module("../lib/prisma", () => ({
  prisma: mockPrisma,
}));

mock.module("../lib/claude", () => ({
  extractPreferences: mock(async () => ({
    currentDestination: "Bangkok",
    days: 1,
    budgetTHB: 3000,
    groupSize: 1,
    vibePrefs: ["culture"],
    accessibilityNeeds: [],
    crowdTolerance: "low",
  })),
  generateDetourRecommendations: mock(async () => []),
}));

mock.module("../lib/neo4j", () => ({
  runQuery: mock(async () => []),
}));

import { v1Routes } from "./v1";

describe("v1 routes", () => {
  const app = new Elysia().use(v1Routes);

  beforeEach(() => {
    mockPrisma.tatPoi.findMany.mockReset();
    mockPrisma.provinceSeasonProfile.findMany.mockReset();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.update.mockReset();
    mockPrisma.itinerary.create.mockReset();
    mockPrisma.itinerary.findMany.mockReset();
    mockPrisma.itinerary.findUnique.mockReset();
    mockPrisma.itinerary.update.mockReset();
    mockPrisma.itinerary.delete.mockReset();
    mockPrisma.complaintSignal.findMany.mockReset();
  });

  it("sorts discovery places by trust_desc", async () => {
    mockPrisma.tatPoi.findMany.mockResolvedValueOnce([
      {
        id: "p1",
        name: "A",
        nameEn: "A",
        destination: { trustScore: 0.4, seasonFitScore: 0.5, accessibilityScore: 0.5, isSecondaryCity: false },
        province: { region: "central" },
        viewerCount: 100,
      },
      {
        id: "p2",
        name: "B",
        nameEn: "B",
        destination: { trustScore: 0.9, seasonFitScore: 0.5, accessibilityScore: 0.5, isSecondaryCity: false },
        province: { region: "central" },
        viewerCount: 50,
      },
    ]);

    const res = await app.handle(
      new Request("http://localhost/api/v1/discovery/places?sortBy=trust_desc&limit=20&page=1"),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data[0].id).toBe("p2");
    expect(json.data[1].id).toBe("p1");
  });

  it("returns intent classification for assistant", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/v1/chat/intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "Is this place overpriced and unsafe?",
          context: {
            pagePath: "/place/dest:tat:33896",
            currentPlaceId: "dest:tat:33896",
          },
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.intent).toBe("report");
    expect(json.suggestedEndpoint).toBe("/api/v1/reports");
    expect(json.structuredQuery.pagePath).toBe("/place/dest:tat:33896");
  });

  it("returns current season hints payload", async () => {
    mockPrisma.provinceSeasonProfile.findMany.mockResolvedValueOnce([
      {
        seasonFitScore: 0.88,
        province: { id: 10, nameTh: "กรุงเทพฯ", nameEn: "Bangkok" },
      },
    ]);

    const res = await app.handle(new Request("http://localhost/api/v1/discovery/seasons/current"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(["hot", "rain", "cool"]).toContain(json.season);
    expect(Array.isArray(json.hints)).toBe(true);
  });

  it("patches and returns tourist preferences", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "u1" });
    mockPrisma.user.update.mockResolvedValueOnce({
      id: "u1",
      consentGiven: true,
      preferences: { budget: "mid", accessibility: ["wheelchair"] },
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const res = await app.handle(
      new Request("http://localhost/api/v1/tourist/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "u1",
          consentGiven: true,
          preferences: { budget: "mid", accessibility: ["wheelchair"] },
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.userId).toBe("u1");
    expect(json.consentGiven).toBe(true);
    expect(json.preferences.budget).toBe("mid");
  });

  it("creates and fetches tourist itinerary", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "u2" });
    mockPrisma.itinerary.create.mockResolvedValueOnce({
      id: "it1",
      userId: "u2",
      title: "My Plan",
      items: [{ destinationId: "dest1", day: 1 }],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const createRes = await app.handle(
      new Request("http://localhost/api/v1/tourist/itineraries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "u2",
          title: "My Plan",
          items: [{ destinationId: "dest1", day: 1 }],
        }),
      }),
    );
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()) as any;
    expect(created.itinerary.id).toBe("it1");

    mockPrisma.itinerary.findUnique.mockResolvedValueOnce({
      id: "it1",
      userId: "u2",
      title: "My Plan",
      items: [{ destinationId: "dest1", day: 1 }],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const getRes = await app.handle(
      new Request("http://localhost/api/v1/tourist/itineraries/it1?userId=u2"),
    );
    expect(getRes.status).toBe(200);
    const fetched = (await getRes.json()) as any;
    expect(fetched.itinerary.userId).toBe("u2");
  });

  it("lists tourist itineraries for the given user", async () => {
    mockPrisma.itinerary.findMany.mockResolvedValueOnce([
      {
        id: "it2",
        userId: "u2",
        title: "Trip 2",
        items: [{ day: 1, destinationId: "dest-1" }],
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    const res = await app.handle(
      new Request("http://localhost/api/v1/tourist/itineraries?userId=u2&limit=10"),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(Array.isArray(json.itineraries)).toBe(true);
    expect(json.itineraries[0].id).toBe("it2");
  });
});
