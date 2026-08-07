import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart3, Plus, Trash2, X, Check, Lock, Unlock } from "lucide-react";
import { timeAgo } from "@/lib/text-utils";

type Poll = {
  id: string;
  question: string;
  is_closed: boolean;
  created_at: string;
  created_by: string;
  options: { id: string; label: string; votes: number }[];
  total: number;
  myOption: string | null;
};

export function PollsTab({ orgId, canManage, me }: { orgId: string; canManage: boolean; me: string | null }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from("organization_polls")
      .select("id, question, is_closed, created_at, created_by, organization_poll_options(id, label, sort_order)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) { toast.error("Could not load polls"); setLoading(false); return; }
    const ids = (rows ?? []).map((r) => r.id);
    let votes: { poll_id: string; option_id: string; user_id: string }[] = [];
    if (ids.length) {
      const { data: v } = await supabase
        .from("organization_poll_votes")
        .select("poll_id, option_id, user_id")
        .in("poll_id", ids);
      votes = v ?? [];
    }
    setPolls(
      (rows ?? []).map((r) => {
        const mine = votes.find((v) => v.poll_id === r.id && v.user_id === me) ?? null;
        const pollVotes = votes.filter((v) => v.poll_id === r.id);
        const options = [...(r.organization_poll_options ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((o) => ({ id: o.id, label: o.label, votes: pollVotes.filter((v) => v.option_id === o.id).length }));
        return {
          id: r.id, question: r.question, is_closed: r.is_closed, created_at: r.created_at,
          created_by: r.created_by, options, total: pollVotes.length, myOption: mine?.option_id ?? null,
        };
      }),
    );
    setLoading(false);
  }, [orgId, me]);

  useEffect(() => { void load(); }, [load]);

  async function vote(poll: Poll, optionId: string) {
    if (!me) { toast.error("Sign in to vote"); return; }
    if (poll.is_closed) return;
    const prev = polls;
    // Optimistic update
    setPolls((cur) => cur.map((p) => {
      if (p.id !== poll.id) return p;
      const had = p.myOption;
      return {
        ...p,
        myOption: optionId,
        total: had ? p.total : p.total + 1,
        options: p.options.map((o) => ({
          ...o,
          votes: o.votes + (o.id === optionId ? 1 : 0) - (had && o.id === had ? 1 : 0),
        })),
      };
    }));
    const { error } = await supabase
      .from("organization_poll_votes")
      .upsert({ poll_id: poll.id, option_id: optionId, user_id: me }, { onConflict: "poll_id,user_id" });
    if (error) { setPolls(prev); toast.error("Could not record your vote"); }
  }

  async function removePoll(id: string) {
    if (!window.confirm("Delete this poll and all its votes?")) return;
    const prev = polls;
    setPolls((cur) => cur.filter((p) => p.id !== id));
    const { error } = await supabase.from("organization_polls").delete().eq("id", id);
    if (error) { setPolls(prev); toast.error("Could not delete poll"); return; }
    toast.success("Poll deleted");
  }

  async function toggleClosed(poll: Poll) {
    const next = !poll.is_closed;
    setPolls((cur) => cur.map((p) => (p.id === poll.id ? { ...p, is_closed: next } : p)));
    const { error } = await supabase.from("organization_polls").update({ is_closed: next }).eq("id", poll.id);
    if (error) {
      setPolls((cur) => cur.map((p) => (p.id === poll.id ? { ...p, is_closed: !next } : p)));
      toast.error("Could not update poll");
      return;
    }
    toast.success(next ? "Poll closed" : "Poll reopened");
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-5 text-sm font-semibold text-neutral-600 transition hover:border-[#d4580a] hover:text-[#d4580a]"
        >
          <Plus className="h-4 w-4" /> Create Poll
        </button>
      )}

      {loading ? (
        <div className="py-14 text-center text-sm text-neutral-500">Loading polls…</div>
      ) : polls.length === 0 ? (
        <div className="py-14 text-center">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
          <p className="text-sm font-medium text-neutral-600">No polls yet.</p>
          <p className="mt-1 text-sm text-neutral-500">
            {canManage ? "Create a poll to gather community feedback." : "Check back soon for community polls."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((p) => {
            const voted = !!p.myOption;
            const showResults = voted || p.is_closed || canManage;
            const owns = canManage || p.created_by === me;
            return (
              <article key={p.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <h3 className="min-w-0 text-base font-bold text-neutral-900">{p.question}</h3>
                  {owns && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => void toggleClosed(p)}
                        aria-label={p.is_closed ? "Reopen poll" : "Close poll"}
                        className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
                      >
                        {p.is_closed ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => void removePoll(p.id)}
                        aria-label="Delete poll"
                        className="rounded-full p-2 text-neutral-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {p.options.map((o) => {
                    const pct = p.total ? Math.round((o.votes / p.total) * 100) : 0;
                    const mine = p.myOption === o.id;
                    return (
                      <button
                        key={o.id}
                        disabled={p.is_closed || !me}
                        onClick={() => void vote(p, o.id)}
                        className={`relative block w-full overflow-hidden rounded-xl border px-4 py-3 text-left text-sm transition ${
                          mine ? "border-[#d4580a] bg-[#d4580a]/5 font-semibold text-neutral-900" : "border-neutral-200 text-neutral-800"
                        } ${p.is_closed || !me ? "cursor-default" : "hover:border-[#d4580a]"}`}
                      >
                        {showResults && (
                          <span
                            aria-hidden
                            className={`absolute inset-y-0 left-0 ${mine ? "bg-[#d4580a]/15" : "bg-neutral-100"}`}
                            style={{ width: `${pct}%` }}
                          />
                        )}
                        <span className="relative flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2">
                            {mine && <Check className="h-4 w-4 shrink-0 text-[#d4580a]" />}
                            <span className="truncate">{o.label}</span>
                          </span>
                          {showResults && (
                            <span className="shrink-0 text-xs font-semibold text-neutral-600">{pct}%</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span>{p.total} {p.total === 1 ? "vote" : "votes"}</span>
                  <span>·</span>
                  <span>{timeAgo(p.created_at)}</span>
                  {p.is_closed && <><span>·</span><span className="font-semibold text-neutral-600">Closed</span></>}
                  {!me && <><span>·</span><span>Sign in to vote</span></>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {open && <CreatePollDialog orgId={orgId} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); void load(); }} />}
    </div>
  );
}

function CreatePollDialog({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);
  const valid = question.trim().length > 0 && options.filter((o) => o.trim()).length >= 2;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { toast.error("Sign in to create a poll"); setSaving(false); return; }
    const { data: poll, error } = await supabase
      .from("organization_polls")
      .insert({ org_id: orgId, created_by: uid, question: question.trim() })
      .select("id")
      .single();
    if (error || !poll) { toast.error("Could not create poll"); setSaving(false); return; }
    const rows = options.map((o) => o.trim()).filter(Boolean).map((label, i) => ({ poll_id: poll.id, label, sort_order: i }));
    const { error: optErr } = await supabase.from("organization_poll_options").insert(rows);
    if (optErr) {
      await supabase.from("organization_polls").delete().eq("id", poll.id);
      toast.error("Could not save answer options");
      setSaving(false);
      return;
    }
    toast.success("Poll launched");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-900">
            <BarChart3 className="h-4 w-4" /> Create Poll
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-800" htmlFor="poll-question">Poll question</label>
            <textarea
              id="poll-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              placeholder="Ask the community something..."
              className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#d4580a]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-800">Answer options</label>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={o}
                    onChange={(e) => setOptions((cur) => cur.map((v, idx) => (idx === i ? e.target.value : v)))}
                    placeholder={`Option ${i + 1}`}
                    aria-label={`Option ${i + 1}`}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#d4580a]"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => setOptions((cur) => cur.filter((_, idx) => idx !== i))}
                      aria-label={`Remove option ${i + 1}`}
                      className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 8 && (
              <button
                onClick={() => setOptions((cur) => [...cur, ""])}
                className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-[#d4580a]"
              >
                <Plus className="h-4 w-4" /> Add option
              </button>
            )}
          </div>
        </div>
        <div className="border-t border-neutral-200 px-5 py-4">
          <button
            onClick={() => void submit()}
            disabled={!valid || saving}
            className="w-full rounded-xl bg-[#d4580a] py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {saving ? "Launching…" : "Launch Poll"}
          </button>
        </div>
      </div>
    </div>
  );
}
