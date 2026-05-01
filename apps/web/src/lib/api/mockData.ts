import type {
  PlaceCardVM,
  PlaceDetail,
  TrustDecisionVM,
  FairPriceVM,
  CulturalContextVM,
  GraphVM,
  SeasonInfo,
  Province,
  Facility,
  RouteVM,
  Itinerary,
  TouristPreferences,
  AdminRiskFlag,
  Report,
  AdminAILog,
  AdminDataJob,
} from "./types";

// Real, location-relevant Unsplash images (curated, documentary feel).
const IMG = {
  aoBoThongLang:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=70",
  panNamRon:
    "https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=1200&q=70",
  banKhokKloi:
    "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=70",
  doiInthanon:
    "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=70",
  pai: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=70",
  ayutthaya:
    "https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=1200&q=70",
  noodleStall:
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=70",
  homestay:
    "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?auto=format&fit=crop&w=1200&q=70",
};

export const PLACES: PlaceDetail[] = [
  {
    id: "mock:place:ao-bo-thong-lang",
    kind: "attraction",
    name: "Ao Bo Thong Lang",
    nameTh: "อ่าวบ่อทองหลาง",
    provinceName: "Prachuap Khiri Khan",
    provinceNameTh: "ประจวบคีรีขันธ์",
    imageUrl: IMG.aoBoThongLang,
    galleryUrls: [IMG.aoBoThongLang, IMG.banKhokKloi],
    trustScore: 0.81,
    crowdScore: 0.34,
    seasonFitScore: 0.84,
    accessibilityScore: 0.72,
    localValueScore: 0.78,
    fairPrice: { label: "in-range", deltaPct: 8 },
    reasonSnippet:
      "Quieter coastal alternative to Hua Hin with consistent local reviews.",
    reasonSnippetTh:
      "ทางเลือกชายทะเลที่เงียบสงบกว่าหัวหิน รีวิวจากคนท้องถิ่นสม่ำเสมอ",
    safetyTags: ["low-crowd", "family-friendly"],
    lat: 11.7842,
    lng: 99.7916,
    description:
      "A small fishing-village bay south of Hua Hin. Calm water, local seafood, and quiet mornings.",
    hours: "Open daily, sunrise to sunset",
  },
  {
    id: "mock:place:pan-nam-ron",
    kind: "attraction",
    name: "Pan Nam Ron",
    nameTh: "น้ำพุร้อนปั่นน้ำร้อน",
    provinceName: "Ranong",
    provinceNameTh: "ระนอง",
    imageUrl: IMG.panNamRon,
    galleryUrls: [IMG.panNamRon],
    trustScore: 0.74,
    crowdScore: 0.46,
    seasonFitScore: 0.76,
    accessibilityScore: 0.58,
    localValueScore: 0.71,
    fairPrice: { label: "in-range", deltaPct: 3 },
    reasonSnippet: "Warm spring route with medium crowd and strong local value.",
    safetyTags: ["community-run"],
    lat: 9.9529,
    lng: 98.63,
    description:
      "Community-managed hot springs with simple bathing pools. Cash preferred.",
    hours: "07:00 – 19:00",
  },
  {
    id: "mock:place:chiang-rai-night-market",
    kind: "experience",
    name: "Chiang Rai Night Market",
    nameTh: "ไนท์บาร์ซ่าเชียงราย",
    provinceName: "Chiang Rai",
    provinceNameTh: "เชียงราย",
    imageUrl: IMG.banKhokKloi,
    galleryUrls: [IMG.banKhokKloi],
    trustScore: 0.69,
    crowdScore: 0.61,
    seasonFitScore: 0.71,
    accessibilityScore: 0.55,
    localValueScore: 0.65,
    fairPrice: { label: "in-range", deltaPct: 0 },
    reasonSnippet: "Local craft and street food market in city center.",
    safetyTags: ["night-market", "local-crafts"],
    lat: 19.9072,
    lng: 99.8309,
    description: "Popular night market with various local foods and handmade products.",
    hours: "18:00 – 23:00",
  },
  {
    id: "mock:place:old-town-food-court",
    kind: "restaurant",
    name: "Old Town Food Court",
    nameTh: "ศูนย์อาหารเมืองเก่า",
    provinceName: "Bangkok",
    provinceNameTh: "กรุงเทพฯ",
    imageUrl: IMG.noodleStall,
    galleryUrls: [IMG.noodleStall],
    trustScore: 0.78,
    crowdScore: 0.57,
    seasonFitScore: 0.73,
    accessibilityScore: 0.68,
    localValueScore: 0.82,
    fairPrice: { label: "in-range", deltaPct: 2 },
    reasonSnippet: "Popular local food court with fair pricing references.",
    safetyTags: ["street-food", "central-location"],
    lat: 13.7563,
    lng: 100.5018,
    description: "Authentic local food court serving classic Thai dishes.",
    hours: "10:00 – 20:00",
  },
];

