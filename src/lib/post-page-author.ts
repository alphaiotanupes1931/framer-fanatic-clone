import { supabase } from "@/integrations/supabase/client";

export type PageAuthor = { id: string; name: string; slug: string; type: string; avatar_url: string | null; neighborhood: string | null };

/** Posts made from a page show that page as the author, not the creator's personal profile. */
export async function loadPageAuthors(ids: (string | null | undefined)[]): Promise<Map<string, PageAuthor>> {
  const unique = [...new Set(ids.filter(Boolean))] as string[];
  if (!unique.length) return new Map();
  const { data } = await supabase.from("organizations").select("id, name, slug, type, avatar_url, neighborhood").in("id", unique);
  return new Map(((data ?? []) as PageAuthor[]).map((o) => [o.id, o]));
}
