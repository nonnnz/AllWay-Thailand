import type {
  PlaceCardVM, PlaceDetail, TrustDecisionVM, FairPriceVM, CulturalContextVM,
  GraphVM, SeasonInfo, Province, Facility, RouteVM, Itinerary,
  TouristPreferences, AdminRiskFlag, Report,
} from './types';

// Real, location-relevant Unsplash images (curated, documentary feel).
const IMG = {
  aoBoThongLang: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=70',
  panNamRon: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=1200&q=70',
  banKhokKloi: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=70',
  doiInthanon: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=70',
  pai: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=70',
  ayutthaya: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=1200&q=70',
  noodleStall: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=70',
  homestay: 'https://images.unsplash.com/photo-1542640244-7e672d6cef4e?auto=format&fit=crop&w=1200&q=70',
};

export const PLACES: PlaceDetail[] = [
  {
    id: 'tat:attraction:P03013345',
    kind: 'attraction',
    name: 'Ao Bo Thong Lang',
    nameTh: 'อ่าวบ่อทองหลาง',
    provinceName: 'Prachuap Khiri Khan',
    provinceNameTh: 'ประจวบคีรีขันธ์',
    imageUrl: IMG.aoBoThongLang,
    galleryUrls: [IMG.aoBoThongLang, IMG.banKhokKloi],
    trustScore: 0.81,
    crowdScore: 0.34,
    seasonFitScore: 0.84,
    accessibilityScore: 0.72,
    localValueScore: 0.78,
    fairPrice: { label: 'in-range', deltaPct: 8 },
    reasonSnippet: 'Quieter coastal alternative to Hua Hin with consistent local reviews.',
    reasonSnippetTh: 'ทางเลือกชายทะเลที่เงียบสงบกว่าหัวหิน รีวิวจากคนท้องถิ่นสม่ำเสมอ',
    safetyTags: ['low-crowd', 'family-friendly'],
    lat: 11.7842, lng: 99.7916,
    description: 'A small fishing-village bay south of Hua Hin. Calm water, local seafood, and quiet mornings. Good for travelers who want the coast without the crowds.',
    descriptionTh: 'อ่าวเล็ก ๆ ในหมู่บ้านชาวประมงทางใต้ของหัวหิน เหมาะกับคนที่อยากชมทะเลแบบสงบ ๆ',
    hours: 'Open daily, sunrise to sunset',
  },
  {
    id: 'tat:attraction:P02011120',
    kind: 'attraction',
    name: 'Pan Nam Ron Hot Springs',
    nameTh: 'น้ำพุร้อนปั่นน้ำร้อน',
    provinceName: 'Ranong',
    provinceNameTh: 'ระนอง',
    imageUrl: IMG.panNamRon,
    galleryUrls: [IMG.panNamRon],
    trustScore: 0.74,
    crowdScore: 0.42,
    seasonFitScore: 0.78,
    accessibilityScore: 0.65,
    localValueScore: 0.71,
    fairPrice: { label: 'in-range', deltaPct: 3 },
    reasonSnippet: 'Lesser-known mineral springs operated by the local community.',
    reasonSnippetTh: 'น้ำพุร้อนแร่ที่ดูแลโดยชุมชนท้องถิ่น',
    safetyTags: ['community-run'],
    lat: 9.9659, lng: 98.6348,
    description: 'Community-managed hot springs with simple bathing pools. Cash preferred. Bring a towel.',
    hours: '07:00 – 19:00',
  },
  {
    id: 'tat:attraction:P05022118',
    kind: 'attraction',
    name: 'Doi Inthanon Summit Trail',
    nameTh: 'เส้นทางยอดดอยอินทนนท์',
    provinceName: 'Chiang Mai',
    provinceNameTh: 'เชียงใหม่',
    imageUrl: IMG.doiInthanon,
    galleryUrls: [IMG.doiInthanon, IMG.pai],
    trustScore: 0.88,
    crowdScore: 0.61,
    seasonFitScore: 0.92,
    accessibilityScore: 0.55,
    localValueScore: 0.74,
    fairPrice: { label: 'in-range', deltaPct: 0 },
    reasonSnippet: 'Reliable national-park experience; cool-season weather window now.',
    reasonSnippetTh: 'อุทยานแห่งชาติที่จัดการดี เหมาะกับช่วงฤดูหนาว',
    safetyTags: ['park-managed', 'cool-season'],
    lat: 18.5886, lng: 98.4870,
    description: 'Highest peak in Thailand. Trail conditions vary in green season; check the ranger station.',
    hours: '06:00 – 18:00',
  },
  {
    id: 'tat:restaurant:R09001442',
    kind: 'restaurant',
    name: 'Krua Pa Daeng Noodle House',
    nameTh: 'ครัวป้าแดง',
    provinceName: 'Prachuap Khiri Khan',
    provinceNameTh: 'ประจวบคีรีขันธ์',
    imageUrl: IMG.noodleStall,
    galleryUrls: [IMG.noodleStall],
    trustScore: 0.69,
    crowdScore: 0.55,
    seasonFitScore: 0.7,
    accessibilityScore: 0.6,
    localValueScore: 0.86,
    fairPrice: { label: 'in-range', deltaPct: -4 },
    reasonSnippet: 'Family-run noodles. Cash only. Order at the counter.',
    reasonSnippetTh: 'ร้านก๋วยเตี๋ยวครอบครัว สั่งที่เคาน์เตอร์ รับเงินสดเท่านั้น',
    safetyTags: ['cash-only', 'local-favorite'],
    lat: 11.8101, lng: 99.7972,
    description: 'A 30-year-old neighborhood noodle stall. The owner speaks limited English; menu has photos.',
    hours: '07:00 – 14:00 (closed Wednesday)',
  },
  {
    id: 'tat:accommodation:A07112233',
    kind: 'accommodation',
    name: 'Ban Khok Kloi Homestay',
    nameTh: 'บ้านโคกกลอยโฮมสเตย์',
    provinceName: 'Phang Nga',
    provinceNameTh: 'พังงา',
    imageUrl: IMG.homestay,
    galleryUrls: [IMG.homestay, IMG.banKhokKloi],
    trustScore: 0.77,
    crowdScore: 0.28,
    seasonFitScore: 0.81,
    accessibilityScore: 0.58,
    localValueScore: 0.83,
    fairPrice: { label: 'slightly_high', deltaPct: 14 },
    reasonSnippet: 'Verified community homestay with consistent guest feedback.',
    reasonSnippetTh: 'โฮมสเตย์ชุมชนที่ผ่านการตรวจสอบ มีรีวิวสม่ำเสมอ',
    safetyTags: ['community-verified'],
    lat: 8.2772, lng: 98.3015,
    description: 'Run by a fishing family. Three rooms only; book ahead by phone.',
    contact: '+66 76 000 000',
    hours: 'Check-in 14:00, check-out 11:00',
  },
  {
    id: 'tat:experience:E04300912',
    kind: 'experience',
    name: 'Ayutthaya Night Bicycle Tour',
    nameTh: 'ทัวร์จักรยานกลางคืนอยุธยา',
    provinceName: 'Ayutthaya',
    provinceNameTh: 'พระนครศรีอยุธยา',
    imageUrl: IMG.ayutthaya,
    galleryUrls: [IMG.ayutthaya],
    trustScore: 0.83,
    crowdScore: 0.48,
    seasonFitScore: 0.79,
    accessibilityScore: 0.7,
    localValueScore: 0.75,
    fairPrice: { label: 'in-range', deltaPct: 5 },
    reasonSnippet: 'Licensed local guide. Helmets and lights provided.',
    reasonSnippetTh: 'ไกด์ท้องถิ่นที่มีใบอนุญาต ครอบคลุมหมวกและไฟ',
    safetyTags: ['licensed-guide', 'equipment-included'],
    lat: 14.3528, lng: 100.5777,
    description: 'Two-hour ride past illuminated temples. Group max 8 to keep things calm.',
    hours: 'Tour starts 19:00 daily',
  },
];