export const TRUST_DECISIONS: Record<string, TrustDecisionVM> = Object.fromEntries(
  PLACES.map((p) => [
    p.id,
    {
      placeId: p.id,
      trustScore: p.trustScore,
      riskLabels: ["low_risk"],
      reasonsPositive: [
        "Consistent local community feedback",
        "Government verified tourism license",
      ],
      reasonsNegative: ["Peak hours can be slightly crowded"],
      sources: [
        { source: "TAT Registry", signal: "official", weight: 0.9, status: "positive" },
        { source: "Community Audit", signal: "verified", weight: 0.8, status: "positive" },
      ],
      lastUpdatedISO: new Date().toISOString(),
      priceFairness: {
        status: p.fairPrice.label,
        areaAvg: 250,
        observed: 250 * (1 + p.fairPrice.deltaPct / 100),
        currency: "THB",
      },
      culturalContext: "Please follow local community guidelines.",
    },
  ]),
);

export const FAIR_PRICES: Record<string, FairPriceVM> = Object.fromEntries(
  PLACES.map((p) => [
    p.id,
    {
      placeId: p.id,
      status: p.fairPrice.label,
      observed: 250 * (1 + p.fairPrice.deltaPct / 100),
      areaAvg: 250,
      areaMin: 80,
      areaMax: 450,
      sampleSize: 24,
      currency: "THB",
      notes: "Verified by local price monitoring.",
    },
  ]),
);

export const CULTURAL_CONTEXTS: Record<string, CulturalContextVM> = Object.fromEntries(
  PLACES.map((p) => [
    p.id,
    {
      placeId: p.id,
      tips: [
        { icon: "camera", text: "Best for morning light." },
        { icon: "smile", text: "Support local artisans." },
      ],
      taboos: ["Avoid loud noises near residents."],
      bestTime: "Early morning or after 16:00 to avoid heat.",
    },
  ]),
);

export const GRAPHS: Record<string, GraphVM> = Object.fromEntries(
  PLACES.map((p) => [
    p.id,
    {
      placeId: p.id,
      nodes: [
        { id: p.id, label: p.name, group: "place", trustScore: p.trustScore },
        { id: `${p.id}:food1`, label: "Local food", group: "food" },
        { id: `${p.id}:culture1`, label: "Community", group: "culture" },
      ],
      links: [
        { source: p.id, target: `${p.id}:food1`, relation: "serves", weight: 0.8 },
        { source: p.id, target: `${p.id}:culture1`, relation: "rooted-in", weight: 0.9 },
      ],
    },
  ]),
);

export const SEASON_CURRENT: SeasonInfo = {
  current: "cool",
  label: "Cool Season",
  monthsRange: "Nov-Feb",
  recommendation: "Great for outdoor routes and coastal trips.",
};

export const PROVINCES: Province[] = [
  { id: "10", name: "Bangkok", nameTh: "กรุงเทพมหานคร", region: "central" },
  { id: "57", name: "Chiang Rai", nameTh: "เชียงราย", region: "north" },
  { id: "77", name: "Prachuap Khiri Khan", nameTh: "ประจวบคีรีขันธ์", region: "west" },
  { id: "85", name: "Ranong", nameTh: "ระนอง", region: "south" },
];

export const FACILITIES: Facility[] = [
  { id: "f1", name: "Wheelchair Ramp", icon: "accessibility" },
  { id: "f2", name: "Accessible Toilet", icon: "toilet" },
  { id: "f3", name: "Braille Signage", icon: "eye-off" },
];

