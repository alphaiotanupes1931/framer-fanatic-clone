import { supabase } from "@/integrations/supabase/client";

export type ProfileKind = "artist" | "resident" | "visitor";

/**
 * Switches the signed-in user's profile type. profiles.role and user_roles are
 * both locked down for direct writes, so this goes through a server function.
 */
export async function setMyProfileKind(kind: ProfileKind): Promise<void> {
  const rpc = supabase.rpc as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("set_my_profile_kind", { _kind: kind });
  if (error) throw new Error(error.message);
}