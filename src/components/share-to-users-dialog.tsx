import { useEffect, useMemo, useState } from "react";
import { Send, Users, X, Search, Link as LinkIcon, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { toast } from "sonner";
import { encodeSharePreview, type SharePreview } from "@/lib/share-preview";

type Person = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

function initials(name: string | null | undefined) {
  return (name || "U").trim()[0]?.toUpperCase() || "U";
}

export function ShareToUsersDialog({
  open,
  onClose,
  url,
  title,
  preview,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  preview?: SharePreview;
}) {
  const me = useCurrentProfile();
  const [people, setPeople] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !me?.id) return;
    setLoading(true);
    (async () => {
      // Followers + following as the default list of people you know.
      const [flw, fwg] = await Promise.all([
        supabase.from("follows").select("follower_id").eq("following_id", me.id),
        supabase.from("follows").select("following_id").eq("follower_id", me.id),
      ]);
      const ids = Array.from(
        new Set([
          ...(flw.data ?? []).map((r: { follower_id: string }) => r.follower_id),
          ...(fwg.data ?? []).map((r: { following_id: string }) => r.following_id),
        ]),
      ).filter((id) => id !== me.id);
      if (ids.length === 0) {
        setPeople([]);
        setLoading(false);
        return;
      }
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      setPeople(((profs as Person[]) ?? []).slice(0, 200));
      setLoading(false);
    })();
  }, [open, me?.id]);

  useEffect(() => {
    if (!open) {
      setSelected({});
      setNote("");
      setQ("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return people;
    return people.filter(
      (p) =>
        (p.display_name || "").toLowerCase().includes(term) ||
        (p.username || "").toLowerCase().includes(term),
    );
  }, [people, q]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const send = async () => {
    if (!me) {
      toast.error("Please sign in");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Pick at least one person");
      return;
    }
    setSending(true);
    try {
      const body = preview
        ? encodeSharePreview({ ...preview, url }, note)
        : `${note.trim() ? note.trim() + "\n\n" : ""}${title ? title + "\n" : ""}${url}`;
      // Send one direct message per recipient. Reuse an existing 1:1 conversation if any.
      for (const uid of selectedIds) {
        const { data: mine } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", me.id);
        const myConvIds = (mine ?? []).map((r: { conversation_id: string }) => r.conversation_id);
        let convId: string | null = null;
        if (myConvIds.length) {
          const { data: shared } = await supabase
            .from("conversation_members")
            .select("conversation_id")
            .eq("user_id", uid)
            .in("conversation_id", myConvIds);
          convId = (shared ?? [])[0]?.conversation_id ?? null;
        }
        if (!convId) {
          const { data: conv, error } = await supabase
            .from("conversations")
            .insert({
              is_group: false,
              created_by: me.id,
              user_a: me.id,
              user_b: uid,
              last_message_preview: (title || url).slice(0, 140),
            })
            .select("id")
            .single();
          if (error || !conv) throw error || new Error("Could not create conversation");
          convId = conv.id;
          const { error: mErr } = await supabase.from("conversation_members").insert([
            { conversation_id: convId, user_id: me.id },
            { conversation_id: convId, user_id: uid },
          ]);
          if (mErr) throw mErr;
        }
        const { error: msgErr } = await supabase
          .from("messages")
          .insert({ conversation_id: convId, sender_id: me.id, content: body });
        if (msgErr) throw msgErr;
      }
      toast.success(`Shared with ${selectedIds.length} ${selectedIds.length === 1 ? "person" : "people"}`);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to share");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="text-lg font-bold text-neutral-900">Share</div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-800 hover:border-[#d4580a] hover:bg-orange-50/40"
          >
            <LinkIcon className="h-4 w-4" /> Copy link
          </button>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people you follow…"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-600">
              <Users className="h-3.5 w-3.5" /> People ({selectedIds.length} selected)
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-neutral-500">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-neutral-500">
                  {people.length === 0 ? "Follow some people to share with them." : "No matches."}
                </div>
              ) : (
                filtered.map((p) => {
                  const on = !!selected[p.id];
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className="flex w-full items-center gap-3 border-b border-neutral-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-neutral-50"
                    >
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#d4580a]/10 text-xs font-bold text-[#d4580a]">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(p.display_name || p.username)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-neutral-900">{p.display_name || p.username}</div>
                        {p.username && <div className="truncate text-xs text-neutral-500">@{p.username}</div>}
                      </div>
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                          on ? "border-[#d4580a] bg-[#d4580a] text-white" : "border-neutral-300 text-transparent"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add a note (optional)"
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
          />
        </div>

        <div className="border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            disabled={sending || selectedIds.length === 0}
            onClick={send}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4580a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#b8480a] disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <Send className="h-4 w-4" />
            {sending
              ? "Sending…"
              : selectedIds.length > 0
              ? `Send to ${selectedIds.length} ${selectedIds.length === 1 ? "person" : "people"}`
              : "Select people to share"}
          </button>
        </div>
      </div>
    </div>
  );
}