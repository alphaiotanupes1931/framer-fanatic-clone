import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventImage } from "@/components/event-image";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search as SearchIcon, MapPin, Calendar, FileText, BookOpen } from "lucide-react";
import { EmptyState, ListSkeleton } from "@/components/shared/empty-state";
import { Img, SmartAvatarImage } from "@/components/shared/smart-img";
import { OrgLink } from "@/components/org/org-link";
import { mergeSearchPages, pageTypeLabel, type SearchPageResult } from "@/lib/search-pages";
import { titleCase } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" && search.q ? { q: search.q } : {},
  head: () => ({ meta: [
    { title: "Search People and Pages | Planet Baltimore" },
    { name: "description", content: "Find people, artist pages, businesses, communities, events and more on Planet Baltimore." },
    { property: "og:title", content: "Search People and Pages | Planet Baltimore" },
    { property: "og:description", content: "Discover Baltimore people and all their public pages, plus events, stories and shop items." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

type Person = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood: string | null; role: string | null };
type Org = SearchPageResult & { owner_name?: string };
type Ev = { id: string; title: string; starts_at: string; venue_name: string | null; image_url: string | null };
type Business = Org;
type PostRow = { id: string; content: string; created_at: string; media_urls: string[] | null; image_url?: string | null; video_url?: string | null; link_title?: string | null; link_image?: string | null; repost_of_event_id?: string | null; repost_of_post_id?: string | null; preview_text?: string | null; preview_image?: string | null; preview_video?: string | null };
type StoryRow = { id: string; title: string; excerpt: string | null; cover_url: string | null; created_at: string };
type Hood = { id: string; name: string; region: string };
type Festiv = { id: string; title: string; category: string | null; starts_at: string; venue_name: string | null; image_url: string | null };
type Product = { id: string; name: string; description: string | null; price_cents: number | null; image_url: string | null; organizations: { name: string; slug: string; type: string; avatar_url: string | null } | null };

const TABS = ["All", "People", "Artists", "Organizations", "Events", "Festivals", "Businesses", "Shop items", "Posts", "Stories", "Neighborhoods"] as const;
const PAGE_FIELDS = "id,name,slug,type,avatar_url,neighborhood,owner_id,is_public,hidden_from_showcase";
type Tab = (typeof TABS)[number];

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function SearchPage() {
  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ ?? "");
  const [debounced, setDebounced] = useState((initialQ ?? "").trim());
  const [tab, setTab] = useState<Tab>("All");
  const [people, setPeople] = useState<Person[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [fests, setFests] = useState<Festiv[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [hoods, setHoods] = useState<Hood[]>([]);
  const [loading, setLoading] = useState(false);

  // Keep the field in sync when the header bar navigates here with a new query.
  useEffect(() => { setQ(initialQ ?? ""); }, [initialQ]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const hasQ = debounced.length > 0;
      const like = `%${debounced}%`;
      const eventCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const [pplRes, orgRes, evRes, bizRes, postRes, storyRes, hoodRes, festRes, prodRes] = await Promise.all([
        hasQ
          ? supabase.rpc("search_creators", { q: debounced.replace(/^@/, ""), lim: 100 })
          : supabase.from("profiles").select("id,display_name,username,avatar_url,neighborhood,role").order("created_at", { ascending: false }).limit(24),
        hasQ
          ? supabase.from("organizations").select(PAGE_FIELDS).eq("is_public", true).eq("hidden_from_showcase", false).ilike("name", like).limit(100)
          : supabase.from("organizations").select(PAGE_FIELDS).eq("is_public", true).eq("hidden_from_showcase", false).order("created_at", { ascending: false }).limit(24),
        // Keyword searches return past events too (people look up events they
        // attended). The default browse list only shows events that have not
        // finished: multi-day events stay until ends_at, single ones for 12
        // hours after they start.
        hasQ
          ? supabase.from("events").select("id,title,starts_at,venue_name,image_url").eq("is_private_org", false).ilike("title", like).order("starts_at", { ascending: false }).limit(24)
          : supabase.from("events").select("id,title,starts_at,venue_name,image_url").eq("is_private_org", false).or(`ends_at.gte.${eventCutoff},and(ends_at.is.null,starts_at.gte.${eventCutoff})`).order("starts_at", { ascending: true }).limit(24),
        hasQ
          ? supabase.from("organizations").select(PAGE_FIELDS).eq("is_public", true).eq("hidden_from_showcase", false).in("type", ["business", "arts_org"]).ilike("name", like).limit(100)
          : supabase.from("organizations").select(PAGE_FIELDS).eq("is_public", true).eq("hidden_from_showcase", false).in("type", ["business", "arts_org"]).order("created_at", { ascending: false }).limit(24),
        hasQ
          ? supabase.from("posts").select("id,content,created_at,media_urls,image_url,video_url,link_title,link_image,repost_of_event_id,repost_of_post_id").eq("is_deleted", false).eq("visibility", "public").ilike("content", like).order("created_at", { ascending: false }).limit(24)
          : supabase.from("posts").select("id,content,created_at,media_urls,image_url,video_url,link_title,link_image,repost_of_event_id,repost_of_post_id").eq("is_deleted", false).eq("visibility", "public").order("created_at", { ascending: false }).limit(12),
        hasQ
          ? supabase.from("stories").select("id,title,excerpt,cover_url,created_at").eq("status", "published").ilike("title", like).order("created_at", { ascending: false }).limit(24)
          : supabase.from("stories").select("id,title,excerpt,cover_url,created_at").eq("status", "published").order("created_at", { ascending: false }).limit(12),
        hasQ
          ? supabase.from("neighborhoods").select("id,name,region").ilike("name", like).order("name").limit(24)
          : supabase.from("neighborhoods").select("id,name,region").order("name").limit(12),
        // Festivals are events whose category or title reads as a festival.
        hasQ
          ? supabase.from("events").select("id,title,category,starts_at,venue_name,image_url").eq("is_private_org", false).or(`title.ilike.${like},category.ilike.${like},description.ilike.${like}`).order("starts_at", { ascending: false }).limit(100)
          : supabase.from("events").select("id,title,category,starts_at,venue_name,image_url").eq("is_private_org", false).or(`ends_at.gte.${eventCutoff},and(ends_at.is.null,starts_at.gte.${eventCutoff})`).order("starts_at", { ascending: true }).limit(100),
        // Shop items are active products on visible pages; RLS hides the rest.
        hasQ
          ? supabase.from("organization_products").select("id,name,description,price_cents,image_url,organizations:org_id(name,slug,type,avatar_url)").eq("is_active", true).or(`name.ilike.${like},description.ilike.${like}`).order("created_at", { ascending: false }).limit(24)
          : supabase.from("organization_products").select("id,name,description,price_cents,image_url,organizations:org_id(name,slug,type,avatar_url)").eq("is_active", true).order("created_at", { ascending: false }).limit(12),
      ]);
      if (cancelled) return;
      const matchedPeople = (pplRes.data ?? []) as Person[];
      const ownedPages: SearchPageResult[] = [];
      if (hasQ && matchedPeople.length) {
        for (let offset = 0; ; offset += 1000) {
          const result = await supabase.from("organizations").select(PAGE_FIELDS)
            .eq("is_public", true).eq("hidden_from_showcase", false)
            .in("owner_id", matchedPeople.map((p) => p.id)).order("id").range(offset, offset + 999);
          if (cancelled) return;
          const batch = result.data ?? [];
          ownedPages.push(...batch);
          if (batch.length < 1000) break;
        }
      }
      const allPages = mergeSearchPages([...(orgRes.data ?? []), ...(bizRes.data ?? [])], ownedPages)
        .map((page) => ({ ...page, owner_name: matchedPeople.find((p) => p.id === page.owner_id)?.display_name ?? undefined }));
      setPeople(matchedPeople);
      setOrgs(allPages.filter((page) => !["business", "arts_org"].includes(page.type)));
      setEvents((evRes.data ?? []) as Ev[]);
      setBusinesses(allPages.filter((page) => ["business", "arts_org"].includes(page.type)));
      const rawPosts = (postRes.data ?? []) as PostRow[];
      const evIds = rawPosts.map((p) => p.repost_of_event_id).filter(Boolean) as string[];
      const rpIds = rawPosts.map((p) => p.repost_of_post_id).filter(Boolean) as string[];
      const [evMap, rpMap] = await Promise.all([
        evIds.length ? supabase.from("events").select("id,title,image_url").in("id", evIds).then((r) => new Map((r.data ?? []).map((e) => [e.id, e]))) : new Map(),
        rpIds.length ? supabase.from("posts").select("id,content,media_urls,image_url,video_url").in("id", rpIds).then((r) => new Map((r.data ?? []).map((e) => [e.id, e]))) : new Map(),
      ]);
      if (cancelled) return;
      const isVideo = (u?: string | null) => !!u && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);
      setPosts(rawPosts.map((p) => {
        const ev = p.repost_of_event_id ? evMap.get(p.repost_of_event_id) : null;
        const rp = p.repost_of_post_id ? rpMap.get(p.repost_of_post_id) : null;
        const media = [...(p.media_urls ?? []), p.image_url, p.link_image, ...((rp?.media_urls as string[] | undefined) ?? []), rp?.image_url, ev?.image_url].filter(Boolean) as string[];
        const img = media.find((u) => !isVideo(u)) ?? null;
        const vid = img ? null : (media.find(isVideo) ?? p.video_url ?? rp?.video_url ?? null);
        const own = stripHtml(p.content ?? "").trim();
        const text = own || p.link_title || (ev ? `Shared event: ${ev.title}` : "") || stripHtml(rp?.content ?? "").trim() || (vid ? "Video post" : "Post");
        return { ...p, preview_text: text, preview_image: img, preview_video: vid };
      }));
      setStories((storyRes.data ?? []) as StoryRow[]);
      setHoods((hoodRes.data ?? []) as Hood[]);
      setFests(((festRes.data ?? []) as Festiv[]).filter((f) => /festival/i.test(f.category ?? "") || /festival|fest\b|block party|street fair|celebration/i.test(f.title)).slice(0, 24));
      setProds((prodRes.data ?? []) as Product[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debounced]);

  const totals = useMemo(() => ({
    People: people.length, Artists: orgs.filter((o) => o.type === "artist").length, Organizations: orgs.filter((o) => o.type !== "artist").length, Events: events.length, Businesses: businesses.length,
    Posts: posts.length, Stories: stories.length, Neighborhoods: hoods.length, Festivals: fests.length, "Shop items": prods.length,
    All: people.length + orgs.length + events.length + businesses.length + posts.length + stories.length + hoods.length + fests.length + prods.length,
  }), [people, orgs, events, businesses, posts, stories, hoods, fests, prods]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <HeroBanner title="Search" subtitle="Find posts, stories, events, festivals, shop items, creators, neighborhoods, businesses and organizations across Baltimore." />

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Baltimore..."
            className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-orange focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                tab === t ? "border-orange bg-orange text-white" : "border-border bg-card text-foreground hover:bg-hover"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <ListSkeleton count={4} />
        ) : totals.All === 0 ? (
          <EmptyState icon={SearchIcon} title={debounced ? `No results for "${debounced}"` : "Nothing here yet"} description="Try another spelling or a different filter." />
        ) : (
          <div className="space-y-8">
            {(tab === "All" || tab === "People") && people.length > 0 && (
              <Section title="People">
                <div className="grid gap-3 sm:grid-cols-2">
                  {people.slice(0, debounced ? people.length : tab === "All" ? 6 : 24).map((p) => (
                    <Link key={p.id} to="/$username" params={{ username: p.username || p.id }} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 hover:bg-hover">
                      <Avatar className="h-11 w-11 shrink-0">
                        {p.avatar_url && <SmartAvatarImage src={p.avatar_url} />}
                        <AvatarFallback>{(p.display_name || p.username || "U").slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{titleCase(p.display_name || p.username)}</div>
                        <div className="text-xs text-muted-foreground">Main profile{p.role ? ` · ${titleCase(p.role)}` : ""}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {p.username && <span className="truncate">@{p.username}</span>}
                          {p.neighborhood && <span className="inline-flex items-center gap-0.5 whitespace-nowrap"><MapPin className="h-3 w-3" /> {p.neighborhood}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {(["Artists", "Organizations"] as const).map((category) => {
              const pages = orgs.filter((o) => category === "Artists" ? o.type === "artist" : o.type !== "artist");
              return (tab === "All" || tab === category) && pages.length > 0 && (
              <Section key={category} title={category}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {pages.slice(0, debounced ? pages.length : tab === "All" ? 6 : 24).map((o) => (
                    <OrgLink key={o.id} type={o.type} slug={o.slug} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-hover">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {o.avatar_url && <Img src={o.avatar_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{o.name}</div>
                        <div className="text-xs text-muted-foreground">{pageTypeLabel(o.type)}{o.neighborhood ? ` · ${o.neighborhood}` : ""}</div>
                        {o.owner_name && <div className="text-xs text-muted-foreground">By {titleCase(o.owner_name)}</div>}
                      </div>
                    </OrgLink>
                  ))}
                </div>
              </Section>
              );
            })}

            {(tab === "All" || tab === "Events") && events.length > 0 && (
              <Section title="Events">
                <div className="grid gap-3 sm:grid-cols-2">
                  {events.slice(0, tab === "All" ? 6 : 24).map((e) => (
                    <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }} className="overflow-hidden rounded-xl border border-border bg-card hover:bg-hover">
                      {e.image_url && <EventImage src={e.image_url} alt="" className="h-32 w-full object-cover" />}
                      <div className="p-3">
                        <div className="text-sm font-semibold text-foreground line-clamp-1">{e.title}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" /> {new Date(e.starts_at).toLocaleDateString()}
                          {e.venue_name && <span className="truncate">· {e.venue_name}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {(tab === "All" || tab === "Festivals") && fests.length > 0 && (
              <Section title="Festivals">
                <div className="grid gap-3 sm:grid-cols-2">
                  {fests.slice(0, tab === "All" ? 6 : 24).map((f) => (
                    <Link key={f.id} to="/festivals/$eventId" params={{ eventId: f.id }} className="overflow-hidden rounded-xl border border-border bg-card hover:bg-hover">
                      {f.image_url && <EventImage src={f.image_url} alt="" className="h-32 w-full object-cover" />}
                      <div className="p-3">
                        <div className="text-sm font-semibold text-foreground line-clamp-1">{f.title}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" /> {new Date(f.starts_at).toLocaleDateString()}
                          {f.venue_name && <span className="truncate">· {f.venue_name}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {(tab === "All" || tab === "Businesses") && businesses.length > 0 && (
              <Section title="Businesses">
                <div className="grid gap-3 sm:grid-cols-2">
                  {businesses.slice(0, debounced ? businesses.length : tab === "All" ? 6 : 24).map((b) => (
                    <OrgLink key={b.id} type={b.type} slug={b.slug} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-hover">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {b.avatar_url && <Img src={b.avatar_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{b.name}</div>
                        <div className="text-xs text-muted-foreground">{pageTypeLabel(b.type)}{b.neighborhood ? ` · ${b.neighborhood}` : ""}</div>
                        {b.owner_name && <div className="text-xs text-muted-foreground">By {titleCase(b.owner_name)}</div>}
                      </div>
                    </OrgLink>
                  ))}
                </div>
              </Section>
            )}

            {(tab === "All" || tab === "Shop items") && prods.length > 0 && (
              <Section title="Shop items">
                <div className="grid gap-3 sm:grid-cols-2">
                  {prods.slice(0, tab === "All" ? 6 : 24).map((p) => (
                    <OrgLink key={p.id} type={p.organizations?.type ?? "business"} slug={p.organizations?.slug ?? ""} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 hover:bg-hover">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {p.image_url && <Img src={p.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{p.name}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {p.price_cents != null ? `$${(p.price_cents / 100).toFixed(2)}` : "Item"}{p.organizations?.name ? ` · ${p.organizations.name}` : ""}
                        </div>
                      </div>
                    </OrgLink>
                  ))}
                </div>
              </Section>
            )}

            {(tab === "All" || tab === "Posts") && posts.length > 0 && (
              <Section title="Posts">
                <div className="grid gap-3 sm:grid-cols-2">
                  {posts.slice(0, tab === "All" ? 6 : 24).map((p) => (
                    <Link key={p.id} to="/posts/$postId" params={{ postId: p.id }} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 hover:bg-hover">
                      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                        {p.preview_image
                          ? <Img src={p.preview_image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                          : p.preview_video
                            ? <video src={`${p.preview_video.split("#")[0]}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                            : <FileText className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-medium text-foreground">{p.preview_text}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {(tab === "All" || tab === "Stories") && stories.length > 0 && (
              <Section title="Stories">
                <div className="grid gap-3 sm:grid-cols-2">
                  {stories.slice(0, tab === "All" ? 6 : 24).map((s) => (
                    <Link key={s.id} to="/stories/$storyId" params={{ storyId: s.id }} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 hover:bg-hover">
                      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                        {s.cover_url
                          ? <Img src={s.cover_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                          : <BookOpen className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{s.title}</div>
                        {s.excerpt && <div className="line-clamp-2 text-xs text-muted-foreground">{stripHtml(s.excerpt)}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {(tab === "All" || tab === "Neighborhoods") && hoods.length > 0 && (
              <Section title="Neighborhoods">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {hoods.slice(0, tab === "All" ? 6 : 24).map((n) => (
                    <Link key={n.id} to="/neighborhoods" search={{ n: n.name }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-hover">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted"><MapPin className="h-4 w-4 text-muted-foreground" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{n.name}</div>
                        <div className="text-xs text-muted-foreground">{n.region}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}