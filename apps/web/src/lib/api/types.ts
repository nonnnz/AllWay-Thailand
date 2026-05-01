// API contract types — mirrors v1 backend shape so swap-in is mechanical.

export type PlaceKind = 'attraction' | 'restaurant' | 'accommodation' | 'experience';

export type Score = number; // 0..1

export interface FairPriceHint {
  label: 'in-range' | 'slightly_high' | 'high' | 'low' | 'unknown';
  deltaPct: number;
  min_avg?: number;
  max_avg?: number;
}

export interface PlaceCardVM {
  id: string;
  kind: PlaceKind;
  kindLabel?: string;
  name: string;
  nameTh?: string;
  provinceName: string;
  provinceNameTh?: string;
  imageUrl: string;
  trustScore: Score;
  crowdScore: Score;
  seasonFitScore: Score;
  accessibilityScore: Score;
  localValueScore: Score;
  fairPrice: FairPriceHint;
  reasonSnippet: string;
  reasonSnippetTh?: string;
  safetyTags: string[];
  lat: number;
  lng: number;
  culturalPaths?: string[];
  culturalDos?: string[];
  culturalDonts?: string[];
  isCsvData?: boolean;
  csvFields?: {
    restaurantName?: string;
    averagePrice?: string;
    location?: string;
    wongnaiLink?: string;
    googleMapsLink?: string;
  };
}

export interface PlaceDetail extends PlaceCardVM {
  description: string;
  descriptionTh?: string;
  hours: string;
  contact?: string;
  galleryUrls: string[];
}

export interface TrustSource {
  source: string;
  signal: string;
  weight: number;
  status: 'positive' | 'neutral' | 'negative';
}

export interface TrustDecisionVM {
  placeId: string;
  trustScore: Score;
  riskLabels: ('low_risk' | 'medium_review_risk' | 'high_risk' | 'recent_reports')[];
  reasonsPositive: string[];
  reasonsNegative: string[];
  sources: TrustSource[];
  lastUpdatedISO: string;
  priceFairness: {
    status: FairPriceHint['label'];
    areaAvg: number;
    observed: number;
    currency: 'THB';
  };
  culturalContext: string;
  culturalContextTh?: string;
}

export interface FairPriceVM {
  placeId: string;
  status: FairPriceHint['label'];
  observed: number;
  areaAvg: number;
  areaMin: number;
  areaMax: number;
  sampleSize: number;
  currency: 'THB';
  notes: string;
}

export interface CulturalContextVM {
  placeId: string;
  tips: { icon: string; text: string; textTh?: string }[];
  taboos: string[];
  bestTime: string;
  paths?: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  group: 'place' | 'food' | 'culture' | 'nature' | 'route';
  trustScore?: Score;
}
export interface GraphLink {
  source: string;
  target: string;
  relation: string;
  weight: number;
  distanceKm?: number;
}
export interface GraphVM {
  placeId: string;
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface DetourRequest {
  intent: string;
  origin?: string;
  budgetTHB?: number;
  vibe?: string[];
  groupSize?: number;
  avoidCrowds?: boolean;
  accessibility?: boolean;
}
export interface DetourResponse {
  requestId: string;
  results: PlaceCardVM[];
  rationale: string;
}

export interface SeasonInfo {
  current: 'cool' | 'hot' | 'green' | 'shoulder';
  label: string;
  monthsRange: string;
  recommendation: string;
}

export interface Province {
  id: string;
  name: string;
  nameTh: string;
  region: 'north' | 'northeast' | 'central' | 'east' | 'south' | 'west';
}

export interface Facility {
  id: string;
  name: string;
  icon: string;
}

export interface RouteStop {
  placeId: string;
  name: string;
  arriveISO: string;
  durationMin: number;
  trustScore: Score;
  warning?: string;
  imageUrl?: string;
  lat: number;
  lng: number;
}
export interface RouteVM {
  id: string;
  title: string;
  days: number;
  totalDistanceKm: number;
  trustAverage: Score;
  stops: RouteStop[][]; // stops grouped per day
}

export interface ItineraryItem {
  id: string;
  placeId: string;
  placeName: string;
  day: number;
  note?: string;
  trustSnapshot: Score;
  dateISO?: string;
  startTime?: string; // HH:mm (24h)
  durationMin?: number; // 30-min increments
  flowX?: number;
  flowY?: number;
}
export interface Itinerary {
  id: string;
  title: string;
  createdISO: string;
  updatedISO?: string;
  startDateISO?: string;
  endDateISO?: string;
  items: ItineraryItem[];
}

export interface TouristPreferences {
  budgetRange: [number, number]; // [min, max] in THB
  vibe: string[];
  crowdTolerance: number; // 0..1
  accessibility: boolean;
  consents: { analytics: boolean; personalization: boolean; sharing: boolean };
}

export interface ReportInput {
  placeId: string;
  category: 'overcharge' | 'safety' | 'misleading' | 'closed' | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
}
export interface Report extends ReportInput {
  id: string;
  status: 'submitted' | 'in_review' | 'confirmed' | 'rejected';
  submittedISO: string;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatContext {
  destination?: string;
  preferences?: Record<string, unknown>;
  currentPlaceId?: string;
  pagePath?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context?: ChatContext;
}

export type ChatSuggestedAction =
  | 'Open Place Detail'
  | 'View Fair Price'
  | 'View Cultural Context'
  | 'View Trust Sources'
  | 'Find Safer Detours'
  | 'Report Risk';

export type ChatRiskHint = 'not_guaranteed_safety' | 'low_risk' | 'review_suggested' | 'high_risk';

export interface ChatResponseVM {
  reply: string;
  replyTh?: string;
  suggestedActions?: ChatSuggestedAction[];
  linkedPlaceIds?: string[];
  riskHint?: ChatRiskHint;
}

export interface AdminRiskFlag {
  id: string;
  placeId: string;
  placeName: string;
  province: string;
  severity: 'low' | 'medium' | 'high';
  reason: string;
  reportsCount: number;
  raisedISO: string;
  status: 'open' | 'in_review' | 'resolved';
}
export interface AdminAILog {
  id: string;
  timestampISO: string;
  module: 'recommendation' | 'chat' | 'trust_engine';
  inputSnippet: string;
  outputSnippet: string;
  confidence: number;
  flagged: boolean;
  attributionSources: string[];
}

export interface AdminDataJob {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  lastRunISO: string;
  itemsProcessed: number;
  errors: string[];
}
