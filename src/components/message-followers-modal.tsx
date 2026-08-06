import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Users, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { toast } from "sonner";
import { Img } from "@/components/shared/smart-img";

type Follower = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

function initials(name: string | null | undefined) {
  return (name || "U").trim()[0]?.toUpperCase() || "U";
}

export function MessageFollowersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !me?.id) return;
    const apply = (list: Follower[]) => {
      setFollowers(list);
      setSelected(Object.fromEntries(list.map((p) => [p.id, true])));
    };
    const snap = getConnectionsSnapshot(me.id);
    if (snap) apply(snap.followers as Follower[]);
    setLoading(!snap);
    let cancelled = false;
    void loadConnections(me.id).then((s) => {
      if (cancelled) return;
      apply(s.followers as Follower[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, me?.id]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const allSelected = followers.length > 0 && selectedIds.length === followers.length;

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const toggleAll = () => {
    if (allSelected) setSelected({});
    else setSelected(Object.fromEntries(followers.map((f) => [f.id, true])));
  };

  const send = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (selectedIds.length === 0) { toast.error("Select at least one follower"); return; }
    if (!message.trim()) { toast.error("Write a message"); return; }
    setSending(true);
    try {
      const title = subject.trim() || `Message from ${me.display_name || me.username || "me"}`;
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({ is_group: true, title, created_by: me.id, last_message_preview: message.slice(0, 140) })
        .select("id")
        .single();
      if (error || !conv) throw error || new Error("Could not create group");
      const memberRows = [
        { conversation_id: conv.id, user_id: me.id },
        ...selectedIds.map((uid) => ({ conversation_id: conv.id, user_id: uid })),
      ];
      const { error: mErr } = await supabase.from("conversation_members").insert(memberRows);
      if (mErr) throw mErr;
      const content = subject.trim() ? `${subject.trim()}\n\n${message}` : message;
      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: me.id,
        content,
      });
      if (msgErr) throw msgErr;
      toast.success(`Sent to ${selectedIds.length} follower${selectedIds.length === 1 ? "" : "s"}`);
      window.localStorage.setItem("pb_open_conversation", conv.id);
      onClose();
      setSubject(""); setMessage("");
      navigate({ to: "/messages" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-neutral-700" />
            <div className="text-lg font-bold text-neutral-900">Message Followers</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="text-sm font-semibold text-neutral-800">Subject (optional)</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`Message from ${me?.username || me?.display_name || "me"}`}
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-neutral-800">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              rows={5}
              className="mt-1.5 w-full resize-none rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2.5">
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-600">
                Recipients ({selectedIds.length} of {followers.length})
              </div>
              {followers.length > 0 && (
                <button type="button" onClick={toggleAll} className="flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-[#d4580a]">
                  <Users className="h-3.5 w-3.5" /> {allSelected ? "Clear all" : "Select all"}
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-neutral-500">Loading…</div>
              ) : followers.length === 0 ? (
                <div className="p-6 text-center text-sm text-neutral-500">You don't have any followers yet.</div>
              ) : (
                followers.map((f) => (
                  <label key={f.id} className="flex cursor-pointer items-center gap-3 border-b border-neutral-100 px-4 py-2.5 last:border-b-0 hover:bg-neutral-50">
                    <input type="checkbox" checked={!!selected[f.id]} onChange={() => toggle(f.id)} className="h-4 w-4 accent-[#d4580a]" />
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#d4580a]/10 text-xs font-bold text-[#d4580a]">
                      {f.avatar_url ? <Img src={f.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(f.display_name || f.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-neutral-900">{f.display_name || f.username}</div>
                      {f.username && <div className="truncate text-xs text-neutral-500">@{f.username}</div>}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            disabled={sending || selectedIds.length === 0 || !message.trim()}
            onClick={send}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4580a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#b8480a] disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending…" : `Send to ${selectedIds.length} Follower${selectedIds.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}