// apps/web/src/lib/api.ts
// Typed API client — mirrors ElysiaJS routes

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("AllWay_token");
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// ─── Recommendations ───────────────────────────────────────

export interface DetourRequest {
  rawMessage?: string;
  currentDestination?: string;
  days?: number;
  budget?: number;
  groupSize?: number;
  preferences?: string[];
  accessibility?: string[];
}

export interface DetourRecommendation {
  destinationId: string;
  name: string;
  fitScore: number;
  crowdScore: number;
  trustScore: number;
  localValueScore: number;
  reason: string;
  safetyNotes: string[];
  packages: PackageSummary[];
}

export const api = {
  recommendations: {
    detour: (body: DetourRequest) =>
      request<{ recommendations: DetourRecommendation[] }>(
        "/api/recommendations/detour",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
  },

  destinations: {
    list: () => request<{ destinations: Destination[] }>("/api/destinations"),
    get: (id: string) =>
      request<{ destination: Destination }>(`/api/destinations/${id}`),
    graph: (id: string) =>
      request<{ nodes: GraphNode[]; edges: GraphEdge[] }>(
        `/api/destinations/${id}/graph`,
      ),
  },

  packages: {
    list: (params?: { destinationId?: string; maxPrice?: number }) => {
      const qs = new URLSearchParams(
        params as Record<string, string>,
      ).toString();
      return request<{ packages: Package[] }>(
        `/api/packages${qs ? `?${qs}` : ""}`,
      );
    },
    get: (id: string) => request<{ package: Package }>(`/api/packages/${id}`),
    trust: (id: string) =>
      request<{ trustAnalysis: TrustAnalysis }>(`/api/packages/${id}/trust`),
  },

  chat: {
    send: (messages: ChatMessage[], context?: object) =>
      request<{ reply: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages, context }),
      }),
  },

  business: {
    createPackage: (body: object) =>
      request<{ package: Package }>("/api/business/packages", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    videoScript: (body: object) =>
      request<{ script: VideoScript }>("/api/business/ai-video-script", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  admin: {
    dashboard: () => request<AdminDashboard>("/api/admin/dashboard"),
    pendingBusinesses: () =>
      request<{ businesses: Business[] }>("/api/admin/pending-businesses"),
    verifyBusiness: (id: string, status: string) =>
      request<{ business: Business }>(
        `/api/admin/businesses/${id}/verification`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      ),
  },

  auth: {
    login: (email: string, role?: string) =>
      request<{ token: string; user: { id: string; role: string } }>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, role }),
        },
      ),
  },
};

// ─── Types (mirrors Prisma schema) ─────────────────────────

export interface Destination {
  id: string;
  name: string;
  nameEn: string;
  province: string;
  latitude: number;
  longitude: number;
  category: string[];
  vibeTags: string[];
  crowdScore: number | null;
  trustScore: number | null;
  localValueScore: number | null;
  imageUrl: string | null;
}

export interface PackageSummary {
  id: string;
  title: string;
  priceMin: number;
  priceMax: number;
  trustScore: number | null;
  includedServices: string[];
  business: { name: string; verificationStatus: string };
}

export interface Package extends PackageSummary {
  description: string | null;
  languageSupported: string[];
  accessibilityTags: string[];
  cancellationPolicy: string | null;
  verificationStatus: string;
  destination?: Destination;
}

export interface TrustAnalysis {
  score: number;
  riskLabels: string[];
  warnings: string[];
  recommendation: "safe" | "caution" | "avoid";
  explanation: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  distance_km?: number;
  travel_time_min?: number;
}

export interface VideoScript {
  hook: string;
  storyboard: {
    scene: number;
    visual: string;
    voiceover: string;
    duration: string;
  }[];
  caption: string;
  hashtags: string[];
  copyTh: string;
  copyEn: string;
}

export interface Business {
  id: string;
  name: string;
  verificationStatus: string;
}

export interface AdminDashboard {
  destinations: unknown[];
  pendingBusinesses: number;
  flaggedAiLogs: number;
}
