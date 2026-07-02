import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUnreadCounts() {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getUser();
      const uid = session.user?.id;
      if (!uid) return;
      const [{ count: msgCount }, { count: notifCount }] = await Promise.all([
        supabase.from("messages").select("id", { count: "exact", head: true }).neq("sender_id", uid),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("is_read", false),
      ]);
      if (cancelled) return;
      if (typeof msgCount === "number") setUnreadMessages(Math.min(msgCount, 99));
      if (typeof notifCount === "number") setUnreadNotifications(Math.min(notifCount, 99));
    })();
    return () => { cancelled = true; };
  }, []);

  return { unreadMessages, unreadNotifications };
}