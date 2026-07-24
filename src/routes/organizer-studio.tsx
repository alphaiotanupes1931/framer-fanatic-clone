import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  ensureConnectAccount,
  createConnectOnboardingLink,
  refreshConnectStatus,
} from "@/lib/stripe.functions";
import {
  Plus, Ticket, Users, CheckSquare, MessageSquare, Megaphone, Banknote, LineChart,
  Copy, Trash2, ExternalLink, CreditCard, CheckCircle2, AlertCircle, Calendar, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/organizer-studio")({
  component: OrganizerStudioPage,
  head: () => ({
    meta: [
      { title: "Organizer Studio - Planet Baltimore" },
      { name: "description", content: "Manage events, tickets, promoters and payouts." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type MyEvent = {
  id: string; title: string; starts_at: string; venue_name: string | null;
  location: string | null; price_cents: number | null; is_published: boolean;
};

type Ticket = {
  id: string; status: string; buyer_total_cents: number; artist_net_cents: number;
  event_id: string; buyer_id: string; created_at: string;
};

function fmt(c: number) { return `$${(c / 100).toFixed(2)}`; }

function OrganizerStudioPage() {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"manage" | "create">("manage");
  const [events, setEvents] = useState<MyEvent[] | null>(null);
  const [selected, setSelected] = useState<MyEvent | null>(null);
  const [overview, setOverview] = useState<{ revenue: number; net: number; orders: number } | null>(null);

  const load = () => {
    if (!me) return;
    supabase.from("events")
      .select("id,title,starts_at,venue_name,location,price_cents,is_published")
      .eq("user_id", me.id)
      .order("starts_at", { ascending: false })
      .then(({ data }) => setEvents((data as MyEvent[] | null) ?? []));
  };
  useEffect(load, [me?.id]);

  useEffect(() => {
    if (!events || events.length === 0) { setOverview({ revenue: 0, net: 0, orders: 0 }); return; }
    const ids = events.map((e) => e.id);
    supabase.from("tickets")
      .select("buyer_total_cents,artist_net_cents,status,event_id")
      .in("event_id", ids)
      .eq("status", "paid")
      .then(({ data }) => {
        const rows = (data as { buyer_total_cents: number; artist_net_cents: number }[] | null) ?? [];
        setOverview({
          revenue: rows.reduce((s, r) => s + (r.buyer_total_cents ?? 0), 0),
          net: rows.reduce((s, r) => s + (r.artist_net_cents ?? 0), 0),
          orders: rows.length,
        });
      });
  }, [events]);

  const duplicate = async (e: MyEvent) => {
    if (!me) return;
    const { data: full } = await supabase.from("events").select("*").eq("id", e.id).maybeSingle();
    if (!full) return;
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = full as Record<string, unknown>;
    void _id; void _c; void _u;
    const { error } = await supabase.from("events").insert({ ...rest, title: `${e.title} (copy)`, is_published: false } as never);
    if (error) return toast.error(error.message);
    toast.success("Duplicated");
    load();
  };

  const remove = async (e: MyEvent) => {
    if (!window.confirm(`Delete "${e.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("events").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Event deleted");
    if (selected?.id === e.id) setSelected(null);
    load();
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        {/* Header banner */}
        <div className="relative rounded-2xl border border-[#d4580a]/30 bg-gradient-to-br from-[#fff4ec] to-white p-6">
          <button
            onClick={() => { if (typeof window !== "undefined" && window.history.length > 1) window.history.back(); else navigate({ to: "/events" }); }}
            aria-label="Back"
            className="absolute right-4 top-4 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4580a]/15 text-[#d4580a]">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#d4580a]">Planet Baltimore</div>
              <h1 className="text-2xl font-semibold text-neutral-900">Organizer Studio</h1>
              <p className="text-sm text-neutral-600">Manage events, tickets, promoters &amp; payouts</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-full bg-neutral-100 p-1 text-sm">
          <button onClick={() => { setTab("manage"); setSelected(null); }} className={`rounded-full py-2 font-semibold transition ${tab === "manage" ? "bg-[#d4580a] text-white shadow" : "text-neutral-600 hover:text-neutral-900"}`}>Manage Events</button>
          <Link to="/events/new" onClick={() => setTab("create")} className={`flex items-center justify-center gap-1.5 rounded-full py-2 font-semibold transition ${tab === "create" ? "bg-[#d4580a] text-white shadow" : "text-neutral-600 hover:text-neutral-900"}`}>
            <Plus className="h-4 w-4" /> Create Event
          </Link>
        </div>

        {!selected ? (
          <>
            <div className="text-sm font-semibold text-neutral-700">Select an event</div>
            {events === null ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">Loading…</div>
            ) : events.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
                No events yet. <Link to="/events/new" className="font-semibold text-[#d4580a] hover:underline">Create your first event</Link>.
              </div>
            ) : (
              <>
              <div className="grid gap-3 sm:grid-cols-2">
                {events.map((e) => {
                  const isPast = new Date(e.starts_at).getTime() < Date.now();
                  return (
                    <div key={e.id} className="group rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-[#d4580a]/50 hover:shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <button onClick={() => setSelected(e)} className="min-w-0 flex-1 text-left">
                          <div className="truncate font-semibold text-neutral-900 group-hover:text-[#d4580a]">{e.title}</div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(e.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                          {(e.venue_name || e.location) && (
                            <div className="mt-0.5 truncate text-xs text-neutral-500">📍 {e.venue_name || e.location}</div>
                          )}
                        </button>
                        <div className="flex flex-col items-end gap-2">
                          {isPast && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-500">Past</span>}
                          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                            <button onClick={() => duplicate(e)} title="Duplicate" className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"><Copy className="h-4 w-4" /></button>
                            <button onClick={() => remove(e)} title="Delete" className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 space-y-3">
                <div className="text-sm font-semibold text-neutral-700">All-events overview</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Events" value={events.length.toString()} subtitle={`${events.filter((e) => new Date(e.starts_at).getTime() >= Date.now()).length} upcoming`} />
                  <Stat label="Tickets sold" value={(overview?.orders ?? 0).toString()} subtitle="paid orders" />
                  <Stat label="Gross revenue" value={fmt(overview?.revenue ?? 0)} subtitle="across all events" />
                  <Stat label="Your net" value={fmt(overview?.net ?? 0)} subtitle="after fees" />
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                  Tip: click an event above to view its attendees, check‑in QR scans, promoter links, and payouts.
                </div>
              </div>
              </>
            )}
          </>
        ) : (
          <EventDetail evt={selected} onBack={() => setSelected(null)} />
        )}
      </div>
    </AppLayout>
  );
}

function EventDetail({ evt, onBack }: { evt: MyEvent; onBack: () => void }) {
  const [tab, setTab] = useState<"tickets" | "attendees" | "checkin" | "message" | "promoters" | "payouts" | "analytics" | "stripe">("attendees");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [buyers, setBuyers] = useState<Record<string, { name: string | null; email: string | null; avatar_url: string | null }>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("tickets")
      .select("id,status,buyer_total_cents,artist_net_cents,event_id,buyer_id,created_at")
      .eq("event_id", evt.id)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const rows = (data as Ticket[] | null) ?? [];
        setTickets(rows);
        const ids = Array.from(new Set(rows.map((r) => r.buyer_id)));
        if (ids.length) {
          const { data: profs } = await supabase.from("profiles").select("id, display_name, username, email, avatar_url").in("id", ids);
          const map: Record<string, { name: string | null; email: string | null; avatar_url: string | null }> = {};
          for (const p of profs ?? []) map[(p as { id: string }).id] = {
            name: (p as { display_name?: string; username?: string }).display_name ?? (p as { username?: string }).username ?? null,
            email: (p as { email?: string | null }).email ?? null,
            avatar_url: (p as { avatar_url?: string | null }).avatar_url ?? null,
          };
          setBuyers(map);
        }
      });
  }, [evt.id]);

  const paid = useMemo(() => (tickets ?? []).filter((t) => t.status === "paid"), [tickets]);
  const revenue = paid.reduce((s, t) => s + t.buyer_total_cents, 0);
  const net = paid.reduce((s, t) => s + t.artist_net_cents, 0);

  const filteredBuyers = paid.filter((t) => {
    if (!search.trim()) return true;
    const b = buyers[t.buyer_id];
    const q = search.toLowerCase();
    return (b?.name?.toLowerCase().includes(q) || b?.email?.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  });

  const tabs = [
    { id: "tickets", label: "Tickets", icon: Ticket },
    { id: "attendees", label: "Attendees", icon: Users },
    { id: "checkin", label: "Check-In", icon: CheckSquare },
    { id: "message", label: "Message", icon: MessageSquare },
    { id: "promoters", label: "Promoters", icon: Megaphone },
    { id: "payouts", label: "Payouts", icon: Banknote },
    { id: "analytics", label: "Analytics", icon: LineChart },
    { id: "stripe", label: "Stripe", icon: CreditCard },
  ] as const;

  const exportCsv = () => {
    const header = ["Ticket ID", "Buyer", "Email", "Status", "Total", "Net", "Date"];
    const lines = [header.join(",")];
    for (const t of paid) {
      const b = buyers[t.buyer_id];
      lines.push([t.id, `"${b?.name ?? ""}"`, b?.email ?? "", t.status, (t.buyer_total_cents / 100).toFixed(2), (t.artist_net_cents / 100).toFixed(2), new Date(t.created_at).toISOString()].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${evt.title.replace(/[^a-z0-9]+/gi, "_")}_orders.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm font-semibold text-neutral-500 hover:text-[#d4580a]">← Back to events</button>

      <div>
        <h2 className="text-xl font-semibold text-neutral-900">{evt.title}</h2>
        <div className="mt-0.5 text-sm text-neutral-500">{new Date(evt.starts_at).toLocaleString()}{evt.venue_name ? ` · ${evt.venue_name}` : ""}</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Revenue" value={fmt(revenue)} subtitle={`${fmt(net)} net`} />
        <Stat label="Tickets sold" value={paid.length.toString()} subtitle={`${paid.length} orders`} />
        <Stat label="Checked in" value="0" subtitle={`of ${paid.length} total`} />
        <Stat label="Promoters" value="1" subtitle="0 via promo" />
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-neutral-200 pb-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id as typeof tab)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${tab === id ? "bg-[#d4580a] text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "attendees" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or order #" className="flex-1 min-w-[220px] rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
            <button onClick={exportCsv} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]">Orders CSV</button>
          </div>
          <div className="text-xs text-neutral-500">{filteredBuyers.length} of {paid.length} orders</div>
          {tickets === null ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">Loading…</div>
          ) : filteredBuyers.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">No orders found</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                  <tr><th className="px-4 py-3">Attendee</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Order</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Date</th></tr>
                </thead>
                <tbody>
                  {filteredBuyers.map((t) => {
                    const b = buyers[t.buyer_id];
                    return (
                      <tr key={t.id} className="border-t border-neutral-100">
                        <td className="px-4 py-3 font-medium text-neutral-900">{b?.name ?? "Buyer"}</td>
                        <td className="px-4 py-3 text-neutral-600">{b?.email ?? ""}</td>
                        <td className="px-4 py-3 font-mono text-xs text-neutral-500">{t.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-right text-neutral-700">{fmt(t.buyer_total_cents)}</td>
                        <td className="px-4 py-3 text-neutral-500">{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "tickets" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          <div className="mb-2 font-semibold text-neutral-900">Ticket type</div>
          <div className="rounded-lg border border-neutral-200 p-4">
            <div className="flex justify-between"><span className="font-semibold text-neutral-900">General Admission</span><span>{evt.price_cents ? fmt(evt.price_cents) : "Free"}</span></div>
            <div className="mt-1 text-xs text-neutral-500">Sold: {paid.length}</div>
          </div>
          <Link to="/events/$eventId" params={{ eventId: evt.id }} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#d4580a] hover:underline">
            <ExternalLink className="h-3 w-3" /> View public event page
          </Link>
        </div>
      )}

      {tab === "checkin" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
          Scan attendee tickets at the door. Each digital ticket carries a QR code you can scan with your phone camera.
        </div>
      )}

      {tab === "message" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Message all {paid.length} attendee{paid.length === 1 ? "" : "s"} at once. <Link to="/messages" className="font-semibold text-[#d4580a] hover:underline">Open Messages</Link>
        </div>
      )}

      {tab === "promoters" && (
        <PromotersTab eventId={evt.id} />
      )}

      {tab === "payouts" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Gross" value={fmt(revenue)} />
          <Stat label="Fees" value={fmt(revenue - net)} />
          <Stat label="Your net payout" value={fmt(net)} />
        </div>
      )}

      {tab === "analytics" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Detailed conversion analytics coming soon. For now: {paid.length} paid orders, {fmt(revenue)} gross revenue.
        </div>
      )}

      {tab === "stripe" && <StripeInline />}
    </div>
  );
}

function Stat({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900">{value}</div>
      {subtitle && <div className="mt-0.5 text-xs text-neutral-500">{subtitle}</div>}
    </div>
  );
}

function StripeInline() {
  const profile = useCurrentProfile() as { id: string; stripe_account_id: string | null; stripe_charges_enabled?: boolean } | null;
  const ensureFn = useServerFn(ensureConnectAccount);
  const linkFn = useServerFn(createConnectOnboardingLink);
  const refreshFn = useServerFn(refreshConnectStatus);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; chargesEnabled: boolean } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;
    if (!profile.stripe_account_id) { setStatus({ connected: false, chargesEnabled: false }); return; }
    refreshFn().then((s) => setStatus(s)).catch(() => setStatus({ connected: !!profile.stripe_account_id, chargesEnabled: !!profile.stripe_charges_enabled }));
  }, [profile?.id, profile?.stripe_account_id, refreshFn]);

  const onboard = async () => {
    setBusy(true);
    try {
      await ensureFn();
      const { url } = await linkFn({ data: {
        returnUrl: `${window.location.origin}/organizer-studio?stripe=onboarded`,
        refreshUrl: `${window.location.origin}/organizer-studio?stripe=refresh`,
      }});
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start onboarding");
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <CreditCard className="mt-0.5 h-5 w-5 text-[#d4580a]" />
        <div className="flex-1">
          <h3 className="text-base font-semibold text-neutral-900">Payouts via Stripe</h3>
          <p className="mt-1 text-sm text-neutral-600">Connect a Stripe account so ticket revenue is paid directly to your bank. Planet Baltimore never holds your funds.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {status?.chargesEnabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Connected &amp; active</span>
            ) : status?.connected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"><AlertCircle className="h-3.5 w-3.5" /> Onboarding incomplete</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">Not connected</span>
            )}
            <button onClick={onboard} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
              {busy ? "Opening Stripe…" : status?.chargesEnabled ? "Update Stripe account" : "Connect Stripe"} <ExternalLink className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => navigate({ to: "/profile", search: { tab: "Stripe" } as never })} className="text-sm font-semibold text-neutral-500 hover:text-[#d4580a]">Full Stripe settings →</button>
          </div>
        </div>
      </div>
    </div>
  );
}