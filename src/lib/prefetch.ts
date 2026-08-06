import { supabase } from "@/integrations/supabase/client";
import { ensureHydrated, hasCache, writeCache } from "@/hooks/use-cached-fetch";

/**
 * Hover prefetching.
 *
 * TanStack Router already preloads a route's JS on intent. This adds the other
 * half: warming the page's data cache with the same key the page reads on
 * mount, so by the time the click lands the list is already there.
 */

type Prefetcher = { key: string; run: () => Promise<unknown> };

const inFlight = new Map<string, Promise<unknown>>();
// A warmed key is not re-warmed for this long (the page revalidates anyway).
const FRESH_MS = 60_000;
const warmedAt = new Map<string, number>();

const registry: Record<string, Prefetcher> = {
  "/discover": {
    key: "discover:all",
    run: async () => {
      const nowIso = new Date().toISOString();
      const [evUp, evPast, ar, gr, bu, ne, st] = await Promise.all([
        supabase.from("events").select("id,title,description,image_url,starts_at,location,venue_name").gte("starts_at", nowIso).order("starts_at", { ascending: true }).limit(40),
        supabase.from("events").select("id,title,description,image_url,starts_at,location,venue_name").lt("starts_at", nowIso).order("starts_at", { ascending: false }).limit(20),
        supabase.rpc("public_creators", { lim: 60 }),
        supabase.from("organizations").select("id,name,slug,type,avatar_url,neighborhood").eq("type", "group").limit(40),
        supabase.from("organizations").select("id,name,slug,type,avatar_url,neighborhood").eq("type", "business").limit(40),
        supabase.from("neighborhoods").select("id,name,region").order("name").limit(80),
        supabase.from("stories").select("id,title,excerpt,cover_url,created_at,user_id,read_minutes,format").eq("status", "published").order("created_at", { ascending: false }).limit(40),
      ]);
      return {
        events: [...(evUp.data ?? []), ...(evPast.data ?? [])],
        artists: ar.data ?? [],
        groups: gr.data ?? [],
        businesses: bu.data ?? [],
        neighborhoods: ne.data ?? [],
        stories: st.data ?? [],
      };
    },
  },
  "/artists": {
    key: "artists:newest:",
    run: async () => {
      const { data } = await supabase.rpc("public_artists", { lim: 96, search: undefined, sort_by: "newest" });
      return data ?? [];
    },
  },
  "/videos": {
    key: "videos:list",
    run: async () => {
      const { data } = await supabase.from("videos").select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  },
  "/podcasts": {
    key: "podcasts:list",
    run: async () => {
      const { data } = await (supabase as any)
        .from("profiles_public")
        .select("id, display_name, username, avatar_url, neighborhood, bio, category")
        .ilike("category", "%podcast%")
        .order("created_at", { ascending: false })
        .limit(48);
      return data ?? [];
    },
  },
  "/community-associations": {
    key: "orgs:community_assoc",
    run: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("type", "community_assoc")
        .order("name", { ascending: true });
      return data ?? [];
    },
  },
  "/businesses": {
    key: "orglist:business",
    run: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("type", "business")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  },
  "/arts-orgs": {
    key: "orglist:arts_org",
    run: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("type", "arts_org")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  },
  "/_community-associations-legacy": {
    key: "orgs:community_assoc",
    run: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("type", "community_assoc")
        .order("name", { ascending: true });
      return data ?? [];
    },
  },
  "/groups": {
    key: "orgs:group:newest",
    run: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("type", "group")
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as { avatar_url: string | null; banner_url: string | null }[];
      rows.sort((a, b) => {
        const aHas = a.avatar_url || a.banner_url ? 1 : 0;
        const bHas = b.avatar_url || b.banner_url ? 1 : 0;
        return bHas - aHas;
      });
      return rows;
    },
  },
  "/stories": {
    key: "stories:Discover:newest:All:All Formats:",
    run: async () => {
      const { data } = await supabase
        .from("stories")
        .select("*")
        .order("created_at", { ascending: false })
        .range(0, 11);
      const list = (data ?? []) as { user_id: string; author?: unknown }[];
      const ids = Array.from(new Set(list.map((s) => s.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
        const byId = new Map(((profs as any[]) || []).map((p) => [p.id, p]));
        list.forEach((s) => { s.author = byId.get(s.user_id); });
      }
      return list;
    },
  },
  "/events": {
    key: "events:upcoming",
    run: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(24);
      return data ?? [];
    },
  },
  "/marketplace": {
    key: "marketplace:active",
    run: async () => {
      const { data } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(120);
      return data ?? [];
    },
  },
  "/neighborhoods": {
    key: "neighborhoods:list",
    run: async () => {
      const { data } = await supabase.from("neighborhoods").select("id, name, region").order("name");
      return data ?? [];
    },
  },
};

export function prefetchPath(path: string) {
  if (typeof window === "undefined") return;
  const entry = registry[path];
  if (!entry) return;
  ensureHydrated();
  const last = warmedAt.get(entry.key) ?? 0;
  if (Date.now() - last < FRESH_MS) return;
  if (inFlight.has(entry.key)) return;
  // Already-cached pages paint instantly anyway; still warm once per minute so
  // the data behind them is fresh by the time the user clicks.
  void hasCache(entry.key);
  const p = entry
    .run()
    .then((result) => {
      writeCache(entry.key, result);
      warmedAt.set(entry.key, Date.now());
    })
    .catch(() => {
      // A failed warm-up is invisible: the page fetches normally on mount.
    })
    .finally(() => {
      inFlight.delete(entry.key);
    });
  inFlight.set(entry.key, p);
}

/** Spread onto a <Link> to warm its data on hover, focus, or touch. */
export function prefetchHandlers(path: string) {
  const go = () => prefetchPath(path);
  return { onMouseEnter: go, onFocus: go, onTouchStart: go };
}