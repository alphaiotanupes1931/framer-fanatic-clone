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
      .select("id, user_id, content, image_url, likes_count, comments_count, neighborhood, is_deleted, created_at")
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

export const Story = {
  async filter(where: Record<string, unknown>, order?: string, limit = 15) {
    const { column, ascending } = parseOrder(order);
    let q = supabase.from("stories").select("id, user_id, title, excerpt, cover_url, likes_count, comments_count, status, created_at");
    for (const [k, v] of Object.entries(where)) q = q.eq(k, v as never);
    const { data, error } = await q.order(column, { ascending }).limit(limit);
    if (error) throw error;
    return attachAuthors(data ?? []);
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