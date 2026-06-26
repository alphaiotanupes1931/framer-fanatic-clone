import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({ meta: [{ title: "Calendar - Planet Baltimore" }] }),
});

type Ev = { id: string; title: string; starts_at: string | null; location: string | null; description: string | null };

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CalendarPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, starts_at, location, description")
        .order("starts_at", { ascending: true });
      setEvents((data || []) as Ev[]);
    })();
  }, []);

  const now = new Date();
  const upcoming = useMemo(
    () => events.filter((e) => e.starts_at && new Date(e.starts_at) >= now).slice(0, 8),
    [events],
  );
  const past = useMemo(
    () =>
      events
        .filter((e) => e.starts_at && new Date(e.starts_at) < now)
        .sort((a, b) => new Date(b.starts_at!).getTime() - new Date(a.starts_at!).getTime())
        .slice(0, 5),
    [events],
  );
  const eventDays = useMemo(
    () => events.filter((e) => e.starts_at).map((e) => new Date(e.starts_at!)),
    [events],
  );
  const dayEvents = useMemo(
    () => (selected ? events.filter((e) => e.starts_at && sameDay(new Date(e.starts_at), selected)) : []),
    [events, selected],
  );

  return (
    <AppLayout
      title="Calendar"
      subtitle="Events from local businesses, organizations and communities."
      cta="Create Event"
      ctaTo="/events"
    >
      <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:gap-8">
        <div className="mx-auto w-fit rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm sm:p-4 lg:mx-0">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            modifiers={{ hasEvent: eventDays }}
            modifiersClassNames={{ hasEvent: "relative font-semibold text-orange after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-orange" }}
            className="pointer-events-auto mx-auto"
          />
        </div>

        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-500">
            {selected ? selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Pick a date"}
          </h2>
          {dayEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
              No events scheduled for this day.
            </div>
          ) : (
            <div className="space-y-3">
              {dayEvents.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:mt-12 lg:grid-cols-2 lg:gap-10">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <CalendarDays className="h-3.5 w-3.5 text-orange" /> Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-neutral-400">No upcoming events.</p>
          ) : (
            <div className="space-y-3">{upcoming.map((e) => <EventRow key={e.id} event={e} />)}</div>
          )}
        </section>
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <CalendarDays className="h-3.5 w-3.5 text-neutral-400" /> Past
          </h2>
          {past.length === 0 ? (
            <p className="text-sm text-neutral-400">No past events yet.</p>
          ) : (
            <div className="space-y-3">{past.map((e) => <EventRow key={e.id} event={e} muted />)}</div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function EventRow({ event, muted = false }: { event: Ev; muted?: boolean }) {
  const d = event.starts_at ? new Date(event.starts_at) : null;
  return (
    <div className={`flex gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-orange/40 hover:shadow-sm ${muted ? "opacity-70" : ""}`}>
      {d && (
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-neutral-50 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-orange">
            {d.toLocaleDateString(undefined, { month: "short" })}
          </div>
          <div className="text-lg font-semibold leading-none text-neutral-900">{d.getDate()}</div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-neutral-900">{event.title}</div>
        <div className="mt-0.5 text-xs text-neutral-500">
          {d ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : ""}
          {event.location ? <span className="inline-flex items-center gap-1"> · <MapPin className="h-3 w-3" /> {event.location}</span> : null}
        </div>
        {event.description && <p className="mt-2 line-clamp-2 text-xs text-neutral-500">{event.description}</p>}
      </div>
    </div>
  );
}
