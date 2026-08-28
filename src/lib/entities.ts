import { supabase } from "@/integrations/supabase/client";

// Repo compatibility adapter. Maps the base44 entity shape used across
// planet-baltimore ports to this project's Supabase tables/columns.
//
// Repo column names on the LEFT (what ported code expects), Supabase on RIGHT:
//   created_date       -> created_at
//   author_id          -> user_id
//   author_name        -> profile.display_name (joined via public_profiles_by_ids)
//   author_avatar      -> profile.avatar_url
//   organizer_id       -> user_id (events)
//   organizer_name     -> profile.display_name (events)
//   neighborhood_name  -> neighborhood
//   target_id          -> following_id (follows)
//   target_name        -> profile.display_name of following_id
//   is_deleted (posts) -> real column added in phase 0 migration
//   status (stories/events) -> real columns added in phase 0
//   published_at       -> created_at (approx)

type ProfileLite = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  neighborhood: string | null;
  is_founder?: boolean;
};

async function attachAuthors<T extends { user_id?: string | null }>(
  rows: T[],
  key: "author" | "organizer" = "author",
): Promise<(T & Record<string, unknown>)[]> {
  const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
  if (!ids.length) return rows as (T & Record<string, unknown>)[];
  const { data } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
  const byId = new Map<string, ProfileLite>((data ?? []).map((p: ProfileLite) => [p.id, p]));
  return rows.map((r) => {
    const p = r.user_id ? byId.get(r.user_id) : undefined;
    if (key === "organizer") {
      return {
        ...r,
        organizer_id: r.user_id,
        organizer_name: p?.display_name ?? p?.username ?? "Someone",
        organizer_avatar: p?.avatar_url ?? null,
        neighborhood_name: (r as unknown as { neighborhood?: string | null }).neighborhood ?? null,
      };
    }
    return {
      ...r,
      author_id: r.user_id,
      author_name: p?.display_name ?? p?.username ?? "Someone",
      author_avatar: p?.avatar_url ?? null,
      author_username: p?.username ?? null,
      neighborhood_name: (r as unknown as { neighborhood?: string | null }).neighborhood ?? null,
      is_founder: !!p?.is_founder,
    };
  });
}

function parseOrder(order?: string): { column: string; ascending: boolean } {
  if (!order) return { column: "created_at", ascending: false };
  const ascending = !order.startsWith("-");
  const raw = ascending ? order : order.slice(1);
  // Rename repo fields to Supabase columns
  const column =
    raw === "created_date" ? "created_at" :
    raw === "published_at" ? "created_at" :
    raw === "date" ? "starts_at" :
    raw;
  return { column, ascending };
}

