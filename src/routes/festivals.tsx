import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { EventCard } from "@/components/shared/event-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { pageHead } from "@/lib/seo";
import { format } from "date-fns";
import { Plus, MapPin } from "lucide-react";

export const Route = createFileRoute("/festivals")({
  component: FestivalsPage,
  head: () =>
    pageHead({
      path: "/festivals",
      title: "Baltimore Festivals | Planet Baltimore",
      description:
        "Discover Baltimore's festivals, celebrations, performances, food, art and culture.",
    }),
});

type Row = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  neighborhood: string | null;
  category: string | null;
  price_cents: number | null;
  pricing_mode: string | null;
  user_id: string | null;
};

const CATEGORY_GROUPS: { label: string; match: RegExp }[] = [
  { label: "Arts", match: /art|gallery|craft/i },
  { label: "Music", match: /music|concert|band|dj/i },
  { label: "Food", match: /food|taste|wine|beer|culinary/i },
  { label: "Film", match: /film|movie|cinema/i },
  { label: "Books & Poetry", match: /book|poetry|literar|author/i },
  { label: "Caribbean", match: /caribbean/i },
  { label: "African Diaspora", match: /african|afram|diaspora|black/i },
  { label: "Latino", match: /latin|hispanic/i },
  { label: "Asian", match: /asian|lunar|korean|chinese|japanese/i },
  { label: "Pride", match: /pride|lgbt|queer/i },
  { label: "Family", match: /family|kid|children/i },
  { label: "Wellness", match: /wellness|yoga|health|fitness/i },
  { label: "Holiday", match: /holiday|christmas|halloween|new year|thanksgiving/i },
  { label: "Neighborhood", match: /neighborhood|block party|street fair|hon/i },
  { label: "Markets", match: /market|vendor|flea|bazaar/i },
];

const QUICK_FILTERS = ["This Weekend", "Free", "Family Friendly", "Outdoor"] as const;
type QuickFilter = (typeof QUICK_FILTERS)[number];

function haystack(r: Row) {
  return `${r.title ?? ""} ${r.description ?? ""} ${r.category ?? ""}`.toLowerCase();
}

function isFree(r: Row) {
  if (r.pricing_mode === "paid") return false;
  return !r.price_cents || r.price_cents <= 0;
}

function weekendRange() {
  const now = new Date();
  const day = now.getDay();
  const daysToFri = (5 - day + 7) % 7;
  const fri = new Date(now);
  fri.setDate(now.getDate() + daysToFri);
  fri.setHours(0, 0, 0, 0);
  const end = new Date(fri);
  end.setDate(fri.getDate() + 3);
  return { start: fri, end };
}

function isThisWeekend(r: Row) {
  if (!r.starts_at) return false;
  const { start, end } = weekendRange();
  const s = new Date(r.starts_at);
  const e = r.ends_at ? new Date(r.ends_at) : s;
  return e >= start && s <= end;
}

function dateRangeLabel(r: Row) {
  if (!r.starts_at) return "Date TBD";
  const s = new Date(r.starts_at);
  const e = r.ends_at ? new Date(r.ends_at) : null;
  if (e && e.toDateString() !== s.toDateString()) {
    return `${format(s, "MMM d")} – ${format(e, "MMM d")}`;
  }
  return format(s, "MMM d");
}

function Section({
  title,
  rows,
  id,
}: {
  title: string;
  rows: Row[];
  id?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section id={id} className="space-y-3">
      <h2 className="font-display text-lg font-extrabold text-foreground sm:text-xl">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((e) => (
          <EventCard key={e.id} event={{ ...e, is_free: isFree(e) }} />
        ))}
      </div>
    </section>
  );
}

