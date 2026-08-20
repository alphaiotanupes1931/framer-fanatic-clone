import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Camera, Check, MessageSquare, Pencil, Plus, Search, Send, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "@tanstack/react-router";
import { MentionText } from "@/components/shared/mention-text";
import { parseSharePreview, type SharePreview } from "@/lib/share-preview";
import { Img, SmartAvatarImage } from "@/components/shared/smart-img";
import { compressAvatar, STORED_URL_TTL } from "@/lib/image-compress";

const SHARE_LABELS: Record<SharePreview["type"], string> = {
  story: "Story",
  event: "Event",
  video: "Video",
  post: "Post",
  profile: "Profile",
  organization: "Page",
};

function SharePreviewCard({ preview, mine }: { preview: SharePreview; mine: boolean }) {
  const label = SHARE_LABELS[preview.type] ?? "Post";
  const inner = (
    <div className={`overflow-hidden rounded-xl ${mine ? "bg-muted/50 ring-1 ring-black/5" : "bg-background ring-1 ring-black/5"}`}>
      {preview.image && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          <Img src={preview.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="px-3 py-2.5">
        <div className={`text-[10px] font-bold uppercase tracking-wide ${mine ? "text-muted-foreground" : "text-[#d4580a]"}`}>{label}</div>
        {preview.title && <div className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">{preview.title}</div>}
        {preview.excerpt && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{preview.excerpt}</div>}
        {preview.author && <div className="mt-1.5 text-[11px] text-muted-foreground">by {preview.author}</div>}
      </div>
    </div>
  );
  if (preview.type === "story") return <Link to="/stories/$storyId" params={{ storyId: preview.id }}>{inner}</Link>;
  if (preview.type === "event") return <Link to="/events/$eventId" params={{ eventId: preview.id }}>{inner}</Link>;
  if (preview.type === "video") return <Link to="/videos/$id" params={{ id: preview.id }}>{inner}</Link>;
  if (preview.type === "profile") return <Link to="/u/$username" params={{ username: preview.id }}>{inner}</Link>;
  if (preview.type === "organization") return <Link to="/o/$slug" params={{ slug: preview.id }}>{inner}</Link>;
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
  image_url?: string | null;
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
  const navigate = useNavigate();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [people, setPeople] = useState<Profile[]>([]);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<Profile[]>([]);
  const [newStep, setNewStep] = useState<"pick" | "confirm">("pick");
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");
  const [msgSearch, setMsgSearch] = useState("");
  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<Profile[]>([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
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
      setMsgSearch("");
      setMsgSearchOpen(false);
    }
  }, [active, loadMsgs, markRead]);

  // Load group members (avatars + names) for group chats
  useEffect(() => {
    let cancelled = false;
    setMembersOpen(false);
    if (!active?.is_group) {
      setGroupMembers([]);
      return;
    }
    (async () => {
      const { data: rows } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", active.id);
      const ids = (rows || []).map((r) => r.user_id as string);
      if (!ids.length) { if (!cancelled) setGroupMembers([]); return; }
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      if (!cancelled) setGroupMembers((profs || []) as Profile[]);
    })();
    return () => { cancelled = true; };
  }, [active?.id, active?.is_group]);

  const memberById = useMemo(
    () => new Map(groupMembers.map((p) => [p.id, p])),
    [groupMembers],
  );

  // Auto-scroll to bottom on new messages. A single smooth scroll can stop
  // short when images/attachments finish loading and grow the thread, so pin
  // to the bottom again on the next frames.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pin = () => el.scrollTo({ top: el.scrollHeight });
    pin();
    const r1 = requestAnimationFrame(pin);
    const t = setTimeout(pin, 250);
    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t);
    };
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

  const resetNewDialog = () => {
    setPeopleQuery("");
    setSelectedPeople([]);
    setNewStep("pick");
    setGroupName("");
  };

  const togglePerson = (p: Profile) => {
    setSelectedPeople((prev) =>
      prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p],
    );
  };

  const defaultGroupName = useMemo(() => {
    const names = selectedPeople.map((p) => (p.display_name || p.username || "Someone").split(" ")[0]);
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
  }, [selectedPeople]);

  const createGroup = async () => {
    if (!me || selectedPeople.length < 2) return;
    setCreatingGroup(true);
    try {
      const title = groupName.trim() || defaultGroupName;
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          is_group: true,
          title,
          created_by: me.id,
          last_message_preview: `${me.display_name || "Someone"} started the group`,
        })
        .select("*")
        .single();
      if (error || !conv) throw error || new Error("Could not create group");
      const rows = [
        { conversation_id: conv.id, user_id: me.id },
        ...selectedPeople.map((p) => ({ conversation_id: conv.id, user_id: p.id })),
      ];
      const { error: mErr } = await supabase.from("conversation_members").insert(rows);
      if (mErr) throw mErr;
      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: me.id,
        content: `${me.display_name || "Someone"} started “${title}”`,
      });
      if (msgErr) throw msgErr;
      toast.success(`Group chat created with ${selectedPeople.length + 1} members`);
      setNewOpen(false);
      resetNewDialog();
      await loadConvs();
      setActive({ ...(conv as Conv), unread: false });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not create group");
    } finally {
      setCreatingGroup(false);
    }
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

  const saveGroupName = async () => {
    if (!active?.is_group) return;
    const next = renameValue.trim();
    if (!next) { toast.error("Give the group a name"); return; }
    setSavingName(true);
    try {
      const { error } = await supabase.from("conversations").update({ title: next }).eq("id", active.id);
      if (error) throw error;
      setActive((c) => (c ? { ...c, title: next } : c));
      setConvs((prev) => prev.map((c) => (c.id === active.id ? { ...c, title: next } : c)));
      setRenaming(false);
      toast.success("Group name updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not rename group");
    } finally {
      setSavingName(false);
    }
  };

  return (
    <AppLayout title="" hero={false}>
      <div className={`mb-4 ${active ? "hidden md:block" : ""} md:hidden`}>
        <HeroBanner title="Messages" subtitle="Direct conversations with people and organizations across Baltimore." />
      </div>
      <h1 className="mb-3 hidden text-2xl font-semibold text-foreground md:block">Messages</h1>
      <div
        className={`grid min-h-0 grid-cols-1 overflow-hidden border border-border bg-card md:sticky md:top-20 md:z-auto md:h-[calc(100dvh-11rem)] md:min-h-[420px] md:rounded-2xl md:grid-cols-[360px_1fr] ${
          active
            ? "fixed inset-x-0 bottom-0 top-0 z-[1002] h-[100dvh] rounded-none pb-[env(safe-area-inset-bottom)]"
            : "h-[calc(100dvh-15rem)] min-h-[420px] rounded-2xl"
        }`}
      >
        {/* Conversation list */}
        <div
          className={`${showList ? "flex" : "hidden"} min-h-0 min-w-0 flex-col overflow-hidden border-r border-border md:flex`}
        >
          <div className="space-y-3 px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="truncate text-base font-semibold text-foreground">Inbox</h2>
              <button
                onClick={openNew}
                className="rounded-full p-2 text-foreground transition hover:bg-muted"
                aria-label="New message"
                title="New message"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-full border border-transparent bg-muted/60 py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-border focus:outline-none"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 pb-2">
            {filteredConvs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              filteredConvs.map((c) => (
                <div
                  key={c.id}
                  className={`group relative flex w-full items-center rounded-xl transition hover:bg-muted/60 ${
                    active?.id === c.id ? "bg-muted/70" : ""
                  }`}
                >
                <button
                  onClick={() => setActive(c)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
                >
                  {!c.is_group && c.other?.username ? (
                    <Link
                      to="/u/$username"
                      params={{ username: c.other.username }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Avatar className="h-12 w-12">
                        {c.other?.avatar_url && <SmartAvatarImage src={c.other.avatar_url} alt="" />}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {initials(c.other)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Avatar className="h-12 w-12">
                      {!c.is_group && c.other?.avatar_url && <SmartAvatarImage src={c.other.avatar_url} alt="" />}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {c.is_group ? <Users className="h-5 w-5" /> : initials(c.other)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      {!c.is_group && c.other?.username ? (
                        <span
                          role="link"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            navigate({ to: "/u/$username", params: { username: c.other!.username! } });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              navigate({ to: "/u/$username", params: { username: c.other!.username! } });
                            }
                          }}
                          className="truncate text-sm font-semibold text-foreground hover:underline"
                        >
                          {c.other?.display_name || c.other?.username}
                        </span>
                      ) : (
                        <span className="truncate text-sm font-semibold text-foreground">
                          {c.is_group ? (c.title || "Group chat") : "Unknown"}
                        </span>
                      )}
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
                            const label = shared.preview.type === "story" ? "story" : shared.preview.type === "event" ? "event" : shared.preview.type === "video" ? "video" : "post";
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
          <div className="border-t border-border p-3">
            <button
              onClick={() => setBroadcastOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Users className="h-3.5 w-3.5" /> Message all followers
            </button>
          </div>
        </div>

        {/* Conversation pane */}
        <div className={`${showList ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col`}>
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
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted md:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {!active.is_group && active.other?.username ? (
                  <Link to="/u/$username" params={{ username: active.other.username }}>
                    <Avatar className="h-9 w-9">
                      {active.other?.avatar_url && (
                        <SmartAvatarImage src={active.other.avatar_url} alt="" />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {initials(active.other)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ) : active.is_group ? (
                  <button
                    type="button"
                    onClick={() => setMembersOpen(true)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-muted"
                  >
                    <div className="flex -space-x-2">
                      {(groupMembers.length ? groupMembers.slice(0, 3) : [null]).map((p, i) => (
                        <Avatar key={p?.id || i} className="h-9 w-9 border-2 border-card">
                          {p?.avatar_url && <SmartAvatarImage src={p.avatar_url} alt="" />}
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {p ? initials(p) : <Users className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-foreground">
                        {active.title || "Group chat"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {groupMembers.length
                          ? `${groupMembers.length} members · tap to see everyone`
                          : "Group chat"}
                      </div>
                    </div>
                  </button>
                ) : (
                  <Avatar className="h-9 w-9">
                    {!active.is_group && active.other?.avatar_url && (
                      <SmartAvatarImage src={active.other.avatar_url} alt="" />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {active.is_group ? <Users className="h-5 w-5" /> : initials(active.other)}
                    </AvatarFallback>
                  </Avatar>
                )}
                {!active.is_group && (
                <div className="min-w-0">
                  {!active.is_group && active.other?.username ? (
                    <Link
                      to="/u/$username"
                      params={{ username: active.other.username }}
                      className="block truncate font-semibold text-foreground hover:underline"
                    >
                      {active.other?.display_name || active.other?.username}
                    </Link>
                  ) : (
                    <div className="truncate font-semibold text-foreground">
                      Unknown
                    </div>
                  )}
                  {active.other?.username ? (
                    <Link
                      to="/u/$username"
                      params={{ username: active.other.username }}
                      className="block truncate text-xs text-muted-foreground hover:underline"
                    >
                      @{active.other.username}
                    </Link>
                  ) : null}
                </div>
                )}
                <button
                  type="button"
                  onClick={() => setMsgSearchOpen((v) => !v)}
                  className="ml-auto rounded-full p-2 text-muted-foreground hover:bg-muted"
                  aria-label="Search in conversation"
                  title="Search in conversation"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
              {msgSearchOpen && (
                <div className="border-b border-border px-4 py-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={msgSearch}
                      onChange={(e) => setMsgSearch(e.target.value)}
                      autoFocus
                      placeholder="Search messages"
                      className="w-full rounded-full border border-border bg-muted py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
                {(msgSearch.trim() ? msgs.filter((m) => m.content.toLowerCase().includes(msgSearch.trim().toLowerCase())) : msgs).map((m, i, arr) => {
                  const mine = m.sender_id === me?.id;
                  const prev = arr[i - 1];
                  const next = arr[i + 1];
                  const showAvatar = !mine && (!next || next.sender_id !== m.sender_id);
                  const showTime = !next || next.sender_id !== m.sender_id;
                  const sender = active.is_group ? memberById.get(m.sender_id) : active.other;
                  const showSenderName =
                    !mine && active.is_group && (!prev || prev.sender_id !== m.sender_id);
                  return (
                    <div
                      key={m.id}
                      className={`group/msg flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${showTime ? "mb-3" : ""}`}
                    >
                      {!mine && (
                        <div className="w-7 shrink-0">
                          {showAvatar && sender?.username ? (
                            <Link to="/u/$username" params={{ username: sender.username }}>
                              <Avatar className="h-7 w-7">
                                {sender.avatar_url && (
                                  <SmartAvatarImage src={sender.avatar_url} alt="" />
                                )}
                                <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
                                  {initials(sender)}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                          ) : showAvatar && (
                            <Avatar className="h-7 w-7">
                              {sender?.avatar_url && (
                                <SmartAvatarImage src={sender.avatar_url} alt="" />
                              )}
                              <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
                                {initials(sender)}
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
                            className={`min-w-0 max-w-[68%] overflow-hidden break-words rounded-3xl px-4 py-2.5 text-sm leading-relaxed text-foreground ${
                              mine ? "bg-muted/70" : "border border-border bg-transparent"
                            }`}
                          >
                            {showSenderName && (
                              sender?.username ? (
                                <Link
                                  to="/u/$username"
                                  params={{ username: sender.username }}
                                  className="mb-1 block truncate text-xs font-semibold text-primary hover:underline"
                                >
                                  {sender.display_name || sender.username}
                                </Link>
                              ) : (
                                <div className="mb-1 truncate text-xs font-semibold text-muted-foreground">
                                  Member
                                </div>
                              )
                            )}
                            {shared ? (
                              <div className="space-y-2">
                                <SharePreviewCard preview={shared.preview} mine={mine} />
                                {shared.note && <div className="whitespace-pre-wrap break-words"><MentionText text={shared.note} /></div>}
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap break-words"><MentionText text={m.content} /></div>
                            )}
                            {showTime && (
                              <div className="mt-1 text-[10px] text-muted-foreground">
                                {formatWhen(m.created_at)}
                              </div>
                            )}
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
              <div className="shrink-0 border-t border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
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
                    onFocus={() => {
                      setTimeout(() => {
                        const el = scrollRef.current;
                        if (el) el.scrollTop = el.scrollHeight;
                      }, 250);
                    }}
                    className="max-h-32 flex-1 resize-none rounded-full border border-border bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
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

      <Dialog
        open={newOpen}
        onOpenChange={(v) => {
          if (creatingGroup) return;
          if (!v) resetNewDialog();
          setNewOpen(v);
        }}
      >
        <DialogContent
          hideClose
          className="w-full max-w-md gap-0 border border-border bg-card p-0 rounded-t-2xl sm:rounded-2xl"
        >
          <DialogHeader className="px-5 pb-3 pt-5 text-left">
            <DialogTitle className="text-lg font-bold text-foreground">
              {newStep === "confirm" ? "New group chat" : "Start a conversation"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {newStep === "confirm"
                ? `You're creating a group chat with ${selectedPeople.length} people.`
                : "Tap people to select. Pick 2 or more to make a group chat."}
            </p>
          </DialogHeader>
          {newStep === "confirm" ? (
            <div className="px-5 pb-5">
              <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-border bg-muted/40 p-4">
                {selectedPeople.map((p) => (
                  <div key={p.id} className="flex w-16 flex-col items-center gap-1">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        {p.avatar_url && <SmartAvatarImage src={p.avatar_url} alt="" />}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {initials(p)}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        onClick={() => {
                          const next = selectedPeople.filter((x) => x.id !== p.id);
                          setSelectedPeople(next);
                          if (next.length < 2) setNewStep("pick");
                        }}
                        aria-label={`Remove ${p.display_name || p.username}`}
                        className="absolute -right-1 -top-1 rounded-full bg-foreground p-0.5 text-background"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="w-full truncate text-center text-[11px] text-muted-foreground">
                      {(p.display_name || p.username || "").split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Group name (optional)
              </label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={defaultGroupName}
                className="mb-4 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setNewStep("pick")}
                  disabled={creatingGroup}
                  className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={createGroup}
                  disabled={creatingGroup}
                  className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {creatingGroup ? "Creating..." : "Create group chat"}
                </button>
              </div>
            </div>
          ) : (
          <div className="px-5 pb-5">
            {selectedPeople.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedPeople.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePerson(p)}
                    className="flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-1 pr-2 text-xs font-semibold text-primary"
                  >
                    <Avatar className="h-5 w-5">
                      {p.avatar_url && <SmartAvatarImage src={p.avatar_url} alt="" />}
                      <AvatarFallback className="bg-primary/20 text-[9px] text-primary">
                        {initials(p)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[100px] truncate">{p.display_name || p.username}</span>
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}
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
            <div className="max-h-[45vh] space-y-1 overflow-y-auto">
              {filteredPeople.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No people found</p>
              ) : (
                filteredPeople.map((p) => {
                  const isSelected = selectedPeople.some((x) => x.id === p.id);
                  return (
                  <button
                    key={p.id}
                    onClick={() => togglePerson(p)}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    <Avatar className="h-9 w-9">
                      {p.avatar_url && <SmartAvatarImage src={p.avatar_url} alt="" />}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {initials(p)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {p.display_name || p.username}
                      </div>
                      {p.username && (
                        <div className="truncate text-xs text-muted-foreground">@{p.username}</div>
                      )}
                    </div>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                  );
                })
              )}
            </div>
            <button
              disabled={selectedPeople.length === 0}
              onClick={() => {
                if (selectedPeople.length === 1) {
                  void startConv(selectedPeople[0].id);
                  setSelectedPeople([]);
                } else {
                  setNewStep("confirm");
                }
              }}
              className="mt-4 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              {selectedPeople.length > 1
                ? `Next: group chat with ${selectedPeople.length}`
                : selectedPeople.length === 1
                  ? `Message ${selectedPeople[0].display_name || selectedPeople[0].username}`
                  : "Select people"}
            </button>
          </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent
          hideClose
          className="w-full max-w-md gap-0 border border-border bg-card p-0 rounded-t-2xl sm:rounded-2xl"
        >
          <DialogHeader className="px-5 pb-3 pt-5 text-left">
            <div className="min-w-0">
              {renaming ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={renameValue}
                    maxLength={80}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void saveGroupName(); if (e.key === "Escape") setRenaming(false); }}
                    placeholder="Group name"
                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => void saveGroupName()}
                    disabled={savingName}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {savingName ? "Saving" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenaming(false)}
                    className="rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <DialogTitle className="truncate text-lg font-bold text-foreground">
                    {active?.title || "Group chat"}
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={() => { setRenameValue(active?.title || ""); setRenaming(true); }}
                    className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Rename group"
                    title="Rename group"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{groupMembers.length} members</p>
            </div>
          </DialogHeader>
          <div className="px-5 pb-5">
            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {groupMembers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No members found</p>
              ) : (
                groupMembers.map((p) =>
                  p.username ? (
                    <Link
                      key={p.id}
                      to="/u/$username"
                      params={{ username: p.username }}
                      onClick={() => setMembersOpen(false)}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                    >
                      <Avatar className="h-10 w-10">
                        {p.avatar_url && <SmartAvatarImage src={p.avatar_url} alt="" />}
                        <AvatarFallback className="bg-primary/10 text-primary">{initials(p)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {p.display_name || p.username}
                          {p.id === me?.id && <span className="ml-1 text-xs text-muted-foreground">(You)</span>}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">@{p.username}</div>
                      </div>
                    </Link>
                  ) : (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg p-2">
                      <Avatar className="h-10 w-10">
                        {p.avatar_url && <SmartAvatarImage src={p.avatar_url} alt="" />}
                        <AvatarFallback className="bg-primary/10 text-primary">{initials(p)}</AvatarFallback>
                      </Avatar>
                      <div className="truncate text-sm font-semibold text-foreground">
                        {p.display_name || "Member"}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={broadcastOpen}
        onOpenChange={(v) => {
          if (!v && broadcasting) return;
          setBroadcastOpen(v);
        }}
      >
        <DialogContent
          hideClose
          className="w-full max-w-md gap-0 border border-border bg-card p-0 rounded-2xl"
        >
          <DialogHeader className="px-5 pb-3 pt-5 text-left">
            <DialogTitle className="text-lg font-bold text-foreground">
              Message all followers
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5">
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
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}