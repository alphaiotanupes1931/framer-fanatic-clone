import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Heart, MessageCircle, UserPlus, Calendar, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ListSkeleton } from "@/components/shared/empty-state";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  head: () => ({ meta: [{ title: "Notifications - Planet Baltimore" }] }),
});

type Notif = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  target_type: string | null;
  target_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  actor?: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null;
};

function iconFor(type: string) {
  if (type === "like") return Heart;
  if (type === "comment") return MessageCircle;
  if (type === "follow") return UserPlus;
  if (type === "event") return Calendar;
  return Bell;
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  const load = async () => {
    const { data: s } = await supabase.auth.getSession();
    const id = s.session?.user.id;
    if (!id) { navigate({ to: "/auth" }); return; }
    setUid(id);
    const { data } = await supabase
      .from("notifications")
      .select("id, user_id, actor_id, type, target_type, target_id, message, is_read, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (data || []) as Notif[];
    const actorIds = Array.from(new Set(list.map((n) => n.actor_id).filter(Boolean))) as string[];
    if (actorIds.length) {
      const { data: ps } = await (supabase as any).from("profiles_public").select("id, display_name, username, avatar_url").in("id", actorIds);
      const byId = new Map((ps || []).map((p: any) => [p.id, p]));
      list.forEach((n) => { if (n.actor_id) n.actor = byId.get(n.actor_id) as Notif["actor"] ?? null; });
    }
    setItems(list);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  // Realtime: refresh when a new notification arrives for this user
  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel(`notifications:${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        () => { void load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [uid]);

  const markAllRead = async () => {
    if (!uid) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", uid).eq("is_read", false);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All marked as read");
  };

  const onClick = async (n: Notif) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.target_type === "post" && n.target_id) navigate({ to: "/dashboard" });
    else if (n.target_type === "event" && n.target_id) navigate({ to: "/events/$eventId", params: { eventId: n.target_id } });
    else if (n.target_type === "user" && n.actor?.username) navigate({ to: "/u/$username", params: { username: n.actor.username } });
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <HeroBanner
          title="Notifications"
          subtitle="Follows, likes, comments, and event updates from your community."
          cta={items.some((n) => !n.is_read) ? (
            <Button onClick={markAllRead} variant="outline" className="gap-2 rounded-lg">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : undefined}
        />

        {loading ? (
          <ListSkeleton count={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="When people interact with you, you'll see it here."
          />
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {items.map((n) => {
              const Icon = iconFor(n.type);
              const name = n.actor?.display_name || n.actor?.username || "Someone";
              return (
                <li key={n.id}>
                  <button
                    onClick={() => onClick(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60 ${!n.is_read ? "bg-[#d4580a]/5" : ""}`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={n.actor?.avatar_url ?? undefined} />
                        <AvatarFallback style={{ backgroundColor: "rgba(212,88,10,0.1)", color: "#d4580a" }}>
                          {name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card" style={{ backgroundColor: "#d4580a" }}>
                        <Icon className="h-3 w-3 text-white" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{name}</span>{" "}
                        <span className="text-muted-foreground">{n.message || defaultText(n.type)}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{relTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: "#d4580a" }} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="text-center">
          <Link to="/settings" className="text-sm text-muted-foreground hover:text-[#d4580a]">Notification settings →</Link>
        </div>
      </div>
    </AppLayout>
  );
}

function defaultText(type: string): string {
  switch (type) {
    case "like": return "liked your post";
    case "comment": return "commented on your post";
    case "follow": return "started following you";
    case "event": return "posted a new event";
    case "message": return "sent you a message";
    default: return "sent you an update";
  }
}