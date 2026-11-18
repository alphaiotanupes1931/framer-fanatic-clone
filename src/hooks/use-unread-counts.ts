import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureLiveSession } from "@/lib/session-health";
import { createRequestCache } from "@/lib/request-cache";

const counts = createRequestCache<{ unreadMessages: number; unreadNotifications: number }>(60_000);
const empty = { unreadMessages: 0, unreadNotifications: 0 };
if (typeof window !== "undefined") supabase.auth.onAuthStateChange(() => counts.clear());

export function useUnreadCounts() {
  const [value, setValue] = useState(empty);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const uid = await ensureLiveSession();
      if (!uid) { if (!cancelled) setValue(empty); return; }
      const result = await counts.read(uid, async () => {
        const [{ count, error: notificationError }, { data: conversations, error: conversationError }] = await Promise.all([
          supabase.from("notifications").select("id", { count: "exact", head: true })
            .eq("user_id", uid).eq("is_read", false),
          supabase.from("conversations").select("id,user_a,user_b,last_message_at,last_read_at_a,last_read_at_b")
            .or(`user_a.eq.${uid},user_b.eq.${uid}`).limit(200),
        ]);
        if (notificationError || conversationError) throw notificationError ?? conversationError;
        const messages = (conversations ?? []).filter((c) => {
          const read = c.user_a === uid ? c.last_read_at_a : c.last_read_at_b;
          return c.last_message_at && (!read || new Date(c.last_message_at) > new Date(read));
        }).length;
        return { unreadMessages: Math.min(messages, 99), unreadNotifications: Math.min(count ?? 0, 99) };
      });
      if (!cancelled) setValue(result);
    }
    const refresh = () => { void load().catch(() => { /* Retry on next navigation. */ }); };
    refresh();
    const { data } = supabase.auth.onAuthStateChange(() => {
      setValue(empty);
      setTimeout(refresh, 0);
    });
    return () => { cancelled = true; data.subscription.unsubscribe(); };
  }, []);
  return value;
}