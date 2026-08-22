import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Access helpers for private pages.
 *
 * A page marked private is invisible to search engines (the route renders
 * `noindex` when the public read returns nothing) and unreadable through the
 * normal client query. The owner can hand out an access code so a specific
 * person can still open it without the page becoming public.
 */

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Public, unauthenticated read used for page metadata. Private pages come back as not found. */
export const getOrgSeo = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabasePublic = createClient(
        process.env["SUPABASE_URL"]!,
        process.env["SUPABASE_PUBLISHABLE_KEY"]!,
        { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
      );
      const { data: row } = await supabasePublic
        .from("organizations")
        .select("name, bio, type, is_public")
        .eq("slug", data.slug)
        .maybeSingle();
      if (!row || row.is_public === false) return { indexable: false as const };
      return {
        indexable: true as const,
        name: row.name as string,
        description: ((row.bio as string | null) ?? "").replace(/\s+/g, " ").slice(0, 155),
      };
    } catch {
      return { indexable: false as const };
    }
  });

/** Exchange a shared access code for the private page's data. */
export const unlockOrgWithCode = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; code: string }) => data)
  .handler(async ({ data }) => {
    const code = (data.code ?? "").trim();
    if (!code) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!row || !row.access_code_hash) return { ok: false as const };
    const hash = await sha256Hex(code.toLowerCase());
    if (hash !== row.access_code_hash) return { ok: false as const };
    const { access_code_hash: _omit, ...safe } = row as Record<string, unknown>;
    // Serialized as a string so the payload stays trivially serializable.
    return { ok: true as const, orgJson: JSON.stringify(safe) };


  });

/** Owner/admin sets (or clears) the access code for their private page. */
export const setOrgAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orgId: string; code: string | null }) => data)
  .handler(async ({ data, context }) => {
    const hash = data.code && data.code.trim() ? await sha256Hex(data.code.trim().toLowerCase()) : null;
    // RLS restricts this update to the owner (or an admin).
    const { error } = await context.supabase
      .from("organizations")
      .update({ access_code_hash: hash })
      .eq("id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Public-safe fallback info for a private page: name and owner so visitors can still follow or contact. */
export const getPrivateOrgFallback = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("id, name, owner_id, is_public")
        .eq("slug", data.slug)
        .maybeSingle();
      if (!org || org.is_public !== false) return null;
      const { data: owner } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .eq("id", org.owner_id)
        .maybeSingle();
      return {
        id: org.id as string,
        name: org.name as string,
        slug: data.slug,
        ownerId: org.owner_id as string,
        owner: owner as { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null,
      };
    } catch {
      return null;
    }
  });