export const ROUTES: RouteVM[] = [
  {
    id: "mock:route:wellness-springs-3d",
    title: "Southern Wellness — 3-day mineral detour",
    days: 3,
    totalDistanceKm: 380,
    trustAverage: 0.79,
    stops: [
      [
        {
          placeId: PLACES[1].id,
          name: PLACES[1].name,
          arriveISO: "D1 09:00",
          durationMin: 120,
          trustScore: PLACES[1].trustScore,
          imageUrl: PLACES[1].imageUrl,
          lat: PLACES[1].lat,
          lng: PLACES[1].lng,
        },
      ],
      [
        {
          placeId: PLACES[0].id,
          name: PLACES[0].name,
          arriveISO: "D2 10:30",
          durationMin: 180,
          trustScore: PLACES[0].trustScore,
          imageUrl: PLACES[0].imageUrl,
          lat: PLACES[0].lat,
          lng: PLACES[0].lng,
        },
      ],
      [
        {
          placeId: PLACES[3].id,
          name: PLACES[3].name,
          arriveISO: "D3 11:00",
          durationMin: 90,
          trustScore: PLACES[3].trustScore,
          imageUrl: PLACES[3].imageUrl,
          lat: PLACES[3].lat,
          lng: PLACES[3].lng,
        },
      ],
    ],
  },
];

export const ITINERARIES: Itinerary[] = [
  {
    id: "itin-1",
    title: "My quiet southern coast trip",
    createdISO: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    items: [
      {
        id: "i1",
        placeId: PLACES[0].id,
        placeName: PLACES[0].name,
        day: 1,
        trustSnapshot: PLACES[0].trustScore,
        note: "Sunrise photo stop.",
      },
      {
        id: "i2",
        placeId: PLACES[3].id,
        placeName: PLACES[3].name,
        day: 1,
        trustSnapshot: PLACES[3].trustScore,
      },
      {
        id: "i3",
        placeId: PLACES[2].id,
        placeName: PLACES[2].name,
        day: 2,
        trustSnapshot: PLACES[2].trustScore,
        note: "Book ahead by phone.",
      },
    ],
  },
];

export const PREFERENCES: TouristPreferences = {
  budgetRange: [500, 4500],
  vibe: ["nature", "food", "quiet"],
  crowdTolerance: 0.4,
  accessibility: false,
  consents: { analytics: true, personalization: true, sharing: false },
};

export const RISK_FLAGS: AdminRiskFlag[] = [
  {
    id: "rf-1",
    placeId: "tat:attraction:UNK1",
    placeName: "Sunset Pier (unverified)",
    province: "Phuket",
    severity: "high",
    reason: "Repeated overcharging reports",
    reportsCount: 7,
    raisedISO: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "open",
  },
  {
    id: "rf-2",
    placeId: "tat:restaurant:UNK2",
    placeName: "Floating Market Stall #14",
    province: "Samut Songkhram",
    severity: "medium",
    reason: "Misleading pricing photos",
    reportsCount: 3,
    raisedISO: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: "in_review",
  },
  {
    id: "rf-3",
    placeId: PLACES[1].id,
    placeName: PLACES[1].name,
    province: "Ranong",
    severity: "low",
    reason: "Single safety note (slippery path)",
    reportsCount: 1,
    raisedISO: new Date(Date.now() - 86400000 * 9).toISOString(),
    status: "open",
  },
];

export const REPORTS: Report[] = [
  {
    id: "rep-1",
    placeId: PLACES[0].id,
    category: "safety",
    severity: "low",
    description: "Unmarked rocks near beach entrance.",
    status: "in_review",
    submittedISO: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export const AI_LOGS: AdminAILog[] = [
  {
    id: "log-1",
    timestampISO: new Date().toISOString(),
    module: "recommendation",
    inputSnippet: "Quiet coast alternatives...",
    outputSnippet: "Matched Ao Bo Thong Lang...",
    confidence: 0.92,
    flagged: false,
    attributionSources: ["tat_registry", "community_reports"],
  },
  {
    id: "log-2",
    timestampISO: new Date(Date.now() - 3600000).toISOString(),
    module: "chat",
    inputSnippet: "Is this place a scam?",
    outputSnippet: "No high-severity reports found...",
    confidence: 0.85,
    flagged: true,
    attributionSources: ["internal_risk_db"],
  },
];

export const DATA_JOBS: AdminDataJob[] = [
  {
    id: "job-1",
    name: "TAT Registry Sync",
    status: "completed",
    lastRunISO: new Date().toISOString(),
    itemsProcessed: 142,
    errors: [],
  },
  {
    id: "job-2",
    name: "Fair Price Engine",
    status: "running",
    lastRunISO: new Date().toISOString(),
    itemsProcessed: 45,
    errors: [],
  },
];
