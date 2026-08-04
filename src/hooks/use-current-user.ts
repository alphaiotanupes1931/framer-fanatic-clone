import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CurrentUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  neighborhood: string | null;
  neighborhood_names: string[];
  is_founder: boolean;
  onboarding_complete: boolean;
};

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: session } = await supabase.auth.getUser();
    const authUser = session.user;
    if (!authUser) { setUser(null); setLoading(false); return; }
    const { data: rows } = await supabase.rpc("my_profile");
    const p = (rows as unknown as Array<Record<string, unknown>> | null)?.[0] as
      | (CurrentUser & { onboarded?: boolean; neighborhood_names?: string[] | null })
      | undefined;
    if (p) {
      setUser({
        id: p.id,
        email: p.email ?? authUser.email ?? null,
        display_name: p.display_name,
        username: p.username,
        avatar_url: p.avatar_url,
        role: p.role,
        neighborhood: p.neighborhood,
        neighborhood_names: (p.neighborhood_names as string[] | null) ?? [],
        is_founder: !!p.is_founder,
        onboarding_complete: !!p.onboarded,
      });
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { user, loading, refetch: load };
}