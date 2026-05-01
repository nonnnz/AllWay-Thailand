import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { prisma } from "../lib/prisma";
import { v1Routes } from "./v1";

describe("v1 live DB write integration", () => {
  const app = new Elysia().use(v1Routes);

  const stamp = `itest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const userEmail = `${stamp}@tripguard.test`;

  let userId: string | null = null;
  let businessId: string | null = null;
  let destinationId: string | null = null;
  let packageId: string | null = null;
  let reportId: string | null = null;
  let itineraryId: string | null = null;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set for live DB write integration test");
    }

    const destination = await prisma.destination.findFirst({
      select: { id: true },
    });
    if (!destination) {
      throw new Error("No destination available in DB for write integration test");
    }
    destinationId = destination.id;

    const user = await prisma.user.create({
      data: {
        email: userEmail,
        consentGiven: true,
      },
      select: { id: true },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (packageId) {
      await prisma.package.deleteMany({ where: { id: packageId } });
    }
    if (businessId) {
      await prisma.business.deleteMany({ where: { id: businessId } });
    }
    if (reportId) {
      await prisma.complaintSignal.deleteMany({ where: { id: reportId } });
    }
    if (itineraryId) {
      await prisma.itinerary.deleteMany({ where: { id: itineraryId } });
    }
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it("POST /api/v1/reports creates complaint signal", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/v1/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          destinationId,
          category: "unsafe",
          severity: 3,
          description: `integration report ${stamp}`,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.report).toBeTruthy();
    expect(json.report.destinationId).toBe(destinationId);
    reportId = json.report.id;
  });

  it("GET /api/v1/tourist/reports returns current user's report history", async () => {
    const res = await app.handle(new Request(`http://localhost/api/v1/tourist/reports?userId=${userId}&limit=10`));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(Array.isArray(json.reports)).toBe(true);
    expect(json.reports.some((report: any) => report.id === reportId)).toBe(true);
  });

  it("PATCH /api/v1/tourist/preferences updates traveler preferences", async () => {
    const patchRes = await app.handle(
      new Request("http://localhost/api/v1/tourist/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          consentGiven: true,
          preferences: {
            budget: "mid",
            crowdTolerance: "low",
            vibe: ["nature", "food"],
          },
        }),
      }),
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as any;
    expect(patched.userId).toBe(userId);
    expect(patched.consentGiven).toBe(true);
    expect(patched.preferences.budget).toBe("mid");

    const getRes = await app.handle(new Request(`http://localhost/api/v1/tourist/preferences?userId=${userId}`));
    expect(getRes.status).toBe(200);
    const loaded = (await getRes.json()) as any;
    expect(loaded.preferences.crowdTolerance).toBe("low");
  });

  it("tourist itinerary CRUD works for save place flow", async () => {
    const createRes = await app.handle(
      new Request("http://localhost/api/v1/tourist/itineraries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          title: `Save places ${stamp}`,
          items: [{ day: 1, destinationId, note: "first stop" }],
        }),
      }),
    );
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()) as any;
    itineraryId = created.itinerary.id;
    expect(created.itinerary.userId).toBe(userId);

    const listRes = await app.handle(new Request(`http://localhost/api/v1/tourist/itineraries?userId=${userId}&limit=10`));
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as any;
    expect(Array.isArray(listed.itineraries)).toBe(true);
    expect(listed.itineraries.some((it: any) => it.id === itineraryId)).toBe(true);

    const getRes = await app.handle(
      new Request(`http://localhost/api/v1/tourist/itineraries/${itineraryId}?userId=${userId}`),
    );
    expect(getRes.status).toBe(200);
    const fetched = (await getRes.json()) as any;
    expect(Array.isArray(fetched.itinerary.items)).toBe(true);
    expect(fetched.itinerary.items[0].destinationId).toBe(destinationId);

    const patchRes = await app.handle(
      new Request(`http://localhost/api/v1/tourist/itineraries/${itineraryId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          title: `Updated save places ${stamp}`,
          items: [{ day: 1, destinationId, note: "updated stop" }],
        }),
      }),
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as any;
    expect(patched.itinerary.title).toContain("Updated");

    const deleteRes = await app.handle(
      new Request(`http://localhost/api/v1/tourist/itineraries/${itineraryId}?userId=${userId}`, {
        method: "DELETE",
      }),
    );
    expect(deleteRes.status).toBe(200);
    const deleted = (await deleteRes.json()) as any;
    expect(deleted.deleted).toBe(true);

    itineraryId = null;
  });

  it("POST /api/v1/partners/profile upserts business", async () => {
    const createRes = await app.handle(
      new Request("http://localhost/api/v1/partners/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          name: `Integration Partner ${stamp}`,
          type: "guide",
          destinationId,
          contact: "integration@test.local",
          licenseNumber: `LIC-${stamp}`,
          verificationDocs: [],
        }),
      }),
    );

    expect(createRes.status).toBe(200);
    const created = (await createRes.json()) as any;
    expect(created.profile).toBeTruthy();
    businessId = created.profile.id;

    const updateRes = await app.handle(
      new Request("http://localhost/api/v1/partners/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          name: `Integration Partner Updated ${stamp}`,
          type: "guide",
          destinationId,
          contact: "integration-updated@test.local",
          licenseNumber: `LIC-${stamp}`,
          verificationDocs: ["https://example.com/doc.pdf"],
        }),
      }),
    );
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as any;
    expect(updated.profile.id).toBe(businessId);
    expect(updated.profile.name).toContain("Updated");
  });

  it("POST /api/v1/partners/experiences creates package", async () => {
    expect(businessId).toBeTruthy();

    const res = await app.handle(
      new Request("http://localhost/api/v1/partners/experiences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId,
          destinationId,
          title: `Integration Experience ${stamp}`,
          experienceType: "walking-tour",
          description: "Integration test experience",
          includedServices: ["guide"],
          priceMin: 500,
          priceMax: 900,
          languageSupported: ["en", "th"],
          accessibilityTags: ["elderly-friendly"],
          cancellationPolicy: "24h",
          maxGroupSize: 6,
          durationDays: 1,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.experience).toBeTruthy();
    expect(json.experience.businessId).toBe(businessId);
    expect(json.experience.destinationId).toBe(destinationId);
    packageId = json.experience.id;
  });
});
