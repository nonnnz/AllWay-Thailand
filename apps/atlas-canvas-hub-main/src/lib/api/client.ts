// Mock API client. Async + small artificial latency so swapping to fetch() later is mechanical.
// Real endpoints (per MVP_UI_BLUEPRINT) are noted next to each function.

import {
  PLACES, TRUST_DECISIONS, FAIR_PRICES, CULTURAL, GRAPHS, SEASON_CURRENT,
  PROVINCES, FACILITIES, ROUTES, ITINERARIES, PREFERENCES, RISK_FLAGS, REPORTS,
} from './mockData';
import type {
  PlaceCardVM, PlaceDetail, TrustDecisionVM, FairPriceVM, CulturalContextVM,
  GraphVM, DetourRequest, DetourResponse, SeasonInfo, Province, Facility,
  RouteVM, Itinerary, TouristPreferences, ReportInput, Report, AdminRiskFlag,
  ChatRequest, ChatResponseVM, ChatSuggestedAction, ChatRiskHint,
} from './types';

const delay = <T,>(value: T, ms = 280): Promise<T> =>
  new Promise((res) => setTimeout(() => res(value), ms));

const toCard = (p: PlaceDetail): PlaceCardVM => ({
  id: p.id, kind: p.kind, name: p.name, nameTh: p.nameTh,
  provinceName: p.provinceName, provinceNameTh: p.provinceNameTh,
  imageUrl: p.imageUrl,
  trustScore: p.trustScore, crowdScore: p.crowdScore,
  seasonFitScore: p.seasonFitScore, accessibilityScore: p.accessibilityScore,
  localValueScore: p.localValueScore, fairPrice: p.fairPrice,
  reasonSnippet: p.reasonSnippet, reasonSnippetTh: p.reasonSnippetTh,
  safetyTags: p.safetyTags, lat: p.lat, lng: p.lng,
});

// GET /api/v1/discovery/seasons/current
export const getCurrentSeason = (): Promise<SeasonInfo> => delay(SEASON_CURRENT);

// GET /api/v1/discovery/places
export const getPlaces = (params?: {
  kind?: string; provinceId?: string; sortBy?: 'relevance' | 'trust' | 'crowd'; limit?: number;
}): Promise<PlaceCardVM[]> => {
  let list = PLACES.map(toCard);
  if (params?.kind) list = list.filter((p) => p.kind === params.kind);
  if (params?.provinceId) {
    const prov = PROVINCES.find((p) => p.id === params.provinceId);
    if (prov) list = list.filter((p) => p.provinceName === prov.name);
  }
  if (params?.sortBy === 'trust') list = list.sort((a, b) => b.trustScore - a.trustScore);
  if (params?.sortBy === 'crowd') list = list.sort((a, b) => a.crowdScore - b.crowdScore);
  if (params?.limit) list = list.slice(0, params.limit);
  return delay(list);
};

// GET /api/v1/discovery/places/{id}
export const getPlace = (id: string): Promise<PlaceDetail | undefined> =>
  delay(PLACES.find((p) => p.id === id));

// GET /api/v1/discovery/provinces
export const getProvinces = (): Promise<Province[]> => delay(PROVINCES);

// GET /api/v1/discovery/facilities
export const getFacilities = (): Promise<Facility[]> => delay(FACILITIES);

// POST /api/v1/recommendations/detour
export const postDetour = (req: DetourRequest): Promise<DetourResponse> => {
  const ranked = [...PLACES]
    .map(toCard)
    .sort((a, b) => (b.trustScore + (1 - b.crowdScore)) - (a.trustScore + (1 - a.crowdScore)))
    .slice(0, 4);
  return delay({
    requestId: 'req-' + Math.random().toString(36).slice(2, 9),
    results: ranked,
    rationale: req.avoidCrowds
      ? 'We prioritized verified places with low crowd scores and consistent local reviews.'
      : 'We balanced trust signals, season fit, and your stated vibe.',
  });
};

// GET /api/v1/trust/places/{id}
export const getTrust = (id: string): Promise<TrustDecisionVM | undefined> =>
  delay(TRUST_DECISIONS[id]);

// GET /api/v1/fair-price/places/{id}
export const getFairPrice = (id: string): Promise<FairPriceVM | undefined> =>
  delay(FAIR_PRICES[id]);

// GET /api/v1/cultural-context/places/{id}
export const getCulturalContext = (id: string): Promise<CulturalContextVM | undefined> =>
  delay(CULTURAL[id]);

// GET /api/v1/graph/places/{id}
export const getGraph = (id: string): Promise<GraphVM | undefined> => delay(GRAPHS[id]);

// GET /api/v1/routes/smart
export const getRoutes = (): Promise<RouteVM[]> => delay(ROUTES);

// GET/POST /api/v1/tourist/itineraries
export const getItineraries = (): Promise<Itinerary[]> => delay(ITINERARIES);
export const getItinerary = (id: string): Promise<Itinerary | undefined> =>
  delay(ITINERARIES.find((i) => i.id === id));

// GET/PATCH /api/v1/tourist/preferences
export const getPreferences = (): Promise<TouristPreferences> => delay(PREFERENCES);
export const patchPreferences = (p: Partial<TouristPreferences>): Promise<TouristPreferences> => {
  Object.assign(PREFERENCES, p);
  return delay(PREFERENCES);
};

// POST /api/v1/reports
export const postReport = (input: ReportInput): Promise<Report> => {
  const r: Report = {
    id: 'rep-' + Math.random().toString(36).slice(2, 9),
    status: 'submitted',
    submittedISO: new Date().toISOString(),
    ...input,
  };
  REPORTS.unshift(r);
  return delay(r, 500);
};

