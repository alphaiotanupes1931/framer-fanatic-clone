import { supabase } from "@/integrations/supabase/client";

// Follow buttons on existing public pages use approved organization memberships.
// Keep those followers alongside explicit page follows without counting pending requests.
export async function getOrgFollowerIds(orgId: string): Promise<string[]> {
  async function readIds(table: "organization_members" | "organization_followers") {
    const ids: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const query = table === "organization_members"
        ? supabase.from("organization_members").select("user_id").eq("organization_id", orgId).eq("status", "approved").order("user_id").range(offset, offset + 999)
        : supabase.from("organization_followers").select("user_id").eq("organization_id", orgId).order("user_id").range(offset, offset + 999);
      const { data, error } = await query;
      if (error) throw error;
      ids.push(...(data ?? []).map((row) => row.user_id));
      if (!data || data.length < 1000) return ids;
    }
  }
  const [members, followers] = await Promise.all([readIds("organization_members"), readIds("organization_followers")]);
  return Array.from(new Set([...members, ...followers]));
}