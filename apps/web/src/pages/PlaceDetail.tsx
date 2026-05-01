import { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ChevronDown,
  Flag,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { ScoreBar } from "@/components/trust/ScoreBar";
import { PlacesMap } from "@/components/map/PlacesMap";
import { ExplainGraph } from "@/components/graph/ExplainGraph";
import {
  getActiveItinerary,
  getPlace,
  getTrust,
  getFairPrice,
  getCulturalContext,
  getGraph,
  postReport,
  savePlaceToItinerary,
  queryKeys,
} from "@/lib/api/client";
import { useT, pickLocalized } from "@/lib/i18n";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Calendar as DayCalendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

function toLocalISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function resolveCulturalIconPath(path: string): string {
  const p = String(path || "").trim();
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p.startsWith("/cultural/")) return p;
  if (p.startsWith("/")) return `/cultural${p}`;
  return `/cultural/${p}`;
}

function inferCulturalIcons(placeId: string, explicit?: string[]): string[] {
  void placeId;
  if (!Array.isArray(explicit) || explicit.length === 0) return [];
  return explicit
    .map((entry) => String(entry || "").trim())
    .filter(
      (entry, idx, arr) => entry.length > 0 && arr.indexOf(entry) === idx,
    );
}

export default function PlaceDetail() {
  const qc = useQueryClient();
  const { id = "" } = useParams();
  const placeId = decodeURIComponent(id);
  const isCsvItem = placeId.startsWith("food-csv-");
  const t = useT();
  const [showReasons, setShowReasons] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveDate, setSaveDate] = useState<Date | undefined>(new Date());
  const [saveTime, setSaveTime] = useState("09:00");
  const [saveDuration, setSaveDuration] = useState(90);
  const [searchParams] = useSearchParams();
  const culturalRef = useRef<HTMLElement | null>(null);
  const [culturalHighlight, setCulturalHighlight] = useState(false);

  const place = useQuery({
    queryKey: queryKeys.place(placeId),
    queryFn: () => getPlace(placeId),
  });
  const trust = useQuery({
    queryKey: queryKeys.trust(placeId),
    queryFn: () => getTrust(placeId),
  });
  const fair = useQuery({
    queryKey: queryKeys.fairPrice(placeId),
    queryFn: () => getFairPrice(placeId),
  });
  const culture = useQuery({
    queryKey: queryKeys.cultural(placeId),
    queryFn: () => getCulturalContext(placeId),
  });
  const graph = useQuery({
    queryKey: queryKeys.graph(placeId),
    queryFn: () => getGraph(placeId),
  });
  const activeItinerary = useQuery({
    queryKey: [...queryKeys.itineraries, "active"],
    queryFn: getActiveItinerary,
  });

  const reportMutation = useMutation({
    mutationFn: postReport,
    onSuccess: () => {
      toast.success("Report submitted. Thank you for keeping travelers safe.");
      setReportOpen(false);
    },
  });
  const saveMutation = useMutation({
    mutationFn: () => {
      const dateISO = toLocalISODate(saveDate || new Date());
      return savePlaceToItinerary(
        {
          id: placeId,
          name: p?.name || "Saved place",
          trustScore: p?.trustScore || 0.7,
        },
        { dateISO, startTime: saveTime, durationMin: saveDuration },
      );
    },
    onSuccess: () => {
      toast.success("Saved to itinerary.");
      setSaveOpen(false);
      qc.invalidateQueries({ queryKey: queryKeys.itineraries });
    },
  });

  useEffect(() => {
    if (searchParams.get("focus") !== "cultural") return;
    if (!culture.data || !culturalRef.current) return;
    culturalRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setCulturalHighlight(true);
    const t = setTimeout(() => setCulturalHighlight(false), 2200);
    return () => clearTimeout(t);
  }, [searchParams, culture.data]);

  if (place.isLoading)
    return (
      <PageShell>
        <div className="container py-16 text-muted-foreground">Loading…</div>
      </PageShell>
    );
  if (!place.data)
    return (
      <PageShell>
        <div className="container py-16">Place not found.</div>
      </PageShell>
    );

  const p = place.data;
  const name = pickLocalized(p, "name");
  const province = pickLocalized(p, "provinceName");
  const description = pickLocalized(p, "description");
  const topCulturalIcons = inferCulturalIcons(
    placeId,
    culture.data?.paths ??
      (culture.data as unknown as { path?: string[] } | undefined)?.path ??
      [],
  );
  const culturalTooltip = [
    ...(Array.isArray(culture.data?.tips)
      ? culture.data.tips
          .map((tip) => String(tip?.text || "").trim())
          .filter(Boolean)
          .slice(1)
          .map((txt) => `Do: ${txt}`)
      : []),
    ...(Array.isArray(culture.data?.taboos)
      ? culture.data.taboos
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
          .map((txt) => `Don't: ${txt}`)
      : []),
  ].join("\n");
  const chosenDateISO = toLocalISODate(saveDate || new Date());
  const occupiedTimes = new Set(
    (activeItinerary.data?.items || [])
      .filter((item) => (item.dateISO || "").slice(0, 10) === chosenDateISO)
      .map((item) => item.startTime || "09:00"),
  );
  const slotOptions = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i / 2)).padStart(2, "0");
    const m = i % 2 === 0 ? "00" : "30";
    return `${h}:${m}`;
  });

  return (
    <PageShell>
      <div className="container py-6 md:py-10">
        <Link
          to="/recommendations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to recommendations
        </Link>

        <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1.35fr_1fr]">
          {/* LEFT */}
          <div className="space-y-6">
            <div
              className="card-spotlight overflow-hidden rounded-card border border-border bg-card shadow-md transition-all duration-500 animate-in fade-in slide-in-from-left-4"
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty(
                  "--mouse-x",
                  `${e.clientX - r.left}px`,
                );
                e.currentTarget.style.setProperty(
                  "--mouse-y",
                  `${e.clientY - r.top}px`,
                );
              }}
            >
              <div className="aspect-[16/9] bg-surface-muted">
                <img
                  src={p.imageUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {province}
                    </p>
                    <h1 className="mt-1 text-3xl font-[650] tracking-tight md:text-4xl">
                      {name}
                    </h1>
                    {topCulturalIcons.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {topCulturalIcons.map((iconPath) => (
                          <span
                            key={iconPath}
                            className="grid h-8 w-8 place-items-center rounded-md border border-border bg-[#0f2a44] p-1"
                            title={culturalTooltip || "Cultural icon"}
                          >
                            <img
                              src={resolveCulturalIconPath(iconPath)}
                              alt="Cultural icon"
                              className="h-5 w-5 object-contain"
                              onError={(e) => {
                                (
                                  e.currentTarget as HTMLImageElement
                                ).style.display = "none";
                              }}
                            />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <TrustBadge score={p.trustScore} />
                </div>

                <p className="text-base leading-relaxed text-muted-foreground">
                  {description}
                </p>

                {!isCsvItem && (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <ScoreBar
                      label={t("label.trust")}
                      value={p.trustScore}
                      tone="trust"
                    />
                    <ScoreBar
                      label={t("label.crowd")}
                      value={p.crowdScore}
                      tone="primary"
                      invert
                    />
                    <ScoreBar
                      label={t("label.fit")}
                      value={p.seasonFitScore}
                      tone="primary"
                    />
                    <ScoreBar
                      label={t("label.localValue")}
                      value={p.localValueScore}
                      tone="local-value"
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {p.hours}
                  </span>
                  {p.contact && (
                    <a
                      href={isCsvItem ? p.contact : `tel:${p.contact}`}
                      target={isCsvItem ? "_blank" : undefined}
                      rel={isCsvItem ? "noopener noreferrer" : undefined}
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        isCsvItem && "text-primary hover:underline",
                      )}
                    >
                      {isCsvItem ? (
                        <>View on Wongnai</>
                      ) : (
                        <>
                          <Phone className="h-3.5 w-3.5" />
                          {p.contact}
                        </>
                      )}
                    </a>
                  )}
                  {isCsvItem && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      View on Google Maps
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Trust panel */}
            {trust.data && (
              <section
                className="card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all duration-500 delay-100 animate-in fade-in slide-in-from-left-4"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty(
                    "--mouse-x",
                    `${e.clientX - r.left}px`,
                  );
                  e.currentTarget.style.setProperty(
                    "--mouse-y",
                    `${e.clientY - r.top}px`,
                  );
                }}
              >
                <header className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-[620]">Why this trust score</h2>
                  <span className="text-xs text-muted-foreground">
                    Updated{" "}
                    {new Date(trust.data.lastUpdatedISO).toLocaleString()}
                  </span>
                </header>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-md bg-trust-soft p-4">
                    <p className="text-sm font-semibold text-trust">
                      Positive signals
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-foreground">
                      {trust.data.reasonsPositive.map((r) => (
                        <li key={r}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md bg-warning-soft p-4">
                    <p className="text-sm font-semibold text-warning">
                      Things to know
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-foreground">
                      {trust.data.reasonsNegative.length === 0 ? (
                        <li className="text-muted-foreground">
                          No notable concerns in last 90 days.
                        </li>
                      ) : (
                        trust.data.reasonsNegative.map((r) => (
                          <li key={r}>• {r}</li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setShowReasons((s) => !s)}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  Source signals{" "}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      !showReasons && "rotate-180",
                    )}
                  />
                </button>
                {!showReasons && (
                  <table className="mt-3 w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 font-medium">Source</th>
                        <th className="font-medium">Signal</th>
                        <th className="font-medium font-mono">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trust.data.sources.map((s, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="py-2">{s.source}</td>
                          <td className="text-muted-foreground">{s.signal}</td>
                          <td className="font-mono">
                            {(s.weight * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {/* Fair price */}
            {fair.data && (
              <section
                className="card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all duration-500 delay-150 animate-in fade-in slide-in-from-left-4"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty(
                    "--mouse-x",
                    `${e.clientX - r.left}px`,
                  );
                  e.currentTarget.style.setProperty(
                    "--mouse-y",
                    `${e.clientY - r.top}px`,
                  );
                }}
              >
                <h2 className="mb-2 text-xl font-[620]">
                  {t("label.fairPrice")}
                </h2>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <Stat
                    label="Observed"
                    value={`฿${fair.data.observed.toFixed(0)}`}
                  />
                  <Stat label="Area average" value={`฿${fair.data.areaAvg}`} />
                  <Stat
                    label="Range"
                    value={`฿${fair.data.areaMin} – ฿${fair.data.areaMax}`}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {fair.data.notes}
                </p>
              </section>
            )}

            {/* Cultural */}
            {culture.data && (
              <section
                ref={culturalRef}
                className={cn(
                  "card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all duration-500 delay-200 animate-in fade-in slide-in-from-left-4",
                  culturalHighlight &&
                    "ring-2 ring-primary/70 bg-primary-soft/20",
                )}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty(
                    "--mouse-x",
                    `${e.clientX - r.left}px`,
                  );
                  e.currentTarget.style.setProperty(
                    "--mouse-y",
                    `${e.clientY - r.top}px`,
                  );
                }}
              >
                <h2 className="mb-3 text-xl font-[620]">Cultural context</h2>

                <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {culture.data.tips.map((tip) => (
                    <li
                      key={tip.text}
                      className="rounded-md bg-surface-soft p-3 text-sm"
                    >
                      {pickLocalized(tip, "text")}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Best time:{" "}
                  {culture.data.bestTime}
                </p>
              </section>
            )}

            {/* Graph */}
            {graph.data && (
              <section
                className="card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all duration-500 delay-250 animate-in fade-in slide-in-from-left-4"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty(
                    "--mouse-x",
                    `${e.clientX - r.left}px`,
                  );
                  e.currentTarget.style.setProperty(
                    "--mouse-y",
                    `${e.clientY - r.top}px`,
                  );
                }}
              >
                <h2 className="mb-3 text-xl font-[620]">Connections</h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  Why this place fits — local food, culture, nature, and routes
                  around it.
                </p>
                <ExplainGraph data={graph.data} />
              </section>
            )}

            {/* ── BOOKING AFFILIATE (accommodation only) ── */}
            {p.kind === "accommodation" && (
              <section className="card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all duration-500 delay-300 animate-in fade-in slide-in-from-left-4">
                <h2 className="mb-1 text-xl font-[620]">Book a room</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Compare rates from trusted platforms. Prices are indicative — click to see live availability.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Agoda */}
                  <a
                    href={`https://www.agoda.com/search?city=17268&textToSearch=${encodeURIComponent(name)}&checkIn=2026-05-10&checkOut=2026-05-12&rooms=1&adults=2&children=0`}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:border-[#E11B22]/40 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#E11B22] px-2 py-0.5 text-[13px] font-black text-white tracking-tight">agoda</span>
                        <span className="text-xs text-muted-foreground">Affiliate partner</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-jade bg-jade-soft px-2 py-0.5 rounded-full">Verified ★</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[11px] text-muted-foreground">From (mock price)</p>
                        <p className="font-serif text-2xl font-bold text-foreground">฿<span className="text-chili">1,290</span> <span className="text-sm font-normal text-muted-foreground">/ night</span></p>
                      </div>
                      <span className="rounded-lg bg-chili px-3 py-1.5 text-xs font-bold text-white group-hover:brightness-110 transition-all">
                        Check rates →
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                      Free cancellation · Breakfast included · Instant confirmation
                    </p>
                  </a>
                  {/* Airbnb */}
                  <a
                    href={`https://www.airbnb.com/s/${encodeURIComponent(province + " Thailand")}/homes?query=${encodeURIComponent(name)}&checkin=2026-05-10&checkout=2026-05-12&adults=2`}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:border-[#FF5A5F]/40 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#FF5A5F] px-2 py-0.5 text-[13px] font-black text-white tracking-tight">Airbnb</span>
                        <span className="text-xs text-muted-foreground">Affiliate partner</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo bg-indigo-soft px-2 py-0.5 rounded-full">Superhost</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[11px] text-muted-foreground">From (mock price)</p>
                        <p className="font-serif text-2xl font-bold text-foreground">฿<span className="text-chili">2,100</span> <span className="text-sm font-normal text-muted-foreground">/ night</span></p>
                      </div>
                      <span className="rounded-lg bg-[#FF5A5F] px-3 py-1.5 text-xs font-bold text-white group-hover:brightness-110 transition-all">
                        View listing →
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                      Entire place · Self check-in · Wifi included
                    </p>
                  </a>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground opacity-70">
                  ★ AllWay may earn a commission when you book through these links — at no extra cost to you.
                </p>
              </section>
            )}

            {/* ── SOCIAL VIDEO REVIEWS (all kinds) ── */}
            {(() => {
              // Kind-specific search terms and mock copy
              const kindMeta: Record<string, { tiktokSuffix: string; ytSuffix: string; tiktokSuffix2: string; ytSuffix2: string; mockTitles: [string, string, string, string]; mockSubs: [string, string, string, string] }> = {
                accommodation: {
                  tiktokSuffix: "Thailand hotel review",
                  ytSuffix: "Thailand hotel review",
                  tiktokSuffix2: "stay Thailand worth it",
                  ytSuffix2: "accommodation Thailand",
                  mockTitles: [
                    `"${name} honest review 🇹🇭 worth it?"`,
                    `"${name} Full Room Tour + Honest Review"`,
                    `"my ${province} hotel for ฿800/night 😳 #Thailand"`,
                    `"Is ${name} actually worth it? #ThailandTravel"`,
                  ],
                  mockSubs: ["@travelwithmai · 128K views · 3 days ago", "Nomad in Thailand · 42K views · 2 weeks ago", "@backpackbkk · 54K views · 1 week ago", "Solo Asia Travel · 19K views · 5 days ago"],
                },
                restaurant: {
                  tiktokSuffix: "Thailand food review",
                  ytSuffix: "Thailand restaurant review",
                  tiktokSuffix2: "Thai food must try",
                  ytSuffix2: "Thailand street food",
                  mockTitles: [
                    `"${name} food review 🍜 is it good?"`,
                    `"Best dishes at ${name} — full review"`,
                    `"eating at ${name} in ${province} 😱 #ThaiFood"`,
                    `"${name} — hidden gem or tourist trap?"`,
                  ],
                  mockSubs: ["@foodiesbkk · 94K views · 2 days ago", "Taste of Thailand · 31K views · 1 week ago", "@bangkokbites · 61K views · 4 days ago", "Eating Thailand · 14K views · 3 days ago"],
                },
                attraction: {
                  tiktokSuffix: "Thailand attraction visit",
                  ytSuffix: "Thailand travel vlog",
                  tiktokSuffix2: "Thailand tourist spot",
                  ytSuffix2: "Thailand must visit",
                  mockTitles: [
                    `"${name} — honestly worth the visit? 🇹🇭"`,
                    `"${name} full travel vlog"`,
                    `"visiting ${name} in ${province} (not what I expected)"`,
                    `"${name} — tips, entrance fees & crowds"`,
                  ],
                  mockSubs: ["@wanderwithpim · 210K views · 5 days ago", "Thailand Travel Vlog · 58K views · 3 weeks ago", "@thaiexplorer · 77K views · 1 week ago", "Solo in Thailand · 22K views · 2 days ago"],
                },
                experience: {
                  tiktokSuffix: "Thailand experience activity",
                  ytSuffix: "Thailand activity review",
                  tiktokSuffix2: "Thailand adventure try",
                  ytSuffix2: "Thailand experience tour",
                  mockTitles: [
                    `"${name} — best experience in ${province}? 🎯"`,
                    `"I tried ${name} and here's what happened"`,
                    `"${name} honest experience review #Thailand"`,
                    `"${name} — is it worth the price?"`,
                  ],
                  mockSubs: ["@explorewithnon · 73K views · 1 day ago", "Adventure Thailand · 28K views · 2 weeks ago", "@backpackthailand · 45K views · 6 days ago", "Thai Adventure · 11K views · 4 days ago"],
                },
              };
              const m = kindMeta[p.kind] ?? kindMeta.attraction;
              const tiktokIcon = (color: string) => (
                <svg viewBox="0 0 24 24" className={`h-3 w-3`} style={{ fill: color }}>
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.94a8.2 8.2 0 0 0 4.79 1.52V7.03a4.85 4.85 0 0 1-1.02-.34z"/>
                </svg>
              );
              const ytIcon = (
                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-[#FF0000]">
                  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                </svg>
              );
              const playIcon = <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white ml-1"><path d="M8 5v14l11-7z"/></svg>;
              const playIconSm = <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white ml-0.5"><path d="M8 5v14l11-7z"/></svg>;

              const videos = [
                {
                  href: `https://www.tiktok.com/search?q=${encodeURIComponent(`${name} ${m.tiktokSuffix}`)}`,
                  bg: "from-[#010101] via-[#1a1a2e] to-[#16213e]",
                  cardBg: "#010101",
                  platform: "TikTok",
                  platformIcon: tiktokIcon("#69C9D0"),
                  playBtn: <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:bg-white/20 transition-all">{playIcon}</div>,
                  duration: "2:47",
                  title: m.mockTitles[0],
                  sub: m.mockSubs[0],
                  stats: ["❤️ 9.4K", "💬 312", "🔖 1.2K"],
                },
                {
                  href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} ${m.ytSuffix}`)}`,
                  bg: "from-[#0f0f0f] via-[#1a0000] to-[#3d0000]",
                  cardBg: "#0f0f0f",
                  platform: "YouTube",
                  platformIcon: ytIcon,
                  playBtn: <div className="h-12 w-12 rounded-full bg-[#FF0000]/80 flex items-center justify-center group-hover:bg-[#FF0000] transition-all">{playIconSm}</div>,
                  duration: "12:18",
                  title: m.mockTitles[1],
                  sub: m.mockSubs[1],
                  stats: ["👍 1.8K", "💬 87", "📌 Pinned"],
                },
                {
                  href: `https://www.tiktok.com/search?q=${encodeURIComponent(`${name} ${m.tiktokSuffix2}`)}`,
                  bg: "from-[#010101] via-[#1a1a2e] to-[#010101]",
                  cardBg: "#010101",
                  platform: "TikTok",
                  platformIcon: tiktokIcon("#EE1D52"),
                  playBtn: <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:bg-white/20 transition-all">{playIcon}</div>,
                  duration: "1:03",
                  title: m.mockTitles[2],
                  sub: m.mockSubs[2],
                  stats: ["❤️ 4.1K", "💬 198", "🔁 820"],
                },
                {
                  href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} ${m.ytSuffix2}`)}`,
                  bg: "from-[#0f0f0f] via-[#001a00] to-[#002200]",
                  cardBg: "#0f0f0f",
                  platform: "YouTube Shorts",
                  platformIcon: ytIcon,
                  playBtn: <div className="h-12 w-12 rounded-full bg-[#FF0000]/80 flex items-center justify-center group-hover:bg-[#FF0000] transition-all">{playIconSm}</div>,
                  duration: "0:58",
                  title: m.mockTitles[3],
                  sub: m.mockSubs[3],
                  stats: ["👍 622", "💬 41", "🔗 Shorts"],
                },
              ];

              return (
                <section className="card-spotlight rounded-card border border-border bg-card p-6 shadow-sm transition-all duration-500 delay-350 animate-in fade-in slide-in-from-left-4">
                  <h2 className="mb-1 text-xl font-[620]">Real traveler reviews</h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Unsponsored videos from people who actually{" "}
                    {p.kind === "accommodation" ? "stayed" : p.kind === "restaurant" ? "ate" : p.kind === "experience" ? "tried it" : "visited"} here.
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {videos.map((v, i) => (
                      <a
                        key={i}
                        href={v.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex flex-col overflow-hidden rounded-xl border border-border transition-all hover:scale-[1.02] hover:shadow-xl"
                        style={{ backgroundColor: v.cardBg }}
                      >
                        <div className={`relative h-36 bg-gradient-to-br ${v.bg} flex items-center justify-center`}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            {v.playBtn}
                          </div>
                          <div className="absolute top-2 left-2">
                            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur" style={{ backgroundColor: `${v.cardBg}cc` }}>
                              {v.platformIcon}
                              {v.platform}
                            </span>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-mono">{v.duration}</div>
                        </div>
                        <div className="p-3 bg-[#1a1a1a]">
                          <p className="text-xs font-semibold text-white truncate">{v.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{v.sub}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                            {v.stats.map((s) => <span key={s}>{s}</span>)}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    🔍 Links open a search on TikTok / YouTube for real traveler content about this place. AllWay does not curate these results.
                  </p>
                </section>
              );
            })()}
          </div>

          {/* RIGHT (sticky) */}
          <aside className="lg:sticky lg:top-24 lg:h-fit space-y-4">
            <PlacesMap
              pins={[
                {
                  id: p.id,
                  lat: p.lat,
                  lng: p.lng,
                  label: p.name,
                  sublabel: p.provinceName,
                  imageUrl: p.imageUrl,
                  trustScore: p.trustScore,
                  kind: p.kind,
                },
              ]}
              height="320px"
              zoom={9}
            />
            <Button
              onClick={() => setSaveOpen(true)}
              className="w-full py-3 text-sm font-semibold"
            >
              {t("cta.saveItinerary")}
            </Button>
            <Drawer open={saveOpen} onOpenChange={setSaveOpen}>
              <DrawerContent className="mx-auto w-full max-w-xl">
                <DrawerHeader>
                  <DrawerTitle>Save To Itinerary</DrawerTitle>
                  <DrawerDescription>
                    Pick date-time slot. Busy slots are disabled.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="space-y-3 px-4">
                  <DayCalendar
                    mode="single"
                    selected={saveDate}
                    onSelect={setSaveDate}
                    className="rounded-md border"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={saveTime}
                      onChange={(e) => setSaveTime(e.target.value)}
                      className="rounded-md border border-input bg-background px-2 py-2 text-xs"
                    >
                      {slotOptions.map((time) => (
                        <option
                          key={time}
                          value={time}
                          disabled={occupiedTimes.has(time)}
                        >
                          {time} {occupiedTimes.has(time) ? "(busy)" : ""}
                        </option>
                      ))}
                    </select>
                    <select
                      value={saveDuration}
                      onChange={(e) => setSaveDuration(Number(e.target.value))}
                      className="rounded-md border border-input bg-background px-2 py-2 text-xs"
                    >
                      {[30, 60, 90, 120, 150, 180, 210, 240].map((d) => (
                        <option key={d} value={d}>
                          {d} min
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="max-h-24 overflow-y-auto rounded-md bg-surface-soft p-2 text-[11px] text-muted-foreground">
                    <p className="mb-1 font-semibold">
                      Busy slots on {chosenDateISO}:
                    </p>
                    {Array.from(occupiedTimes).length === 0
                      ? "No booked slot yet."
                      : Array.from(occupiedTimes).sort().join(", ")}
                  </div>
                </div>
                <DrawerFooter>
                  <Button variant="outline" onClick={() => setSaveOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={
                      saveMutation.isPending || occupiedTimes.has(saveTime)
                    }
                    className="w-full"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save This Slot"}
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            <button
              onClick={() => setReportOpen((s) => !s)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card py-3 text-sm font-semibold text-foreground hover:bg-surface-soft"
            >
              <Flag className="h-4 w-4 text-destructive" /> {t("cta.report")}
            </button>

            {reportOpen && (
              <ReportForm
                onCancel={() => setReportOpen(false)}
                onSubmit={(input) =>
                  reportMutation.mutate({ ...input, placeId })
                }
                pending={reportMutation.isPending}
              />
            )}
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-soft p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-base font-semibold">{value}</p>
    </div>
  );
}

type ReportCategory =
  | "overcharge"
  | "safety"
  | "misleading"
  | "closed"
  | "other";
type ReportSeverity = "low" | "medium" | "high";

function ReportForm({
  onCancel,
  onSubmit,
  pending,
}: {
  onCancel: () => void;
  onSubmit: (i: {
    category: ReportCategory;
    severity: ReportSeverity;
    description: string;
  }) => void;
  pending: boolean;
}) {
  const [category, setCategory] = useState<
    "overcharge" | "safety" | "misleading" | "closed" | "other"
  >("safety");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [description, setDescription] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ category, severity, description });
      }}
      className="space-y-3 rounded-card border border-border bg-card p-4"
    >
      <p className="text-sm font-semibold">Submit a report</p>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as ReportCategory)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="safety">Safety concern</option>
        <option value="overcharge">Overcharging</option>
        <option value="misleading">Misleading info</option>
        <option value="closed">Permanently closed</option>
        <option value="other">Other</option>
      </select>
      <div className="flex gap-2">
        {(["low", "medium", "high"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeverity(s)}
            className={cn(
              "flex-1 rounded-md border px-3 py-2 text-xs font-semibold capitalize",
              severity === s
                ? "border-primary bg-primary-soft text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Describe what happened. Stay factual."
        required
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-border py-2 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
