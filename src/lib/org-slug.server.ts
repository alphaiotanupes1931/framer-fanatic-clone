import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Only returns the existing public address/type, never private page content. */
export async function resolvePageSlug(input: string): Promise<{ slug: string | null; type: string | null }> {
  const signal = AbortSignal.timeout(4_000);
  const missing = { slug: null, type: null };
  try {
    const slug = input.toLowerCase();
    const { data: current } = await supabaseAdmin.from("organizations")
      .select("slug, type").eq("slug", slug).abortSignal(signal).maybeSingle();
    if (current) return current;
    const { data: alias } = await supabaseAdmin.from("organization_slug_aliases")
      .select("organization_id").eq("old_slug", slug).abortSignal(signal).maybeSingle();
    if (alias) {
      const { data: organization } = await supabaseAdmin.from("organizations")
        .select("slug, type").eq("id", alias.organization_id).abortSignal(signal).maybeSingle();
      return organization ?? missing;
    }
    const joined = slug.replace(/[^a-z0-9]/g, "");
    if (joined.length < 4) return missing;
    if (joined !== slug) {
      const { data: exact } = await supabaseAdmin.from("organizations")
        .select("slug, type").eq("slug", joined).abortSignal(signal).maybeSingle();
      if (exact) return exact;
    }
    const { data: starts } = await supabaseAdmin.from("organizations")
      .select("slug, type").like("slug", `${joined}%`).limit(2).abortSignal(signal);
    return starts?.length === 1 ? starts[0] : missing;
  } catch {
    return missing;
  }
}