export const TRUST_DECISIONS: Record<string, TrustDecisionVM> = Object.fromEntries(
  PLACES.map((p) => [p.id, {
    placeId: p.id,
    trustScore: p.trustScore,
    riskLabels: p.trustScore >= 0.8 ? ['low_risk'] : p.trustScore >= 0.65 ? ['medium_review_risk'] : ['recent_reports'],
    reasonsPositive: [
      'TAT registry record matches operating address.',
      'Consistent guest reviews across the last 90 days.',
      'No active safety incidents reported.',
    ],
    reasonsNegative: p.trustScore < 0.8 ? ['Limited multi-language information.'] : [],
    sources: [
      { source: 'TAT registry', signal: 'verified', weight: 0.4, status: 'positive' },
      { source: 'Community reports', signal: '0 high-severity (90d)', weight: 0.25, status: 'positive' },
      { source: 'Price observations', signal: `${p.fairPrice.label}`, weight: 0.2, status: p.fairPrice.label === 'in-range' ? 'positive' : 'neutral' },
      { source: 'Local partner network', signal: 'cross-referenced', weight: 0.15, status: 'positive' },
    ],
    lastUpdatedISO: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    priceFairness: {
      status: p.fairPrice.label,
      areaAvg: 120,
      observed: 120 + (p.fairPrice.deltaPct * 1.2),
      currency: 'THB',
    },
    culturalContext: 'Cash preferred. Order at the counter first. Ask for "no fish sauce" if vegetarian.',
    culturalContextTh: 'นิยมเงินสด สั่งที่เคาน์เตอร์ก่อน หากทานมังสวิรัติบอก "ไม่ใส่น้ำปลา"',
  }]),
);

