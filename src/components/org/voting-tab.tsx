import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Plus, Trash2, X, Check } from "lucide-react";

const VOTE_TYPES = {
  yes_no: { label: "Yes / No", choices: ["Yes", "No"] },
  yes_no_abstain: { label: "Yes / No / Abstain", choices: ["Yes", "No", "Abstain"] },
  approve_reject: { label: "Approve / Reject", choices: ["Approve", "Reject"] },
} as const;

type VoteTypeKey = keyof typeof VOTE_TYPES;

function choicesFor(type: string): readonly string[] {
  return (VOTE_TYPES[type as VoteTypeKey] ?? VOTE_TYPES.yes_no).choices;
}

type VoteItem = {
  id: string;
  title: string;
  description: string | null;
  vote_type: string;
  starts_at: string;
  ends_at: string;
  created_by: string;
  tally: Record<string, number>;
  total: number;
  myChoice: string | null;
};

function statusOf(v: VoteItem) {
  const now = Date.now();
  if (new Date(v.starts_at).getTime() > now) return "upcoming" as const;
  if (new Date(v.ends_at).getTime() < now) return "closed" as const;
  return "open" as const;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function VotingTab({ orgId, canManage, me }: { orgId: string; canManage: boolean; me: string | null }) {
  const [items, setItems] = useState<VoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from("organization_votes")
      .select("id, title, description, vote_type, starts_at, ends_at, created_by")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) { toast.error("Could not load voting items"); setLoading(false); return; }
    const ids = (rows ?? []).map((r) => r.id);
    let ballots: { vote_id: string; user_id: string; choice: string }[] = [];
    if (ids.length) {
      const { data: b } = await supabase
        .from("organization_vote_ballots")
        .select("vote_id, user_id, choice")
        .in("vote_id", ids);
      ballots = b ?? [];
    }
    setItems((rows ?? []).map((r) => {
      const mine = ballots.find((b) => b.vote_id === r.id && b.user_id === me) ?? null;
      const cast = ballots.filter((b) => b.vote_id === r.id);
      const tally: Record<string, number> = {};
      for (const c of choicesFor(r.vote_type)) tally[c] = cast.filter((b) => b.choice === c).length;
      return { ...r, tally, total: cast.length, myChoice: mine?.choice ?? null };
    }));
    setLoading(false);
  }, [orgId, me]);

  useEffect(() => { void load(); }, [load]);

  async function cast(item: VoteItem, choice: string) {
    if (!me) { toast.error("Sign in to vote"); return; }
    if (statusOf(item) !== "open") return;
    const prev = items;
    setItems((cur) => cur.map((v) => {
      if (v.id !== item.id) return v;
      const tally = { ...v.tally };
      if (v.myChoice) tally[v.myChoice] = Math.max(0, (tally[v.myChoice] ?? 0) - 1);
      tally[choice] = (tally[choice] ?? 0) + 1;
      return { ...v, tally, myChoice: choice, total: v.myChoice ? v.total : v.total + 1 };
    }));
    const { error } = await supabase
      .from("organization_vote_ballots")
      .upsert({ vote_id: item.id, user_id: me, choice }, { onConflict: "vote_id,user_id" });
    if (error) { setItems(prev); toast.error("Could not record your vote"); return; }
    toast.success(`You voted ${choice}`);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this voting item and all its votes?")) return;
    const prev = items;
    setItems((cur) => cur.filter((v) => v.id !== id));
    const { error } = await supabase.from("organization_votes").delete().eq("id", id);
    if (error) { setItems(prev); toast.error("Could not delete voting item"); return; }
    toast.success("Voting item deleted");
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-5 text-sm font-semibold text-neutral-600 transition hover:border-[#d4580a] hover:text-[#d4580a]"
        >
          <Plus className="h-4 w-4" /> Create New Voting
        </button>
      )}

      {loading ? (
        <div className="py-14 text-center text-sm text-neutral-500">Loading voting items…</div>
      ) : items.length === 0 ? (
        <div className="py-14 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
          <p className="text-sm font-medium text-neutral-600">No voting items yet.</p>
          <p className="mt-1 text-sm text-neutral-500">
            {canManage ? "Create one to start gathering community input." : "Check back soon for community votes."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((v) => {
            const status = statusOf(v);
            const owns = canManage || v.created_by === me;
            const showResults = !!v.myChoice || status === "closed" || canManage;
            return (
              <article key={v.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-neutral-900">{v.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        status === "open" ? "bg-green-100 text-green-700"
                        : status === "upcoming" ? "bg-amber-100 text-amber-700"
                        : "bg-neutral-100 text-neutral-600"}`}>
                        {status === "open" ? "Open" : status === "upcoming" ? "Upcoming" : "Closed"}
                      </span>
                    </div>
                    {v.description && <p className="mt-1 text-sm text-neutral-600">{v.description}</p>}
                    <p className="mt-1 text-xs text-neutral-500">{fmt(v.starts_at)} – {fmt(v.ends_at)}</p>
                  </div>
                  {owns && (
                    <button
                      onClick={() => void remove(v.id)}
                      aria-label="Delete voting item"
                      className="shrink-0 rounded-full p-2 text-neutral-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {choicesFor(v.vote_type).map((c) => {
                    const count = v.tally[c] ?? 0;
                    const pct = v.total ? Math.round((count / v.total) * 100) : 0;
                    const mine = v.myChoice === c;
                    const disabled = status !== "open" || !me;
                    return (
                      <button
                        key={c}
                        disabled={disabled}
                        onClick={() => void cast(v, c)}
                        className={`relative block w-full overflow-hidden rounded-xl border px-4 py-3 text-left text-sm transition ${
                          mine ? "border-[#d4580a] bg-[#d4580a]/5 font-semibold text-neutral-900" : "border-neutral-200 text-neutral-800"
                        } ${disabled ? "cursor-default" : "hover:border-[#d4580a]"}`}
                      >
                        {showResults && (
                          <span aria-hidden className={`absolute inset-y-0 left-0 ${mine ? "bg-[#d4580a]/15" : "bg-neutral-100"}`} style={{ width: `${pct}%` }} />
                        )}
                        <span className="relative flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2">
                            {mine && <Check className="h-4 w-4 shrink-0 text-[#d4580a]" />}
                            <span className="truncate">{c}</span>
                          </span>
                          {showResults && <span className="shrink-0 text-xs font-semibold text-neutral-600">{count} · {pct}%</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span>{v.total} {v.total === 1 ? "vote" : "votes"}</span>
                  {status === "upcoming" && <><span>·</span><span>Opens {fmt(v.starts_at)}</span></>}
                  {status === "closed" && <><span>·</span><span>Voting ended</span></>}
                  {!me && <><span>·</span><span>Sign in to vote</span></>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {open && <CreateVotingDialog orgId={orgId} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); void load(); }} />}
    </div>
  );
}

function localInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function CreateVotingDialog({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [voteType, setVoteType] = useState<VoteTypeKey>("yes_no");
  const [startsAt, setStartsAt] = useState(localInput(now));
  const [endsAt, setEndsAt] = useState(localInput(week));
  const [saving, setSaving] = useState(false);
  const valid = title.trim().length > 0 && !!startsAt && !!endsAt && new Date(endsAt) > new Date(startsAt);

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { toast.error("Sign in to create a voting item"); setSaving(false); return; }
    const { error } = await supabase.from("organization_votes").insert({
      org_id: orgId,
      created_by: uid,
      title: title.trim(),
      description: description.trim() || null,
      vote_type: voteType,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
    });
    if (error) { toast.error("Could not create voting item"); setSaving(false); return; }
    toast.success("Voting created");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-bold text-neutral-900">Create Voting</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor="vote-title" className="mb-1.5 block text-sm font-semibold text-neutral-800">Issue Title *</label>
            <input
              id="vote-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Should we host monthly community events?"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#d4580a]"
            />
          </div>
          <div>
            <label htmlFor="vote-desc" className="mb-1.5 block text-sm font-semibold text-neutral-800">Description</label>
            <textarea
              id="vote-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context for the vote..."
              className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#d4580a]"
            />
          </div>
          <div>
            <label htmlFor="vote-type" className="mb-1.5 block text-sm font-semibold text-neutral-800">Voting Type</label>
            <select
              id="vote-type" value={voteType} onChange={(e) => setVoteType(e.target.value as VoteTypeKey)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#d4580a]"
            >
              {Object.entries(VOTE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vote-start" className="mb-1.5 block text-sm font-semibold text-neutral-800">Start Date</label>
              <input id="vote-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#d4580a]" />
            </div>
            <div>
              <label htmlFor="vote-end" className="mb-1.5 block text-sm font-semibold text-neutral-800">End Date</label>
              <input id="vote-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#d4580a]" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-neutral-200 px-5 py-4">
          <button onClick={onClose} className="w-full rounded-xl border border-neutral-300 py-3 text-sm font-semibold text-neutral-800">Cancel</button>
          <button
            onClick={() => void submit()} disabled={!valid || saving}
            className="w-full rounded-xl bg-[#d4580a] py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {saving ? "Creating…" : "Create Voting"}
          </button>
        </div>
      </div>
    </div>
  );
}
