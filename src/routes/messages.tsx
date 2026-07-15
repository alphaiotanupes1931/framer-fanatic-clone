import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MessageSquare, Plus, Search, Send, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { parseSharePreview, type SharePreview } from "@/lib/share-preview";

function SharePreviewCard({ preview, mine }: { preview: SharePreview; mine: boolean }) {
  const label = preview.type === "story" ? "Story" : preview.type === "event" ? "Event" : "Post";
  const inner = (
    <div className={`overflow-hidden rounded-xl border ${mine ? "border-white/25 bg-white/10" : "border-border bg-background"}`}>
      {preview.image && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          <img src={preview.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-3">
        <div className={`text-[10px] font-bold uppercase tracking-wide ${mine ? "text-white/70" : "text-[#d4580a]"}`}>{label}</div>
        {preview.title && <div className={`mt-0.5 line-clamp-2 text-sm font-semibold ${mine ? "text-white" : "text-foreground"}`}>{preview.title}</div>}
        {preview.excerpt && <div className={`mt-1 line-clamp-2 text-xs ${mine ? "text-white/80" : "text-muted-foreground"}`}>{preview.excerpt}</div>}
        {preview.author && <div className={`mt-1.5 text-[11px] ${mine ? "text-white/70" : "text-muted-foreground"}`}>by {preview.author}</div>}
      </div>
    </div>
  );
  if (preview.type === "story") return <Link to="/stories/$storyId" params={{ storyId: preview.id }}>{inner}</Link>;
  if (preview.type === "event") return <Link to="/events/$eventId" params={{ eventId: preview.id }}>{inner}</Link>;
  return <Link to="/posts/$postId" params={{ postId: preview.id }}>{inner}</Link>;
}

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
  head: () => ({ meta: [{ title: "Messages - Planet Baltimore" }] }),
});

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Conv = {
  id: string;
  user_a: string | null;
  user_b: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_read_at_a: string;
  last_read_at_b: string;
  is_group?: boolean | null;
  title?: string | null;
  created_by?: string | null;
  my_last_read?: string | null;
  cleared_at_a?: string | null;
  cleared_at_b?: string | null;
  my_cleared_at?: string | null;
  other?: Profile;
  unread?: boolean;
};

type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  deleted_for?: string[] | null;
};

function initials(p?: Profile | null) {
  const s = p?.display_name || p?.username || "U";
  return s.trim()[0]?.toUpperCase() || "U";
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}