export const FAIR_PRICES: Record<string, FairPriceVM> = Object.fromEntries(
  PLACES.map((p) => [p.id, {
    placeId: p.id,
    status: p.fairPrice.label,
    observed: 120 + p.fairPrice.deltaPct * 1.2,
    areaAvg: 120,
    areaMin: 80,
    areaMax: 180,
    sampleSize: 24,
    currency: 'THB',
    notes: 'Observed prices from public menus and verified guest receipts in the last 60 days.',
  }]),
);

export const CULTURAL: Record<string, CulturalContextVM> = Object.fromEntries(
  PLACES.map((p) => [p.id, {
    placeId: p.id,
    tips: [
      { icon: 'wallet', text: 'Cash preferred. Small bills help.', textTh: 'นิยมเงินสด เตรียมแบงก์ย่อย' },
      { icon: 'utensils', text: 'Order at the counter, then sit.', textTh: 'สั่งที่เคาน์เตอร์ก่อนนั่ง' },
      { icon: 'shirt', text: 'Modest dress recommended at temples.', textTh: 'แต่งกายสุภาพในวัด' },
    ],
    taboos: ['Do not point feet at images of Buddha.', 'Avoid raised voices in temples.'],
    bestTime: 'Early morning or after 16:00 to avoid heat.',
  }]),
);

export const GRAPHS: Record<string, GraphVM> = Object.fromEntries(
  PLACES.map((p) => [p.id, {
    placeId: p.id,
    nodes: [
      { id: p.id, label: p.name, group: 'place', trustScore: p.trustScore },
      { id: `${p.id}:food1`, label: 'Local seafood', group: 'food' },
      { id: `${p.id}:culture1`, label: 'Fishing community', group: 'culture' },
      { id: `${p.id}:nature1`, label: 'Coastal mangrove', group: 'nature' },
      { id: `${p.id}:route1`, label: 'Coastal Route 4', group: 'route' },
    ],
    links: [
      { source: p.id, target: `${p.id}:food1`, relation: 'serves', weight: 0.8 },
      { source: p.id, target: `${p.id}:culture1`, relation: 'rooted-in', weight: 0.9 },
      { source: p.id, target: `${p.id}:nature1`, relation: 'near', weight: 0.6 },
      { source: p.id, target: `${p.id}:route1`, relation: 'on-route', weight: 0.5 },
    ],
  }]),
);

export const SEASON_CURRENT: SeasonInfo = {
  current: 'cool',
  label: 'Cool season',
  monthsRange: 'Nov – Feb',
  recommendation: 'Mountain trails and northern routes are at their best. Coastal mornings are calm.',
};

