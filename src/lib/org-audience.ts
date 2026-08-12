import { supabase } from "@/integrations/supabase/client";
import type { MessageAllCandidate } from "@/components/message-all-button";

/** Everyone attached to a page: members first, then followers. Used to share polls and votes. */
export async function loadOrgAudience(orgId: string): Promise<MessageAllCandidate[]> {
  const [{ data: members }, { data: followers }] = await Promise.all([
    supabase.from("organization_members").select("user_id").eq("organization_id", orgId),
    supabase.from("organization_followers").select("user_id").eq("organization_id", orgId),
  ]);
  const ids = Array.from(new Set([
    ...((members ?? []) as { user_id: string }[]).map((m) => m.user_id),
    ...((followers ?? []) as { user_id: string }[]).map((f) => f.user_id),
  ]));
  if (!ids.length) return [];
  const { data } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
  return ((data ?? []) as { id: string; display_name: string | null; username: string | null; avatar_url: string | null }[])
    .map((p) => ({ id: p.id, display_name: p.display_name, username: p.username, avatar_url: p.avatar_url }));
}

export function tabDeepLink(tab: string) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}?tab=${encodeURIComponent(tab)}`;
}
