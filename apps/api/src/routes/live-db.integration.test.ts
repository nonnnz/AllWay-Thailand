import { beforeAll, describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { v1Routes } from "./v1";

describe("v1 live DB integration", () => {
  const app = new Elysia().use(v1Routes);
  let placeId: string | null = null;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set for live DB integration test");
    }
    const res = await app.handle(
      new Request("http://localhost/api/v1/discovery/places?limit=5&page=1&sortBy=updated_desc"),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length === 0) {
      throw new Error("No discovery places in DB. Seed data before running live tests.");
    }
    placeId = json.data[0].id;
  });

  it("GET /api/v1/discovery/places returns list + paging", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/v1/discovery/places?limit=10&page=1&sortBy=viewer_desc"),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(Array.isArray(json.data)).toBe(true);
    expect(typeof json.paging?.page).toBe("number");
    expect(typeof json.paging?.limit).toBe("number");
  });

  it("GET /api/v1/discovery/places/:id returns normalized payload", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/v1/discovery/places/${encodeURIComponent(placeId!)}`),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.place).toBeTruthy();
    expect(json.place.id).toBe(placeId);
  });

  it("GET /api/v1/discovery/provinces returns metadata", async () => {
    const res = await app.handle(new Request("http://localhost/api/v1/discovery/provinces"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(Array.isArray(json.provinces)).toBe(true);
    expect(json.provinces.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/discovery/facilities works with empty or populated data", async () => {
    const res = await app.handle(new Request("http://localhost/api/v1/discovery/facilities?limit=20"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(Array.isArray(json.facilities)).toBe(true);
  });

  it("GET /api/v1/discovery/seasons/current returns season hints", async () => {
    const res = await app.handle(new Request("http://localhost/api/v1/discovery/seasons/current"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(["hot", "rain", "cool"]).toContain(json.season);
    expect(Array.isArray(json.hints)).toBe(true);
  });

  it("GET /api/v1/trust/places/:id returns trust snapshot", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/v1/trust/places/${encodeURIComponent(placeId!)}`),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.placeId).toBe(placeId);
    expect(json.sourceBreakdown).toBeTruthy();
  });

  it("GET /api/v1/fair-price/places/:id returns baseline payload", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/v1/fair-price/places/${encodeURIComponent(placeId!)}`),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.placeId).toBe(placeId);
  });

  it("GET /api/v1/cultural-context/places/:id returns context payload", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/v1/cultural-context/places/${encodeURIComponent(placeId!)}`),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.placeId).toBe(placeId);
  });

  it("GET /api/v1/graph/places/:id returns graph envelope", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/v1/graph/places/${encodeURIComponent(placeId!)}`),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(Array.isArray(json.nodes)).toBe(true);
    expect(Array.isArray(json.edges)).toBe(true);
  });

  it("GET /api/v1/routes/smart returns routes envelope", async () => {
    const res = await app.handle(new Request("http://localhost/api/v1/routes/smart?limit=5&days=3"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(Array.isArray(json.routes)).toBe(true);
  });
});