export const PROVINCES: Province[] = [
  { id: 'pkk', name: 'Prachuap Khiri Khan', nameTh: 'ประจวบคีรีขันธ์', region: 'west' },
  { id: 'rng', name: 'Ranong', nameTh: 'ระนอง', region: 'south' },
  { id: 'cnx', name: 'Chiang Mai', nameTh: 'เชียงใหม่', region: 'north' },
  { id: 'pna', name: 'Phang Nga', nameTh: 'พังงา', region: 'south' },
  { id: 'ayy', name: 'Ayutthaya', nameTh: 'พระนครศรีอยุธยา', region: 'central' },
];

export const FACILITIES: Facility[] = [
  { id: 'parking', name: 'Parking', icon: 'car' },
  { id: 'restroom', name: 'Restroom', icon: 'toilet' },
  { id: 'wheelchair', name: 'Wheelchair access', icon: 'accessibility' },
  { id: 'wifi', name: 'Wi-Fi', icon: 'wifi' },
  { id: 'family', name: 'Family-friendly', icon: 'users' },
];

export const ROUTES: RouteVM[] = [
  {
    id: 'route-coast-3d',
    title: 'Quiet coast — 3-day southern detour',
    days: 3,
    totalDistanceKm: 412,
    trustAverage: 0.78,
    stops: [
      [
        { placeId: PLACES[0].id, name: PLACES[0].name, arriveISO: 'D1 09:00', durationMin: 120, trustScore: PLACES[0].trustScore, lat: PLACES[0].lat, lng: PLACES[0].lng },
        { placeId: PLACES[3].id, name: PLACES[3].name, arriveISO: 'D1 12:30', durationMin: 60, trustScore: PLACES[3].trustScore, lat: PLACES[3].lat, lng: PLACES[3].lng },
      ],
      [
        { placeId: PLACES[1].id, name: PLACES[1].name, arriveISO: 'D2 10:00', durationMin: 90, trustScore: PLACES[1].trustScore, warning: 'Road can be slippery in heavy rain.', lat: PLACES[1].lat, lng: PLACES[1].lng },
      ],
      [
        { placeId: PLACES[4].id, name: PLACES[4].name, arriveISO: 'D3 14:00', durationMin: 720, trustScore: PLACES[4].trustScore, lat: PLACES[4].lat, lng: PLACES[4].lng },
      ],
    ],
  },
];

export const ITINERARIES: Itinerary[] = [
  {
    id: 'itin-1',
    title: 'My quiet southern coast trip',
    createdISO: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    items: [
      { id: 'i1', placeId: PLACES[0].id, placeName: PLACES[0].name, day: 1, trustSnapshot: PLACES[0].trustScore, note: 'Sunrise photo stop.' },
      { id: 'i2', placeId: PLACES[3].id, placeName: PLACES[3].name, day: 1, trustSnapshot: PLACES[3].trustScore },
      { id: 'i3', placeId: PLACES[4].id, placeName: PLACES[4].name, day: 2, trustSnapshot: PLACES[4].trustScore, note: 'Book ahead by phone.' },
    ],
  },
];

export const PREFERENCES: TouristPreferences = {
  budget: 'mid',
  vibe: ['nature', 'food', 'quiet'],
  crowdTolerance: 0.4,
  accessibility: false,
  consents: { analytics: true, personalization: true, sharing: false },
};

export const RISK_FLAGS: AdminRiskFlag[] = [
  { id: 'rf-1', placeId: 'tat:attraction:UNK1', placeName: 'Sunset Pier (unverified)', province: 'Phuket', severity: 'high', reason: 'Repeated overcharging reports', reportsCount: 7, raisedISO: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'open' },
  { id: 'rf-2', placeId: 'tat:restaurant:UNK2', placeName: 'Floating Market Stall #14', province: 'Samut Songkhram', severity: 'medium', reason: 'Misleading pricing photos', reportsCount: 3, raisedISO: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'in_review' },
  { id: 'rf-3', placeId: PLACES[1].id, placeName: PLACES[1].name, province: 'Ranong', severity: 'low', reason: 'Single safety note (slippery path)', reportsCount: 1, raisedISO: new Date(Date.now() - 86400000 * 9).toISOString(), status: 'open' },
];

export const REPORTS: Report[] = [
  { id: 'rep-1', placeId: PLACES[0].id, category: 'safety', severity: 'low', description: 'Unmarked rocks near beach entrance.', status: 'in_review', submittedISO: new Date(Date.now() - 86400000 * 3).toISOString() },
];
