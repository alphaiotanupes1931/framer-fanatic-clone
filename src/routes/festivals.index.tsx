import { createFileRoute, Link } from "@tanstack/react-router";
import { Img } from "@/components/shared/smart-img";
import { useEffect, useMemo, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { EventCard } from "@/components/shared/event-card";
import { FestivalMap, type FestivalPin } from "@/components/festivals/festival-map";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { pageHead } from "@/lib/seo";
import { format } from "date-fns";
import { toast } from "sonner";
import { siteUrl } from "@/lib/utils";
import { downloadIcs } from "@/lib/ics";
import { externalShare } from "@/lib/share-preview";
import {
  Plus,
  MapPin,
  Compass,
  CalendarDays,
  LayoutGrid,
  Landmark,
  Users,
  Bookmark,
  Navigation,
  UserPlus,
  UserCheck,
  Share2,
  CalendarPlus,
} from "lucide-react";

export const Route = createFileRoute("/festivals/")({
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
  address: string | null;
  neighborhood: string | null;
  category: string | null;
  price_cents: number | null;
  pricing_mode: string | null;
  latitude: number | null;
  longitude: number | null;
  organization_id: string | null;
  user_id: string | null;
};

type Org = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
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

const TABS = [
  { key: "discover", label: "Discover", icon: Compass },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "map", label: "Map", icon: MapPin },
  { key: "categories", label: "Categories", icon: LayoutGrid },
  { key: "neighborhoods", label: "Neighborhoods", icon: Landmark },
  { key: "organizers", label: "Organizers", icon: Users },
  { key: "saved", label: "Saved", icon: Bookmark },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function haystack(r: Row) {
  return `${r.title ?? ""} ${r.description ?? ""} ${r.category ?? ""}`.toLowerCase();
}

function isFree(r: Row) {
  if (r.pricing_mode === "paid") return false;
  return !r.price_cents || r.price_cents <= 0;
}

function priceLabel(r: Row) {
  if (isFree(r)) return "Free";
  return `$${Math.round((r.price_cents ?? 0) / 100)}`;
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

function placeOf(r: Row) {
  return (r.neighborhood || r.venue_name || "").trim();
}

function Section({ title, rows, id }: { title: string; rows: Row[]; id?: string }) {
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

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function tagsOf(r: Row) {
  return [priceLabel(r), r.category, placeOf(r)].filter(Boolean) as string[];
}

/** Save / Share / Calendar actions used on the featured festival. */
function FestivalActions({
  row,
  meId,
  saved,
  onSavedChange,
}: {
  row: Row;
  meId?: string | null;
  saved: boolean;
  onSavedChange: (id: string, next: boolean) => void;
}) {
  const url = siteUrl(`/festivals/${row.id}`);

  const toggleSave = async () => {
    if (!meId) {
      toast.error("Sign in to save");
      return;
    }
    const next = !saved;
    onSavedChange(row.id, next);
    const res = next
      ? await supabase
          .from("event_saves")
          .upsert({ event_id: row.id, user_id: meId }, { onConflict: "event_id,user_id", ignoreDuplicates: true })
      : await supabase.from("event_saves").delete().eq("event_id", row.id).eq("user_id", meId);
    if (res.error) {
      onSavedChange(row.id, !next);
      toast.error(res.error.message);
    }
  };

  const addToCalendar = () => {
    if (!row.starts_at) {
      toast.error("This festival has no date yet");
      return;
    }
    downloadIcs(
      {
        uid: `festival-${row.id}@planetbaltimore.com`,
        title: row.title,
        start: new Date(row.starts_at),
        end: row.ends_at ? new Date(row.ends_at) : null,
        location: row.address || row.venue_name || placeOf(row) || "Baltimore",
        description: (row.description ?? "").replace(/<[^>]+>/g, "") || null,
        url,
      },
      row.title.replace(/[^\w\s-]/g, "").trim() || "festival",
    );
    toast.success("Added to your calendar");
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-[#d4580a] hover:text-[#d4580a]";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={toggleSave}
        className={
          saved
            ? "inline-flex items-center gap-1.5 rounded-full border border-[#d4580a] bg-[#d4580a]/10 px-3 py-1.5 text-xs font-medium text-[#d4580a]"
            : btn
        }
      >
        <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
        {saved ? "Saved" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => void externalShare(url, row.title, row.description || undefined)}
        className={btn}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
      <button type="button" onClick={addToCalendar} className={btn}>
        <CalendarPlus className="h-3.5 w-3.5" />
        Calendar
      </button>
    </div>
  );
}

function Thumb({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return <div className={`bg-gradient-to-br from-[#d4580a] to-[#7a2f04] ${className ?? ""}`} />;
  }
  return <Img src={src} alt={alt} loading="lazy" className={`object-cover ${className ?? ""}`} />;
}

function OrgFollowButton({ orgId, meId }: { orgId: string; meId?: string | null }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!meId) {
      setFollowing(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("organization_followers")
        .select("user_id")
        .eq("organization_id", orgId)
        .eq("user_id", meId)
        .maybeSingle();
      if (!cancelled) setFollowing(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, meId]);

  if (!meId) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    const { error } = next
      ? await supabase.from("organization_followers").insert({ organization_id: orgId, user_id: meId })
      : await supabase
          .from("organization_followers")
          .delete()
          .eq("organization_id", orgId)
          .eq("user_id", meId);
    if (error) {
      setFollowing(!next);
      toast.error("Could not update follow");
    }
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        following
          ? "border-[#d4580a] bg-[#d4580a] text-white"
          : "border-[#d4580a] bg-transparent text-[#d4580a] hover:bg-[#d4580a]/10"
      }`}
    >
      {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? "Following" : "Follow"}
    </button>
  );
}

function FestivalsPage() {
  const me = useCurrentProfile();
  const [q, setQ] = useState("");
  const [active, setActive] = useState<QuickFilter[]>([]);
  const [tab, setTab] = useState<TabKey>("discover");
  const [mapArea, setMapArea] = useState<string>("all");
  const [activePin, setActivePin] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [hoods, setHoods] = useState<{ name: string; latitude: number; longitude: number }[]>([]);

  const { data } = useCachedFetch<Row[]>("pb:festivals:v3", async () => {
    const { data } = await supabase
      .from("events")
      .select(
        "id,title,description,image_url,starts_at,ends_at,venue_name,address,neighborhood,category,price_cents,pricing_mode,latitude,longitude,organization_id,user_id",
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

  const all = useMemo(() => data ?? [], [data]);

  // Neighborhood coordinates let festivals without their own pin still map.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("neighborhoods")
        .select("name, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      setHoods((data as any[] | null)?.map((n) => ({ name: n.name, latitude: n.latitude, longitude: n.longitude })) ?? []);
    })();
  }, []);

  // Organizers behind the festivals currently listed.
  useEffect(() => {
    const ids = [...new Set(all.map((r) => r.organization_id).filter(Boolean))] as string[];
    if (ids.length === 0) {
      setOrgs([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id,name,slug,bio,avatar_url")
        .in("id", ids);
      setOrgs((data as Org[] | null) ?? []);
    })();
  }, [all]);

  // Which of these festivals the signed-in person saved.
  useEffect(() => {
    if (!me?.id) {
      setSavedIds([]);
      return;
    }
    (async () => {
      const { data } = await supabase.from("event_saves").select("event_id").eq("user_id", me.id);
      setSavedIds(((data as any[] | null) ?? []).map((r) => r.event_id as string));
    })();
  }, [me?.id, tab]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((r) => {
      if (
        term &&
        !`${r.title ?? ""} ${r.neighborhood ?? ""} ${r.venue_name ?? ""}`.toLowerCase().includes(term)
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

  const categoryCounts = useMemo(
    () =>
      CATEGORY_GROUPS.map((c) => {
        const matched = rows.filter((r) => c.match.test(haystack(r)));
        return {
          label: c.label,
          count: matched.length,
          image: matched.find((r) => r.image_url)?.image_url ?? null,
        };
      }),
    [rows],
  );

  const neighborhoodGroups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const n = placeOf(r);
      if (!n) continue;
      map.set(n, [...(map.get(n) ?? []), r]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [rows]);

  // Resolve a coordinate for every festival, falling back to its neighborhood.
  const located = useMemo(() => {
    const byName = new Map(hoods.map((h) => [h.name.toLowerCase(), h]));
    return rows
      .map((r) => {
        let lat = r.latitude;
        let lng = r.longitude;
        if ((lat == null || lng == null) && r.neighborhood) {
          const h = byName.get(r.neighborhood.trim().toLowerCase());
          if (h) {
            lat = h.latitude;
            lng = h.longitude;
          }
        }
        return lat != null && lng != null ? { row: r, lat, lng } : null;
      })
      .filter(Boolean) as { row: Row; lat: number; lng: number }[];
  }, [rows, hoods]);

  const mapAreas = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of located) {
      const n = placeOf(l.row);
      if (!n) continue;
      map.set(n, (map.get(n) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [located]);

  const mapItems = useMemo(
    () => (mapArea === "all" ? located : located.filter((l) => placeOf(l.row) === mapArea)),
    [located, mapArea],
  );

  const pins: FestivalPin[] = mapItems.map((l) => ({
    id: l.row.id,
    title: l.row.title,
    latitude: l.lat,
    longitude: l.lng,
  }));

  const calendar = useMemo(
    () => [...rows].sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? "")),
    [rows],
  );

  const orgCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) if (r.organization_id) counts.set(r.organization_id, (counts.get(r.organization_id) ?? 0) + 1);
    return orgs
      .map((o) => ({ ...o, count: counts.get(o.id) ?? 0 }))
      .filter((o) => o.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [orgs, rows]);

  const saved = rows.filter((r) => savedIds.includes(r.id));

  const toggle = (f: QuickFilter) =>
    setActive((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const directions = (r: Row) => {
    const dest = encodeURIComponent(r.address || r.venue_name || placeOf(r) || r.title);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, "_blank", "noopener");
  };

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

        <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  on ? "bg-[#d4580a] text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {all.length === 0 ? (
          <Empty text="No festivals listed yet. Create one and it will show up here." />
        ) : rows.length === 0 ? (
          <Empty text="No festivals match those filters." />
        ) : (
          <>
            {tab === "discover" && (
              <div className="space-y-6">
                {featured && (
                  <section className="space-y-3">
                    <h2 className="font-display text-lg font-extrabold text-foreground sm:text-xl">
                      Featured Festival
                    </h2>
                    <div
                      className="block overflow-hidden rounded-2xl border-2 bg-card transition hover:shadow-md"
                      style={{ borderColor: "#d4580a" }}
                    >
                      <div className="grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                        <Link to="/festivals/$eventId" params={{ eventId: featured.id }} className="block">
                          <Thumb
                            src={featured.image_url}
                            alt={featured.title}
                            className="h-56 w-full md:h-full"
                          />
                        </Link>
                        <div className="space-y-2 p-5">
                          <Link
                            to="/festivals/$eventId"
                            params={{ eventId: featured.id }}
                            className="block space-y-2"
                          >
                            <h3 className="font-display text-xl font-extrabold text-foreground sm:text-2xl">
                              {featured.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                              <span>{dateRangeLabel(featured)}</span>
                              {placeOf(featured) && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {placeOf(featured)}
                                </span>
                              )}
                            </div>
                            {featured.description && (
                              <p className="line-clamp-4 text-sm text-muted-foreground">
                                {featured.description.replace(/<[^>]+>/g, "")}
                              </p>
                            )}
                          </Link>
                          {tagsOf(featured).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {tagsOf(featured).map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Link
                              to="/festivals/$eventId"
                              params={{ eventId: featured.id }}
                              className="inline-block rounded-full bg-[#d4580a] px-4 py-2 text-xs font-semibold text-white"
                            >
                              Explore Festival
                            </Link>
                            <Link
                              to="/festivals/$eventId"
                              params={{ eventId: featured.id }}
                              hash="festival-schedule"
                              className="inline-block rounded-full border-2 px-4 py-2 text-xs font-semibold text-foreground"
                              style={{ borderColor: "#d4580a" }}
                            >
                              View Schedule
                            </Link>
                          </div>
                          <div className="pt-1">
                            <FestivalActions
                              row={featured}
                              meId={me?.id}
                              saved={savedIds.includes(featured.id)}
                              onSavedChange={(id, next) =>
                                setSavedIds((prev) =>
                                  next ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
                                )
                              }
                            />
                          </div>

                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <Section title="Happening Soon" rows={soon} />
                <Section title="This Weekend" rows={weekend} />
                <Section title="Free Festivals" rows={free} />
                <Section title="Upcoming Festivals" rows={rows} />
              </div>
            )}

            {tab === "calendar" && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="mb-3 font-display text-lg font-extrabold text-foreground">
                  Festival Calendar
                </h2>
                <div className="divide-y divide-border">
                  {calendar.map((r) => {
                    const d = r.starts_at ? new Date(r.starts_at) : null;
                    return (
                      <Link
                        key={r.id}
                        to="/festivals/$eventId"
                        params={{ eventId: r.id }}
                        className="flex items-center gap-4 py-3 transition hover:bg-muted/50"
                      >
                        <div className="w-14 shrink-0 rounded-lg border border-border bg-muted/60 py-1.5 text-center">
                          <div className="text-[10px] font-bold uppercase text-muted-foreground">
                            {d ? format(d, "MMM") : "TBD"}
                          </div>
                          <div className="text-lg font-extrabold leading-none text-foreground">
                            {d ? format(d, "d") : "–"}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-foreground">{r.title}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {placeOf(r) || "Baltimore"} · {priceLabel(r)}
                          </div>
                        </div>
                        {r.category && (
                          <span className="hidden rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground sm:inline">
                            {r.category}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {tab === "map" && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="inline-flex items-center gap-1.5 font-display text-lg font-extrabold text-foreground">
                    <MapPin className="h-4 w-4 text-[#d4580a]" />
                    Active Festivals Map
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {located.length} active · {mapAreas.length} neighborhoods
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMapArea("all")}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      mapArea === "all"
                        ? "border-[#d4580a] bg-[#d4580a] text-white"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    All ({located.length})
                  </button>
                  {mapAreas.map(([name, count]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setMapArea(name)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        mapArea === name
                          ? "border-[#d4580a] bg-[#d4580a] text-white"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {name} ({count})
                    </button>
                  ))}
                </div>
                {located.length === 0 ? (
                  <Empty text="No festivals have a location on the map yet." />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <FestivalMap pins={pins} activeId={activePin} onSelect={setActivePin} />
                    <div className="space-y-3">
                      {mapItems.map((l) => (
                        <div
                          key={l.row.id}
                          className={`flex items-center gap-3 rounded-xl border bg-card p-3 ${
                            activePin === l.row.id ? "border-[#d4580a]" : "border-border"
                          }`}
                        >
                          <Link to="/festivals/$eventId" params={{ eventId: l.row.id }}>
                            <Thumb
                              src={l.row.image_url}
                              alt={l.row.title}
                              className="h-14 w-14 rounded-lg"
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              to="/festivals/$eventId"
                              params={{ eventId: l.row.id }}
                              className="block truncate font-semibold text-foreground"
                            >
                              {l.row.title}
                            </Link>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {placeOf(l.row)} · {dateRangeLabel(l.row)}
                            </div>
                            <div className="text-xs text-muted-foreground">{priceLabel(l.row)}</div>
                          </div>
                          <button
                            type="button"
                            aria-label={`Directions to ${l.row.title}`}
                            onClick={() => directions(l.row)}
                            className="rounded-full p-2 text-muted-foreground hover:text-[#d4580a]"
                          >
                            <Navigation className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {tab === "categories" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {categoryCounts.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => {
                      setQ(c.label);
                      setTab("discover");
                    }}
                    className="overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-[#d4580a]"
                  >
                    <Thumb src={c.image} alt={c.label} className="h-32 w-full" />
                    <div className="p-3">
                      <div className="font-semibold text-foreground">{c.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.count} upcoming {c.count === 1 ? "festival" : "festivals"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {tab === "neighborhoods" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {neighborhoodGroups.map(([name, list]) => (
                  <div key={name} className="overflow-hidden rounded-xl border border-border bg-card">
                    <Thumb
                      src={list.find((r) => r.image_url)?.image_url ?? null}
                      alt={name}
                      className="h-28 w-full"
                    />
                    <div className="space-y-1 p-3">
                      <div className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <MapPin className="h-4 w-4 text-[#d4580a]" />
                        {name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {list.length} upcoming {list.length === 1 ? "festival" : "festivals"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Next: {list[0]!.title} · {dateRangeLabel(list[0]!)}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setQ(name);
                          setTab("discover");
                        }}
                        className="pt-1 text-xs font-semibold text-[#d4580a]"
                      >
                        View Festivals →
                      </button>
                    </div>
                  </div>
                ))}
                {neighborhoodGroups.length === 0 && (
                  <Empty text="No festival neighborhoods yet." />
                )}
              </div>
            )}

            {tab === "organizers" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {orgCounts.map((o) => (
                  <div key={o.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      {o.avatar_url ? (
                        <Img
                          src={o.avatar_url}
                          alt={o.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-bold text-muted-foreground">
                          {o.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-foreground">{o.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.count} {o.count === 1 ? "festival" : "festivals"}
                        </div>
                      </div>
                    </div>
                    {o.bio && <p className="line-clamp-2 text-xs text-muted-foreground">{o.bio}</p>}
                    <div className="flex flex-wrap items-center gap-3">
                      <OrgFollowButton orgId={o.id} meId={me?.id} />
                      <Link
                        to="/o/$slug"
                        params={{ slug: o.slug }}
                        className="text-xs font-semibold text-[#d4580a]"
                      >
                        View Organization →
                      </Link>
                    </div>
                  </div>
                ))}
                {orgCounts.length === 0 && (
                  <Empty text="No festival organizers to show yet." />
                )}
              </div>
            )}

            {tab === "saved" && (
              <>
                {!me?.id ? (
                  <Empty text="Sign in to save festivals and see them here." />
                ) : saved.length === 0 ? (
                  <Empty text="You have not saved any festivals yet." />
                ) : (
                  <Section title="Saved Festivals" rows={saved} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
