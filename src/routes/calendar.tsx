import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, MapPin, Filter, Star, List, LayoutGrid, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EventImage } from "@/components/event-image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { pageHead } from "@/lib/seo";

function openEventPopup(ev: Ev) {
  window.dispatchEvent(new CustomEvent<Ev>("pb-open-event", { detail: ev }));
}

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => pageHead({ path: "/calendar", title: "Baltimore Event Calendar by Date | Planet Baltimore", description: "See everything happening in Baltimore on a full monthly calendar you can plan around." }),
});

type Ev = {
  id: string;
  title: string;
  starts_at: string | null;
  location: string | null;
  venue_name: string | null;
  description: string | null;
  image_url: string | null;
  neighborhood: string | null;
  category: string | null;
  organization_id: string | null;
};

const ORGANIZERS = [
  { id: "all", label: "All Organizers", icon: "calendar" },
  { id: "business", label: "Businesses", icon: "business" },
  { id: "community", label: "Communities", icon: "community" },
  { id: "arts", label: "Arts Orgs", icon: "arts" },
] as const;

const EVENT_TYPES = [
  "All Types", "Music", "Art", "Community", "Education", "Food",
  "Wellness", "Nightlife", "Family", "Festival", "Networking", "Activism", "Sports",
];

function MobileDateStrip({
  selected,
  onSelect,
  eventDays,
}: {
  selected: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  eventDays: Date[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const eventSet = new Set(eventDays.map((d) => d.toDateString()));
  if (!mounted) return <div className="h-[92px] rounded-2xl border border-neutral-200 bg-white shadow-sm" />;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-neutral-500">
        <span>{today.toLocaleString(undefined, { month: "long", year: "numeric" })}</span>
        <button
          onClick={() => onSelect(today)}
          className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600"
        >
          Today
        </button>
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((d) => {
          const isSel = selected && d.toDateString() === selected.toDateString();
          const hasEvent = eventSet.has(d.toDateString());
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelect(d)}
              className={`relative flex min-w-[52px] flex-col items-center rounded-xl border px-2 py-2 transition ${
                isSel
                  ? "border-[#d4580a] bg-[#d4580a] text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-orange-300"
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase ${isSel ? "text-white/80" : "text-neutral-500"}`}>
                {d.toLocaleString(undefined, { weekday: "short" })}
              </span>
              <span className="mt-0.5 text-lg font-bold leading-none">{d.getDate()}</span>
              {hasEvent && (
                <span
                  className={`mt-1 h-1 w-1 rounded-full ${isSel ? "bg-white" : "bg-[#d4580a]"}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyGrid({ events }: { events: Ev[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dayOpen, setDayOpen] = useState<{ date: Date; events: Ev[] } | null>(null);
  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const firstDow = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();
  const cells: Array<{ day: number; inMonth: boolean; date: Date }> = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, inMonth: false, date: new Date(cursor.getFullYear(), cursor.getMonth() - 1, prevMonthDays - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, date: new Date(cursor.getFullYear(), cursor.getMonth(), d) });
  }
  while (cells.length % 7 !== 0) {
    const d = cells.length - firstDow - daysInMonth + 1;
    cells.push({ day: d, inMonth: false, date: new Date(cursor.getFullYear(), cursor.getMonth() + 1, d) });
  }
  const today = new Date();
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const eventsByDay = new Map<string, Ev[]>();
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  const monthEvents = events.filter((e) => {
    if (!e.starts_at) return false;
    const t = new Date(e.starts_at);
    return t >= monthStart && t < monthEnd;
  });
  for (const e of monthEvents) {
    const key = new Date(e.starts_at!).toDateString();
    const arr = eventsByDay.get(key) ?? [];
    arr.push(e);
    eventsByDay.set(key, arr);
  }
  const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const upcoming = monthEvents
    .filter((e) => new Date(e.starts_at!) >= today)
    .slice(0, 8);

  return (
    <section className="mt-6 space-y-6">
      <div className="flex items-center justify-between px-2">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="rounded-full p-2 hover:bg-neutral-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-lg font-semibold text-neutral-900">{monthLabel}</div>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="rounded-full p-2 hover:bg-neutral-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-600">
          {dowLabels.map((d) => (
            <div key={d} className="px-3 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((c, i) => {
            const dayEvents = eventsByDay.get(c.date.toDateString()) ?? [];
            return (
              <div
                key={i}
                className={`min-h-[80px] border-b border-r border-neutral-100 p-2 text-sm ${
                  c.inMonth ? "text-neutral-900" : "bg-neutral-50 text-neutral-400"
                }`}
              >
                <button
                  type="button"
                  disabled={dayEvents.length === 0}
                  onClick={() => setDayOpen({ date: c.date, events: dayEvents })}
                  title={dayEvents.length ? `${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}` : undefined}
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs transition ${
                    isToday(c.date) ? "border border-neutral-900" : ""
                  } ${dayEvents.length ? "font-semibold text-[#d4580a] hover:bg-[#d4580a]/10" : "cursor-default"}`}
                >
                  {c.day}
                </button>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => openEventPopup(e)}
                      className="block w-full truncate rounded bg-[#d4580a]/10 px-1 py-0.5 text-left text-[10px] font-medium text-[#d4580a] hover:bg-[#d4580a]/20"
                    >
                      {e.title}
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setDayOpen({ date: c.date, events: dayEvents })}
                      className="block w-full rounded px-1 py-0.5 text-left text-[10px] font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-[#d4580a]"
                    >
                      +{dayEvents.length - 2 >= 50 ? "50+" : dayEvents.length - 2} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <CalendarDays className="h-4 w-4" /> Upcoming Events
        </div>
        {upcoming.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">No upcoming events.</div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => openEventPopup(e)}
                className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-left text-sm hover:border-[#d4580a]"
              >
                <div className="font-medium text-neutral-900">{e.title}</div>
                <div className="text-xs text-neutral-500">{new Date(e.starts_at!).toLocaleString()}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <DayEventsDialog data={dayOpen} onClose={() => setDayOpen(null)} />
    </section>
  );
}

function DayEventsDialog({ data, onClose }: { data: { date: Date; events: Ev[] } | null; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("All Types");
  useEffect(() => { setQ(""); setType("All Types"); }, [data?.date?.toDateString()]);
  const all = data?.events ?? [];
  const types = ["All Types", ...Array.from(new Set(all.map((e) => e.category).filter(Boolean) as string[]))];
  const list = all.filter((e) => {
    const matchesQ =
      !q.trim() ||
      (e.title || "").toLowerCase().includes(q.toLowerCase()) ||
      (e.venue_name || e.location || "").toLowerCase().includes(q.toLowerCase());
    const matchesType = type === "All Types" || e.category === type;
    return matchesQ && matchesType;
  });
  const shown = list.length >= 50 ? "50+" : String(list.length);
  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden p-0">
        {data && (
          <>
            <div className="space-y-3 border-b border-neutral-100 p-5 pb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#d4580a]" />
                <h2 className="text-lg font-bold text-neutral-900">
                  {data.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </h2>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-600">{shown}</span>
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search events on this day…"
                className="w-full rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm focus:border-[#d4580a] focus:outline-none"
              />
              {types.length > 1 && (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {types.map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                        type === t ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {list.length === 0 ? (
                <div className="py-10 text-center text-sm text-neutral-500">No events match your filters.</div>
              ) : (
                list.map((e) => {
                  const d = e.starts_at ? new Date(e.starts_at) : null;
                  const where = e.venue_name || e.location;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => { onClose(); openEventPopup(e); }}
                      className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left hover:border-[#d4580a]"
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        {e.image_url && <EventImage src={e.image_url} alt={e.title} className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-neutral-900">{e.title}</div>
                        <div className="mt-0.5 text-xs text-neutral-500">
                          {d ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : ""}
                          {where ? ` · ${where}` : ""}
                        </div>
                        {e.description && (
                          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-neutral-500">{e.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CalendarPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [organizer, setOrganizer] = useState<string>("all");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [eventType, setEventType] = useState<string>("All Types");
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string }[]>([]);
  const forYouRef = useRef<HTMLDivElement | null>(null);
  const scrollForYou = (dir: number) => {
    const el = forYouRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth - 40), behavior: "smooth" });
  };
  const [upcomingView, setUpcomingView] = useState<"list" | "grid">("list");
  const [showMonthly, setShowMonthly] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, starts_at, location, venue_name, description, image_url, neighborhood, category, organization_id")
        .order("starts_at", { ascending: true });
      setEvents((data || []) as Ev[]);
    })();
    (async () => {
      const { data } = await supabase.from("neighborhoods").select("id,name").order("name");
      setNeighborhoods((data ?? []) as { id: string; name: string }[]);
    })();
  }, []);

  const [orgTypeById, setOrgTypeById] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("organizations").select("id,type");
      const map: Record<string, string> = {};
      for (const o of (data ?? []) as Array<{ id: string; type: string }>) map[o.id] = o.type;
      setOrgTypeById(map);
    })();
  }, []);

  const now = new Date();
  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (neighborhood && e.neighborhood !== neighborhood) return false;
      if (eventType !== "All Types" && (e.category ?? "").toLowerCase() !== eventType.toLowerCase()) return false;
      if (organizer !== "all") {
        const orgType = e.organization_id ? orgTypeById[e.organization_id] : null;
        if (organizer === "business" && orgType !== "business") return false;
        if (organizer === "community" && orgType !== "community_assoc") return false;
        if (organizer === "arts" && orgType !== "arts_org") return false;
      }
      return true;
    });
  }, [events, neighborhood, eventType, organizer, orgTypeById]);

  const upcoming = useMemo(
    () => {
      const future = filtered
        .filter((e) => e.starts_at && new Date(e.starts_at) >= now)
        .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime());
      if (future.length > 0) return future.slice(0, 12);
      // Fallback: show most recent events so the calendar is never empty
      return filtered
        .filter((e) => e.starts_at)
        .sort((a, b) => new Date(b.starts_at!).getTime() - new Date(a.starts_at!).getTime())
        .slice(0, 12);
    },
    [filtered],
  );
  const forYou = useMemo(
    () => {
      const future = filtered
        .filter((e) => e.starts_at && e.image_url && new Date(e.starts_at) >= now)
        .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime());
      if (future.length > 0) return future.slice(0, 8);
      return filtered
        .filter((e) => e.starts_at && e.image_url)
        .sort((a, b) => new Date(b.starts_at!).getTime() - new Date(a.starts_at!).getTime())
        .slice(0, 8);
    },
    [filtered],
  );
  const eventDays = useMemo(
    () => filtered.filter((e) => e.starts_at).map((e) => new Date(e.starts_at!)),
    [filtered],
  );

  return (
    <AppLayout>
      <HeroBanner
        title="Calendar"
        subtitle="Events from local businesses, organizations & communities"
        cta={
          <Link to="/events/new">
            <Button variant="outline" className="gap-2 rounded-xl h-11 px-5" style={{ borderColor: "#d4580a", color: "#d4580a" }}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Event</span>
            </Button>
          </Link>
        }
      />

      {/* Organizer filter pills */}
      <div className="mt-6 flex flex-wrap gap-2">
        {ORGANIZERS.map((o) => {
          const active = organizer === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setOrganizer(o.id)}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-neutral-800 text-white"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:border-orange-300"
              }`}
            >
              <OrgIcon id={o.icon} />
              {o.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowMonthly((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            showMonthly
              ? "bg-[#d4580a] text-white"
              : "border border-neutral-200 bg-white text-neutral-600 hover:border-orange-300"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Monthly Calendar
        </button>
      </div>

      {/* Full-width monthly calendar when active */}
      {showMonthly && <MonthlyGrid events={filtered} />}

      {/* Main two-column layout - constrained to match other pages */}
      {!showMonthly && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
          {/* Left column: calendar + filters */}
          <div className="space-y-6">
            {/* Mobile: horizontal date strip */}
            <div className="sm:hidden">
              <MobileDateStrip selected={selected} onSelect={setSelected} eventDays={eventDays} />
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-neutral-800">
                <MapPin className="h-4 w-4 text-[#d4580a]" /> Neighborhood
              </div>
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full appearance-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-700 focus:border-[#d4580a] focus:outline-none focus:ring-1 focus:ring-[#d4580a]/30"
              >
                <option value="">All Neighborhoods</option>
                {neighborhoods.map((n) => (
                  <option key={n.id} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-neutral-800">
                <Filter className="h-4 w-4 text-[#d4580a]" /> Event Type
              </div>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((t) => {
                  const active = eventType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setEventType(t)}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                        active
                          ? "bg-neutral-800 text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column: For You + Upcoming */}
          <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-[#d4580a]" />
                <h2 className="text-lg font-bold tracking-tight text-neutral-900">On Planet</h2>
                <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-neutral-100 px-2 text-[11px] font-bold text-neutral-600">
                  {forYou.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollForYou(-1)}
                  className="grid h-7 w-7 place-items-center rounded-full border border-neutral-200 text-neutral-500 hover:border-[#d4580a] hover:text-[#d4580a]"
                  aria-label="Prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollForYou(1)}
                  className="grid h-7 w-7 place-items-center rounded-full border border-neutral-200 text-neutral-500 hover:border-[#d4580a] hover:text-[#d4580a]"
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            {forYou.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
                No personalized events yet.
              </div>
            ) : (
              <div
                ref={forYouRef}
                className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {forYou.map((e) => (
                  <ForYouCard key={e.id} event={e} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-900">Upcoming Events</h2>
                <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-neutral-100 px-2 text-[11px] font-bold text-neutral-600">
                  {upcoming.length}
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-0.5">
                <button
                  onClick={() => setUpcomingView("list")}
                  className={`grid h-7 w-7 place-items-center rounded-md ${
                    upcomingView === "list" ? "bg-neutral-100 text-neutral-800" : "text-neutral-400"
                  }`}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setUpcomingView("grid")}
                  className={`grid h-7 w-7 place-items-center rounded-md ${
                    upcomingView === "grid" ? "bg-neutral-100 text-neutral-800" : "text-neutral-400"
                  }`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-500">
                No upcoming events scheduled yet.{" "}
                <Link to="/events/new" className="font-semibold text-[#d4580a] hover:underline">
                  Create one
                </Link>
                .
              </div>
            ) : upcomingView === "grid" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {upcoming.map((e) => (
                  <UpcomingRow key={e.id} event={e} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((e) => (
                  <UpcomingRow key={e.id} event={e} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    )}
    <EventPopup />
    </AppLayout>
  );
}

function EventPopup() {
  const [ev, setEv] = useState<Ev | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => setEv((e as CustomEvent<Ev>).detail);
    window.addEventListener("pb-open-event", onOpen as EventListener);
    return () => window.removeEventListener("pb-open-event", onOpen as EventListener);
  }, []);
  const d = ev?.starts_at ? new Date(ev.starts_at) : null;
  const where = ev?.venue_name || ev?.location;
  return (
    <Dialog open={!!ev} onOpenChange={(o) => !o && setEv(null)}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        {ev && (
          <div>
            {ev.image_url && (
              <div className="aspect-[16/9] w-full overflow-hidden bg-neutral-100">
                <EventImage src={ev.image_url} alt={ev.title} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="space-y-3 p-5">
              <h2 className="text-xl font-bold text-neutral-900">{ev.title}</h2>
              {d && (
                <div className="flex items-center gap-2 text-sm font-medium text-[#d4580a]">
                  <CalendarDays className="h-4 w-4" />
                  {d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                  {" · "}
                  {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </div>
              )}
              {where && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <MapPin className="h-4 w-4" /> {where}
                </div>
              )}
              {ev.description && (
                <p className="line-clamp-5 text-sm leading-relaxed text-neutral-600">{ev.description}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Link
                  to="/events/$eventId"
                  params={{ eventId: ev.id }}
                  onClick={() => setEv(null)}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8480a]"
                >
                  View full event
                </Link>
                <button
                  onClick={() => setEv(null)}
                  className="inline-flex items-center justify-center rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OrgIcon({ id }: { id: string }) {
  const cls = "h-4 w-4";
  if (id === "business")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21V7l9-4 9 4v14" /><path d="M9 21V12h6v9" />
      </svg>
    );
  if (id === "community")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /><path d="M15 20c0-2 1.8-4 4-4" />
      </svg>
    );
  if (id === "arts")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18" /><path d="M5 21V9l7-6 7 6v12" /><path d="M9 21v-6h6v6" />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M8 3v4M16 3v4" />
    </svg>
  );
}

function ForYouCard({ event }: { event: Ev }) {
  const d = event.starts_at ? new Date(event.starts_at) : null;
  return (
    <button
      type="button"
      onClick={() => openEventPopup(event)}
      className="group block w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left transition hover:border-[#d4580a]/40 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {event.image_url ? (
          <EventImage src={event.image_url} alt={event.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : null}
        <div className="absolute left-3 top-3 rounded-full bg-neutral-900/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          Community
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-bold text-neutral-800 shadow">
          <Star className="h-3 w-3 text-[#d4580a]" />
          9.5/10
        </div>
      </div>
      <div className="p-3">
        <div className="line-clamp-1 text-sm font-semibold text-neutral-900">{event.title}</div>
        {d && (
          <div className="mt-0.5 text-xs font-medium text-[#d4580a]">
            {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </div>
        )}
        {event.description && (
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-neutral-500">
            "{event.description}"
          </p>
        )}
      </div>
    </button>
  );
}

function UpcomingRow({ event }: { event: Ev }) {
  const d = event.starts_at ? new Date(event.starts_at) : null;
  const where = event.venue_name || event.location;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-[#d4580a]/40 hover:shadow-sm">
      <div className="flex gap-4">
        {event.image_url ? (
          <button
            type="button"
            onClick={() => openEventPopup(event)}
            className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100"
          >
            <EventImage src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
            {d && (
              <span className="absolute left-1 top-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#d4580a] shadow">
                {d.toLocaleDateString(undefined, { month: "short" })} {d.getDate()}
              </span>
            )}
          </button>
        ) : d ? (
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-50 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#d4580a]">
              {d.toLocaleDateString(undefined, { month: "short" })}
            </div>
            <div className="text-2xl font-bold leading-none text-neutral-900">{d.getDate()}</div>
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => openEventPopup(event)}
            className="line-clamp-1 text-left text-[15px] font-semibold text-neutral-900 hover:text-[#d4580a]"
          >
            {event.title}
          </button>
          <div className="mt-1 text-xs text-neutral-500">
            {d
              ? d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
                " · " +
                d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
              : ""}
          </div>
          {where && (
            <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
              <MapPin className="h-3 w-3" /> {where}
            </div>
          )}
          {event.description && (
            <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-neutral-500">{event.description}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-neutral-100 pt-3">
        <button className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:border-[#d4580a] hover:text-[#d4580a]">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18" />
          </svg>
          Going · 1
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:border-[#d4580a] hover:text-[#d4580a]">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2" />
          </svg>
          Interested
        </button>
      </div>
    </div>
  );
}