function MessagesPage() {
  const me = useCurrentProfile();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [people, setPeople] = useState<Profile[]>([]);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const decorate = useCallback(
    (rows: Conv[], profilesById: Map<string, Profile>) => {
      if (!me) return rows;
      return rows.map((c) => {
        if (c.is_group) {
          const myRead = c.my_last_read || c.last_message_at;
          return {
            ...c,
            other: undefined,
            unread: new Date(c.last_message_at).getTime() > new Date(myRead).getTime(),
          };
        }
        const otherId = (c.user_a === me.id ? c.user_b : c.user_a) as string;
        const myRead = c.user_a === me.id ? c.last_read_at_a : c.last_read_at_b;
        return {
          ...c,
          other: profilesById.get(otherId),
          unread: new Date(c.last_message_at).getTime() > new Date(myRead).getTime(),
        };
      });
    },
    [me],
  );

  const loadConvs = useCallback(async () => {
    if (!me) return;
    const { data: direct } = await supabase
      .from("conversations")
      .select("*")
      .or(`user_a.eq.${me.id},user_b.eq.${me.id}`)
      .order("last_message_at", { ascending: false });
    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", me.id);
    const groupIds = (memberships || []).map((m) => m.conversation_id);
    const readByConv = new Map<string, string>((memberships || []).map((m) => [m.conversation_id, m.last_read_at]));
    let groups: Conv[] = [];
    if (groupIds.length) {
      const { data: g } = await supabase
        .from("conversations")
        .select("*")
        .in("id", groupIds)
        .eq("is_group", true);
      groups = ((g || []) as Conv[]).map((c) => ({ ...c, my_last_read: readByConv.get(c.id) || null }));
    }
    const clearedByConv = new Map<string, string | null>((memberships || []).map((m: { conversation_id: string; cleared_at?: string | null }) => [m.conversation_id, m.cleared_at ?? null]));
    const seen = new Set<string>();
    const merged = [...(direct as Conv[] || []), ...groups].filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
    // Attach my_cleared_at for each conversation
    const withCleared = merged.map((c) => {
      const myCleared = c.is_group
        ? clearedByConv.get(c.id) || null
        : (c.user_a === me.id ? c.cleared_at_a : c.cleared_at_b) || null;
      return { ...c, my_cleared_at: myCleared };
    });
    // Hide chats the user cleared and no new activity since
    const visible = withCleared.filter((c) => {
      if (!c.my_cleared_at) return true;
      return new Date(c.last_message_at).getTime() > new Date(c.my_cleared_at).getTime();
    });
    visible.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    const list = visible;
    const otherIds = list
      .filter((c) => !c.is_group)
      .map((c) => (c.user_a === me.id ? c.user_b : c.user_a))
      .filter((v): v is string => !!v);
    let byId = new Map<string, Profile>();
    if (otherIds.length) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: otherIds });
      byId = new Map((profs || []).map((p) => [p.id, p as Profile]));
    }
    const decorated = decorate(list, byId);
    setConvs(decorated);
    const pendingId = window.localStorage.getItem("pb_open_conversation");
    if (pendingId) {
      const pending = decorated.find((c) => c.id === pendingId);
      if (pending) {
        setActive(pending);
        window.localStorage.removeItem("pb_open_conversation");
      }
    } else if (active) {
      const freshActive = decorated.find((c) => c.id === active.id);
      if (freshActive) setActive(freshActive);
    }
  }, [me, decorate, active?.id]);

  const loadMsgs = useCallback(async (c: Conv) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", c.id)
      .order("created_at");
    const meId = (await supabase.auth.getUser()).data.user?.id;
    const cleared = c.my_cleared_at ? new Date(c.my_cleared_at).getTime() : 0;
    const filtered = ((data || []) as Msg[]).filter((m) => {
      if (Array.isArray(m.deleted_for) && meId && m.deleted_for.includes(meId)) return false;
      if (cleared && new Date(m.created_at).getTime() <= cleared) return false;
      return true;
    });
    setMsgs(filtered);
  }, []);

  const deleteChat = useCallback(
    async (c: Conv) => {
      if (!me) return;
      if (!confirm("Delete this chat for you? It won't be removed for the other person.")) return;
      const now = new Date().toISOString();
      if (c.is_group) {
        await supabase
          .from("conversation_members")
          .update({ cleared_at: now })
          .eq("conversation_id", c.id)
          .eq("user_id", me.id);
      } else {
        const patch = c.user_a === me.id ? { cleared_at_a: now } : { cleared_at_b: now };
        await supabase.from("conversations").update(patch).eq("id", c.id);
      }
      setConvs((prev) => prev.filter((row) => row.id !== c.id));
      if (active?.id === c.id) setActive(null);
      toast.success("Chat deleted for you");
    },
    [me, active],
  );

  const deleteMessage = useCallback(
    async (m: Msg) => {
      if (!me) return;
      if (!confirm("Delete this message for you? It won't be removed for others.")) return;
      const next = Array.from(new Set([...(m.deleted_for || []), me.id]));
      const { error } = await supabase
        .from("messages")
        .update({ deleted_for: next })
        .eq("id", m.id);
      if (error) { toast.error(error.message); return; }
      setMsgs((prev) => prev.filter((x) => x.id !== m.id));
    },
    [me],
  );

  const markRead = useCallback(
    async (c: Conv) => {
      if (!me) return;
      const now = new Date().toISOString();
      if (c.is_group) {
        await supabase
          .from("conversation_members")
          .update({ last_read_at: now })
          .eq("conversation_id", c.id)
          .eq("user_id", me.id);
      } else {
        const patch =
          c.user_a === me.id ? { last_read_at_a: now } : { last_read_at_b: now };
        await supabase.from("conversations").update(patch).eq("id", c.id);
      }
      setConvs((prev) =>
        prev.map((row) => (row.id === c.id ? { ...row, unread: false } : row)),
      );
    },
    [me],
  );

  useEffect(() => {
    loadConvs();
  }, [loadConvs]);

  useEffect(() => {
    if (active) {
      loadMsgs(active);
      markRead(active);
    }
  }, [active, loadMsgs, markRead]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length, active?.id]);

  // Realtime: messages
  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`messages-${me.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Msg;
          if (active && m.conversation_id === active.id) {
            setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            if (m.sender_id !== me.id) markRead(active);
          }
          loadConvs();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, active, loadConvs, markRead]);

  const openNew = async () => {
    setNewOpen(true);
    const { data, error } = await supabase.rpc("search_creators", { q: "", lim: 100 });
    if (error) { toast.error(error.message); return; }
    setPeople(((data || []) as Profile[]).filter((p) => p.id !== me?.id));
  };

  const filteredPeople = useMemo(() => {
    const q = peopleQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) =>
        (p.display_name || "").toLowerCase().includes(q) ||
        (p.username || "").toLowerCase().includes(q),
    );
  }, [people, peopleQuery]);

  const filteredConvs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter(
      (c) =>
        (c.title || "").toLowerCase().includes(q) ||
        (c.other?.display_name || "").toLowerCase().includes(q) ||
        (c.other?.username || "").toLowerCase().includes(q) ||
        (c.last_message_preview || "").toLowerCase().includes(q),
    );
  }, [convs, search]);

  const send = async () => {
    if (!active || !me || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    // Optimistic: render immediately so chat feels instant.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: Msg = {
      id: tempId,
      conversation_id: active.id,
      sender_id: me.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, optimistic]);
    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({ conversation_id: active.id, sender_id: me.id, content })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      setMsgs((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(content);
      return;
    }
    // Replace temp row with the real one (or drop the temp if realtime beat us).
    if (inserted) {
      setMsgs((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (withoutTemp.some((m) => m.id === (inserted as Msg).id)) return withoutTemp;
        return [...withoutTemp, inserted as Msg];
      });
    }
    void supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.slice(0, 140),
      })
      .eq("id", active.id);
    void loadConvs();
  };

  const startConv = async (otherId: string) => {
    if (!me) return;
    const [a, b] = me.id < otherId ? [me.id, otherId] : [otherId, me.id];
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_a", a)
      .eq("user_b", b)
      .maybeSingle();
    let conv = existing as Conv | null;
    if (!conv) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ user_a: a, user_b: b })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      conv = created as Conv;
    }
    setNewOpen(false);
    setPeopleQuery("");
    await loadConvs();
    const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: [otherId] });
    setActive({ ...conv, other: (profs?.[0] || undefined) as Profile | undefined, unread: false });
  };

  const broadcast = async () => {
    if (!me || !broadcastText.trim()) return;
    setBroadcasting(true);
    try {
      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", me.id);
      const ids = (followers || []).map((f: { follower_id: string }) => f.follower_id);
      if (!ids.length) {
        toast.info("You don't have any followers yet.");
        return;
      }
      const content = broadcastText.trim();
      for (const otherId of ids) {
        const [a, b] = me.id < otherId ? [me.id, otherId] : [otherId, me.id];
        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_a", a)
          .eq("user_b", b)
          .maybeSingle();
        let convId = existing?.id as string | undefined;
        if (!convId) {
          const { data: created } = await supabase
            .from("conversations")
            .insert({ user_a: a, user_b: b })
            .select("id")
            .single();
          convId = created?.id;
        }
        if (!convId) continue;
        await supabase.from("messages").insert({
          conversation_id: convId,
          sender_id: me.id,
          content,
        });
        await supabase
          .from("conversations")
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: content.slice(0, 140),
          })
          .eq("id", convId);
      }
      toast.success(`Sent to ${ids.length} follower${ids.length === 1 ? "" : "s"}`);
      setBroadcastOpen(false);
      setBroadcastText("");
      loadConvs();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Broadcast failed");
    } finally {
      setBroadcasting(false);
    }
  };

  const showList = !active;

  return (
    <AppLayout title="" hero={false}>
      <div className="mb-6">
        <HeroBanner title="Messages" subtitle="Direct conversations with people and organizations across Baltimore." />
      </div>
      <div className="grid h-[calc(100vh-12rem)] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[340px_1fr]">
        {/* Conversation list */}
        <div
          className={`${showList ? "flex" : "hidden"} flex-col border-r border-border md:flex`}
        >
          <div className="border-b border-border p-4">
            <h2 className="mb-3 text-2xl font-bold text-foreground">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-full border border-border bg-muted py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              filteredConvs.map((c) => (
                <div
                  key={c.id}
                  className={`group relative flex w-full items-center border-b border-border transition hover:bg-muted ${
                    active?.id === c.id ? "bg-muted" : ""
                  }`}
                >
                <button
                  onClick={() => setActive(c)}
                  className="flex flex-1 items-center gap-3 px-4 py-3 text-left"
                >
                  <Avatar className="h-10 w-10">
                    {!c.is_group && c.other?.avatar_url && <AvatarImage src={c.other.avatar_url} alt="" />}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {c.is_group ? <Users className="h-5 w-5" /> : initials(c.other)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {c.is_group ? (c.title || "Group chat") : (c.other?.display_name || c.other?.username || "Unknown")}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatWhen(c.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-xs ${
                          c.unread ? "font-semibold text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {(() => {
                          const raw = c.last_message_preview || "";
                          const shared = parseSharePreview(raw);
                          if (shared) {
                            const label = shared.preview.type === "story" ? "story" : shared.preview.type === "event" ? "event" : "post";
                            return `Shared a ${label}${shared.preview.title ? `: ${shared.preview.title}` : ""}`;
                          }
                          if (raw.startsWith("::share::")) {
                            const m = raw.match(/"type"\s*:\s*"(post|story|event)"/);
                            const t = m?.[1] || "post";
                            return `Shared a ${t}`;
                          }
                          return raw || "Say hello";
                        })()}
                      </span>
                      {c.unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); void deleteChat(c); }}
                    className="mr-2 rounded-full p-2 text-muted-foreground opacity-0 transition hover:bg-background hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete chat"
                    title="Delete chat for me"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2 border-t border-border p-3">
            <button
              onClick={openNew}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New message
            </button>
            <button
              onClick={() => setBroadcastOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <Users className="h-4 w-4" /> Message all followers
            </button>
          </div>
        </div>

        {/* Conversation pane */}
        <div className={`${showList ? "hidden md:flex" : "flex"} min-h-0 flex-col`}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full bg-muted p-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Select a conversation</h3>
              <p className="max-w-xs text-sm text-muted-foreground">
                Choose from your conversations or start a new one with an Artist or organizer.
              </p>
              <button
                onClick={openNew}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Start a conversation
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted md:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar className="h-9 w-9">
                  {!active.is_group && active.other?.avatar_url && (
                    <AvatarImage src={active.other.avatar_url} alt="" />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {active.is_group ? <Users className="h-5 w-5" /> : initials(active.other)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">
                    {active.is_group
                      ? (active.title || "Group chat")
                      : (active.other?.display_name || active.other?.username)}
                  </div>
                  {active.is_group ? (
                    <div className="truncate text-xs text-muted-foreground">Group chat</div>
                  ) : active.other?.username && (
                    <div className="truncate text-xs text-muted-foreground">
                      @{active.other.username}
                    </div>
                  )}
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4 sm:p-5">
                {msgs.map((m, i) => {
                  const mine = m.sender_id === me?.id;
                  const prev = msgs[i - 1];
                  const showAvatar = !mine && (!prev || prev.sender_id !== m.sender_id);
                  return (
                    <div
                      key={m.id}
                      className={`group/msg flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
                    >
                      {!mine && (
                        <div className="w-7 shrink-0">
                          {showAvatar && (
                            <Avatar className="h-7 w-7">
                              {active.other?.avatar_url && (
                                <AvatarImage src={active.other.avatar_url} alt="" />
                              )}
                              <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
                                {initials(active.other)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}
                      {mine && (
                        <button
                          onClick={() => void deleteMessage(m)}
                          className="mb-2 rounded-full p-1.5 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-destructive group-hover/msg:opacity-100"
                          aria-label="Delete message"
                          title="Delete for me"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {(() => {
                        const shared = parseSharePreview(m.content);
                        return (
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                              mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                            }`}
                          >
                            {shared ? (
                              <div className="space-y-2">
                                <SharePreviewCard preview={shared.preview} mine={mine} />
                                {shared.note && <div className="whitespace-pre-wrap break-words">{shared.note}</div>}
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            )}
                            <div className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {formatWhen(m.created_at)}
                            </div>
                          </div>
                        );
                      })()}
                      {!mine && (
                        <button
                          onClick={() => void deleteMessage(m)}
                          className="mb-2 rounded-full p-1.5 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-destructive group-hover/msg:opacity-100"
                          aria-label="Delete message"
                          title="Delete for me"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border p-3 sm:p-4">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder="Type a message"
                    className="max-h-32 flex-1 resize-none rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    onClick={send}
                    disabled={!draft.trim()}
                    className="rounded-full bg-primary p-2.5 text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {newOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setNewOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Start a conversation</h2>
              <button
                onClick={() => setNewOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={peopleQuery}
                onChange={(e) => setPeopleQuery(e.target.value)}
                autoFocus
                placeholder="Search people"
                className="w-full rounded-full border border-border bg-muted py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {filteredPeople.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No people found</p>
              ) : (
                filteredPeople.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => startConv(p.id)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted"
                  >
                    <Avatar className="h-9 w-9">
                      {p.avatar_url && <AvatarImage src={p.avatar_url} alt="" />}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {initials(p)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {p.display_name || p.username}
                      </div>
                      {p.username && (
                        <div className="truncate text-xs text-muted-foreground">@{p.username}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {broadcastOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !broadcasting && setBroadcastOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Message all followers</h2>
              <button
                onClick={() => !broadcasting && setBroadcastOpen(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Sends a direct message to every follower. They will see it in their inbox.
            </p>
            <textarea
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              rows={4}
              placeholder="Share an update with your followers"
              className="w-full rounded-xl border border-border bg-muted p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={broadcast}
              disabled={broadcasting || !broadcastText.trim()}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {broadcasting ? "Sending..." : "Send to followers"}
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}