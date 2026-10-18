import { supabase } from "@/integrations/supabase/client";

export type FollowedPage = {
  id: string;
  name: string;
  slug: string;
  type: string;
  avatar_url: string | null;
  allowDms: boolean;
};

export const PAGE_TYPE_LABEL: Record<string, string> = {
  artist: "Artist",
  arts_org: "Arts Org",
  business: "Business",
  community_assoc: "Community Association",
  group: "Group",
};

/** Pages a person follows: explicit page follows plus approved memberships, deduplicated by page. */
export async function getFollowedPages(userId: string): Promise<FollowedPage[]> {
  const [fol, mem] = await Promise.all([
    supabase.from("organization_followers").select("organization_id, allow_dms").eq("user_id", userId),
    supabase.from("organization_members").select("organization_id, allow_dms").eq("user_id", userId).eq("status", "approved"),
  ]);
  const dm = new Map<string, boolean>();
  for (const r of [...((fol.data ?? []) as { organization_id: string; allow_dms: boolean | null }[]), ...((mem.data ?? []) as { organization_id: string; allow_dms: boolean | null }[])]) {
    dm.set(r.organization_id, (dm.get(r.organization_id) ?? false) || r.allow_dms !== false);
  }
  const ids = Array.from(dm.keys());
  if (!ids.length) return [];
  const { data } = await supabase.from("organizations").select("id, name, slug, type, logo_url").in("id", ids);
  return ((data ?? []) as { id: string; name: string; slug: string; type: string; logo_url: string | null }[])
    .filter((o) => o.type in PAGE_TYPE_LABEL)
    .map((o) => ({ id: o.id, name: o.name, slug: o.slug, type: o.type, avatar_url: o.logo_url, allowDms: dm.get(o.id) ?? true }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
