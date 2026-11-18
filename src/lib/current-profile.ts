import { supabase } from "@/integrations/supabase/client";
import { ensureLiveSession } from "@/lib/session-health";
import { createRequestCache } from "@/lib/request-cache";

const profiles = createRequestCache<Record<string, unknown> | null>(60_000);
export function clearCurrentProfileRequest() { profiles.clear(); }
export async function readCurrentProfile() {
  const uid = await ensureLiveSession();
  if (!uid) return null;
  return profiles.read(uid, async () => {
    const { data, error } = await supabase.rpc("my_profile");
    if (error) throw error;
    return (data as unknown as Array<Record<string, unknown>> | null)?.[0] ?? null;
  });
}
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => profiles.clear());
}