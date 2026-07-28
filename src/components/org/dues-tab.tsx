import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createDuesCheckout } from "@/lib/stripe.functions";
import { Loader2, Plus, Trash2, Check, X, DollarSign, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Tier = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  amount_cents: number;
  interval: "monthly" | "quarterly" | "yearly" | "one_time";
  is_active: boolean;
  sort_order: number;
};

type Payment = {
  id: string;
  member_id: string;
  amount_cents: number;
  buyer_total_cents: number;
  owner_net_cents: number;
  interval: string;
  status: string;
  created_at: string;
  tier_id: string | null;
};

const INTERVAL_LABEL: Record<Tier["interval"], string> = {
  monthly: "per month",
  quarterly: "per quarter",
  yearly: "per year",
  one_time: "one time",
};

function fmtDollars(cents: number) {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function DuesTab({ orgId, ownerId, canManage, me }: { orgId: string; ownerId: string; canManage: boolean; me: string | null }) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [myPayments, setMyPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [ownerReady, setOwnerReady] = useState<boolean | null>(null);
  const [busyTierId, setBusyTierId] = useState<string | null>(null);
  const checkout = useServerFn(createDuesCheckout);

  const load = async () => {
    setLoading(true);
    const [tRes, pRes, myRes, ownerRes] = await Promise.all([
      supabase.from("organization_dues_tiers").select("*").eq("org_id", orgId).order("sort_order").order("created_at"),
      canManage
        ? supabase.from("organization_dues_payments").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).limit(100)
        : Promise.resolve({ data: [] as Payment[], error: null }),
      me
        ? supabase.from("organization_dues_payments").select("*").eq("org_id", orgId).eq("member_id", me).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Payment[], error: null }),
      supabase.from("profiles").select("stripe_charges_enabled").eq("id", ownerId).maybeSingle(),
    ]);
    setTiers((tRes.data ?? []) as Tier[]);
    setPayments((pRes.data ?? []) as Payment[]);
    setMyPayments((myRes.data ?? []) as Payment[]);
    setOwnerReady(!!ownerRes.data?.stripe_charges_enabled);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId, me, canManage]);

  const handlePay = async (tier: Tier) => {
    if (!me) { toast.error("Please sign in to pay dues."); return; }
    setBusyTierId(tier.id);
    try {
      const res = await checkout({ data: { tierId: tier.id, returnOrigin: window.location.origin } });
      if (res?.url) window.location.href = res.url;
      else toast.error("Could not start checkout.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusyTierId(null);
    }
  };

  const removeTier = async (id: string) => {
    if (!confirm("Delete this dues tier?")) return;
    const { error } = await supabase.from("organization_dues_tiers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setTiers((t) => t.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const toggleActive = async (t: Tier) => {
    const { error } = await supabase.from("organization_dues_tiers").update({ is_active: !t.is_active }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    setTiers((tiers) => tiers.map((x) => x.id === t.id ? { ...x, is_active: !t.is_active } : x));
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>;

  const totalCollected = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.owner_net_cents, 0);
  const paidCount = payments.filter(p => p.status === "paid").length;

  return (
    <div className="space-y-8">
      {canManage && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="text-xs font-medium text-neutral-500">Total collected</div>
            <div className="mt-1 text-2xl font-bold text-neutral-900">{fmtDollars(totalCollected)}</div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="text-xs font-medium text-neutral-500">Payments</div>
            <div className="mt-1 text-2xl font-bold text-neutral-900">{paidCount}</div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="text-xs font-medium text-neutral-500">Payout status</div>
            <div className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ownerReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              {ownerReady ? "Stripe connected" : "Stripe not ready"}
            </div>
          </div>
        </div>
      )}

      {canManage && !ownerReady && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Set up Stripe payment under Settings before members can pay dues. Payouts go straight to your bank.
        </div>
      )}

      {!canManage && myPayments.some(p => p.status === "paid") && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4" /> Your dues are paid</div>
          <div className="mt-1 text-xs">
            Last payment {new Date(myPayments.find(p => p.status === "paid")!.created_at).toLocaleDateString()}
          </div>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900">Dues plans</h3>
          {canManage && (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-full bg-[#d4580a] px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90">
              <Plus className="h-4 w-4" /> New tier
            </button>
          )}
        </div>

        {adding && canManage && (
          <TierForm orgId={orgId} onCancel={() => setAdding(false)} onSaved={(t) => { setTiers((x) => [...x, t]); setAdding(false); }} />
        )}

        {tiers.length === 0 && !adding && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 py-10 text-center text-sm text-neutral-500">
            {canManage ? "Create your first dues plan to start collecting." : "This association hasn't set up dues yet."}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {tiers.map((t) => {
            const isPaid = myPayments.some(p => p.tier_id === t.id && p.status === "paid");
            return (
              <div key={t.id} className={`rounded-2xl border p-5 ${t.is_active ? "border-neutral-200 bg-white" : "border-neutral-200 bg-neutral-50 opacity-70"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-base font-bold text-neutral-900">{t.name}</div>
                    {t.description && <div className="mt-1 text-sm text-neutral-600">{t.description}</div>}
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => toggleActive(t)} title={t.is_active ? "Hide" : "Show"} className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100">
                        {t.is_active ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </button>
                      <button onClick={() => removeTier(t.id)} className="rounded-full p-1.5 text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-neutral-900">{fmtDollars(t.amount_cents)}</span>
                  <span className="text-sm text-neutral-500">{INTERVAL_LABEL[t.interval]}</span>
                </div>
                {!canManage && (
                  isPaid ? (
                    <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <Check className="h-3.5 w-3.5" /> Paid
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePay(t)}
                      disabled={busyTierId === t.id || !t.is_active}
                      className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#d4580a] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {busyTierId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                      Pay dues
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </section>

      {canManage && (
        <section>
          <h3 className="mb-3 text-lg font-bold text-neutral-900">Recent payments</h3>
          {payments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 py-8 text-center text-sm text-neutral-500">No payments yet.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Member</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">You net</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-neutral-100">
                      <td className="px-4 py-2 text-neutral-600">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2 font-mono text-xs text-neutral-500">{p.member_id.slice(0, 8)}</td>
                      <td className="px-4 py-2">{fmtDollars(p.buyer_total_cents)}</td>
                      <td className="px-4 py-2 font-semibold text-neutral-900">{fmtDollars(p.owner_net_cents)}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.status === "paid" ? "bg-emerald-50 text-emerald-700"
                          : p.status === "pending" ? "bg-amber-50 text-amber-700"
                          : "bg-neutral-100 text-neutral-600"
                        }`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function TierForm({ orgId, onCancel, onSaved }: { orgId: string; onCancel: () => void; onSaved: (t: Tier) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState<Tier["interval"]>("yearly");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsed = parseFloat(amount);
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!isFinite(parsed) || parsed < 1) { toast.error("Amount must be at least $1"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("organization_dues_tiers").insert({
      org_id: orgId,
      name: name.trim(),
      description: description.trim() || null,
      amount_cents: Math.round(parsed * 100),
      interval,
    }).select().single();
    setSaving(false);
    if (error || !data) { toast.error(error?.message ?? "Save failed"); return; }
    onSaved(data as Tier);
    toast.success("Dues tier added");
  };

  return (
    <div className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tier name (e.g. Household)" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50" inputMode="decimal" className="w-full rounded-lg border border-neutral-200 py-2 pl-7 pr-3 text-sm" />
          </div>
          <select value={interval} onChange={(e) => setInterval(e.target.value as Tier["interval"])} className="rounded-lg border border-neutral-200 px-2 py-2 text-sm">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
            <option value="one_time">One time</option>
          </select>
        </div>
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this tier includes (optional)" rows={2} className="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
    </div>
  );
}