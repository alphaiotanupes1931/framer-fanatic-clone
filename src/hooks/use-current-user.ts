import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readCurrentProfile, clearCurrentProfileRequest } from "@/lib/current-profile";

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
    try {
    const p = (await readCurrentProfile()) as
      | (CurrentUser & { onboarded?: boolean; neighborhood_names?: string[] | null })
      | null;
    if (p) {
      setUser({
        id: p.id,
        email: p.email ?? null,
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
    } catch { setUser(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const { data } = supabase.auth.onAuthStateChange(() => {
      setUser(null);
      // Defer reads until the auth callback has released its session lock.
      setTimeout(() => void load(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  return { user, loading, refetch: () => { clearCurrentProfileRequest(); return load(); } };
}