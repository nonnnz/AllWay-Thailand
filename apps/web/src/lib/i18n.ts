import { useAppStore } from "./store";

type Dict = Record<string, { en: string; th: string }>;

const STRINGS: Dict = {
  "app.tagline": {
    en: "Thailand, tasted like a friend showed you.",
    th: "เที่ยวไทยแบบที่เพื่อนคนไทยจะพาไป",
  },
  "nav.home": { en: "Home", th: "หน้าแรก" },
  "nav.explore": { en: "Explore", th: "สำรวจ" },
  "nav.recommendations": { en: "Recommendations", th: "แนะนำ" },
  "nav.routes": { en: "Routes", th: "เส้นทาง" },
  "nav.itinerary": { en: "Itinerary", th: "แผนเที่ยว" },
  "nav.profile": { en: "Profile", th: "โปรไฟล์" },
  "nav.admin": { en: "Admin", th: "แอดมิน" },
  "cta.findDetours": { en: "Take a tour", th: "เริ่มเที่ยว" },
  "cta.viewTrusted": {
    en: "See why we trust this",
    th: "ดูว่าทำไมเราไว้ใจที่นี่",
  },
  "cta.report": { en: "Report risk", th: "แจ้งความเสี่ยง" },
  "cta.saveItinerary": {
    en: "★ Save to Itinerary",
    th: "★ บันทึกเข้าแผนเที่ยว",
  },
  "label.trust": { en: "Trust", th: "ความน่าเชื่อถือ" },
  "label.crowd": { en: "Crowd", th: "ความหนาแน่น" },
  "label.fit": { en: "Fit", th: "ความเหมาะ" },
  "label.localValue": { en: "Local value", th: "คุณค่าท้องถิ่น" },
  "label.access": { en: "Accessibility", th: "การเข้าถึง" },
  "label.fairPrice": { en: "Fair price", th: "ราคาที่เป็นธรรม" },
  "trust.high": { en: "Verified ★", th: "ผ่านการตรวจสอบ ★" },
  "trust.medium": { en: "Worth checking", th: "น่าตรวจสอบ" },
  "trust.low": { en: "Heads-up — low trust", th: "ระวัง — ความน่าเชื่อถือต่ำ" },
  "home.searchPlaceholder": {
    en: "What do you crave on a perfect day in Thailand?",
    th: "อยากเจอวันแบบไหนในไทย?",
  },
  "home.searchHelper": {
    en: "A travel companion built by people who actually live here. Warm. Verified. Color-coded by the way you want to spend a day.",
    th: "เพื่อนร่วมทางที่สร้างโดยคนที่อยู่ที่นี่จริง ๆ อบอุ่น ตรวจสอบแล้ว จัดสีตามวันที่คุณอยากใช้",
  },
  "home.trendingTitle": {
    en: "Hot places picked for you",
    th: "สถานที่ฮิตที่เราคัดมาให้",
  },
  "cta.login": { en: "Sign in", th: "เข้าสู่ระบบ" },
  "cta.logout": { en: "Sign out", th: "ออกจากระบบ" },
  "auth.title": { en: "Welcome back", th: "ยินดีต้อนรับกลับมา" },
  "auth.subtitle": {
    en: "Choose a mock role to continue",
    th: "เลือกบทบาทเพื่อดำเนินการต่อ",
  },
  "role.traveler": { en: "Traveler", th: "นักท่องเที่ยว" },
  "role.admin": { en: "Administrator", th: "ผู้ดูแลระบบ" },
  disclaimer: {
    en: "Trust scores are verified by people who've been. Always check official updates before traveling.",
    th: "คะแนนความน่าเชื่อถือยืนยันโดยคนที่ไปมาแล้ว โปรดตรวจสอบข้อมูลทางการก่อนเดินทาง",
  },
};

export function useT() {
  const lang = useAppStore((s) => s.language);
  return (key: keyof typeof STRINGS) => STRINGS[key]?.[lang] ?? key;
}

// Pick localized field from an object that might have an `xxxTh` variant.
export function pickLocalized(
  obj: { [k: string]: any } | undefined,
  base: string,
): string {
  const lang = useAppStore.getState().language;
  if (!obj) return "";
  if (lang === "th" && obj[base + "Th"]) return obj[base + "Th"];
  return obj[base] ?? "";
}
