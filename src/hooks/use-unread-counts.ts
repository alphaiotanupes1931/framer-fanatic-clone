import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Basic implementation: count unread messages in conversations the user is in.
// Notifications table doesn't exist yet — returns 0.
export function useUnreadCounts() {
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: session } = await supabase.auth.getUser();
      const uid = session.user?.id;
      if (!uid) return;
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", uid);
      if (!cancelled && typeof count === "number") setUnreadMessages(Math.min(count, 99));
    })();
    return () => { cancelled = true; };
  }, []);

  return { unreadMessages, unreadNotifications: 0 };
}