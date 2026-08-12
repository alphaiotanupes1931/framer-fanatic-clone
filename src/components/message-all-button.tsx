import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessageSquarePlus, Search, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { SmartAvatarImage } from "@/components/shared/smart-img";

export type MessageAllCandidate = {
  id: string;
  display_name: string | null;
  username?: string | null;
  avatar_url?: string | null;
  subtitle?: string | null;
};

function initials(name: string | null | undefined) {
  return (name || "U").trim()[0]?.toUpperCase() || "U";
}

export function MessageAllButton({
  label = "Message All",
  audienceLabel,
  loadCandidates,
  defaultGroupName,
  initialMessage,
  triggerClassName,
}: {
  label?: string;
  audienceLabel: string;
  loadCandidates: () => Promise<MessageAllCandidate[]>;
  defaultGroupName?: string;
  /** Optional first message posted into the new group (used to share polls and votes). */
  initialMessage?: string;
  triggerClassName?: string;
}) {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<MessageAllCandidate[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, MessageAllCandidate>>({});
  const [name, setName] = useState(defaultGroupName || `${audienceLabel} group chat`);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadCandidates()
      .then((list) => setPeople(list.filter((p) => p.id !== me?.id)))
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [open, loadCandidates, me?.id]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return people;
    return people.filter(
      (p) =>
        (p.display_name || "").toLowerCase().includes(needle) ||
        (p.username || "").toLowerCase().includes(needle) ||
        (p.subtitle || "").toLowerCase().includes(needle),
    );
  }, [people, q]);

  const selectedList = Object.values(selected);

  const toggle = (p: MessageAllCandidate) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = p;
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const p of filtered) next[p.id] = p;
      return next;
    });
  };

  const clearAll = () => setSelected({});

  const create = async () => {
    if (!me) {
      toast.error("Please sign in first");
      return;
    }
    if (selectedList.length < 1) {
      toast.error("Select at least one person");
      return;
    }
    const title = name.trim() || `${audienceLabel} group chat`;
    setSaving(true);
    try {
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          is_group: true,
          title,
          created_by: me.id,
          last_message_preview: `${me.display_name || "Someone"} started the group`,
        })
        .select("id")
        .single();
      if (error || !conv) throw error || new Error("Could not create group");
      const rows = [
        { conversation_id: conv.id, user_id: me.id },
        ...selectedList.map((p) => ({ conversation_id: conv.id, user_id: p.id })),
      ];
      const { error: mErr } = await supabase.from("conversation_members").insert(rows);
      if (mErr) throw mErr;
      if (initialMessage?.trim()) {
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          sender_id: me.id,
          content: initialMessage.trim(),
        });
      }
      toast.success(`Group chat created with ${selectedList.length + 1} members`);
      window.localStorage.setItem("pb_open_conversation", conv.id);
      setOpen(false);
      setSelected({});
      navigate({ to: "/messages" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "inline-flex items-center gap-2 rounded-full border border-[#d4580a]/40 bg-white px-4 py-2 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"}
      >
        <MessageSquarePlus className="h-4 w-4" /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <div className="text-lg font-bold text-neutral-900">Create group chat</div>
                <div className="text-xs text-neutral-500">Pick people from {audienceLabel.toLowerCase()}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 px-5 pt-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Group name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Group name"
                  className="mt-1 w-full rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
                />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search people"
                  className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-10 pr-3 text-sm focus:border-orange-400 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>{selectedList.length} selected</span>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAllVisible} className="font-semibold text-[#d4580a] hover:underline">
                    Select all
                  </button>
                  {selectedList.length > 0 && (
                    <button type="button" onClick={clearAll} className="font-semibold text-neutral-500 hover:underline">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto border-t border-neutral-100">
              {loading ? (
                <div className="p-6 text-center text-sm text-neutral-500">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-neutral-500">No people to show.</div>
              ) : (
                filtered.map((p) => {
                  const isSel = !!selected[p.id];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggle(p)}
                      className={`flex w-full items-center gap-3 border-b border-neutral-100 px-5 py-3 text-left transition hover:bg-neutral-50 ${
                        isSel ? "bg-orange-50" : ""
                      }`}
                    >
                      <Avatar className="h-9 w-9">
                        {p.avatar_url && <SmartAvatarImage src={p.avatar_url} alt="" />}
                        <AvatarFallback className="bg-[#d4580a]/10 text-[#d4580a]">
                          {initials(p.display_name || p.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-neutral-900">
                          {p.display_name || p.username || "Unnamed"}
                        </div>
                        {p.subtitle && (
                          <div className="truncate text-xs text-neutral-500">{p.subtitle}</div>
                        )}
                      </div>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          isSel ? "border-[#d4580a] bg-[#d4580a] text-white" : "border-neutral-300 bg-white"
                        }`}
                      >
                        {isSel && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || selectedList.length === 0}
                onClick={create}
                className="rounded-full bg-[#d4580a] px-5 py-2 text-sm font-semibold text-white hover:bg-[#b8480a] disabled:opacity-50"
              >
                {saving ? "Creating…" : `Create group (${selectedList.length + 1})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
