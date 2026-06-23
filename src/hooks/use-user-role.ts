import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "attendee" | "artist" | "admin";

export function useUserRole() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) {
        if (!cancelled) { setRoles([]); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (cancelled) return;
      setRoles(((data as { role: UserRole }[] | null) ?? []).map((r) => r.role));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return {
    roles,
    loading,
    isArtist: roles.includes("artist"),
    isAttendee: roles.includes("attendee") && !roles.includes("artist"),
    isAdmin: roles.includes("admin"),
  };
}