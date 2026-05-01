// apps/api/src/lib/claude.ts
// Wrapper around Anthropic SDK for all AI agent calls
// Each agent has its own function with typed input/output

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";

let _anthropic: Anthropic | null = null;

function getAnthropic() {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is required for Claude-backed endpoints",
      );
    }
    _anthropic = new Anthropic({ apiKey });
  }
  return _anthropic;
}

// ─── Types ─────────────────────────────────────────────────

export interface UserPreferences {
  currentDestination: string;
  days: number;
  budgetTHB: number;
  groupSize: number;
  ageGroups?: string[]; // elderly, family, young, solo
  foodPrefs?: string[]; // local, vegetarian, halal, etc.
  vibePrefs?: string[]; // culture, nature, adventure, slow-travel
  crowdTolerance?: "low" | "medium" | "high";
  accessibilityNeeds?: string[]; // wheelchair, elderly-friendly
}

export interface DestinationScore {
  destinationId: string;
  name: string;
  fitScore: number;
  crowdScore: number;
  trustScore: number;
  localValueScore: number;
  reason: string;
  safetyNotes: string[];
}

export interface TrustAnalysis {
  score: number; // 0-100
  riskLabels: string[];
  warnings: string[];
  recommendation: string;
  explanation: string;
}

// ─── Agent 1: Preference Extraction ────────────────────────

export async function extractPreferences(
  rawMessage: string,
): Promise<UserPreferences> {
  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: `You extract travel preferences from user messages. 
Return ONLY valid JSON matching this shape:
{
  "currentDestination": string,
  "days": number,
  "budgetTHB": number,
  "groupSize": number,
  "ageGroups": string[],
  "foodPrefs": string[],
  "vibePrefs": string[],
  "crowdTolerance": "low"|"medium"|"high",
  "accessibilityNeeds": string[]
}
Use reasonable defaults if not specified. budgetTHB default: 3000. days default: 1. groupSize default: 1.`,
    messages: [{ role: "user", content: rawMessage }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── Agent 2: Detour Recommendation ────────────────────────

export async function generateDetourRecommendations(
  prefs: UserPreferences,
  candidates: unknown[], // destination rows from PostgreSQL
): Promise<DestinationScore[]> {
  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: `You are AllWay's recommendation engine for Thailand tourism.
Given user preferences and candidate destinations, return ONLY valid JSON array of top 3 recommendations.
Each item:
{
  "destinationId": string,
  "name": string,
  "fitScore": number (0-1),
  "crowdScore": number (0-1, lower = less crowded),
  "trustScore": number (0-1),
  "localValueScore": number (0-1),
  "reason": string (2-3 sentences, specific, no hype),
  "safetyNotes": string[]
}
Be honest about crowd and trust scores. Never say 100% safe. Prioritize local economic value.`,
    messages: [
      {
        role: "user",
        content: JSON.stringify({ preferences: prefs, candidates }),
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "[]";
  const results: DestinationScore[] = JSON.parse(
    text.replace(/```json|```/g, "").trim(),
  );

  // Audit log
  await prisma.aiLog.create({
    data: {
      module: "detour_recommendation",
      inputSnapshot: { preferences: prefs } as object,
      outputSnapshot: results as object,
      sourcesUsed: ["anthropic/claude-sonnet", "postgresql/destinations"],
    },
  });

  return results;
}

// ─── Agent 3: Trust Scoring ────────────────────────────────

export async function analyzePackageTrust(packageData: {
  package: unknown;
  business: unknown;
  reviews: unknown[];
  complaints: unknown[];
}): Promise<TrustAnalysis> {
  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system: `You are AllWay's trust analysis engine.
Analyze the package/business data and return ONLY valid JSON:
{
  "score": number (0-100),
  "riskLabels": string[],  // e.g. "missing-cancellation-policy", "unverified-provider"
  "warnings": string[],
  "recommendation": "safe"|"caution"|"avoid",
  "explanation": string (factual, 2-3 sentences)
}
Be fair. Do not accuse without evidence. Score 80+ only for verified providers with clear policies.
Never guarantee 100% safety.`,
    messages: [{ role: "user", content: JSON.stringify(packageData) }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── Agent 4: AI Video Script (Business Portal) ────────────

export async function generateVideoScript(input: {
  packageTitle: string;
  destination: string;
  services: string[];
  priceRange: string;
  targetAudience: string;
  mood: string;
}): Promise<{
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
}> {
  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `You create short-form social media video scripts for Thai tourism packages.
Return ONLY valid JSON with this shape:
{
  "hook": string (first 3 seconds, attention-grabbing),
  "storyboard": [{ "scene": number, "visual": string, "voiceover": string, "duration": string }],
  "caption": string,
  "hashtags": string[],
  "copyTh": string (Thai caption),
  "copyEn": string (English caption)
}
Max 4 storyboard scenes. Total video: 15-30 seconds. Avoid AI slop phrases. Be specific to the destination.`,
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── Agent 5: Chat ─────────────────────────────────────────

export async function chatWithGuard(
  messages: { role: "user" | "assistant"; content: string }[],
  context?: {
    destination?: string;
    currentPlaceId?: string;
    pagePath?: string;
    preferences?: UserPreferences;
  },
): Promise<string> {
  const systemPrompt = `You are AllWay, a trusted travel safety assistant for tourists in Thailand.
Your role: help tourists find safe, trusted nearby destinations and packages.
Current context: ${JSON.stringify(context || {})}

Rules:
- Always be clear, calm, and helpful.
- Never guarantee 100% safety.
- Recommend checking official TAT sources for high-risk topics.
- Keep responses concise. Use bullet points for lists.
- If asked about bookings or payments, say you don't handle payments yet.
- Always mention trust score and crowd info when recommending places.
- Treat pagePath/currentPlaceId as hidden UI context and tailor response to that page.
- You cover Bangkok metro and nearby provinces: Ayutthaya, Nakhon Pathom, Samut Prakan, Ratchaburi, Chachoengsao.`;

  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    system: systemPrompt,
    messages,
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
