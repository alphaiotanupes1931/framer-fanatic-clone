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
    const { data: p } = await supabase
      .from("profiles")
      .select("id, email, display_name, username, avatar_url, role, neighborhood, neighborhood_names, is_founder, onboarded")
      .eq("id", authUser.id)
      .maybeSingle();
    if (p) {
      setUser({
        id: p.id,
        email: p.email,
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