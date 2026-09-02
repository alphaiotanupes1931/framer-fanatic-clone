import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ElementType } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, Heart, MessageCircle, UserPlus, Calendar, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ListSkeleton } from "@/components/shared/empty-state";
import { SmartAvatarImage } from "@/components/shared/smart-img";

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
  metadata?: Record<string, unknown> | null;
  actor?: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null;
  context?: { label: string; excerpt?: string | null } | null;
};

function iconFor(type: string) {
  if (type.includes("like")) return Heart;
  if (type.includes("comment") || type === "mention") return MessageCircle;
  if (type === "message") return MessageCircle;
  if (type === "follow") return UserPlus;
  if (type.includes("ticket") || type.includes("event")) return Calendar;
  if (type.includes("donation")) return Calendar;
  if (type === "group_join_request") return UserPlus;
  return Bell;
}

function clip(text: string | null | undefined, max = 90) {
  if (!text) return null;
  const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return null;
  return plain.length > max ? `${plain.slice(0, max)}...` : plain;
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

function ActorAvatarLink({
  username,
  avatarUrl,
  fallback,
  typeIcon,
}: {
  username: string;
  avatarUrl: string | null | undefined;
  fallback: string;
  typeIcon: ElementType;
}) {
  const Icon = typeIcon;
  return (
    <Link
      to="/u/$username"
      params={{ username }}
      onClick={(e) => e.stopPropagation()}
      className="relative flex-shrink-0 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#d4580a]"
    >
      <Avatar className="h-10 w-10">
        <SmartAvatarImage src={avatarUrl ?? undefined} />
        <AvatarFallback style={{ backgroundColor: "rgba(212,88,10,0.1)", color: "#d4580a" }}>
          {fallback.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card" style={{ backgroundColor: "#d4580a" }}>
        <Icon className="h-3 w-3 text-white" />
      </span>
    </Link>
  );
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
      .select("id, user_id, actor_id, type, target_type, target_id, message, is_read, created_at, metadata")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (data || []) as Notif[];
    const actorIds = Array.from(new Set(list.map((n) => n.actor_id).filter(Boolean))) as string[];
    if (actorIds.length) {
      const { data: ps } = await (supabase as any).rpc("get_actors_minimal", { _ids: actorIds });
      const byId = new Map((ps || []).map((p: any) => [p.id, p]));
      list.forEach((n) => { if (n.actor_id) n.actor = byId.get(n.actor_id) as Notif["actor"] ?? null; });
    }

    // Enrich with what the notification is actually about.
    const idsOf = (pred: (t: string) => boolean) =>
      Array.from(new Set(list.filter((n) => pred(n.type) && n.target_id).map((n) => n.target_id as string)));
    const postIds = idsOf((t) => t.startsWith("post_") || t === "mention");
    const storyIds = idsOf((t) => t.startsWith("story_"));
    const orgIds = idsOf((t) => t === "group_join_request");
    const eventIds = Array.from(new Set(list
      .map((n) => (n.metadata as { event_id?: string } | null)?.event_id
        ?? (n.target_type === "event" ? n.target_id : null))
      .filter(Boolean) as string[]));

    const [posts, stories, orgs, events] = await Promise.all([
      postIds.length ? supabase.from("posts").select("id, content").in("id", postIds) : Promise.resolve({ data: [] }),
      storyIds.length ? supabase.from("stories").select("id, title, excerpt").in("id", storyIds) : Promise.resolve({ data: [] }),
      orgIds.length ? supabase.from("organizations").select("id, name, slug").in("id", orgIds) : Promise.resolve({ data: [] }),
      eventIds.length ? supabase.from("events").select("id, title").in("id", eventIds) : Promise.resolve({ data: [] }),
    ]);
    const postMap = new Map((posts.data || []).map((p: any) => [p.id, p]));
    const storyMap = new Map((stories.data || []).map((s: any) => [s.id, s]));
    const orgMap = new Map((orgs.data || []).map((o: any) => [o.id, o]));
    const eventMap = new Map((events.data || []).map((e: any) => [e.id, e]));

    list.forEach((n) => {
      const evId = (n.metadata as { event_id?: string } | null)?.event_id
        ?? (n.target_type === "event" ? n.target_id : null);
      if (n.type.startsWith("post_") || n.type === "mention") {
        const p = postMap.get(n.target_id ?? "");
        if (p) n.context = { label: "your post", excerpt: clip(p.content) };
      } else if (n.type.startsWith("story_")) {
        const s = storyMap.get(n.target_id ?? "");
        if (s) n.context = { label: "your story", excerpt: clip(s.title || s.excerpt) };
      } else if (n.type === "group_join_request") {
        const o = orgMap.get(n.target_id ?? "");
        if (o) n.context = { label: o.name, excerpt: null };
        (n as any)._slug = o?.slug ?? null;
      } else if (evId) {
        const e = eventMap.get(evId);
        if (e) n.context = { label: e.title, excerpt: null };
      }
    });

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

  const remove = async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((n) => n.id !== id));
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) { setItems(prev); toast.error(error.message); }
  };

  const clearAll = async () => {
    if (!uid) return;
    const prev = items;
    setItems([]);
    const { error } = await supabase.from("notifications").delete().eq("user_id", uid);
    if (error) { setItems(prev); toast.error(error.message); return; }
    toast.success("Notifications cleared");
  };

  const onClick = async (n: Notif) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
    }
    const t = n.type;
    const meta = (n.metadata || {}) as { event_id?: string; ticket_id?: string };
    const evId = meta.event_id ?? (n.target_type === "event" ? n.target_id : null);

    if (t === "message" && n.target_id) {
      try { window.localStorage.setItem("pb_open_conversation", n.target_id); } catch { /* ignore */ }
      navigate({ to: "/messages" });
      return;
    }
    if ((t.startsWith("post_") || t === "mention" || n.target_type === "post") && n.target_id) {
      navigate({ to: "/posts/$postId", params: { postId: n.target_id } });
      return;
    }
    if (t.startsWith("story_") && n.target_id) {
      navigate({ to: "/stories/$storyId", params: { storyId: n.target_id } });
      return;
    }
    if (t === "group_join_request") {
      const slug = (n as any)._slug as string | null;
      if (slug) { navigate({ to: "/o/$slug", params: { slug } }); return; }
      navigate({ to: "/groups" });
      return;
    }
    if (t === "ticket_purchased" && meta.ticket_id) {
      navigate({ to: "/tickets/$ticketId", params: { ticketId: meta.ticket_id } });
      return;
    }
    if (evId) {
      navigate({ to: "/events/$eventId", params: { eventId: evId } });
      return;
    }
    if (n.actor?.username) navigate({ to: "/u/$username", params: { username: n.actor.username } });
  };


  return (
    <AppLayout>
      <div className="space-y-5">
        <HeroBanner
          title="Notifications"
          subtitle="Follows, likes, comments, and event updates from your community."
          cta={items.length ? (
            <div className="flex gap-2">
              {items.some((n) => !n.is_read) && (
                <Button onClick={markAllRead} variant="outline" className="gap-2 rounded-lg">
                  <CheckCheck className="h-4 w-4" /> Mark all read
                </Button>
              )}
              <Button onClick={clearAll} variant="outline" className="gap-2 rounded-lg">
                <Trash2 className="h-4 w-4" /> Clear all
              </Button>
            </div>
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
                  <div
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60 ${!n.is_read ? "bg-[#d4580a]/5" : ""}`}
                  >
                    {n.actor?.username ? (
                      <ActorAvatarLink
                        username={n.actor.username}
                        avatarUrl={n.actor.avatar_url}
                        fallback={name}
                        typeIcon={Icon}
                      />
                    ) : (
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-10 w-10">
                          <SmartAvatarImage src={n.actor?.avatar_url ?? undefined} />
                          <AvatarFallback style={{ backgroundColor: "rgba(212,88,10,0.1)", color: "#d4580a" }}>
                            {name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card" style={{ backgroundColor: "#d4580a" }}>
                          <Icon className="h-3 w-3 text-white" />
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        {n.actor?.username ? (
                          <Link
                            to="/u/$username"
                            params={{ username: n.actor.username }}
                            className="font-semibold hover:underline"
                          >
                            {name}
                          </Link>
                        ) : (
                          <span className="font-semibold">{name}</span>
                        )}{" "}
                        <button
                          type="button"
                          onClick={() => onClick(n)}
                          className="text-left text-muted-foreground hover:text-foreground"
                        >
                          {describe(n)}
                        </button>
                      </p>
                      {n.context?.excerpt && (
                        <button
                          type="button"
                          onClick={() => onClick(n)}
                          className="mt-1 block w-full truncate rounded-md bg-secondary/60 px-2 py-1 text-left text-xs italic text-muted-foreground hover:text-foreground"
                        >
                          "{n.context.excerpt}"
                        </button>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">{relTime(n.created_at)} · {actionHint(n.type)}</p>
                    </div>

                    {!n.is_read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: "#d4580a" }} />}
                    <button
                      type="button"
                      onClick={() => void remove(n.id)}
                      aria-label="Delete notification"
                      title="Delete"
                      className="ml-1 mt-0.5 flex-shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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