import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, MapPin, Filter, Star, List, LayoutGrid, Maximize2, CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { EventImage } from "@/components/event-image";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendar - Planet Baltimore" }] }),
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const eventSet = new Set(eventDays.map((d) => d.toDateString()));
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

function CalendarPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [organizer, setOrganizer] = useState<string>("all");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [eventType, setEventType] = useState<string>("All Types");
  const [neighborhoods, setNeighborhoods] = useState<{ id: string; name: string }[]>([]);
  const [foryouIdx, setForyouIdx] = useState(0);
  const [upcomingView, setUpcomingView] = useState<"list" | "grid">("list");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, starts_at, location, venue_name, description, image_url, neighborhood")
        .order("starts_at", { ascending: true });
      setEvents((data || []) as Ev[]);
    })();
    (async () => {
      const { data } = await supabase.from("neighborhoods").select("id,name").order("name");
      setNeighborhoods((data ?? []) as { id: string; name: string }[]);
    })();
  }, []);

  const now = new Date();
  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (neighborhood && e.neighborhood !== neighborhood) return false;
      return true;
    });
  }, [events, neighborhood]);

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
      </div>

      {/* Main two-column layout - constrained to match other pages */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
        {/* Left column: calendar + filters */}
        <div className="space-y-6">
          <div className="hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:block">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold text-neutral-800">
                {selected ? selected.toLocaleDateString(undefined, { month: "long", year: "numeric" }) : new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </div>
              <span className="grid h-2 w-2 rounded-full bg-[#d4580a]" />
            </div>
            <p className="mb-4 text-xs text-neutral-500">
              {eventDays.length} event{eventDays.length === 1 ? "" : "s"} this month
            </p>
            <button
              onClick={() => setExpanded(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4580a] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#b84a08]"
            >
              <CalendarDays className="h-4 w-4" /> Mon. Calendar
            </button>
          </div>
          {/* Mobile: horizontal date strip */}
          <div className="max-w-full sm:hidden">
            <MobileDateStrip selected={selected} onSelect={setSelected} eventDays={eventDays} />
            <button
              onClick={() => setExpanded(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4580a] py-3 text-sm font-semibold text-white"
            >
              <CalendarDays className="h-4 w-4" /> Mon. Calendar
            </button>
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
            <div className="mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-[#d4580a]" />
              <h2 className="text-lg font-bold text-neutral-900">For You</h2>
              <span className="rounded-full bg-[#d4580a]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#d4580a]">
                Personalized
              </span>
              <div className="ml-2 flex items-center gap-1.5">
                <button
                  onClick={() => setForyouIdx((i) => Math.max(0, i - 1))}
                  className="grid h-7 w-7 place-items-center rounded-full border border-neutral-200 text-neutral-500 hover:border-[#d4580a] hover:text-[#d4580a]"
                  aria-label="Prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setForyouIdx((i) => Math.min(Math.max(0, forYou.length - 1), i + 1))}
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
              <div className="overflow-hidden">
                <div
                  className="flex gap-3 transition-transform duration-300"
                  style={{ transform: `translateX(calc(-${foryouIdx} * (260px + 0.75rem)))` }}
                >
                  {forYou.map((e) => (
                    <ForYouCard key={e.id} event={e} />
                  ))}
                </div>
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
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="h-full max-h-screen w-full max-w-full p-0 pt-14 sm:h-auto sm:w-[calc(100%-2rem)] sm:max-w-[900px] sm:pt-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CalendarDays className="h-5 w-5 text-[#d4580a]" />
              Mon. Calendar
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 items-start justify-center px-4 pb-6 sm:px-6">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => { setSelected(d); if (d) setExpanded(false); }}
              modifiers={{ hasEvent: eventDays }}
              modifiersClassNames={{
                hasEvent:
                  "relative font-semibold text-[#d4580a] after:absolute after:bottom-2 after:left-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-[#d4580a]",
              }}
              className="pointer-events-auto origin-top [&_.rdp-day]:h-10 [&_.rdp-day]:w-10 [&_.rdp-cell]:h-10 [&_.rdp-cell]:w-10 [&_.rdp-head_cell]:w-10 sm:[&_.rdp-day]:h-16 sm:[&_.rdp-day]:w-16 sm:[&_.rdp-cell]:h-16 sm:[&_.rdp-cell]:w-16 sm:[&_.rdp-head_cell]:w-16"
            />
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
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
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="group block w-[260px] shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:border-[#d4580a]/40 hover:shadow-md"
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
    </Link>
  );
}

function UpcomingRow({ event }: { event: Ev }) {
  const d = event.starts_at ? new Date(event.starts_at) : null;
  const where = event.venue_name || event.location;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-[#d4580a]/40 hover:shadow-sm">
      <div className="flex gap-4">
        {d && (
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-50 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#d4580a]">
              {d.toLocaleDateString(undefined, { month: "short" })}
            </div>
            <div className="text-2xl font-bold leading-none text-neutral-900">{d.getDate()}</div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link to="/events/$eventId" params={{ eventId: event.id }} className="line-clamp-1 text-[15px] font-semibold text-neutral-900 hover:text-[#d4580a]">
            {event.title}
          </Link>
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
