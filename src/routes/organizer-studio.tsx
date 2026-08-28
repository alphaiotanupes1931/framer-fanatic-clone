import { siteUrl } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ensureConnectAccount, createConnectOnboardingLink, refreshConnectStatus } from "@/lib/stripe.functions";
import { navigateExternal, openExternalWindow, closeExternalWindow } from "@/lib/external-nav";
import { sanitizeErrorMessage } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Ticket, Users, CheckSquare, MessageSquare, Megaphone, Banknote, LineChart,
  Copy, Trash2, ExternalLink, Calendar, Download, Camera, List, Mail, Send,
  Zap, Crown, Star, Tag, MapPin, PartyPopper, AlertTriangle, GraduationCap,
  ChevronUp, ChevronDown, Upload, Eye, X, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { EventEditForm } from "@/components/organizer/event-edit-form";
import { RichTextEditor, richHtmlToPlainText, richHtmlIsEmpty } from "@/components/rich-text-editor";
import { richHtmlToEmailDocument } from "@/lib/rich-email";
import { deleteEventDraft, listEventDrafts, type EventDraft } from "@/lib/event-drafts";
import { FileText } from "lucide-react";

/** Unfinished events saved locally from the create-event page. */
function DraftsSection() {
  const [drafts, setDrafts] = useState<EventDraft[]>([]);

  useEffect(() => {
    const sync = () => setDrafts(listEventDrafts());
    sync();
    window.addEventListener("pb:event-drafts", sync);
    return () => window.removeEventListener("pb:event-drafts", sync);
  }, []);

  if (drafts.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
        <FileText className="h-4 w-4 text-[#d4580a]" /> Drafts
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {drafts.map((d) => (
          <div key={d.id} className="group flex items-start justify-between gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-4 transition hover:border-[#d4580a]/50">
            <Link
              to="/events/new"
              search={{ draft: d.id, ...(d.org ? { org: d.org } : {}), ...(d.kind ? { kind: d.kind } : {}) }}
              className="min-w-0 flex-1"
            >
              <div className="truncate font-semibold text-neutral-900 group-hover:text-[#d4580a]">
                {d.form.title.trim() || "Untitled event"}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {d.pricing === "paid" ? "Paid tickets" : "Free"} · saved {new Date(d.updated_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </div>
            </Link>
            <button
              onClick={() => { deleteEventDraft(d.id); setDrafts(listEventDrafts()); }}
              title="Discard draft"
              className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


export const Route = createFileRoute("/organizer-studio")({
  component: OrganizerStudioPage,
  validateSearch: (search: Record<string, unknown>): { event?: string; edit?: boolean } => ({
    ...(typeof search['event'] === "string" ? { event: search['event'] as string } : {}),
    ...(search['edit'] === true || search['edit'] === "true" || search['edit'] === "1" ? { edit: true } : {}),
  }),
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
  const { event: focusEventId, edit: focusEdit } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"manage" | "stripe" | "campaign">("manage");
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const refreshStatusFn = useServerFn(refreshConnectStatus);
  useEffect(() => {
    if (!me) return;
    if (!me.stripe_account_id) { setStripeReady(false); return; }
    refreshStatusFn()
      .then((s) => setStripeReady(!!s.chargesEnabled))
      .catch(() => setStripeReady(!!me.stripe_charges_enabled));
  }, [me?.id, me?.stripe_account_id]);
  const [events, setEvents] = useState<MyEvent[] | null>(null);
  const [selected, setSelected] = useState<MyEvent | null>(null);
  const [overview, setOverview] = useState<{ revenue: number; net: number; orders: number; promoters: number } | null>(null);

  const load = () => {
    if (!me) return;
    supabase.from("events")
      .select("id,title,starts_at,venue_name,location,price_cents,is_published")
      .eq("user_id", me.id)
      .order("starts_at", { ascending: false })
      .then(({ data }) => setEvents((data as MyEvent[] | null) ?? []));
  };
  useEffect(load, [me?.id]);

  // Arriving from "create event" lands directly on that event's ticket setup.
  useEffect(() => {
    if (!focusEventId || !events) return;
    const match = events.find((e) => e.id === focusEventId);
    if (match) {
      setTab("manage");
      setSelected(match);
    }
  }, [focusEventId, events]);

  useEffect(() => {
    if (!events || events.length === 0) { setOverview({ revenue: 0, net: 0, orders: 0, promoters: 0 }); return; }
    const ids = events.map((e) => e.id);
    (async () => {
      const [{ data: tRows }, { count: pCount }] = await Promise.all([
        supabase.from("tickets").select("buyer_total_cents,artist_net_cents,status,event_id").in("event_id", ids).eq("status", "paid"),
        supabase.from("event_promoters").select("id", { count: "exact", head: true }).in("event_id", ids),
      ]);
      const rows = (tRows as { buyer_total_cents: number; artist_net_cents: number }[] | null) ?? [];
      setOverview({
        revenue: rows.reduce((s, r) => s + (r.buyer_total_cents ?? 0), 0),
        net: rows.reduce((s, r) => s + (r.artist_net_cents ?? 0), 0),
        orders: rows.length,
        promoters: pCount ?? 0,
      });
    })();
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
        <div className="grid grid-cols-2 gap-2 rounded-full bg-neutral-100 p-1 text-sm sm:grid-cols-4">
          <button onClick={() => { setTab("manage"); setSelected(null); }} className={`rounded-full py-2 font-semibold transition ${tab === "manage" ? "bg-[#d4580a] text-white shadow" : "text-neutral-600 hover:text-neutral-900"}`}>Manage Events</button>
          <button
            onClick={() => setTab("stripe")}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 font-semibold transition ${
              tab === "stripe"
                ? "bg-[#d4580a] text-white shadow"
                : stripeReady === false
                  ? "animate-pulse bg-red-50 text-red-600 shadow-[0_0_0_2px_rgba(220,38,38,0.55),0_0_16px_rgba(220,38,38,0.55)]"
                  : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <CreditCard className="h-4 w-4" /> Stripe
          </button>
          <button
            onClick={() => {
              if (selected) { navigate({ to: "/events/$eventId", params: { eventId: selected.id } }); return; }
              toast.info("Pick an event first, then Save Tickets opens its page.");
              setTab("manage");
            }}
            className="flex items-center justify-center gap-1.5 rounded-full py-2 font-semibold text-neutral-600 transition hover:text-neutral-900"
          >
            <Ticket className="h-4 w-4" /> Save Tickets
          </button>
          <button onClick={() => { setTab("campaign"); setSelected(null); }} className={`flex items-center justify-center gap-1.5 rounded-full py-2 font-semibold transition ${tab === "campaign" ? "bg-[#d4580a] text-white shadow" : "text-neutral-600 hover:text-neutral-900"}`}>
            <Mail className="h-4 w-4" /> Campaign
          </button>
        </div>

        {tab === "stripe" ? (
          <StripeTab onStatus={setStripeReady} />
        ) : tab === "campaign" ? (
          <CampaignTab events={events ?? []} />
        ) : !selected ? (
          <>
            <DraftsSection />
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
                            <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-neutral-500"><MapPin className="h-3 w-3" /> {e.venue_name || e.location}</div>
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

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Revenue" value={fmt(overview?.revenue ?? 0)} subtitle={`${fmt(overview?.net ?? 0)} net`} />
                <Stat label="Tickets sold" value={(overview?.orders ?? 0).toString()} subtitle={`${overview?.orders ?? 0} orders`} />
                <Stat label="Checked in" value="0" subtitle={`of ${overview?.orders ?? 0} total`} />
                <Stat label="Promoters" value={(overview?.promoters ?? 0).toString()} subtitle="0 via promo" />
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                Tip: Click an event above to view its attendees, check-in QR scans, promoter links, and payouts.
              </div>
              </>
            )}
          </>
        ) : (
          <EventDetail evt={selected} onBack={() => setSelected(null)} initialTab={focusEdit ? "details" : undefined} />
        )}
      </div>
    </AppLayout>
  );
}

function EventDetail({ evt, onBack, initialTab }: { evt: MyEvent; onBack: () => void; initialTab?: "details" }) {
  const [tab, setTab] = useState<"details" | "tickets" | "attendees" | "checkin" | "message" | "promoters" | "payouts" | "analytics">(initialTab ?? "tickets");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [buyers, setBuyers] = useState<Record<string, { name: string | null; email: string | null; avatar_url: string | null }>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [promoterCount, setPromoterCount] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);

  useEffect(() => {
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", evt.id)
      .not("checked_in_at", "is", null)
      .then(({ count }) => setCheckedInCount(count ?? 0));
  }, [evt.id]);

  useEffect(() => {
    supabase.from("event_promoters").select("id", { count: "exact", head: true }).eq("event_id", evt.id)
      .then(({ count }) => setPromoterCount(count ?? 0));
  }, [evt.id]);

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
          const { data: profs } = await supabase.rpc("event_buyer_contacts", { _event_id: evt.id });
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

  const tabs = [
    { id: "details", label: "Edit Details", icon: Pencil },
    { id: "tickets", label: "Tickets", icon: Ticket },
    { id: "attendees", label: "Attendees", icon: Users },
    { id: "checkin", label: "Check-In", icon: CheckSquare },
    { id: "message", label: "Message", icon: MessageSquare },
    { id: "promoters", label: "Promoters", icon: Megaphone },
    { id: "payouts", label: "Payouts", icon: Banknote },
    { id: "analytics", label: "Analytics", icon: LineChart },
  ] as const;

  const exportCsv = (kind: "orders" | "rsvps") => {
    const header = kind === "orders"
      ? ["Order ID", "Buyer", "Email", "Status", "Total", "Net", "Date"]
      : ["Attendee", "Email", "Date"];
    const lines = [header.join(",")];
    for (const t of paid) {
      const b = buyers[t.buyer_id];
      if (kind === "orders") {
        lines.push([t.id, `"${b?.name ?? ""}"`, b?.email ?? "", t.status, (t.buyer_total_cents / 100).toFixed(2), (t.artist_net_cents / 100).toFixed(2), new Date(t.created_at).toISOString()].join(","));
      } else {
        lines.push([`"${b?.name ?? ""}"`, b?.email ?? "", new Date(t.created_at).toISOString()].join(","));
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${evt.title.replace(/[^a-z0-9]+/gi, "_")}_${kind}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredList = filteredBuyersHelper(paid, buyers, search, statusFilter);

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
        <Stat label="Checked in" value={checkedInCount.toString()} subtitle={`of ${paid.length} total`} />
        <Stat label="Promoters" value={promoterCount.toString()} subtitle="0 via promo" />
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
            <div className="relative flex-1 min-w-[220px]">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or order #..." className="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
              <option value="pending">Pending</option>
            </select>
            <button onClick={() => exportCsv("orders")} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"><Download className="h-4 w-4" /> Orders CSV</button>
            <button onClick={() => exportCsv("rsvps")} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"><Download className="h-4 w-4" /> RSVPs CSV</button>
          </div>
          <div className="text-xs text-neutral-500">{filteredList.length} of {paid.length} orders</div>
          {tickets === null ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">Loading…</div>
          ) : filteredList.length === 0 ? (
            <div className="py-10 text-center text-sm text-neutral-500">No orders found</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                  <tr><th className="px-4 py-3">Attendee</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Order</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Date</th></tr>
                </thead>
                <tbody>
                  {filteredList.map((t) => {
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

      {tab === "details" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <EventEditForm eventId={evt.id} onSaved={onBack} onCancel={() => setTab("tickets")} />
        </div>
      )}

      {tab === "tickets" && (
        <TicketsTab evt={evt} soldCount={paid.length} />
      )}

      {tab === "checkin" && (
        <CheckInTab eventId={evt.id} paid={paid} buyers={buyers} />
      )}

      {tab === "message" && (
        <MessageTab eventId={evt.id} evtTitle={evt.title} recipients={paid.map((t) => t.buyer_id).filter(Boolean)} />
      )}

      {tab === "promoters" && (
        <PromotersTab eventId={evt.id} />
      )}

      {tab === "payouts" && (
        <PayoutsTab paid={paid} buyers={buyers} revenue={revenue} net={net} />
      )}

      {tab === "analytics" && (
        <AnalyticsTab paid={paid} revenue={revenue} />
      )}
    </div>
  );
}

function filteredBuyersHelper(
  paid: Ticket[],
  buyers: Record<string, { name: string | null; email: string | null; avatar_url: string | null }>,
  search: string,
  status: string,
): Ticket[] {
  return paid.filter((t) => {
    if (status !== "all" && t.status !== status) return false;
    if (!search.trim()) return true;
    const b = buyers[t.buyer_id];
    const q = search.toLowerCase();
    return !!(b?.name?.toLowerCase().includes(q) || b?.email?.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  });
}

type TicketType = {
  id: string; event_id: string; category: string; name: string;
  price_cents: number; quantity: number | null; max_per_buyer: number | null;
  sale_starts_at: string | null; sale_ends_at: string | null;
  description: string | null; perks: string[];
};

const CATEGORIES = [
  { key: "general", label: "General Admission", Icon: Ticket },
  { key: "early_bird", label: "Early Bird", Icon: Zap },
  { key: "vip", label: "VIP", Icon: Crown },
  { key: "group", label: "Group", Icon: Users },
  { key: "free_rsvp", label: "Free / RSVP", Icon: Star },
  { key: "donation", label: "Donation", Icon: Tag },
] as const;

function TicketsTab({ evt }: { evt: MyEvent; soldCount: number }) {
  const [types, setTypes] = useState<TicketType[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [cap, setCap] = useState<string>("");
  const [capLoaded, setCapLoaded] = useState(false);
  const [savingCap, setSavingCap] = useState(false);

  useEffect(() => {
    supabase.from("events").select("max_tickets_per_buyer").eq("id", evt.id).maybeSingle()
      .then(({ data }) => {
        const v = (data as { max_tickets_per_buyer: number | null } | null)?.max_tickets_per_buyer;
        setCap(v ? String(v) : "");
        setCapLoaded(true);
      });
  }, [evt.id]);

  const saveCap = async () => {
    setSavingCap(true);
    const value = cap.trim() ? Math.max(1, parseInt(cap, 10)) : null;
    const { error } = await supabase.from("events").update({ max_tickets_per_buyer: value }).eq("id", evt.id);
    setSavingCap(false);
    if (error) toast.error(error.message);
    else toast.success(value ? `Limited to ${value} per person` : "Limit removed");
  };

  const load = () => {
    supabase.from("ticket_types").select("*").eq("event_id", evt.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true })
      .then(({ data }) => setTypes((data as TicketType[] | null) ?? []));
  };
  useEffect(load, [evt.id]);

  const move = async (index: number, dir: -1 | 1) => {
    if (!types) return;
    const target = index + dir;
    if (target < 0 || target >= types.length) return;
    const next = types.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setTypes(next);
    const updates = next.map((t, i) =>
      supabase.from("ticket_types").update({ sort_order: i }).eq("id", t.id)
    );
    const results = await Promise.all(updates);
    const err = results.find(r => r.error)?.error;
    if (err) { toast.error(err.message); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Ticket Types</h3>
          <p className="text-xs text-neutral-500">{types?.length ?? 0} types · Add multiple ticket tiers for your event</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#d4580a] px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110">
            <Plus className="h-4 w-4" /> Add Ticket Type
          </button>
        )}
      </div>

      {showForm && (
        <NewTicketTypeForm eventId={evt.id} onCancel={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      )}

      {capLoaded && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-semibold text-neutral-900">Limit per person</div>
          <p className="mt-0.5 text-xs text-neutral-500">
            You decide how many tickets one person can get for this event. Leave blank for no limit. Ticket types can set their own limit too.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              placeholder="No limit"
              className="w-32 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
            <button
              onClick={saveCap}
              disabled={savingCap}
              className="rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {savingCap ? "Saving…" : "Save limit"}
            </button>
          </div>
        </div>
      )}

      {types && types.length > 0 ? (
        <div className="space-y-2">
          {types.map((t, i) => (
            <div key={t.id} className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent"
                    ><ChevronUp className="h-4 w-4" /></button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === (types?.length ?? 0) - 1}
                      aria-label="Move down"
                      className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent"
                    ><ChevronDown className="h-4 w-4" /></button>
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900">{t.name}</div>
                    <div className="mt-0.5 text-xs text-neutral-500 capitalize">{t.category.replace("_", " ")}{t.quantity ? ` · ${t.quantity} available` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold text-neutral-900">{t.price_cents ? fmt(t.price_cents) : "Free"}</div>
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this ticket type?")) return;
                      const { error } = await supabase.from("ticket_types").delete().eq("id", t.id);
                      if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
                    }}
                    className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
                  ><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-neutral-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
            <Ticket className="h-6 w-6" />
          </div>
          <div className="mt-4 text-base font-semibold text-neutral-900">No ticket types yet</div>
          <div className="mt-1 text-sm text-neutral-500">Create your first ticket type to start selling</div>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#d4580a] px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110">
            <Plus className="h-4 w-4" /> Add Ticket Type
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NewTicketTypeForm({ eventId, onCancel, onCreated }: { eventId: string; onCancel: () => void; onCreated: () => void }) {
  const [category, setCategory] = useState<string>("general");
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("0");
  const [quantity, setQuantity] = useState<string>("");
  const [maxPer, setMaxPer] = useState<string>("");
  const [starts, setStarts] = useState<string>("");
  const [ends, setEnds] = useState<string>("");
  const [description, setDescription] = useState("");
  const [perks, setPerks] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = name.trim().length > 0 && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const priceCents = Math.max(0, Math.round(parseFloat(price || "0") * 100));
    const { error } = await supabase.from("ticket_types").insert({
      event_id: eventId,
      category,
      name: name.trim(),
      price_cents: category === "free_rsvp" ? 0 : priceCents,
      quantity: quantity ? parseInt(quantity, 10) : null,
      max_per_buyer: maxPer ? parseInt(maxPer, 10) : null,
      sale_starts_at: starts ? new Date(starts).toISOString() : null,
      sale_ends_at: ends ? new Date(ends).toISOString() : null,
      description: description.trim() || null,
      perks: perks.split(",").map(p => p.trim()).filter(Boolean),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticket type created");
    onCreated();
  };

  const label = "text-[11px] font-semibold uppercase tracking-wide text-neutral-500";
  const input = "mt-1.5 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
        <div className="font-semibold text-neutral-900">New Ticket Type</div>
        <button onClick={onCancel} className="text-sm text-neutral-500 hover:text-neutral-900">Cancel</button>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <div className={label}>Ticket Category</div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map(c => {
              const active = category === c.key;
              const Icon = c.Icon;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${active ? "border-neutral-900 bg-white text-neutral-900" : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"}`}
                >
                  <Icon className="h-4 w-4" /> {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className={label}>Ticket Name *</div>
          <input value={name} onChange={e => setName(e.target.value)} className={input} placeholder="e.g., General Admission, VIP Pass, Early Bird..." />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={label}>Price ($) *</div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 pt-[3px] text-sm text-neutral-400">$</span>
              <input
                type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                disabled={category === "free_rsvp"}
                className={`${input} pl-7 disabled:bg-neutral-50 disabled:text-neutral-400`}
              />
            </div>
          </div>
          <div>
            <div className={label}>Quantity Available *</div>
            <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className={input} placeholder="e.g., 100" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={label}>Max Per Buyer</div>
            <input type="number" min="1" value={maxPer} onChange={e => setMaxPer(e.target.value)} className={input} placeholder="No limit" />
          </div>
          <div>
            <div className={label}>Sale Starts</div>
            <input type="datetime-local" value={starts} onChange={e => setStarts(e.target.value)} className={input} />
          </div>
        </div>

        <div>
          <div className={label}>Sale Ends</div>
          <input type="datetime-local" value={ends} onChange={e => setEnds(e.target.value)} className={`${input} sm:max-w-[calc(50%-8px)]`} />
        </div>

        <div>
          <div className={label}>Description</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={input} placeholder="What's included? Any restrictions or details..." />
        </div>

        <div>
          <div className={label}>Perks / Inclusions <span className="text-neutral-400 normal-case">(comma-separated)</span></div>
          <input value={perks} onChange={e => setPerks(e.target.value)} className={input} placeholder="Early Entry, Meet & Greet, Open Bar, Backstage Access..." />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="flex-1 rounded-lg bg-[#d4580a] py-3 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >{saving ? "Creating..." : "Create Ticket Type"}</button>
          <button onClick={onCancel} className="rounded-lg border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function CheckInTab({
  eventId,
  paid,
  buyers,
}: {
  eventId: string;
  paid: Ticket[];
  buyers: Record<string, { name: string | null; email: string | null; avatar_url: string | null }>;
}) {
  const [mode, setMode] = useState<"list" | "scanner">("list");
  const [state, setState] = useState<Record<string, string | null>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const total = paid.length;

  // Check-ins usually happen on a phone at the door while this screen is open
  // on another device, so keep it live instead of loading once on mount.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("tickets")
        .select("id, checked_in_at")
        .eq("event_id", eventId);
      if (!alive || !data) return;
      const next: Record<string, string | null> = {};
      for (const t of data as Array<{ id: string; checked_in_at: string | null }>) next[t.id] = t.checked_in_at;
      setState(next);
    };
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 15000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const channel = supabase
      .channel(`checkin-${eventId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tickets", filter: `event_id=eq.${eventId}` }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [eventId]);

  const toggle = async (ticketId: string) => {
    const isIn = !!state[ticketId];
    setBusyId(ticketId);
    const nextValue = isIn ? null : new Date().toISOString();
    const prev = state[ticketId] ?? null;
    setState((s) => ({ ...s, [ticketId]: nextValue }));
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("tickets")
      .update({ checked_in_at: nextValue, checked_in_by: nextValue ? auth.user?.id ?? null : null })
      .eq("id", ticketId);
    setBusyId(null);
    if (error) {
      setState((s) => ({ ...s, [ticketId]: prev }));
      toast.error(error.message);
      return;
    }
    toast.success(nextValue ? "Checked in" : "Check-in undone");
  };

  const checkInByCode = async () => {
    const raw = code.trim();
    if (!raw) return;
    const id = raw.split("/").pop()?.trim() ?? raw;
    const match = paid.find((t) => t.id === id || t.id.startsWith(id));
    if (!match) { toast.error("No ticket for this event matches that code"); return; }
    if (state[match.id]) { toast.info("That ticket is already checked in"); setCode(""); return; }
    await toggle(match.id);
    setCode("");
  };

  const checkedIn = paid.filter((t) => state[t.id]).length;
  const pct = total === 0 ? 0 : Math.round((checkedIn / total) * 100);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-neutral-100 p-8 text-center">
        <div className="text-5xl font-semibold text-neutral-900">{checkedIn}<span className="text-2xl text-neutral-400">/{total}</span></div>
        <div className="mt-2 text-sm text-neutral-600">Attendees Checked In</div>
        <div className="mx-auto mt-4 h-1.5 max-w-md overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full bg-[#d4580a] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-xs text-neutral-500">{pct}% capacity</div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-full bg-neutral-100 p-1 text-sm">
        <button onClick={() => setMode("list")} className={`inline-flex items-center justify-center gap-1.5 rounded-full py-2 font-semibold transition ${mode === "list" ? "bg-[#d4580a] text-white shadow" : "text-neutral-600"}`}>
          <List className="h-4 w-4" /> Attendee List
        </button>
        <button onClick={() => setMode("scanner")} className={`inline-flex items-center justify-center gap-1.5 rounded-full py-2 font-semibold transition ${mode === "scanner" ? "bg-[#d4580a] text-white shadow" : "text-neutral-600"}`}>
          <Camera className="h-4 w-4" /> Ticket Code
        </button>
      </div>

      {mode === "scanner" ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <Link
            to="/scan"
            className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-[#d4580a] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            <Camera className="h-4 w-4" /> Open QR scanner
          </Link>
          <p className="text-sm text-neutral-600">
            Or type or paste the ticket code shown under the attendee's QR code, then check them in.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void checkInByCode(); }}
              placeholder="Ticket code"
              className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm"
            />
            <button
              onClick={() => void checkInByCode()}
              disabled={!code.trim()}
              className="rounded-lg bg-[#d4580a] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              Check in
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white">
          {total === 0 ? (
            <div className="p-10 text-center text-sm text-neutral-500">No attendees to check in yet.</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {paid.map((t) => {
                const b = buyers[t.buyer_id];
                const isIn = !!state[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => void toggle(t.id)}
                    disabled={busyId === t.id}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50 disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-neutral-900">{b?.name ?? "Attendee"}</div>
                      <div className="text-xs text-neutral-500">
                        {isIn ? `Checked in ${new Date(state[t.id] as string).toLocaleTimeString()}` : `Code ${t.id.slice(0, 8)}`}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        isIn ? "bg-[#d4580a] text-white" : "border border-neutral-200 text-neutral-600"
                      }`}
                    >
                      {isIn ? "Checked in" : "Check in"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageTab({ eventId, evtTitle, recipients }: { eventId: string; evtTitle: string; recipients: string[] }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const totalCount = new Set(recipients).size;
  const count = totalCount;

  const iconFor = (cat: string | null) => {
    switch (cat) {
      case "early_bird": return Zap;
      case "vip": return Crown;
      case "group": return Users;
      case "student": return GraduationCap;
      case "general": return Ticket;
      default: return Ticket;
    }
  };

  const toHtml = (plain: string) => plain.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

  const applyTemplate = (kind: string) => {
    if (kind === "venue") { setSubject(`Venue update for ${evtTitle}`); setBody(toHtml(`Hi there,\n\nQuick heads up about the venue for ${evtTitle}. Please note the following updates:\n\n[venue details]\n\nSee you soon!`)); }
    if (kind === "reminder") { setSubject(`Reminder: ${evtTitle} is coming up`); setBody(toHtml(`Hi,\n\nJust a friendly reminder that ${evtTitle} is coming up. Doors open at [time].\n\nCan't wait to see you!`)); }
    if (kind === "thanks") { setSubject(`Thank you for coming to ${evtTitle}`); setBody(toHtml(`Hi,\n\nThank you for coming out to ${evtTitle}. It meant the world to have you there!\n\n- The team`)); }
    if (kind === "important") { setSubject(`Important update about ${evtTitle}`); setBody(toHtml(`Hi,\n\nWe have an important update regarding ${evtTitle}:\n\n[update details]\n\nThank you for your understanding.`)); }
  };

  const send = async () => {
    if (!subject.trim() || richHtmlIsEmpty(body)) { toast.error("Subject and message are required"); return; }
    if (count === 0) { toast.error("No attendees to message yet"); return; }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const meId = auth.user?.id;
      if (!meId) { toast.error("Please sign in first"); return; }
      const ids = Array.from(new Set(recipients)).filter((id) => id && id !== meId);
      if (ids.length === 0) { toast.error("No attendees to message yet"); return; }

      const { data: conv, error: cErr } = await supabase
        .from("conversations")
        .insert({
          is_group: true,
          title: subject.trim().slice(0, 120),
          created_by: meId,
          last_message_preview: richHtmlToPlainText(body).slice(0, 140),
        })
        .select("id")
        .single();
      if (cErr || !conv) throw cErr || new Error("Could not start the conversation");

      const { error: mErr } = await supabase.from("conversation_members").insert([
        { conversation_id: conv.id, user_id: meId },
        ...ids.map((id) => ({ conversation_id: conv.id, user_id: id })),
      ]);
      if (mErr) throw mErr;

      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: meId,
        content: `${subject.trim()}\n\n${richHtmlToPlainText(body)}`,
      });
      if (msgErr) throw msgErr;

      toast.success(`Sent to ${ids.length} attendee${ids.length === 1 ? "" : "s"}`);
      setSubject(""); setBody("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not send the message");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600"><Mail className="h-5 w-5" /></div>
          <div>
            <div className="font-semibold text-neutral-900">Message Your Attendees</div>
            <div className="text-xs text-neutral-500">Send a message straight to the inbox of ticket buyers for <span className="font-semibold text-neutral-700">{evtTitle}</span></div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Send To</div>
        <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[#d4580a] bg-[#fff4ec] px-3 py-2 text-sm text-[#d4580a]">
          <Users className="h-4 w-4" /> All Ticket Buyers
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-neutral-500">{totalCount}</span>
        </div>
        <div className="mt-1 text-xs text-neutral-500">{count} attendee{count === 1 ? "" : "s"} will receive this message</div>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Quick Templates</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => applyTemplate("venue")} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-neutral-700 hover:border-[#d4580a]"><MapPin className="h-4 w-4" /> Venue Update</button>
          <button onClick={() => applyTemplate("reminder")} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-neutral-700 hover:border-[#d4580a]"><Ticket className="h-4 w-4" /> Reminder</button>
          <button onClick={() => applyTemplate("thanks")} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-neutral-700 hover:border-[#d4580a]"><PartyPopper className="h-4 w-4" /> Thank You</button>
          <button onClick={() => applyTemplate("important")} className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-neutral-700 hover:border-[#d4580a]"><AlertTriangle className="h-4 w-4" /> Important Update</button>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Subject *</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 120))} placeholder="e.g., Important update about your tickets" className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm" />
        <div className="mt-1 text-right text-[11px] text-neutral-400">{subject.length}/120</div>
      </div>

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Message *</label>
        <RichTextEditor value={body} onChange={setBody} placeholder="Write your message to attendees here..." minHeight={150} className="mt-1" />
        <div className="mt-1 text-right text-[11px] text-neutral-400">{richHtmlToPlainText(body).length}/1000</div>
      </div>

      <button onClick={send} disabled={busy || count === 0 || !subject.trim() || richHtmlIsEmpty(body)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-400 px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
        <Send className="h-4 w-4" /> {busy ? "Sending…" : `Send to ${count} Attendee${count === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}

function PayoutsTab({ paid, buyers, revenue, net }: { paid: Ticket[]; buyers: Record<string, { name: string | null; email: string | null; avatar_url: string | null }>; revenue: number; net: number }) {
  const orders = paid.length;
  // Stripe: 2.9% + 30¢ per successful charge
  const stripeFees = Math.round(revenue * 0.029) + orders * 30;
  // Planet Baltimore platform fee: flat $0.70 per order (not per ticket)
  const platformFees = orders * 70;
  const totalFees = stripeFees + platformFees;
  const takeHome = Math.max(0, revenue - totalFees);
  void net;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="font-semibold text-neutral-900">Financial Summary</div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-neutral-600">Gross Ticket Sales</span><span className="font-semibold text-neutral-900">{fmt(revenue)}</span></div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-neutral-600">Platform fee</div>
              <div className="text-xs text-neutral-400">2.9% + 30 cents card processing, plus a flat 70 cent platform fee per order</div>
            </div>
            <span className="font-semibold text-red-500">-{fmt(totalFees)} {revenue > 0 && <span className="text-xs font-normal">({(totalFees / revenue * 100).toFixed(1)}%)</span>}</span>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 pt-3"><span className="font-semibold text-neutral-900">Your Take-Home</span><span className="text-lg font-bold text-neutral-900">{fmt(takeHome)}</span></div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="font-semibold text-neutral-900">Orders ({paid.length})</div>
        {paid.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">No orders yet</div>
        ) : (
          <div className="mt-3 divide-y divide-neutral-100 text-sm">
            {paid.slice(0, 10).map((t) => {
              const b = buyers[t.buyer_id];
              return (
                <div key={t.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="font-medium text-neutral-900">{b?.name ?? "Buyer"}</div>
                    <div className="text-xs text-neutral-500">{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-neutral-700">{fmt(t.buyer_total_cents)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsTab({ paid, revenue }: { paid: Ticket[]; revenue: number }) {
  const avg = paid.length ? revenue / paid.length : 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatIcon label="Gross Revenue" value={fmt(revenue)} icon={<Banknote className="h-4 w-4" />} />
      <StatIcon label="Tickets Sold" value={paid.length.toString()} icon={<Ticket className="h-4 w-4" />} />
      <StatIcon label="Avg Order" value={fmt(avg)} icon={<LineChart className="h-4 w-4" />} />
      <StatIcon label="Refunds" value="0" icon={<Users className="h-4 w-4" />} />
    </div>
  );
}

function StatIcon({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">{icon}<span>{label}</span></div>
      <div className="mt-2 text-2xl font-semibold text-neutral-900">{value}</div>
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

type PromoterRow = { id: string; name: string; email: string; commission_rate: number; referral_code: string; status: string; created_at: string };

function PromotersTab({ eventId }: { eventId: string }) {
  const me = useCurrentProfile();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rate, setRate] = useState(13.5);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [promoters, setPromoters] = useState<PromoterRow[] | null>(null);

  const load = () => {
    supabase.from("event_promoters")
      .select("id,name,email,commission_rate,referral_code,status,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPromoters((data as PromoterRow[] | null) ?? []));
  };
  useEffect(load, [eventId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return toast.error("Name and email required");
    if (!me) return toast.error("Sign in required");
    setBusy(true);
    try {
      const { error } = await supabase.from("event_promoters").insert({
        event_id: eventId,
        organizer_id: me.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        commission_rate: rate,
      } as never);
      if (error) throw error;
      toast.success(`Promoter added: ${email}`);
      setName(""); setEmail(""); setRate(13.5); setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add promoter");
    } finally { setBusy(false); }
  };

  const removePromoter = async (id: string) => {
    if (!window.confirm("Remove this promoter?")) return;
    const { error } = await supabase.from("event_promoters").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  const copyLink = (code: string) => {
    const url = siteUrl(`/events/${eventId}?ref=${code}`);
    navigator.clipboard.writeText(url);
    toast.success("Referral link copied");
  };

  const count = promoters?.length ?? 0;

  return (
    <div className="space-y-4">
      <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-500 px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110">
        <Plus className="h-4 w-4" /> Add Sub-Promoter
      </button>

      <div>
        <div className="font-semibold text-neutral-900">Active Promoters ({count})</div>
        {promoters === null ? (
          <div className="mt-2 rounded-xl bg-neutral-100 p-6 text-center text-sm text-neutral-500">Loading…</div>
        ) : count === 0 ? (
          <div className="mt-2 rounded-xl bg-neutral-100 p-6 text-center text-sm text-neutral-500">
            No promoters yet. Add one above to start tracking referral sales.
          </div>
        ) : (
          <div className="mt-2 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {promoters.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="font-semibold text-neutral-900">{p.name}</div>
                  <div className="truncate text-xs text-neutral-500">{p.email} · {p.commission_rate}% commission</div>
                  <div className="mt-1 font-mono text-[11px] text-neutral-400">ref: {p.referral_code}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-500">{p.status}</span>
                  <button onClick={() => copyLink(p.referral_code)} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]">Copy link</button>
                  <button onClick={() => removePromoter(p.id)} title="Remove" className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
      <form onSubmit={submit} className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h4 className="text-base font-semibold text-neutral-900">Invite Sub-Promoter</h4>
        <p className="mt-1 text-xs text-neutral-500">They'll receive an email with their unique referral link. Commission is calculated on ticket subtotal (excl. platform fees).</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-neutral-700">Full Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-700">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-700">Commission Rate (%) *</label>
            <input type="number" step="0.1" min="0" max="100" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">Promoter earns <span className="font-semibold text-neutral-900">{rate}%</span> of every ticket sale made through their link.</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-[#d4580a] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
            {busy ? "Adding…" : "+ Add Promoter"}
          </button>
          <button type="button" onClick={() => { setName(""); setEmail(""); setRate(13.5); setOpen(false); }} className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:border-neutral-300">Cancel</button>
        </div>
      </form>
      )}

      <div className="text-right">
        <Link to="/promoter-dashboard" className="text-xs font-semibold text-[#d4580a] hover:underline">Open full promoter dashboard →</Link>
      </div>
    </div>
  );
}
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

type Audience = { id: string; title: string; created_at: string; count: number };
type Contact = { id: string; email: string; name: string | null };

function parseEmails(text: string) {
  return Array.from(new Set((text.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase())));
}

const TEMPLATES: { key: string; label: string; subject: (t: string) => string; body: (t: string, when: string, where: string) => string }[] = [
  {
    key: "save-the-date", label: "Save the Date",
    subject: (t) => `Save the date: ${t}`,
    body: (t, when, where) => `Mark your calendar. ${t} is happening ${when} at ${where}.\n\nMore details coming soon, but we wanted you to have first notice.`,
  },
  {
    key: "youre-invited", label: "You're Invited",
    subject: (t) => `You're invited: ${t}`,
    body: (t, when, where) => `I'd love to see you at ${t}.\n\nWhen: ${when}\nWhere: ${where}\n\nHope to see you there.`,
  },
  {
    key: "tickets", label: "Tickets On Sale",
    subject: (t) => `Tickets are live for ${t}`,
    body: (t, when, where) => `Tickets for ${t} are officially on sale.\n\nWhen: ${when}\nWhere: ${where}\n\nGrab yours before they're gone.`,
  },
  {
    key: "lineup", label: "Lineup Announcement",
    subject: () => `The lineup for our event is here`,
    body: (t, when) => `We've locked in the lineup for ${t}, and it does not disappoint.\n\nThis is your crew. This is your night ${when}. Lock in your ticket now and we'll see you there.`,
  },
  {
    key: "early-bird", label: "Early Bird Ending",
    subject: (t) => `Last call for early bird tickets to ${t}`,
    body: (t, when, where) => `Early bird pricing for ${t} ends soon.\n\nWhen: ${when}\nWhere: ${where}\n\nDon't wait, prices go up shortly.`,
  },
];

function CampaignTab({ events }: { events: MyEvent[] }) {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [openAudience, setOpenAudience] = useState<Audience | null>(null);

  const [fromName, setFromName] = useState("Planet Baltimore");
  const [eventId, setEventId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [extraRaw, setExtraRaw] = useState("");
  const [pickedEmails, setPickedEmails] = useState<Record<string, string[]>>({});
  const [preview, setPreview] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const loadAudiences = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setAudiences([]); setLoading(false); return; }
    const { data } = await supabase
      .from("email_audiences")
      .select("id,title,created_at,email_audience_contacts(count)")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false });
    setAudiences(
      (data ?? []).map((a: any) => ({
        id: a.id, title: a.title, created_at: a.created_at,
        count: a.email_audience_contacts?.[0]?.count ?? 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => { void loadAudiences(); }, []);

  const uploadFiles = async (files: FileList) => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return toast.error("Sign in first");
    let made = 0;
    for (const file of Array.from(files)) {
      const text = await file.text();
      const emails = parseEmails(text);
      if (emails.length === 0) { toast.error(`No emails found in ${file.name}`); continue; }
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled list";
      const { data: aud, error } = await supabase
        .from("email_audiences").insert({ owner_id: uid, title }).select("id").single();
      if (error || !aud) { toast.error(error?.message ?? "Could not create audience"); continue; }
      const rows = emails.map((email) => ({ audience_id: aud.id, owner_id: uid, email }));
      const { error: cErr } = await supabase.from("email_audience_contacts").insert(rows);
      if (cErr) toast.error(cErr.message);
      made += 1;
    }
    if (made) toast.success(`Created ${made} audience${made === 1 ? "" : "s"}`);
    await loadAudiences();
  };

  const createEmptyAudience = async () => {
    const title = window.prompt("Name this audience");
    if (!title?.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const { error } = await supabase.from("email_audiences").insert({ owner_id: uid, title: title.trim() });
    if (error) return toast.error(error.message);
    toast.success("Audience created");
    await loadAudiences();
  };

  const renameAudience = async (a: Audience) => {
    const title = window.prompt("Rename audience", a.title);
    if (!title?.trim() || title === a.title) return;
    const { error } = await supabase.from("email_audiences").update({ title: title.trim() }).eq("id", a.id);
    if (error) return toast.error(error.message);
    await loadAudiences();
  };

  const deleteAudience = async (a: Audience) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("email_audiences").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    setPicked((p) => p.filter((id) => id !== a.id));
    toast.success("Audience deleted");
    await loadAudiences();
  };

  const toggleAudience = async (a: Audience) => {
    if (picked.includes(a.id)) {
      setPicked((p) => p.filter((id) => id !== a.id));
      return;
    }
    if (!pickedEmails[a.id]) {
      const { data } = await supabase.from("email_audience_contacts").select("email").eq("audience_id", a.id);
      setPickedEmails((m) => ({ ...m, [a.id]: (data ?? []).map((r: any) => r.email) }));
    }
    setPicked((p) => [...p, a.id]);
  };

  const evt = events.find((e) => e.id === eventId) || null;
  const eventLink = evt
    ? `https://www.planetbaltimore.com/events/${evt.id}`
    : null;

  const recipients = useMemo(() => {
    const set = new Set<string>();
    picked.forEach((id) => (pickedEmails[id] ?? []).forEach((e) => set.add(e.toLowerCase())));
    parseEmails(extraRaw).forEach((e) => set.add(e));
    return Array.from(set);
  }, [picked, pickedEmails, extraRaw]);

  const applyTemplate = (key: string) => {
    const tpl = TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    const title = evt?.title ?? "our event";
    const when = evt
      ? new Date(evt.starts_at).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "soon";
    const where = evt?.venue_name || evt?.location || "Baltimore";
    setSubject(tpl.subject(title));
    const plain = `${tpl.body(title, when, where)}${eventLink ? `\n\nEvent details and tickets: ${eventLink}` : ""}\n\n${fromName}`;
    setBody(plain.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join(""));
  };

  // The invitation always carries the event link so recipients can tap
  // straight through to the event page, even if they edit the message.
  const withEventLink = (html: string) => {
    if (!eventLink) return html;
    if (html.includes(eventLink)) return html;
    return `${html}<p>Event details and tickets: <a href="${eventLink}">${eventLink}</a></p>`;
  };

  const send = async () => {
    if (recipients.length === 0) return toast.error("Add at least one valid recipient email");
    if (!subject.trim()) return toast.error("Add a subject before sending");
    if (richHtmlIsEmpty(body)) return toast.error("Write a message before sending");
    if (!evt || !eventLink) return toast.error("Choose an event before sending");

    setSending(true);
    const toastId = toast.loading(`Sending to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}…`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again before sending");

      let sent = 0;
      const failures: string[] = [];
      for (const recipientEmail of recipients) {
        const response = await fetch("/lovable/email/transactional/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            templateName: "event-invitation",
            recipientEmail,
            idempotencyKey: `event-invitation-${evt.id}-${recipientEmail}-${Date.now()}`,
            templateData: {
              fromName: fromName.trim() || "Planet Baltimore",
              subject: subject.trim(),
              messageDocument: richHtmlToEmailDocument(withEventLink(body)),
              eventTitle: `View ${evt.title} details and tickets`,
              eventUrl: eventLink,
            },
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.success !== false) sent += 1;
        else failures.push(result.error || result.reason || "Delivery failed");
      }

      if (failures.length === 0) toast.success(`Invitation sent to ${sent} recipient${sent === 1 ? "" : "s"}`, { id: toastId });
      else if (sent > 0) toast.warning(`Sent to ${sent}. ${failures.length} could not be sent.`, { id: toastId });
      else throw new Error(failures[0] || "The invitation could not be sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The invitation could not be sent", { id: toastId });
    } finally {
      setSending(false);
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${richHtmlToPlainText(withEventLink(body))}`);
      toast.success("Draft copied");
    } catch { toast.error("Could not copy"); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-2 text-base font-semibold text-neutral-900">
          <Mail className="h-4 w-4 text-[#d4580a]" /> New invitation campaign
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Start from a template</div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => applyTemplate(t.key)}
                className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-[#d4580a] hover:text-[#d4580a]"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">From name</label>
            <input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-[#d4580a]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Link to event (optional)</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-[#d4580a]"
            >
              <option value="">None</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Write your subject line"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-medium text-neutral-900 outline-none focus:border-[#d4580a]"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Message</label>
          <RichTextEditor
            value={body}
            onChange={setBody}
            placeholder="Write your email here, or start from a template above."
            minHeight={220}
          />
        </div>

        <div className="mt-5 border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <Users className="h-4 w-4 text-neutral-500" /> Send to
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">Add the list(s) you want to send this email to.</p>

          <div className="mt-3 space-y-2">
            {loading && <div className="text-sm text-neutral-500">Loading audiences…</div>}
            {!loading && audiences.length === 0 && (
              <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
                No audiences yet. Upload a CSV below to create one.
              </div>
            )}
            {audiences.map((a) => {
              const on = picked.includes(a.id);
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3.5 py-2.5">
                  <button onClick={() => setOpenAudience(a)} className="flex-1 truncate text-left text-sm font-medium text-neutral-900 hover:underline">
                    {a.title}
                  </button>
                  <span className="shrink-0 text-xs text-neutral-500">{a.count} contact{a.count === 1 ? "" : "s"}</span>
                  <button
                    onClick={() => void toggleAudience(a)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${on ? "bg-neutral-900 text-white" : "bg-[#d4580a] text-white hover:bg-[#b8480a]"}`}
                  >
                    {on ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) void uploadFiles(e.target.files); if (fileRef.current) fileRef.current.value = ""; }}
            />
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50">
              <Upload className="h-4 w-4" /> Upload CSV files
            </button>
            <button onClick={() => void createEmptyAudience()} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50">
              <Plus className="h-4 w-4" /> New audience
            </button>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">Or paste extra emails</label>
            <textarea
              value={extraRaw}
              onChange={(e) => setExtraRaw(e.target.value)}
              rows={3}
              placeholder="name@example.com, other@example.com"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-[#d4580a]"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
          <button onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50">
            <Eye className="h-4 w-4" /> {preview ? "Hide preview" : "Preview"}
          </button>
          <button onClick={copyAll} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50">
            <Copy className="h-4 w-4" /> Copy draft
          </button>
          <div className="flex-1" />
          <button onClick={() => void send()} disabled={sending} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b8480a] disabled:cursor-not-allowed disabled:opacity-60">
            <Send className="h-4 w-4" /> {sending ? "Sending…" : `Send to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}`}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500">Invitations are sent directly. Choose an event and add a subject, message, and at least one valid email.</p>

        {preview && (
          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="text-xs text-neutral-500">From</div>
            <div className="text-sm font-semibold text-neutral-900">{fromName || "—"}</div>
            <div className="mt-2 text-xs text-neutral-500">Subject</div>
            <div className="text-sm font-semibold text-neutral-900">{subject || "(no subject)"}</div>
            {withEventLink(body) ? (
              <div
                className="prose prose-sm prose-neutral mt-2 max-w-none text-sm leading-relaxed text-neutral-800 [&_a]:text-[#d4580a] [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: withEventLink(body) }}
              />
            ) : (
              <div className="mt-2 text-sm leading-relaxed text-neutral-400">(empty message)</div>
            )}
            {eventLink && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#d4580a]/10 px-3 py-1 text-xs font-medium text-[#b8480a]">
                Event link included: {eventLink}
              </div>
            )}
          </div>
        )}
      </div>

      {openAudience && (
        <AudienceEditor
          audience={openAudience}
          onClose={() => { setOpenAudience(null); void loadAudiences(); }}
          onRename={() => void renameAudience(openAudience)}
          onDelete={async () => { await deleteAudience(openAudience); setOpenAudience(null); }}
          onChanged={(emails) => setPickedEmails((m) => ({ ...m, [openAudience.id]: emails }))}
        />
      )}
    </div>
  );
}

function AudienceEditor({
  audience, onClose, onRename, onDelete, onChanged,
}: {
  audience: Audience;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onChanged: (emails: string[]) => void;
}) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [add, setAdd] = useState("");
  const addRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("email_audience_contacts")
      .select("id,email,name")
      .eq("audience_id", audience.id)
      .order("email");
    const rows = (data ?? []) as Contact[];
    setContacts(rows);
    onChanged(rows.map((r) => r.email));
  };

  useEffect(() => { void load(); }, [audience.id]);

  const addEmails = async (text: string) => {
    const emails = parseEmails(text);
    if (emails.length === 0) return toast.error("No valid emails found");
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const existing = new Set((contacts ?? []).map((c) => c.email));
    const rows = emails.filter((e) => !existing.has(e)).map((email) => ({ audience_id: audience.id, owner_id: uid, email }));
    if (rows.length === 0) return toast.error("Those emails are already in this audience");
    const { error } = await supabase.from("email_audience_contacts").insert(rows);
    if (error) return toast.error(error.message);
    setAdd("");
    toast.success(`Added ${rows.length} contact${rows.length === 1 ? "" : "s"}`);
    await load();
  };

  const remove = async (c: Contact) => {
    setContacts((prev) => (prev ?? []).filter((x) => x.id !== c.id));
    const { error } = await supabase.from("email_audience_contacts").delete().eq("id", c.id);
    if (error) { toast.error(error.message); await load(); return; }
    await load();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-neutral-900">{audience.title}</div>
            <div className="text-xs text-neutral-500">{contacts?.length ?? 0} contacts</div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            ref={addRef}
            value={add}
            onChange={(e) => setAdd(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void addEmails(add); }}
            placeholder="Add emails, comma or newline separated"
            className="flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#d4580a]"
          />
          <button onClick={() => void addEmails(add)} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b8480a]">
            Add
          </button>
        </div>

        <div className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
          {contacts === null && <div className="p-3 text-sm text-neutral-500">Loading…</div>}
          {contacts?.length === 0 && <div className="p-3 text-sm text-neutral-500">No contacts yet.</div>}
          {contacts?.map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 truncate text-sm text-neutral-800">{c.email}</span>
              <button onClick={() => void remove(c)} className="rounded-full p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={onRename} className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50">
            Rename
          </button>
          <button onClick={onDelete} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
            Delete audience
          </button>
        </div>
      </div>
    </div>
  );
}
