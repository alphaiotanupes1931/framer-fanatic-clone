import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cached: Promise<boolean> | null = null;

async function fetchIsAdmin(): Promise<boolean> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!cached) cached = fetchIsAdmin();
    cached.then((v) => { if (!cancelled) setIsAdmin(v); });
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      cached = fetchIsAdmin();
      cached.then((v) => { if (!cancelled) setIsAdmin(v); });
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);
  return isAdmin;
}