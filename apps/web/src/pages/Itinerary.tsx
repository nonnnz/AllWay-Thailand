import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download, FolderPlus, Plus, Save, StickyNote, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { TrustBadge } from '@/components/trust/TrustBadge';
import { deleteItinerary, getItineraries, queryKeys, setActiveItineraryId, upsertItinerary } from '@/lib/api/client';
import type { Itinerary, ItineraryItem } from '@/lib/api/types';

function toISODate(v: string | undefined) {
  return v ? v.slice(0, 10) : undefined;
}

function localTodayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function parseLocalISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toLocalISOFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildDays(startDateISO?: string, endDateISO?: string): string[] {
  const start = toISODate(startDateISO || localTodayISO())!;
  const end = toISODate(endDateISO || start)!;
  const days: string[] = [];
  const cur = parseLocalISO(start);
  const endDate = parseLocalISO(end);
  while (cur <= endDate && days.length < 21) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function dayLabel(iso: string) {
  return parseLocalISO(iso).toLocaleDateString();
}

function normalizeItemDate(item: ItineraryItem, fallbackDateISO: string): string {
  return toISODate(item.dateISO) || fallbackDateISO;
}

function parseDateTimeLocal(dateISO: string, timeHHmm?: string, durationMin = 90) {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [hh, mm] = String(timeHHmm || '09:00').split(':').map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
  const end = new Date(start.getTime() + Math.max(30, durationMin) * 60 * 1000);
  return { start, end };
}

function toICSDateUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function toGoogleDateUTC(date: Date): string {
  return toICSDateUTC(date);
}

function buildGoogleCalendarUrl(title: string, details: string, location: string, start: Date, end: Date): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details,
    location,
    dates: `${toGoogleDateUTC(start)}/${toGoogleDateUTC(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

function toMonthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildMonthGrid(monthDate: Date): Date[] {
  const first = toMonthStart(monthDate);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const TRIP_COLORS = ['#1E3A5F', '#0F766E', '#B45309', '#BE123C', '#4338CA', '#0E7490', '#166534'];

export default function ItineraryPage() {
  const qc = useQueryClient();
  const itineraries = useQuery({ queryKey: queryKeys.itineraries, queryFn: getItineraries });
  const [activeTripId, setActiveTripId] = useState('');
  const [newTripTitle, setNewTripTitle] = useState('');
  const [newTripStart, setNewTripStart] = useState(localTodayISO());
  const [newTripEnd, setNewTripEnd] = useState(localTodayISO());
  const [monthCursor, setMonthCursor] = useState(() => toMonthStart(new Date()));
  const [dragItemId, setDragItemId] = useState('');

  const allTrips = useMemo(() => itineraries.data || [], [itineraries.data]);
  const resolvedTripId = activeTripId && allTrips.some((x) => x.id === activeTripId) ? activeTripId : (allTrips[0]?.id || '');
  const trip = allTrips.find((x) => x.id === resolvedTripId);
  const days = useMemo(() => buildDays(trip?.startDateISO, trip?.endDateISO), [trip?.startDateISO, trip?.endDateISO]);
  const monthCells = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const tripColorById = useMemo(
    () => Object.fromEntries(allTrips.map((it, idx) => [it.id, TRIP_COLORS[idx % TRIP_COLORS.length]])),
    [allTrips],
  );
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Array<{ tripId: string; tripTitle: string; placeName: string; color: string; startTime: string }>>();
    for (const it of allTrips) {
      const fallback = (it.startDateISO || new Date().toISOString()).slice(0, 10);
      for (const item of it.items) {
        const dateISO = normalizeItemDate(item, fallback);
        const list = map.get(dateISO) || [];
        list.push({
          tripId: it.id,
          tripTitle: it.title,
          placeName: item.placeName,
          color: tripColorById[it.id] || TRIP_COLORS[0],
          startTime: item.startTime || '09:00',
        });
        map.set(dateISO, list);
      }
    }
    return map;
  }, [allTrips, tripColorById]);

  const createTrip = useMutation({
    mutationFn: async () =>
      upsertItinerary({
        title: newTripTitle.trim() || `My Trip ${newTripStart}`,
        startDateISO: newTripStart,
        endDateISO: newTripEnd < newTripStart ? newTripStart : newTripEnd,
        items: [],
      }),
    onSuccess: (created) => {
      setActiveTripId(created.id);
      setActiveItineraryId(created.id);
      qc.invalidateQueries({ queryKey: queryKeys.itineraries });
    },
  });

  const saveTrip = useMutation({
    mutationFn: async (payload: Itinerary) =>
      upsertItinerary({
        itineraryId: payload.id,
        title: payload.title,
        startDateISO: payload.startDateISO,
        endDateISO: payload.endDateISO,
        items: payload.items,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.itineraries }),
  });

  const removeTrip = useMutation({
    mutationFn: (id: string) => deleteItinerary(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.itineraries }),
  });

  const updateTripItems = (nextItems: ItineraryItem[]) => {
    if (!trip) return;
    saveTrip.mutate({ ...trip, items: nextItems });
  };

  const updateItem = (id: string, patch: Partial<ItineraryItem>) => {
    if (!trip) return;
    updateTripItems(trip.items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    if (!trip) return;
    updateTripItems(trip.items.filter((item) => item.id !== id));
  };

  const assignDayByDrop = (dayISO: string) => {
    if (!trip || !dragItemId) return;
    updateTripItems(
      trip.items.map((item) =>
        item.id === dragItemId ? { ...item, dateISO: dayISO, startTime: item.startTime || '09:00' } : item,
      ),
    );
    setDragItemId('');
  };

  const bumpTime = (item: ItineraryItem, deltaMin: number) => {
    const base = item.startTime || '09:00';
    const [hh, mm] = base.split(':').map(Number);
    const total = ((hh || 0) * 60 + (mm || 0) + deltaMin + 24 * 60) % (24 * 60);
    const next = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    updateItem(item.id, { startTime: next });
  };

  const exportableItems = useMemo(() => {
    if (!trip || days.length === 0) return [];
    const fallbackDate = days[0];
    return trip.items
      .filter((item) => !!item.dateISO || days.length > 0)
      .map((item) => {
        const dateISO = normalizeItemDate(item, fallbackDate);
        const { start, end } = parseDateTimeLocal(dateISO, item.startTime, item.durationMin || 90);
        return { item, dateISO, start, end };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [trip, days]);

  const downloadICS = () => {
    if (!trip || exportableItems.length === 0) return;
    const now = toICSDateUTC(new Date());
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TripGuard Thailand//Itinerary//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];
    for (const { item, dateISO, start, end } of exportableItems) {
      const uid = `${trip.id}-${item.id}-${dateISO}@tripguard.local`;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${escapeICS(uid)}`,
        `DTSTAMP:${now}`,
        `DTSTART:${toICSDateUTC(start)}`,
        `DTEND:${toICSDateUTC(end)}`,
        `SUMMARY:${escapeICS(item.placeName)}`,
        `DESCRIPTION:${escapeICS(item.note || `Trip: ${trip.title}`)}`,
        'END:VEVENT',
      );
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${trip.title.replace(/[^\w.-]+/g, '_') || 'itinerary'}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const syncGoogleCalendar = () => {
    if (!trip || exportableItems.length === 0) return;
    const top = exportableItems.slice(0, 20);
    for (const { item, start, end } of top) {
      const url = buildGoogleCalendarUrl(
        item.placeName,
        item.note || `Trip: ${trip.title}`,
        '',
        start,
        end,
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <PageShell>
      <section className="container py-8 md:py-12">
        <header className="mb-6">
          <h1 className="text-3xl font-[650] tracking-tight md:text-4xl">Itinerary</h1>
          <p className="mt-2 text-sm text-muted-foreground">Timeline by day with trust snapshot, notes, and quick edit/remove actions.</p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-card border border-border bg-card p-4">
              <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
                <FolderPlus className="h-4 w-4" /> Saved Trips
              </h2>
              <div className="space-y-2">
                {allTrips.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => {
                      setActiveTripId(it.id);
                      setActiveItineraryId(it.id);
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                      resolvedTripId === it.id ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface-soft text-foreground'
                    }`}
                  >
                    <p className="font-semibold">{it.title}</p>
                    <p className="text-xs text-muted-foreground">{it.items.length} items</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-card border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Create Trip</h3>
              <div className="space-y-2">
                <input
                  value={newTripTitle}
                  onChange={(e) => setNewTripTitle(e.target.value)}
                  placeholder="Trip name"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={newTripStart} onChange={(e) => setNewTripStart(e.target.value)} className="rounded-md border border-input bg-background px-2 py-2 text-xs" />
                  <input type="date" value={newTripEnd} onChange={(e) => setNewTripEnd(e.target.value)} className="rounded-md border border-input bg-background px-2 py-2 text-xs" />
                </div>
                <button
                  onClick={() => createTrip.mutate()}
                  disabled={createTrip.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" /> Add Trip
                </button>
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            {!trip && <div className="rounded-card border border-border bg-card p-6 text-sm text-muted-foreground">No trip selected.</div>}

            <section data-tour="itinerary-calendar" className="rounded-card border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Calendar Overview</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    className="rounded border border-border p-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="min-w-32 text-center text-sm font-semibold">
                    {monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </p>
                  <button
                    onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    className="rounded border border-border p-1.5"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {allTrips.map((it) => (
                  <span
                    key={it.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-soft px-2 py-1 text-[11px]"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tripColorById[it.id] }} />
                    {it.title}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {monthCells.map((cell) => {
                  const iso = toLocalISOFromDate(cell);
                  const inMonth = cell.getMonth() === monthCursor.getMonth();
                  const events = (eventsByDate.get(iso) || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const isToday = iso === localTodayISO();
                  return (
                    <div
                      key={iso}
                      className={`min-h-32 rounded-md border p-2 ${inMonth ? 'border-border bg-background' : 'border-border/40 bg-surface-muted/50 text-muted-foreground'} ${isToday ? 'ring-2 ring-primary/40' : ''}`}
                    >
                      <p className={`mb-1 text-xs font-semibold ${isToday ? 'text-primary' : ''}`}>{cell.getDate()}</p>
                      <div className="space-y-1">
                        {events.slice(0, 3).map((ev, idx) => (
                          <div
                            key={`${ev.tripId}-${idx}-${ev.placeName}`}
                            className="truncate rounded px-1.5 py-1 text-[10px] text-white shadow-sm"
                            style={{
                              backgroundColor: ev.color,
                              outline: ev.tripId === resolvedTripId ? '2px solid rgba(255,255,255,0.75)' : 'none',
                            }}
                            title={`${ev.startTime} ${ev.placeName} (${ev.tripTitle})`}
                          >
                            {ev.startTime} {ev.placeName}
                          </div>
                        ))}
                        {events.length > 3 && <p className="text-[10px] text-muted-foreground">+{events.length - 3} more</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {trip && (
              <>
                <div className="rounded-card border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{trip.title}</h2>
                      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {days[0] ? dayLabel(days[0]) : '-'} {days.length > 1 ? `to ${dayLabel(days[days.length - 1])}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        onClick={syncGoogleCalendar}
                        data-tour="itinerary-sync-google"
                        disabled={exportableItems.length === 0}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-soft px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" /> Sync Google Calendar
                      </button>
                      <button
                        onClick={downloadICS}
                        data-tour="itinerary-download-ics"
                        disabled={exportableItems.length === 0}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-soft px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" /> Download .ics
                      </button>
                      <button
                        onClick={() => removeTrip.mutate(trip.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-xs font-semibold text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete Trip
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mb-3 rounded-card border border-border bg-card p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Unscheduled / Drag Source</p>
                  <div className="flex flex-wrap gap-2">
                    {trip.items
                      .filter((item) => !item.dateISO)
                      .map((item) => (
                        <button
                          key={item.id}
                          draggable
                          onDragStart={() => setDragItemId(item.id)}
                          className="rounded border border-border bg-surface-soft px-2 py-1 text-xs"
                        >
                          {item.placeName}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {days.map((dayISO) => {
                    const items = trip.items
                      .filter((item) => normalizeItemDate(item, days[0]) === dayISO)
                      .sort((a, b) => (a.startTime || '09:00').localeCompare(b.startTime || '09:00'));
                    return (
                      <section
                        key={dayISO}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => assignDayByDrop(dayISO)}
                        className="rounded-card border border-border bg-card p-4"
                      >
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">{dayLabel(dayISO)}</h3>
                        {items.length === 0 && <p className="text-xs text-muted-foreground">No items for this day.</p>}
                        <div className="space-y-3">
                          {items.map((item) => (
                            <article
                              key={item.id}
                              draggable
                              onDragStart={() => setDragItemId(item.id)}
                              className="rounded-md border border-border bg-surface-soft p-3"
                            >
                              <div className="mb-2 flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold">{item.placeName}</p>
                                <TrustBadge score={item.trustSnapshot} size="sm" />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => bumpTime(item, -30)} className="rounded border border-border p-1"><ChevronDown className="h-3 w-3" /></button>
                                  <input
                                    type="time"
                                    step={1800}
                                    value={item.startTime || '09:00'}
                                    onChange={(e) => updateItem(item.id, { startTime: e.target.value })}
                                    className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs"
                                  />
                                  <button onClick={() => bumpTime(item, 30)} className="rounded border border-border p-1"><ChevronUp className="h-3 w-3" /></button>
                                </div>
                                <select
                                  value={item.durationMin || 90}
                                  onChange={(e) => updateItem(item.id, { durationMin: Number(e.target.value) })}
                                  className="rounded border border-input bg-background px-2 py-1.5 text-xs"
                                >
                                  {[30, 60, 90, 120, 150, 180, 210, 240].map((d) => (
                                    <option key={d} value={d}>{d} min</option>
                                  ))}
                                </select>
                              </div>

                              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                                <div className="relative">
                                  <StickyNote className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                  <input
                                    value={item.note || ''}
                                    onChange={(e) => updateItem(item.id, { note: e.target.value })}
                                    placeholder="Add note"
                                    className="w-full rounded border border-input bg-background py-1.5 pl-7 pr-2 text-xs"
                                  />
                                </div>
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="rounded border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                                >
                                  Remove
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => saveTrip.mutate(trip)}
                    className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary-soft px-4 py-2 text-sm font-semibold text-primary"
                  >
                    <Save className="h-4 w-4" /> Save Timeline
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
