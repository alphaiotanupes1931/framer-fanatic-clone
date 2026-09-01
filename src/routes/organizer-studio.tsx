import { siteUrl } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ensureConnectAccount, createConnectOnboardingLink, refreshConnectStatus } from "@/lib/stripe.functions";
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
import { FileText, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

/** Stripe payout connection panel shown inside Organizer Studio. */
function StripeTab({ onStatus }: { onStatus: (ready: boolean) => void }) {
  const profile = useCurrentProfile();
  const ensureFn = useServerFn(ensureConnectAccount);
  const linkFn = useServerFn(createConnectOnboardingLink);
  const refreshFn = useServerFn(refreshConnectStatus);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; chargesEnabled: boolean } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Popup: "checking" shows a spinner while the status is fetched (min 2.2s
  // so the animation is visible), then resolves to connected / not-connected.
  const [checkPhase, setCheckPhase] = useState<"checking" | "connected" | "not-connected">("checking");
  const [checkOpen, setCheckOpen] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    const minDelay = new Promise((r) => setTimeout(r, 2200));
    const fetchStatus = profile.stripe_account_id
      ? refreshFn().catch(() => ({ connected: true, chargesEnabled: !!profile.stripe_charges_enabled }))
      : Promise.resolve({ connected: false, chargesEnabled: false });
    Promise.all([fetchStatus, minDelay]).then(([s]) => {
      if (cancelled) return;
      setStatus(s);
      onStatus(!!s.chargesEnabled);
      setCheckPhase(s.chargesEnabled ? "connected" : "not-connected");
    });
    return () => { cancelled = true; };
  }, [profile?.id, profile?.stripe_account_id]);

  const onboard = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const account = await ensureFn();
      if (!account.ok) {
        setErrorMsg(account.message);
        toast.error(account.message);
        setBusy(false);
        return;
      }
      const { url } = await linkFn({ data: {
        returnUrl: `${window.location.origin}/organizer-studio?stripe=ok`,
        refreshUrl: `${window.location.origin}/organizer-studio?stripe=refresh`,
      }});
      // Keep this in the current tab. Preview browsers can leave a pre-opened
      // popup stuck on about:blank while the secure link is generated.
      window.location.assign(url);
    } catch (e) {
      const message = sanitizeErrorMessage(e, "Could not open payout setup");
      setErrorMsg(message);
      toast.error(message);
      setBusy(false);
    }
  };

  const ready = !!status?.chargesEnabled;

  return (
    <div className="space-y-5">
      <div
        className={`rounded-2xl border p-5 ${
          status && !ready
            ? "border-red-400 bg-red-50/60 shadow-[0_0_18px_rgba(220,38,38,0.35)]"
            : "border-neutral-200 bg-white"
        }`}
      >
        <div className="flex items-start gap-3">
          <CreditCard className={`mt-0.5 h-5 w-5 ${ready ? "text-[#d4580a]" : "text-red-600"}`} />
          <div className="flex-1">
            <div className="text-sm font-semibold text-neutral-900">Your payout account</div>
            <p className="mt-1 text-sm text-neutral-600">
              Connect payouts so you can sell paid tickets. Money lands in your own bank account.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {ready ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected &amp; active
                </span>
              ) : status?.connected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5" /> Onboarding incomplete
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  <AlertCircle className="h-3.5 w-3.5" /> Not connected
                </span>
              )}
              <button
                onClick={onboard}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {busy ? "Opening secure form…" : ready ? "Manage payouts" : "Set up payouts"}
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
            {errorMsg ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-relaxed text-neutral-700">
        <h4 className="mb-2 text-base font-semibold text-neutral-900">What happens next</h4>
        <ol className="list-decimal space-y-2 pl-5 text-neutral-600">
          <li>Verify your identity and add a bank account in the secure form.</li>
          <li>Come back here. The badge turns green when you can sell paid tickets.</li>
          <li>Pick an event under Manage Events, add ticket types, then use Save Tickets to view the live event page.</li>
        </ol>
      </div>

      {checkOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl animate-scale-in">
            {checkPhase === "checking" ? (
              <div className="py-4">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-[#d4580a]" />
                <div className="mt-4 text-sm font-semibold text-neutral-900">Checking your Stripe connection…</div>
                <p className="mt-1 text-xs text-neutral-500">This takes a moment.</p>
              </div>
            ) : checkPhase === "connected" ? (
              <div className="py-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 animate-scale-in">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="mt-4 text-base font-semibold text-neutral-900">Stripe has been connected</div>
                <p className="mt-1 text-sm text-neutral-600">You can sell paid tickets right away.</p>
                <button
                  onClick={() => setCheckOpen(false)}
                  className="mt-5 w-full rounded-full bg-[#d4580a] py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Continue
                </button>
              </div>
            ) : (
              <div className="py-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 animate-scale-in">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <div className="mt-4 text-base font-semibold text-neutral-900">Your Stripe account has not been set up</div>
                <p className="mt-1 text-sm text-neutral-600">Set up payouts before selling paid tickets.</p>
                <div className="mt-5 space-y-2">
                  <button
                    onClick={() => { setCheckOpen(false); onboard(); }}
                    disabled={busy}
                    className="w-full rounded-full bg-[#d4580a] py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    {busy ? "Opening secure form…" : "Set up my Stripe account"}
                  </button>
                  <button
                    onClick={() => setCheckOpen(false)}
                    className="w-full rounded-full bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200"
                  >
                    Not now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

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
  pricing_mode?: string | null;
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
  const [ticketsDirty, setTicketsDirty] = useState(false);
  const [saveTicketsSignal, setSaveTicketsSignal] = useState(0);

  const load = () => {
    if (!me) return;
    supabase.from("events")
      .select("id,title,starts_at,venue_name,location,price_cents,pricing_mode,is_published")
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
              if (!selected) { toast.info("Pick an event first, then Save Tickets opens its page."); setTab("manage"); return; }
              if (ticketsDirty) { setSaveTicketsSignal((s) => s + 1); return; }
              navigate({ to: "/events/$eventId", params: { eventId: selected.id } });
            }}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 font-semibold transition ${
              ticketsDirty
                ? "bg-[#d4580a] text-white shadow hover:brightness-110"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
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
          <EventDetail
            evt={selected}
            onBack={() => setSelected(null)}
            initialTab={focusEdit ? "details" : undefined}
            onTicketsDirtyChange={setTicketsDirty}
            saveTicketsSignal={saveTicketsSignal}
            onTicketsSaved={() => navigate({ to: "/events/$eventId", params: { eventId: selected.id } })}
          />
        )}
      </div>
    </AppLayout>
  );
}

function EventDetail({ evt, onBack, initialTab, onTicketsDirtyChange, saveTicketsSignal, onTicketsSaved }: { evt: MyEvent; onBack: () => void; initialTab?: "details"; onTicketsDirtyChange?: (dirty: boolean) => void; saveTicketsSignal?: number; onTicketsSaved?: () => void; }) {
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

      {/* Kept mounted so in-progress edits survive a trip to another tab. */}
      <div className={tab === "details" ? "rounded-xl border border-neutral-200 bg-white p-5" : "hidden"}>
        <EventEditForm eventId={evt.id} onSaved={onBack} onCancel={() => setTab("tickets")} />
      </div>

      {tab === "tickets" && (
        <TicketsTab evt={evt} soldCount={paid.length} onDirtyChange={onTicketsDirtyChange} saveSignal={saveTicketsSignal} onSaved={onTicketsSaved} />
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

/**
 * Shared payout gate. Paid tickets and donations both need an active Stripe
 * account, so they check the live status before saving and offer a one-click
 * path into the secure setup form.
 */
function useStripeGate() {
  const refreshFn = useServerFn(refreshConnectStatus);
  const ensureFn = useServerFn(ensureConnectAccount);
  const linkFn = useServerFn(createConnectOnboardingLink);
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);

  /** Live check with Stripe. Can take a few seconds. */
  const check = async () => {
    setChecking(true);
    try {
      const status = await refreshFn();
      return !!status.chargesEnabled;
    } catch {
      return false;
    } finally {
      setChecking(false);
    }
  };

  const startSetup = async () => {
    setOpening(true);
    try {
      const account = await ensureFn();
      if (!account.ok) { toast.error(account.message); setOpening(false); return; }
      const { url } = await linkFn({ data: {
        returnUrl: `${window.location.origin}/organizer-studio?stripe=ok`,
        refreshUrl: `${window.location.origin}/organizer-studio?stripe=refresh`,
      }});
      window.location.assign(url);
    } catch (e) {
      toast.error(sanitizeErrorMessage(e, "Could not open payout setup"));
      setOpening(false);
    }
  };

  return { checking, opening, check, startSetup };
}

/** Red callout shown when money features are blocked by a missing Stripe account. */
function StripeRequiredNotice({ message, onSetup, busy }: { message: string; onSetup: () => void; busy?: boolean }) {
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 p-4">
      <div className="flex items-start gap-2 text-sm font-semibold text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
      </div>
      <button
        type="button"
        onClick={onSetup}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Opening secure form…" : "Click here to set up your Stripe account"}
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Full-screen progress while Stripe is checked, so the wait is explained. */
function StripeCheckingOverlay({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl animate-scale-in">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-[#d4580a]" />
        <div className="mt-4 text-sm font-semibold text-neutral-900">{label}</div>
        <p className="mt-1 text-xs text-neutral-500">This can take a few seconds. Please keep this window open.</p>
      </div>
    </div>
  );
}


function TicketsTab({ evt, soldCount, onDirtyChange, saveSignal, onSaved }: { evt: MyEvent; soldCount: number; onDirtyChange?: (dirty: boolean) => void; saveSignal?: number; onSaved?: () => void; }) {
  const [types, setTypes] = useState<TicketType[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [capLoaded, setCapLoaded] = useState(false);
  const [hasTicketEdits, setHasTicketEdits] = useState(false);
  const [donations, setDonations] = useState(false);
  const [donationError, setDonationError] = useState<string | null>(null);
  const gate = useStripeGate();

  useEffect(() => {
    supabase.from("events").select("donations_enabled").eq("id", evt.id).maybeSingle()
      .then(({ data }) => {
        setDonations(!!(data as { donations_enabled?: boolean | null } | null)?.donations_enabled);
        setCapLoaded(true);
      });
  }, [evt.id]);

  const [createdPending, setCreatedPending] = useState(false);

  const isDirty = showForm || createdPending || hasTicketEdits;
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  useEffect(() => {
    setHasTicketEdits(false);
    setCreatedPending(false);
  }, [evt.id]);

  useEffect(() => {
    if (saveSignal === undefined || saveSignal === 0) return;
    onSaved?.();
  }, [saveSignal]);

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
    setHasTicketEdits(true);
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
        <NewTicketTypeForm eventId={evt.id} onCancel={() => setShowForm(false)} onCreated={() => { setShowForm(false); setCreatedPending(true); setHasTicketEdits(true); load(); }} />
      )}

      {capLoaded && evt.pricing_mode !== "paid" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-semibold text-neutral-900">Donate button</div>
          <p className="mt-0.5 text-xs text-neutral-500">
            Free events can still take support. Turn this on and guests see a Donate button next to their free ticket.
            Donations need a connected Stripe account.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                setDonationError(null);
                const next = !donations;
                if (next) {
                  const ready = await gate.check();
                  if (!ready) {
                    setDonationError("You will need to set up a Stripe account before you can take donations.");
                    return;
                  }
                }
                const { error } = await supabase.from("events").update({ donations_enabled: next }).eq("id", evt.id);
                if (error) { toast.error(error.message); return; }
                setDonations(next);
                toast.success(next ? "Donate button is on" : "Donate button is off");
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                donations ? "bg-emerald-600 text-white" : "bg-neutral-900 text-white"
              } hover:brightness-110`}
            >
              {donations ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {donations ? "Donate button is on" : "Add a donate button"}
            </button>
            {donations && <span className="text-xs text-neutral-500">Guests can give any amount from $1.</span>}
          </div>
          {donationError && (
            <div className="mt-3">
              <StripeRequiredNotice message={donationError} onSetup={gate.startSetup} busy={gate.opening} />
            </div>
          )}
        </div>
      )}

      {gate.checking && <StripeCheckingOverlay label="Checking your Stripe account…" />}

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
                       if (error) toast.error(error.message); else { toast.success("Deleted"); setHasTicketEdits(true); load(); }
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
  const [stripeError, setStripeError] = useState<string | null>(null);
  const gate = useStripeGate();

  const canSubmit = name.trim().length > 0 && !saving && !gate.checking;

  const submit = async () => {
    if (!canSubmit) return;
    const priceCents = Math.max(0, Math.round(parseFloat(price || "0") * 100));
    // Paid tiers and donations move money, so confirm payouts are live first.
    const needsStripe = category === "donation" || (category !== "free_rsvp" && priceCents > 0);
    setStripeError(null);
    if (needsStripe) {
      const ready = await gate.check();
      if (!ready) {
        setStripeError(
          category === "donation"
            ? "You will need to set up a Stripe account before you can take donations."
            : "You will need to set up a Stripe account before you can sell paid tickets.",
        );
        return;
      }
    }
    setSaving(true);
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

        {stripeError && <StripeRequiredNotice message={stripeError} onSetup={gate.startSetup} busy={gate.opening} />}
        {gate.checking && <StripeCheckingOverlay label="Checking your Stripe account…" />}

        <div className="flex gap-2 pt-2">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="flex-1 rounded-lg bg-[#d4580a] py-3 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >{gate.checking ? "Checking your Stripe account…" : saving ? "Creating..." : "Create Ticket Type"}</button>
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