export const Post = {
  async list(order?: string, limit = 50) {
    const { column, ascending } = parseOrder(order);
    const { data, error } = await supabase
      .from("posts")
      .select("id, user_id, content, image_url, video_url, media_urls, music_url, post_type, bg_color, text_color, font_size, link_url, link_title, link_description, likes_count, comments_count, neighborhood, is_deleted, featured, featured_at, created_at")
      .eq("is_deleted", false)
      .order(column, { ascending })
      .limit(limit);
    if (error) throw error;
    return attachAuthors(data ?? []);
  },
  async delete(id: string) {
    // Soft delete
    const { error } = await supabase.from("posts").update({ is_deleted: true }).eq("id", id);
    if (error) throw error;
  },
  async create(input: { content: string; image_url?: string | null; neighborhood?: string | null }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { error, data } = await supabase.from("posts").insert({
      user_id: user.id,
      content: input.content,
      image_url: input.image_url ?? null,
      neighborhood: input.neighborhood ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  },
};

// Posts made from a page (artist, business, arts org, group). These live in
// organization_posts, so the home feed has to read them separately or page
// posts never reach "On Planet".
export const OrgPost = {
  async recent(limit = 30) {
    const { data, error } = await supabase
      .from("organization_posts")
      .select("id, org_id, title, body, media_url, media_urls, video_url, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const rows = data ?? [];
    const orgIds = Array.from(new Set(rows.map((r) => r.org_id)));
    if (!orgIds.length) return [];
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, slug, avatar_url")
      .in("id", orgIds);
    const byId = new Map((orgs ?? []).map((o) => [o.id, o]));
    return rows
      .map((r) => {
        const o = byId.get(r.org_id);
        if (!o?.slug) return null;
        return {
          ...r,
          org_name: o.name ?? "Page",
          org_slug: o.slug,
          org_avatar: o.avatar_url ?? null,
        };
      })
      .filter(Boolean) as Array<
        (typeof rows)[number] & { org_name: string; org_slug: string; org_avatar: string | null }
      >;
  },
};



export const Story = {
  async filter(where: Record<string, unknown>, order?: string, limit = 15) {
    const { column, ascending } = parseOrder(order);
    let q = supabase.from("stories").select("id, user_id, title, excerpt, cover_url, likes_count, comments_count, status, featured, featured_at, created_at");
    for (const [k, v] of Object.entries(where)) q = q.eq(k, v as never);
    const { data, error } = await q
      .order(column, { ascending })
      .limit(limit);
    if (error) throw error;
    return attachAuthors(data ?? []);
  },
  // Ranked by real engagement (likes + comments) with a recency boost so the
  // list moves as people interact.
  async trending(limit = 5) {
    const { data, error } = await supabase
      .from("stories")
      .select("id, user_id, title, excerpt, cover_url, likes_count, comments_count, status, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    const now = Date.now();
    const scored = (data ?? []).map((s) => {
      const likes = s.likes_count ?? 0;
      const comments = s.comments_count ?? 0;
      const ageDays = Math.max(0, (now - new Date(s.created_at).getTime()) / 86400000);
      const recency = 1 / Math.pow(ageDays + 2, 0.4);
      const engagement = likes + comments * 3;
      return { ...s, trend_score: (engagement + 1) * recency };
    });
    scored.sort((a, b) => b.trend_score - a.trend_score);
    return attachAuthors(scored.slice(0, limit));
  },
};

export const Event = {
  async filter(where: Record<string, unknown>, order?: string, limit = 15) {
    const { column, ascending } = parseOrder(order);
    let q = supabase.from("events")
      .select("id, user_id, title, description, image_url, starts_at, venue_name, neighborhood, is_published, status, created_at")
      .eq("is_published", true);
    for (const [k, v] of Object.entries(where)) q = q.eq(k, v as never);
    const { data, error } = await q.order(column, { ascending }).limit(limit);
    if (error) throw error;
    // Add `date` alias for repo templates
    const rows = (data ?? []).map((r) => ({ ...r, date: r.starts_at }));
    return attachAuthors(rows, "organizer");
  },
  // Only events that have not started yet, soonest first.
  async upcoming(limit = 5) {
    const { data, error } = await supabase
      .from("events")
      .select("id, user_id, title, image_url, starts_at, venue_name, neighborhood, is_published, status, created_at")
      .eq("is_published", true)
      .neq("status", "cancelled")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    const rows = (data ?? []).map((r) => ({ ...r, date: r.starts_at }));
    return attachAuthors(rows, "organizer");
  },
};

export const Follow = {
  async listMine(userId: string) {
    const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
    return (data ?? []).map((r) => ({ target_id: r.following_id }));
  },
};

export const EphemeralStory = {
  async list(limit = 100) {
    const { data, error } = await supabase
      .from("ephemeral_stories")
      .select("id, user_id, media_url, media_type, caption, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return attachAuthors(data ?? []);
  },
  async create(input: { media_url: string; media_type?: string; caption?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { data, error } = await supabase.from("ephemeral_stories").insert({
      user_id: user.id,
      media_url: input.media_url,
      media_type: input.media_type ?? "image",
      caption: input.caption ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  },
};