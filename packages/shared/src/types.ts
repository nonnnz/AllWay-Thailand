// packages/shared/src/types.ts
// Shared between apps/api and apps/web
// Keep in sync with Prisma schema

export type UserRole = "GUEST" | "TOURIST" | "BUSINESS" | "ADMIN";
export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "FLAGGED";
export type TrustRecommendation = "safe" | "caution" | "avoid";

export interface ScoreSet {
  fitScore: number;       // 0-1, match to user preference
  crowdScore: number;     // 0-1, lower = less crowded = better
  trustScore: number;     // 0-1, higher = more trustworthy
  localValueScore: number; // 0-1, higher = more economic benefit to locals
}

export const SCOPE_PROVINCES = [
  "Bangkok",
  "Nonthaburi",
  "Pathum Thani",
  "Samut Prakan",
  "Nakhon Pathom",
  "Phra Nakhon Si Ayutthaya",
  "Chachoengsao",
  "Ratchaburi",
] as const;

export type Province = (typeof SCOPE_PROVINCES)[number];

export const VIBE_TAGS = [
  "culture",
  "heritage",
  "nature",
  "slow-travel",
  "local-food",
  "adventure",
  "family",
  "romantic",
  "low-crowd",
  "floating-market",
  "temple",
  "day-trip",
] as const;

export type VibeTag = (typeof VIBE_TAGS)[number];

export const ACCESSIBILITY_TAGS = [
  "elderly-friendly",
  "wheelchair",
  "child-friendly",
  "no-stairs",
] as const;

export type AccessibilityTag = (typeof ACCESSIBILITY_TAGS)[number];

export const INCLUDED_SERVICES = [
  "van-pickup",
  "local-guide",
  "boat-ride",
  "local-lunch",
  "temple-entry",
  "hotel-transfer",
  "English-guide",
  "Thai-guide",
] as const;

export type IncludedService = (typeof INCLUDED_SERVICES)[number];
