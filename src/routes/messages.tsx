import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Plus, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
  head: () => ({ meta: [{ title: "Messages - Planet Baltimore" }] }),
});

type Conv = {
  id: string; user_a: string; user_b: string; last_message_at: string;
  other?: { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
  preview?: string;
};
type Msg = { id: string; sender_id: string; content: string; created_at: string };

function MessagesPage() {
  const me = useCurrentProfile();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [people, setPeople] = useState<{ id: string; username: string | null; display_name: string | null }[]>([]);

  const loadConvs = async () => {
    if (!me) return;
    const { data } = await supabase.from("conversations").select("*")
      .or(`user_a.eq.${me.id},user_b.eq.${me.id}`).order("last_message_at", { ascending: false });
    const list = (data || []) as Conv[];
    const otherIds = list.map((c) => (c.user_a === me.id ? c.user_b : c.user_a));
    if (otherIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", otherIds);
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((c) => { c.other = byId.get(c.user_a === me.id ? c.user_b : c.user_a) as any; });
    }
    setConvs(list);
  };

  const loadMsgs = async (c: Conv) => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", c.id).order("created_at");
    setMsgs((data || []) as Msg[]);
  };

  useEffect(() => { loadConvs(); }, [me]);
  useEffect(() => { if (active) loadMsgs(active); }, [active]);

  const send = async () => {
    if (!active || !me || !draft.trim()) return;
    const { error } = await supabase.from("messages").insert({ conversation_id: active.id, sender_id: me.id, content: draft.trim() });
    if (error) { toast.error(error.message); return; }
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", active.id);
    setDraft(""); loadMsgs(active); loadConvs();
  };

  const openNew = async () => {
    setNewOpen(true);
    const { data } = await supabase.from("profiles").select("id, username, display_name").neq("id", me?.id || "").limit(50);
    setPeople(data || []);
  };

  const startConv = async (otherId: string) => {
    if (!me) return;
    const [a, b] = me.id < otherId ? [me.id, otherId] : [otherId, me.id];
    const { data: existing } = await supabase.from("conversations").select("*").eq("user_a", a).eq("user_b", b).maybeSingle();
    let conv = existing as Conv | null;
    if (!conv) {
      const { data: created, error } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select().single();
      if (error) { toast.error(error.message); return; }
      conv = created as Conv;
    }
    setNewOpen(false); await loadConvs(); setActive(conv);
  };

  return (
    <AppLayout title="" hero={false}>
      <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white md:grid-cols-[340px_1fr]">
        <div className="flex flex-col border-r border-neutral-200">
          <div className="border-b border-neutral-200 p-4">
            <h2 className="mb-3 text-2xl font-bold">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…"
                className="w-full rounded-full border border-neutral-200 bg-neutral-50 py-2 pl-10 pr-3 text-sm focus:border-orange-400 focus:outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-neutral-400">
                <MessageSquare className="h-8 w-8" /> No conversations yet
              </div>
            ) : convs
              .filter((c) => !search || (c.other?.username || "").toLowerCase().includes(search.toLowerCase()) || (c.other?.display_name || "").toLowerCase().includes(search.toLowerCase()))
              .map((c) => (
              <button key={c.id} onClick={() => setActive(c)}
                className={`flex w-full items-center gap-3 border-b border-neutral-100 px-4 py-3 text-left hover:bg-neutral-50 ${active?.id===c.id ? "bg-orange-50" : ""}`}>
                <Avatar className="h-10 w-10"><AvatarFallback className="bg-orange-100 text-orange-700">{(c.other?.username || c.other?.display_name || "U")[0].toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.other?.display_name || c.other?.username || "Unknown"}</div>
                  <div className="text-xs text-neutral-500">{new Date(c.last_message_at).toLocaleDateString()}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="space-y-2 border-t border-neutral-200 p-3">
            <button onClick={openNew} className="flex w-full items-center justify-center gap-2 rounded-full bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">
              <Plus className="h-4 w-4" /> New Message
            </button>
            <button
              onClick={() => toast.info("Broadcast to followers is coming soon")}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold hover:bg-neutral-50"
            >
              <Users className="h-4 w-4" /> Message All Followers
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full bg-neutral-100 p-4"><MessageSquare className="h-6 w-6 text-neutral-400" /></div>
              <h3 className="text-lg font-bold">Select a conversation</h3>
              <p className="max-w-xs text-sm text-neutral-500">Choose from your existing conversations or start a new one with an artist or arts organization.</p>
              <button onClick={openNew} className="mt-2 inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">
                <Plus className="h-4 w-4" /> Start a Conversation
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-neutral-200 px-5 py-3">
                <div className="font-semibold">{active.other?.display_name || active.other?.username}</div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id===me?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${m.sender_id===me?.id ? "bg-orange-600 text-white" : "bg-neutral-100 text-neutral-800"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-200 p-4">
                <div className="flex gap-2">
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key==="Enter" && send()}
                    placeholder="Type a message…" className="flex-1 rounded-full border border-neutral-200 px-4 py-2 text-sm focus:border-orange-400 focus:outline-none" />
                  <button onClick={send} className="rounded-full bg-orange-600 p-2.5 text-white hover:bg-orange-700"><Send className="h-4 w-4" /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setNewOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-xl font-bold">Start a Conversation</h2>
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {people.map((p) => (
                <button key={p.id} onClick={() => startConv(p.id)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-neutral-100">
                  <Avatar className="h-8 w-8"><AvatarFallback className="bg-orange-100 text-orange-700">{(p.username || p.display_name || "U")[0].toUpperCase()}</AvatarFallback></Avatar>
                  <div>
                    <div className="text-sm font-semibold">{p.display_name || p.username}</div>
                    <div className="text-xs text-neutral-500">@{p.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}