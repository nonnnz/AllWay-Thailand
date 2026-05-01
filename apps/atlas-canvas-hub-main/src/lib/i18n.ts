import { useAppStore } from './store';

type Dict = Record<string, { en: string; th: string }>;

const STRINGS: Dict = {
  'app.tagline': { en: 'Travel safer. Stay trusted.', th: 'เที่ยวอย่างมั่นใจ เลือกเส้นทางที่ไว้ใจได้' },
  'nav.home': { en: 'Home', th: 'หน้าแรก' },
  'nav.explore': { en: 'Explore', th: 'สำรวจ' },
  'nav.recommendations': { en: 'Recommendations', th: 'แนะนำ' },
  'nav.routes': { en: 'Routes', th: 'เส้นทาง' },
  'nav.itinerary': { en: 'Itinerary', th: 'แผนเที่ยว' },
  'nav.profile': { en: 'Profile', th: 'โปรไฟล์' },
  'nav.admin': { en: 'Admin', th: 'แอดมิน' },
  'cta.findDetours': { en: 'Find safer detours', th: 'หาเส้นทางทางเลือกที่ปลอดภัย' },
  'cta.viewTrusted': { en: 'View trusted places', th: 'ดูสถานที่ที่ไว้ใจได้' },
  'cta.report': { en: 'Report risk', th: 'แจ้งความเสี่ยง' },
  'cta.saveItinerary': { en: 'Save to itinerary', th: 'บันทึกเข้าแผนเที่ยว' },
  'label.trust': { en: 'Trust', th: 'ความน่าเชื่อถือ' },
  'label.crowd': { en: 'Crowd', th: 'ความหนาแน่น' },
  'label.fit': { en: 'Fit', th: 'ความเหมาะ' },
  'label.localValue': { en: 'Local value', th: 'คุณค่าท้องถิ่น' },
  'label.access': { en: 'Accessibility', th: 'การเข้าถึง' },
  'label.fairPrice': { en: 'Fair price', th: 'ราคาที่เป็นธรรม' },
  'trust.high': { en: 'Verified — High trust', th: 'ผ่านการตรวจสอบ — น่าเชื่อถือสูง' },
  'trust.medium': { en: 'Review suggested', th: 'แนะนำให้ตรวจสอบเพิ่มเติม' },
  'trust.low': { en: 'Caution — Low trust', th: 'โปรดระวัง — ความน่าเชื่อถือต่ำ' },
  'home.searchPlaceholder': { en: 'e.g. quiet coast near Hua Hin, family-friendly, under 3,000 THB/day', th: 'เช่น ทะเลเงียบ ๆ ใกล้หัวหิน เหมาะกับครอบครัว งบไม่เกิน 3,000 บาท/วัน' },
  'home.searchHelper': { en: 'Tell us in your own words. We will compare verified, low-risk options.', th: 'เล่าด้วยภาษาของคุณ เราจะเปรียบเทียบตัวเลือกที่ผ่านการตรวจสอบและความเสี่ยงต่ำ' },
  'home.trendingTitle': { en: 'Trending verified places', th: 'สถานที่ที่ผ่านการตรวจสอบและกำลังมาแรง' },
  'disclaimer': { en: 'Trust scores are estimates based on multiple sources. Always check official updates before traveling.', th: 'คะแนนความน่าเชื่อถือเป็นค่าประมาณจากหลายแหล่งข้อมูล โปรดตรวจสอบข้อมูลทางการก่อนเดินทาง' },
};

export function useT() {
  const lang = useAppStore((s) => s.language);
  return (key: keyof typeof STRINGS) => STRINGS[key]?.[lang] ?? key;
}

// Pick localized field from an object that might have an `xxxTh` variant.
export function pickLocalized(obj: { [k: string]: any } | undefined, base: string): string {
  const lang = useAppStore.getState().language;
  if (!obj) return '';
  if (lang === 'th' && obj[base + 'Th']) return obj[base + 'Th'];
  return obj[base] ?? '';
}