function FestivalsPage() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<QuickFilter[]>([]);

  const { data } = useCachedFetch<Row[]>("pb:festivals:v2", async () => {
    const { data } = await supabase
      .from("events")
      .select(
        "id,title,description,image_url,starts_at,ends_at,venue_name,neighborhood,category,price_cents,pricing_mode,user_id",
      )
      .eq("is_published", true)
      .gte("starts_at", new Date(Date.now() - 12 * 3600 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(300);
    const rows = (data as Row[] | null) ?? [];
    return rows.filter(
      (r) =>
        /festival/i.test(r.category ?? "") ||
        /festival|fest\b|block party|street fair|celebration/i.test(r.title ?? ""),
    );
  });

  const all = data ?? [];

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((r) => {
      if (
        term &&
        !`${r.title ?? ""} ${r.neighborhood ?? ""} ${r.venue_name ?? ""}`
          .toLowerCase()
          .includes(term)
      )
        return false;
      for (const f of active) {
        if (f === "Free" && !isFree(r)) return false;
        if (f === "This Weekend" && !isThisWeekend(r)) return false;
        if (f === "Family Friendly" && !/family|kid|children|all ages/i.test(haystack(r)))
          return false;
        if (f === "Outdoor" && !/outdoor|park|street|plaza|waterfront|harbor/i.test(haystack(r)))
          return false;
      }
      return true;
    });
  }, [all, q, active]);

  const featured = rows[0] ?? null;
  const soon = rows.slice(0, 6);
  const weekend = rows.filter(isThisWeekend);
  const free = rows.filter(isFree);
  const upcoming = rows;

  const categoryCounts = useMemo(
    () =>
      CATEGORY_GROUPS.map((c) => ({
        label: c.label,
        count: rows.filter((r) => c.match.test(haystack(r))).length,
      })).filter((c) => c.count > 0),
    [rows],
  );

  const neighborhoodCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const n = (r.neighborhood || r.venue_name || "").trim();
      if (!n) continue;
      map.set(n, (map.get(n) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const toggle = (f: QuickFilter) =>
    setActive((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <HeroBanner
          title="Festivals"
          subtitle="Discover Baltimore's festivals, celebrations, performances, food, art and culture."
          cta={
            <Button asChild className="bg-[#d4580a] text-white hover:bg-[#b8490a]">
              <Link to="/events/new">
                <Plus className="mr-1.5 h-4 w-4" />
                Create a Festival
              </Link>
            </Button>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((f) => {
              const on = active.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggle(f)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    on
                      ? "border-[#d4580a] bg-[#d4580a] text-white"
                      : "border-border bg-card text-muted-foreground hover:border-[#d4580a] hover:text-[#d4580a]"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search festivals by name, neighborhood or venue"
            className="sm:max-w-xs"
          />
        </div>

        {all.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
            No festivals listed yet. Create one and it will show up here.
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
            No festivals match those filters.
          </div>
        ) : (
          <>
            {featured && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-extrabold text-foreground sm:text-xl">
                  Featured Festival
                </h2>
                <Link
                  to="/events/$eventId"
                  params={{ eventId: featured.id }}
                  className="block overflow-hidden rounded-2xl border-2 bg-card transition hover:shadow-md"
                  style={{ borderColor: "#d4580a" }}
                >
                  <div className="grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                    {featured.image_url ? (
                      <img
                        src={featured.image_url}
                        alt={featured.title}
                        loading="lazy"
                        className="h-56 w-full object-cover md:h-full"
                      />
                    ) : (
                      <div className="h-40 w-full bg-gradient-to-br from-[#d4580a] to-[#7a2f04] md:h-full" />
                    )}
                    <div className="space-y-2 p-5">
                      <h3 className="font-display text-xl font-extrabold text-foreground sm:text-2xl">
                        {featured.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span>{dateRangeLabel(featured)}</span>
                        {(featured.neighborhood || featured.venue_name) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {featured.neighborhood || featured.venue_name}
                          </span>
                        )}
                      </div>
                      {featured.description && (
                        <p className="line-clamp-4 text-sm text-muted-foreground">
                          {featured.description.replace(/<[^>]+>/g, "")}
                        </p>
                      )}
                      <span className="inline-block rounded-full bg-[#d4580a] px-4 py-2 text-xs font-semibold text-white">
                        Explore Festival
                      </span>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            <Section title="Happening Soon" rows={soon} />
            <Section title="This Weekend" rows={weekend} />
            <Section title="Free Festivals" rows={free} />

            {categoryCounts.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-extrabold text-foreground sm:text-xl">
                  Browse by Category
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {categoryCounts.map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setQ(c.label)}
                      className="rounded-xl border border-border bg-card px-3 py-3 text-left transition hover:border-[#d4580a]"
                    >
                      <div className="text-sm font-semibold text-foreground">{c.label}</div>
                      <div className="text-xs text-muted-foreground">{c.count} upcoming</div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {neighborhoodCounts.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-extrabold text-foreground sm:text-xl">
                  Browse by Neighborhood
                </h2>
                <div className="flex flex-wrap gap-2">
                  {neighborhoodCounts.map(([name, count]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setQ(name)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-[#d4580a] hover:text-[#d4580a]"
                    >
                      {name} <span className="ml-1 text-[#d4580a]">{count}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <Section title="Upcoming Festivals" rows={upcoming} />
          </>
        )}
      </div>
    </AppLayout>
  );
}
