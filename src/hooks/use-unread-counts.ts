import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Cache across mounts so navigating between pages doesn't re-hit the DB.
let cache: { at: number; msgs: number; notifs: number } | null = null;
const TTL = 60_000;

export function useUnreadCounts() {
  const [unreadMessages, setUnreadMessages] = useState(cache?.msgs ?? 0);
  const [unreadNotifications, setUnreadNotifications] = useState(cache?.notifs ?? 0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cache && Date.now() - cache.at < TTL) {
        setUnreadMessages(cache.msgs);
        setUnreadNotifications(cache.notifs);
        return;
      }
      const { data: session } = await supabase.auth.getUser();
      const uid = session.user?.id;
      if (!uid) return;

      // Unread notifications: fast (partial index exists).
      const notifP = supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("is_read", false);

      // Unread messages: only from the user's own conversations, and only
      // messages newer than their last_read_at. Previous implementation
      // scanned every message in the whole database on every mount.
      const convP = supabase
        .from("conversations")
        .select("id, user_a, user_b, last_message_at, last_read_at_a, last_read_at_b")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .limit(200);

      const [{ count: notifCount }, { data: convs }] = await Promise.all([notifP, convP]);

      let msgCount = 0;
      if (convs && convs.length) {
        msgCount = convs.reduce((acc: number, c: any) => {
          const lastRead = c.user_a === uid ? c.last_read_at_a : c.last_read_at_b;
          if (c.last_message_at && (!lastRead || new Date(c.last_message_at) > new Date(lastRead))) {
            return acc + 1;
          }
          return acc;
        }, 0);
      }

      if (cancelled) return;
      const nextMsgs = Math.min(msgCount, 99);
      const nextNotifs = Math.min(typeof notifCount === "number" ? notifCount : 0, 99);
      cache = { at: Date.now(), msgs: nextMsgs, notifs: nextNotifs };
      setUnreadMessages(nextMsgs);
      setUnreadNotifications(nextNotifs);
    })();
    return () => { cancelled = true; };
  }, []);

  return { unreadMessages, unreadNotifications };
}