// GET /api/v1/tourist/reports
export const getMyReports = (): Promise<Report[]> => delay(REPORTS);

// GET /api/v1/admin/risk-flags
export const getRiskFlags = (): Promise<AdminRiskFlag[]> => delay(RISK_FLAGS);

// POST /api/chat — supportive AI assistant (mock). Returns ChatResponseVM.
export const postChat = (req: ChatRequest): Promise<ChatResponseVM> => {
  const last = req.messages[req.messages.length - 1]?.content?.toLowerCase() ?? '';
  const ctxId = req.context?.currentPlaceId;
  const pagePath = req.context?.pagePath ?? '';

  // naive intent matching against mock places
  const matched = PLACES.filter((p) =>
    last.includes(p.name.toLowerCase()) ||
    (p.nameTh && last.includes(p.nameTh)) ||
    last.includes(p.provinceName.toLowerCase()),
  ).slice(0, 3);

  const linkedPlaceIds = matched.length
    ? matched.map((p) => p.id)
    : ctxId
    ? [ctxId]
    : [PLACES[0].id];

  const top = PLACES.find((p) => p.id === linkedPlaceIds[0])!;

  let riskHint: ChatRiskHint = 'low_risk';
  if (top.trustScore < 0.5) riskHint = 'high_risk';
  else if (top.trustScore < 0.7) riskHint = 'review_suggested';

  const isReportIntent = /(scam|cheat|overcharg|suspic|unsafe|report|risk)/.test(last);
  const isPriceIntent = /(price|cost|expensive|cheap|baht|thb|fair)/.test(last);
  const isCultureIntent = /(culture|temple|wai|tip|etiquette|respect|monk)/.test(last);
  const isAlternativeIntent = /(altern|detour|quiet|less crowd|instead|other place)/.test(last);

  const actions: ChatSuggestedAction[] = ['Open Place Detail'];
  if (pagePath.startsWith('/place/')) actions.unshift('View Trust Sources');
  if (isPriceIntent) actions.unshift('View Fair Price');
  if (isCultureIntent) actions.push('View Cultural Context');
  if (isAlternativeIntent || pagePath === '/' || pagePath.startsWith('/explore')) actions.push('Find Safer Detours');
  if (isReportIntent) {
    actions.unshift('Report Risk');
    riskHint = 'not_guaranteed_safety';
  }
  if (!actions.includes('View Trust Sources')) actions.push('View Trust Sources');

  let reply: string;
  let replyTh: string;
  if (isReportIntent) {
    reply = `If something feels off at ${top.name}, you can submit a quick report. Trust signals are estimates only — your safety is not guaranteed.`;
    replyTh = `หากพบสิ่งผิดปกติที่ ${top.nameTh ?? top.name} สามารถแจ้งรายงานได้ คะแนนความน่าเชื่อถือเป็นเพียงค่าประมาณ ไม่ใช่การรับประกันความปลอดภัย`;
  } else if (isPriceIntent) {
    const fp = top.fairPrice;
    reply = `${top.name} pricing looks ${fp.label.replace('_', ' ')} (${fp.deltaPct > 0 ? '+' : ''}${fp.deltaPct}% vs area average). Open the fair-price card for the full breakdown.`;
    replyTh = `ราคา ${top.nameTh ?? top.name} อยู่ในระดับ ${fp.label} เทียบกับค่าเฉลี่ยพื้นที่ ${fp.deltaPct > 0 ? '+' : ''}${fp.deltaPct}%`;
  } else if (isCultureIntent) {
    reply = `For ${top.name}, check the cultural-context card before visiting — it covers etiquette, best time, and local taboos.`;
    replyTh = `ก่อนไป ${top.nameTh ?? top.name} แนะนำให้อ่านการ์ดบริบทวัฒนธรรมเรื่องมารยาทและช่วงเวลาที่เหมาะสม`;
  } else if (isAlternativeIntent) {
    reply = `Here are quieter, verified alternatives near your interest. ${top.name} scores ${(top.trustScore * 100) | 0}% trust with low crowd levels.`;
    replyTh = `นี่คือทางเลือกที่เงียบกว่าและผ่านการตรวจสอบ ${top.nameTh ?? top.name} ได้คะแนนความน่าเชื่อถือ ${(top.trustScore * 100) | 0}%`;
  } else {
    reply = `${top.name} (${top.provinceName}) looks generally trusted at ${(top.trustScore * 100) | 0}%. Open the place card to review trust sources, fair price, and cultural context.`;
    replyTh = `${top.nameTh ?? top.name} (${top.provinceNameTh ?? top.provinceName}) ดูน่าเชื่อถือโดยรวม ${(top.trustScore * 100) | 0}% เปิดการ์ดเพื่อดูแหล่งข้อมูลและบริบทวัฒนธรรม`;
  }

  return delay({
    reply,
    replyTh,
    suggestedActions: Array.from(new Set(actions)).slice(0, 4),
    linkedPlaceIds,
    riskHint,
  }, 450);
};

export const queryKeys = {
  season: ['season', 'current'] as const,
  places: (params?: unknown) => ['places', params] as const,
  place: (id: string) => ['place', id] as const,
  trust: (id: string) => ['trust', id] as const,
  fairPrice: (id: string) => ['fair-price', id] as const,
  cultural: (id: string) => ['cultural', id] as const,
  graph: (id: string) => ['graph', id] as const,
  provinces: ['provinces'] as const,
  facilities: ['facilities'] as const,
  routes: ['routes'] as const,
  itineraries: ['itineraries'] as const,
  itinerary: (id: string) => ['itinerary', id] as const,
  preferences: ['preferences'] as const,
  reports: ['reports'] as const,
  riskFlags: ['admin', 'risk-flags'] as const,
};
