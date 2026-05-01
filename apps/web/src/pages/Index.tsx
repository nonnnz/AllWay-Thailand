import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, Sparkles, Compass, Map as MapIcon, Wallet, CalendarDays, 
  Users, Accessibility, Heart, Navigation, Clock, Info, CheckCircle2,
  X, Send, Phone, MapPin, PlayCircle, Video, ChevronRight,
  LocateFixed, Plus, Minus, Train, Plane, DollarSign
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { PlaceCard } from '@/components/place/PlaceCard';
import { getCurrentSeason, getPlaces, queryKeys } from '@/lib/api/client';
import { useT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';
import { PlacesMap } from '@/components/map/PlacesMap';
import { TrustBadge } from '@/components/trust/TrustBadge';
import { cn } from '@/lib/utils';

const VIBE_CHIPS = [
  { en: 'Quiet coast', th: 'ทะเลเงียบ' },
  { en: 'Local food', th: 'อาหารท้องถิ่น' },
  { en: 'Family-friendly', th: 'เหมาะกับครอบครัว' },
  { en: 'Mountain & nature', th: 'ภูเขาและธรรมชาติ' },
  { en: 'Cultural', th: 'วัฒนธรรม' },
  { en: 'Avoid crowds', th: 'เลี่ยงคนเยอะ' },
];

const PROVINCE_DATA = [
  { id: 'all', nameEn: 'All Thailand', nameTh: 'ทั่วประเทศไทย', lat: 13.7563, lng: 100.5018, zoom: 6, area: '513,120 km²', secondary: false },
  { id: '10', nameEn: 'Bangkok', nameTh: 'กรุงเทพมหานคร', lat: 13.7563, lng: 100.5018, zoom: 11, area: '1,568 km²', secondary: false },
  { id: '50', nameEn: 'Chiang Mai', nameTh: 'เชียงใหม่', lat: 18.7883, lng: 98.9853, zoom: 11, area: '20,107 km²', secondary: false },
  { id: '57', nameEn: 'Chiang Rai', nameTh: 'เชียงราย', lat: 19.9072, lng: 99.8309, zoom: 10, area: '11,678 km²', secondary: true },
  { id: '55', nameEn: 'Nan', nameTh: 'น่าน', lat: 18.7833, lng: 100.7833, zoom: 11, area: '11,472 km²', secondary: true },
  { id: '71', nameEn: 'Kanchanaburi', nameTh: 'กาญจนบุรี', lat: 14.0227, lng: 99.5328, zoom: 10, area: '19,483 km²', secondary: true },
  { id: '64', nameEn: 'Sukhothai', nameTh: 'สุโขทัย', lat: 17.0078, lng: 99.8235, zoom: 11, area: '6,596 km²', secondary: true },
  { id: '20', nameEn: 'Chonburi', nameTh: 'ชลบุรี', lat: 13.3611, lng: 100.9847, zoom: 10, area: '4,363 km²', secondary: false },
  { id: '81', nameEn: 'Krabi', nameTh: 'กระบี่', lat: 8.0863, lng: 98.9063, zoom: 10, area: '4,709 km²', secondary: true },
  { id: '30', nameEn: 'Nakhon Ratchasima', nameTh: 'นครราชสีมา', lat: 14.9707, lng: 102.0978, zoom: 9, area: '20,494 km²', secondary: false },
  { id: '83', nameEn: 'Phuket', nameTh: 'ภูเก็ต', lat: 7.8804, lng: 98.3922, zoom: 11, area: '543 km²', secondary: false },
  { id: '84', nameEn: 'Surat Thani', nameTh: 'สุราษฎร์ธานี', lat: 9.1387, lng: 99.3217, zoom: 10, area: '12,891 km²', secondary: true },
];

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  // Simple Euclidean for mock purposes (approx 1 degree = 111km)
  const dLat = (lat1 - lat2) * 111;
  const dLng = (lng1 - lng2) * 111 * Math.cos(lat1 * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export default function Index() {
  const t = useT();
  const lang = useAppStore((s) => s.language);
  const navigate = useNavigate();
  const [intent, setIntent] = useState('');
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState<[number, number]>([1000, 8000]);
  const [duration, setDuration] = useState('2');
  const [companion, setCompanion] = useState('2');
  const [specials, setSpecials] = useState<string[]>(['pwd']);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedProvinceId, setSelectedProvinceId] = useState('all');
  const [showPricingHeatmap, setShowPricingHeatmap] = useState(false);
  const [areaHeatmapRadiusKm, setAreaHeatmapRadiusKm] = useState<number | undefined>(undefined);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("Geolocation error:", error);
          setUserLocation(null);
        }
      );
    }
  }, []);

  const { data: season } = useQuery({ queryKey: queryKeys.season, queryFn: getCurrentSeason });
  
  const selectedProvince = PROVINCE_DATA.find(p => p.id === selectedProvinceId) || PROVINCE_DATA[0];

  const { data: trendingRaw } = useQuery({
    queryKey: queryKeys.places({ sortBy: 'trust', limit: 12 }),
    queryFn: () => getPlaces({ sortBy: 'trust', limit: 12 }),
  });

  const trendingBase =
    (trendingRaw ?? []).filter((p) => p.provinceName !== 'Unknown province' && p.trustScore >= 0.65).length >= 3
      ? (trendingRaw ?? []).filter((p) => p.provinceName !== 'Unknown province' && p.trustScore >= 0.65)
      : trendingRaw ?? [];

  const trending = trendingBase
    .map(p => ({
      ...p,
      distance: calculateDistance(selectedProvince.lat, selectedProvince.lng, p.lat, p.lng)
    }))
    .sort((a, b) => a.distance - b.distance);

  const mapPlaces = useQuery({
    queryKey: queryKeys.places({ 
      limit: 50, 
      kind: filterCategory === 'all' ? undefined : filterCategory as any,
      provinceId: selectedProvinceId === 'all' ? undefined : selectedProvinceId
    }),
    queryFn: () => getPlaces({ 
      limit: 50, 
      kind: filterCategory === 'all' ? undefined : filterCategory as any,
      provinceId: selectedProvinceId === 'all' ? undefined : selectedProvinceId
    }),
  });

  const selectedPlace = mapPlaces.data?.find(p => p.id === selectedPlaceId);

  const mapCenter = useMemo<[number, number]>(() => [selectedProvince.lat, selectedProvince.lng], [selectedProvince.lat, selectedProvince.lng]);
  const mapZoom = selectedProvince.zoom;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams();
    if (intent) q.set('q', intent);
    if (activeChips.length) q.set('vibe', activeChips.join(','));
    navigate(`/recommendations?${q.toString()}`);
  };

  return (
    <PageShell>
      <section className="grain-surface">
        <div className="container pt-12 md:pt-20 pb-6 md:pb-8">
          <div className="relative mx-auto max-w-3xl text-center">
            {/* Hero warm backlights — mango + lotus + lemongrass radials */}
            <div className="absolute -top-32 right-0 -z-10 h-72 w-72 rounded-full bg-primary-soft/60 blur-[120px]" />
            <div className="absolute -top-16 -left-24 -z-10 h-56 w-56 rounded-full bg-lotus-soft/50 blur-[100px]" />
            
            <p className="kicker mb-6 animate-in fade-in zoom-in-95 duration-700">
              <Compass className="h-3.5 w-3.5" aria-hidden />
              {season ? `${season.label} · ${season.monthsRange}` : 'Mood Board · Vibrant Direction'}
            </p>

            {/* Fraunces display headline with chili-italic accent — moodboard §5, §7, §10 */}
            <h1 className="font-serif text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] md:text-5xl lg:text-[68px] text-foreground animate-in fade-in slide-in-from-top-4 duration-1000">
              Thailand,<br/>tasted <em className="text-chili">like a friend</em> showed you.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg animate-in fade-in slide-in-from-top-6 duration-1000 delay-200">
              {t('home.searchHelper')}
            </p>

            {/* Handwritten tagline — Caveat, moodboard §5 */}
            <p className="font-hand text-2xl text-jade mt-5 animate-in fade-in slide-in-from-top-8 duration-1000 delay-400" style={{ transform: 'rotate(-1.5deg)' }}>
              "เที่ยวไทยแบบที่เพื่อนคนไทยจะพาไป"
            </p>

            {/* Category tag chips — moodboard §4 Notion-tag system */}
            <div className="flex flex-wrap justify-center gap-2 mt-6 animate-in fade-in slide-in-from-top-8 duration-1000 delay-500">
              <span className="tag-chip tag-chili"><span className="dot"></span>Eats</span>
              <span className="tag-chip tag-indigo"><span className="dot"></span>Culture</span>
              <span className="tag-chip tag-lemongrass"><span className="dot"></span>Nature</span>
              <span className="tag-chip tag-lotus"><span className="dot"></span>Nightlife</span>
              <span className="tag-chip tag-mango"><span className="dot"></span>Wellness</span>
              <span className="tag-chip tag-jade"><span className="dot"></span>Crafts</span>
            </div>
          </div>

          {season && (
            <p className="mx-auto mt-8 max-w-3xl text-center text-sm text-muted-foreground animate-in fade-in slide-in-from-top-8 duration-1000 delay-400">
              <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden />
              {season.recommendation}
            </p>
          )}
        </div>
      </section>

      <section className="container pb-12 md:pb-16 pt-0">

        <div className="flex flex-col lg:flex-row gap-6 h-[700px] w-full overflow-hidden rounded-3xl border border-border shadow-2xl">
          {/* Left Sidebar: AI Assistant Controls */}
          <div className="grain-surface w-full lg:w-[320px] flex-shrink-0 border-r border-border flex flex-col bg-card overflow-hidden">
            <div className="p-5 border-b border-border bg-primary-soft/30">
              <div className="flex items-center gap-3">
                <div className="bg-chili p-2 rounded-xl text-white"><Sparkles size={20} /></div>
                <div>
                  <h3 className="font-serif font-bold text-sm tracking-tight">Your perfect day</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-hand text-jade">— what do you crave?</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
              {/* Province Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin size={14}/> Destination Province
                </label>
                <div className="space-y-2">
                  <select 
                    value={selectedProvinceId} 
                    onChange={e => setSelectedProvinceId(e.target.value)} 
                    className="w-full bg-surface-soft border border-border text-sm rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-primary font-bold"
                  >
                    {PROVINCE_DATA.map(p => (
                      <option key={p.id} value={p.id}>{lang === 'th' ? p.nameTh : p.nameEn}</option>
                    ))}
                  </select>
                  
                  {selectedProvinceId !== 'all' && (
                    <div className="p-3 rounded-xl bg-primary-soft/50 border border-primary/10 animate-in fade-in slide-in-from-left-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-primary uppercase">Area Profile</span>
                        {selectedProvince.secondary && (
                          <span className="bg-local-value/10 text-local-value text-[9px] font-bold px-1.5 py-0.5 rounded ring-1 ring-local-value/20">Secondary City Boost</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Area Size</span>
                          <span className="font-bold">{selectedProvince.area}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Coordinates</span>
                          <span className="font-mono font-bold text-[9px]">{selectedProvince.lat.toFixed(2)}, {selectedProvince.lng.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Vibe Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Compass size={14}/> Destination Vibe
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {VIBE_CHIPS.slice(0, 4).map((chip) => {
                    const label = lang === 'th' ? chip.th : chip.en;
                    const active = activeChips.includes(chip.en);
                    return (
                      <button 
                        key={chip.en} 
                        onClick={() => setActiveChips(prev => prev.includes(chip.en) ? prev.filter(c => c !== chip.en) : [...prev, chip.en])}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-[11px] font-bold border-2 transition-all",
                          active ? "border-chili bg-chili-soft text-chili shadow-sm" : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Budget slider (Dual Range) */}
              <div className="space-y-4 bg-primary-soft/30 p-4 rounded-2xl border border-primary/10">
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Wallet size={14} className="text-primary" /> Budget Range</span>
                  <span className="text-primary font-mono font-black text-[11px]">฿{budgetRange[0].toLocaleString()} - ฿{budgetRange[1].toLocaleString()}</span>
                </div>
                
                <div className="relative h-6 flex items-center">
                  <div className="absolute w-full h-1.5 bg-border rounded-lg" />
                  <div 
                    className="absolute h-1.5 bg-primary rounded-lg" 
                    style={{ 
                      left: `${(budgetRange[0] / 15000) * 100}%`, 
                      right: `${100 - (budgetRange[1] / 15000) * 100}%` 
                    }} 
                  />
                  <input 
                    type="range" min="0" max="15000" step="500" value={budgetRange[0]} 
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), budgetRange[1] - 500);
                      setBudgetRange([val, budgetRange[1]]);
                    }}
                    className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:appearance-none"
                  />
                  <input 
                    type="range" min="0" max="15000" step="500" value={budgetRange[1]} 
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), budgetRange[0] + 500);
                      setBudgetRange([budgetRange[0], val]);
                    }}
                    className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:appearance-none"
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase opacity-50 px-1">
                  <span>Min</span>
                  <span>15k+</span>
                </div>
              </div>

              {/* Grid selects */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <CalendarDays size={14}/> Duration
                  </label>
                  <select value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-surface-soft border border-border text-sm rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-primary">
                    <option value="1">Day Trip</option>
                    <option value="2">2 Days 1 Night</option>
                    <option value="3">3 Days 2 Nights+</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Users size={14}/> Companions
                  </label>
                  <select value={companion} onChange={e => setCompanion(e.target.value)} className="w-full bg-surface-soft border border-border text-sm rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-primary">
                    <option value="1">Solo Traveler</option>
                    <option value="2">Couple</option>
                    <option value="3">Small Family</option>
                    <option value="4">Group of Friends</option>
                  </select>
                </div>
              </div>

              {/* Payment & Specials */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-3">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                     <Accessibility size={14}/> Special Needs
                   </label>
                   <div className="flex flex-col gap-2">
                     <button 
                       onClick={() => setSpecials(s => s.includes('pwd') ? [] : ['pwd'])}
                       className={cn(
                         "w-full p-3 rounded-xl border flex items-center justify-between transition-all",
                         specials.includes('pwd') ? "bg-primary-soft border-primary/30" : "bg-background border-border"
                       )}
                     >
                       <span className="text-xs font-bold">Wheelchair Ramps (PWDs)</span>
                       <div className={cn("w-4 h-4 rounded flex items-center justify-center", specials.includes('pwd') ? "bg-primary text-primary-foreground" : "bg-border")}>
                         {specials.includes('pwd') && <CheckCircle2 size={12}/>}
                       </div>
                     </button>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-surface-soft/30 border-t border-border">
              <button 
                onClick={onSubmit}
                className="w-full bg-chili text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-lg transition-all text-sm"
              >
                Take a tour → <Send size={16} />
              </button>
            </div>
          </div>

          {/* Right Area: Interactive Map */}
          <div className="flex-1 relative bg-surface-muted overflow-hidden flex flex-col">
            {/* Map UI Overlays */}
            <div className="absolute top-4 inset-x-0 z-[1001] flex flex-col items-center gap-4 px-4">
              {/* Merged Search Bar */}
              <form
                onSubmit={onSubmit}
                data-tour="home-search"
                className="group w-full max-w-2xl rounded-2xl border border-border bg-background/95 backdrop-blur-md p-2 shadow-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20"
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-3 pl-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                      data-tour="home-search-input"
                      type="text"
                      value={intent}
                      onChange={(e) => setIntent(e.target.value)}
                      placeholder={t('home.searchPlaceholder')}
                      className="w-full bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>
                  <button
                    data-tour="home-search-submit"
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl bg-chili px-5 py-2 text-xs font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
                  >
                    {t('cta.findDetours')}
                  </button>
                </div>
              </form>

              <div className="flex gap-2 overflow-x-auto no-scrollbar w-full justify-center">
                {[
                  { id: 'all', label: 'All', icon: <MapIcon size={12}/> },
                  { id: 'attraction', label: 'Explore', icon: <Compass size={12}/> },
                  { id: 'restaurant', label: 'Food', icon: <Heart size={12}/> },
                  { id: 'accommodation', label: 'Stays', icon: <MapPin size={12}/> }
                ].map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => setFilterCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all shadow-sm border",
                      filterCategory === cat.id ? "bg-foreground text-background border-transparent" : "bg-background/90 backdrop-blur-md text-muted-foreground border-border hover:bg-surface-soft"
                    )}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* The Actual Map Component */}
            <div className="h-full w-full relative">
              {mapPlaces.isFetching && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/20 backdrop-blur-[2px]">
                  <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-xs font-bold shadow-xl ring-1 ring-border">
                    <Clock className="h-3.5 w-3.5 animate-spin text-primary" /> Updating Map...
                  </div>
                </div>
              )}
              <PlacesMap 
                pins={(mapPlaces.data ?? []).map(p => ({
                  id: p.id,
                  lat: p.lat,
                  lng: p.lng,
                  label: p.name,
                  sublabel: p.provinceName,
                  imageUrl: p.imageUrl,
                  trustScore: p.trustScore,
                  kind: p.kind,
                  priceAvg: p.fairPrice?.min_avg ? (p.fairPrice.min_avg + (p.fairPrice.max_avg || p.fairPrice.min_avg)) / 2 : undefined
                }))}
                height="100%"
                center={mapCenter}
                zoom={mapZoom}
                userLocation={userLocation}
                showPricingHeatmap={showPricingHeatmap}
                areaHeatmapRadiusKm={areaHeatmapRadiusKm}
                onSelect={setSelectedPlaceId}
                onHover={setHoveredPlaceId}
                onHoverEnd={() => setHoveredPlaceId(null)}
              />
            </div>

            {/* Floating Map Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-[1001]">
              <div className="bg-background/90 backdrop-blur-md rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
                <button 
                  onClick={() => setAreaHeatmapRadiusKm(areaHeatmapRadiusKm === 3 ? undefined : 3)}
                  className={`px-2 py-3 text-xs font-bold transition-all border-b border-border ${
                    areaHeatmapRadiusKm === 3 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-surface-soft hover:text-foreground'
                  }`}
                  title="3km Area Avg Price"
                >
                  3km
                </button>
                <button 
                  onClick={() => setAreaHeatmapRadiusKm(areaHeatmapRadiusKm === 5 ? undefined : 5)}
                  className={`px-2 py-3 text-xs font-bold transition-all ${
                    areaHeatmapRadiusKm === 5 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-surface-soft hover:text-foreground'
                  }`}
                  title="5km Area Avg Price"
                >
                  5km
                </button>
              </div>
              <button 
                onClick={() => setShowPricingHeatmap(!showPricingHeatmap)}
                className={`p-3 rounded-full shadow-2xl border transition-all group active:scale-95 ${
                  showPricingHeatmap 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-background/90 text-primary border-border backdrop-blur-md hover:bg-surface-soft'
                }`}
                title="Toggle Pricing Heatmap"
              >
                <DollarSign size={20} className="group-hover:scale-110 transition-transform" />
              </button>
              <button className="bg-background/90 backdrop-blur-md p-3 rounded-full shadow-2xl border border-border hover:bg-surface-soft transition-all group active:scale-95">
                <LocateFixed size={20} className="text-primary group-hover:scale-110 transition-transform" />
              </button>
              <div className="bg-background/90 backdrop-blur-md rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
                 <button className="p-3 hover:bg-surface-soft transition border-b border-border text-muted-foreground hover:text-foreground"><Plus size={18} /></button>
                 <button className="p-3 hover:bg-surface-soft transition text-muted-foreground hover:text-foreground"><Minus size={18} /></button>
              </div>
            </div>


            {/* HOVER PREVIEW CARD (REELS STYLE) */}
            {hoveredPlaceId && !selectedPlaceId && (() => {
              const hp = mapPlaces.data?.find(p => p.id === hoveredPlaceId);
              if (!hp) return null;
              return (
                <div 
                  className="absolute z-[1002] bottom-24 left-6 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                >
                  <div className="w-44 h-64 bg-background rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/20 relative flex flex-col">
                    <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-bold border border-white/20">
                      <Video size={10} className="text-primary" /> REELS
                    </div>
                    <img src={hp.imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                    <div className="absolute inset-0 flex items-center justify-center z-10"><PlayCircle className="text-white/80 drop-shadow-lg" size={36} /></div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 pt-10 z-20 text-white">
                      <h4 className="font-black text-sm truncate leading-tight">{hp.name}</h4>
                      <p className="text-[10px] mt-0.5 font-medium opacity-80">{hp.provinceName}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Place Detail Overlay (if selected) */}
            {selectedPlace && (
              <div className="absolute inset-y-0 right-0 w-full lg:w-[400px] bg-background shadow-2xl z-[1003] flex flex-col transition-all animate-in slide-in-from-right-10 border-l border-border">
                <div className="relative h-48 flex-shrink-0">
                  <img src={selectedPlace.imageUrl} alt={selectedPlace.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                  <button onClick={() => setSelectedPlaceId(null)} className="absolute top-4 right-4 bg-background/80 hover:bg-background text-foreground p-2 rounded-full backdrop-blur-md transition-colors shadow-lg"><X size={18} /></button>
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="bg-primary/90 text-primary-foreground text-[10px] uppercase font-bold px-2 py-0.5 rounded mb-2 inline-block">
                      {selectedPlace.kindLabel || selectedPlace.kind}
                    </span>
                    <h3 className="text-xl font-bold leading-tight">{selectedPlace.name}</h3>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar pb-24">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                       <span className="text-sm font-medium">{selectedPlace.provinceName}</span>
                     </div>
                     <TrustBadge score={selectedPlace.trustScore} />
                   </div>

                   {selectedPlace.isCsvData ? (
                     <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-4 rounded-2xl bg-surface-soft border border-border space-y-4">
                           <div className="flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Average Price</span>
                             <span className="text-sm font-bold text-foreground">{selectedPlace.csvFields?.averagePrice}</span>
                           </div>
                           <div className="flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Location Detail</span>
                             <span className="text-sm font-medium text-foreground">{selectedPlace.csvFields?.location}</span>
                           </div>
                           <div className="flex flex-col gap-1">
                             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Coordinates</span>
                             <span className="text-sm font-mono text-primary">{selectedPlace.lat.toFixed(4)}, {selectedPlace.lng.toFixed(4)}</span>
                           </div>
                        </div>

                        <div className="space-y-3">
                           <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verification Links</h4>
                           <div className="grid grid-cols-1 gap-2">
                              {selectedPlace.csvFields?.wongnaiLink && (
                                <a 
                                  href={selectedPlace.csvFields.wongnaiLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors group"
                                >
                                  <span className="text-xs font-bold">View on Wongnai</span>
                                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                </a>
                              )}
                              {selectedPlace.csvFields?.googleMapsLink && (
                                <a 
                                  href={selectedPlace.csvFields.googleMapsLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors group"
                                >
                                  <span className="text-xs font-bold">Search on Google Maps</span>
                                  <MapPin size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                </a>
                              )}
                           </div>
                        </div>

                        <div className="bg-local-value/5 p-4 rounded-xl border border-local-value/10 flex gap-3 items-start">
                          <Info className="text-local-value flex-shrink-0 mt-0.5" size={18} />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            This restaurant is part of our <span className="font-bold text-foreground">Community Food List</span>. While not yet fully audited by our AI Trust Engine, it is highly rated by local travelers.
                          </p>
                        </div>
                     </div>
                   ) : (
                     <>
                       <p className="text-sm text-muted-foreground leading-relaxed">{selectedPlace.reasonSnippet}</p>

                       {/* Transport Estimation */}
                       <div className="space-y-3">
                         <h4 className="text-xs font-bold text-foreground flex items-center justify-between uppercase tracking-wider">
                           <span className="flex items-center gap-2"><Navigation size={14} className="text-primary" /> Transport Estimates</span>
                           <span className="text-[10px] text-muted-foreground font-mono">From: Current GPS</span>
                         </h4>
                         <div className="space-y-2">
                           {[
                             { name: 'Standard Van', price: 120, time: '45m', icon: <Navigation size={14}/>, tag: 'Best Value' },
                             { name: 'Private VIP', price: 450, time: '35m', icon: <Navigation size={14}/>, tag: 'Fastest' }
                           ].map((opt, i) => (
                             <div key={i} className={cn("flex items-center justify-between p-3 rounded-xl border", i === 0 ? "bg-primary-soft/30 border-primary/20" : "bg-surface-soft border-border")}>
                               <div className="flex items-center gap-3">
                                 <div className="bg-background p-2 rounded-lg text-primary shadow-sm">{opt.icon}</div>
                                 <div>
                                   <p className="text-xs font-bold">{opt.name}</p>
                                   <p className="text-[10px] text-muted-foreground">{opt.time} • {opt.tag}</p>
                                 </div>
                               </div>
                               <span className="font-mono font-bold text-sm">฿{opt.price}</span>
                             </div>
                           ))}
                         </div>
                       </div>

                       {/* Accessibility Grid */}
                       <div className="space-y-3">
                         <h4 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                           <Accessibility size={14} className="text-primary" /> Facilities
                         </h4>
                         <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'Ramps', icon: '🚶' },
                              { label: 'Toilet', icon: '🚻' },
                              { label: 'Elevator', icon: '🛗' },
                              { label: 'Parking', icon: '🅿️' }
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[11px] p-2 rounded-lg border border-border bg-background shadow-sm">
                                <span>{item.icon}</span>
                                <span className="font-medium text-muted-foreground">{item.label}</span>
                                <CheckCircle2 size={12} className="text-primary ml-auto" />
                              </div>
                            ))}
                         </div>
                       </div>

                       {/* Nearby Hubs */}
                       <div className="space-y-3">
                         <h4 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                           <MapPin size={14} className="text-primary" /> Nearby Hubs
                         </h4>
                         <div className="space-y-2">
                            {[
                              { name: 'Phuket Airport', type: 'Airport', icon: <Plane size={14}/> },
                              { name: 'Ranong Station', type: 'Train', icon: <Train size={14}/> }
                            ].map((hub, idx) => (
                              <div key={idx} className="flex gap-3 items-center bg-surface-soft p-2.5 rounded-xl border border-border">
                                <div className="bg-background p-2 rounded-lg shadow-sm text-primary">{hub.icon}</div>
                                <div>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{hub.type}</p>
                                  <p className="text-xs font-bold">{hub.name}</p>
                                </div>
                              </div>
                            ))}
                         </div>
                       </div>

                       {/* Quick Tips */}
                       <div className="bg-local-value-soft p-4 rounded-xl border border-local-value/20 flex gap-3 items-start">
                         <Info className="text-local-value flex-shrink-0 mt-0.5" size={18} />
                         <div>
                           <h4 className="text-xs font-bold text-local-value mb-1">Traveler Tip</h4>
                           <p className="text-xs text-muted-foreground leading-relaxed">
                             Verified local guides recommend visiting before 10:00 AM for the best light and fewer crowds.
                           </p>
                         </div>
                       </div>
                     </>
                   )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm p-4 border-t border-border flex gap-3">
                  <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.name)}`, '_blank')} className="flex-1 bg-surface-soft font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 border border-border hover:bg-surface-muted transition-colors">
                    <MapPin size={16} /> Google Maps
                  </button>
                  <button 
                    onClick={() => navigate(`/place/${encodeURIComponent(selectedPlace.id)}`)}
                    className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-primary-hover transition-all"
                  >
                    Full Details <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">{t('home.trendingTitle')}</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trending?.map((p) => (
            <PlaceCard key={p.id} place={p} distance={p.distance} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
