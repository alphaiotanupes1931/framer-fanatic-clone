import { siteUrl } from "@/lib/utils";
import { navigateExternal, openExternalWindow, closeExternalWindow } from "@/lib/external-nav";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { Calendar, MapPin, Plus, X, Ticket, ImagePlus, Loader2, Search, Clock, TrendingUp, Megaphone, Send, Bookmark } from "lucide-react";
import { HeroBanner } from "@/components/shared/hero-banner";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";
import { useServerFn } from "@tanstack/react-start";
import { createTicketCheckout } from "@/lib/stripe.functions";
import { EventImage } from "@/components/event-image";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { compressImage } from "@/lib/image-compress";
import { pageHead } from "@/lib/seo";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { emailMyTickets } from "@/lib/tickets.functions";
import { isPaidEvent } from "@/lib/event-pricing";

type EventRow = {
  id: string; user_id: string; title: string; description: string | null;
  location: string | null; image_url: string | null; starts_at: string;
  price_cents?: number | null;
  pricing_mode?: string | null;
  donations_enabled?: boolean | null;
  category?: string | null;
};

export const Route = createFileRoute("/events/")({
  component: EventsPage,
  head: () => pageHead({ path: "/events", title: "Baltimore Events Calendar | Planet Baltimore", description: "Concerts, gallery openings, markets and meetups happening across Baltimore, updated every day." }),
});

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function EventCard({ e, onBuy, variant = "light" }: { e: EventRow; onBuy?: (id: string) => void; variant?: "light" | "dark" }) {
  const priced = isPaidEvent(e);
  const dark = variant === "dark";
  const wrap = dark ? "border-paper/10 bg-paper/5" : "border-border bg-card text-card-foreground";
  const imgBg = dark ? "bg-paper/10 text-paper/30" : "bg-muted text-muted-foreground";
  const meta = dark ? "text-paper/60" : "text-muted-foreground";
  const body = dark ? "text-paper/70" : "text-muted-foreground";
  return (
    <Link to="/events/$eventId" params={{ eventId: e.id }} className={`block rounded-2xl overflow-hidden border h-full transition hover:shadow-lg hover:-translate-y-0.5 ${wrap}`}>
      <div className={`aspect-[16/10] overflow-hidden flex items-center justify-center ${imgBg}`}>
        {e.image_url
          ? <EventImage src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
          : <Calendar className="w-10 h-10" />}
      </div>
      <div className="p-4">
        <div className={`text-xs flex items-center gap-1 ${meta}`}><Calendar className="w-3 h-3" /> {fmtDate(e.starts_at)}</div>
        <div className="font-semibold mt-1 line-clamp-2">{e.title}</div>
        {e.location && <div className={`text-xs mt-1 flex items-center gap-1 ${meta}`}><MapPin className="w-3 h-3" /> {e.location}</div>}
        {e.description && <p className={`text-sm mt-2 line-clamp-2 ${body}`}>{e.description}</p>}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm font-semibold">
            {priced ? (e.price_cents ?? 0) > 0 ? `$${((e.price_cents ?? 0)/100).toFixed(2)}` : "Paid" : "Free"}
          </div>
          {priced && onBuy && (
            <button
              onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onBuy(e.id); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-orange px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
            >
              <Ticket className="h-3 w-3" /> Buy ticket
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

function fmtDateLong(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

const CATEGORIES = ["All", "Music", "Art", "Community", "Family", "Nightlife", "Food", "Wellness", "Education", "Sports", "Networking", "Festival"] as const;

function BigEventCard({ e, onBuy, buying }: { e: EventRow; onBuy: (id: string) => void; buying: boolean }) {
  const priced = isPaidEvent(e);
  const [shareOpen, setShareOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const shareUrl = siteUrl(`/events/${e.id}`);
  const me = useCurrentProfile();

  useEffect(() => {
    if (!me?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("event_saves").select("event_id").eq("event_id", e.id).eq("user_id", me.id).maybeSingle();
      if (!cancelled && data) setSaved(true);
    })();
    return () => { cancelled = true; };
  }, [me?.id, e.id]);

  const toggleSave = async (ev: React.MouseEvent) => {
    ev.preventDefault(); ev.stopPropagation();
    if (!me?.id) { toast.error("Sign in to save"); return; }
    const was = saved;
    setSaved(!was);
    const res = was
      ? await supabase.from("event_saves").delete().eq("event_id", e.id).eq("user_id", me.id)
      : await supabase.from("event_saves").insert({ event_id: e.id, user_id: me.id });
    if (res.error) { setSaved(was); toast.error(res.error.message); }
    else toast.success(was ? "Removed from saved" : "Saved");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <Link to="/events/$eventId" params={{ eventId: e.id }} className="relative block">
        <div className="aspect-[16/9] w-full overflow-hidden bg-neutral-100">
          {e.image_url ? (
            <EventImage src={e.image_url} alt={e.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-400">
              <Calendar className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
          <div className="text-lg font-bold text-white">{e.title}</div>
        </div>
      </Link>
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Clock className="h-4 w-4 text-neutral-400" /> {fmtDateLong(e.starts_at)}
        </div>
        {e.location && (
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <MapPin className="h-4 w-4 text-neutral-400" /> {e.location}
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <div className="text-sm font-bold text-neutral-900">
            {priced ? (e.price_cents ?? 0) > 0 ? `From $${((e.price_cents ?? 0) / 100).toFixed(2)}` : "Paid" : "Free"}
          </div>
          {!priced && (
            <button
              onClick={() => onBuy(e.id)}
              disabled={buying}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-500 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-600 disabled:opacity-60"
            >
              <Ticket className="h-3.5 w-3.5" /> Tickets
            </button>
          )}

        </div>
        <div className="flex items-center justify-end gap-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500">
          <button type="button" onClick={toggleSave} className={`inline-flex items-center gap-1 transition ${saved ? "text-[#d4580a]" : "hover:text-neutral-800"}`} aria-label={saved ? "Unsave" : "Save"} title={saved ? "Unsave" : "Save"}>
            <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} /> {saved ? "Saved" : "Save"}
          </button>
          <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1 hover:text-neutral-800"><Send className="h-4 w-4 -rotate-45" /> Share</button>
        </div>
      </div>
      <ShareToUsersDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={e.title}
        preview={{
          type: "event",
          id: e.id,
          url: shareUrl,
          title: e.title,
          excerpt: [fmtDateLong(e.starts_at), e.location].filter(Boolean).join(" - "),
          image: e.image_url ?? null,
        }}
      />
    </div>
  );
}

function EventsPage() {
  const { loading, signedIn } = useAuthState();
  // Cached so returning to Events paints the previous list instantly while
  // fresh data revalidates behind it.
  const { data: cachedEvents, loading: dataLoading, refetch } = useCachedFetch<EventRow[]>(
    "events:upcoming",
    async () => {
      // Include events happening today (or already started but not over) so a
      // freshly created event doesn't vanish the moment its start time passes.
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("events").select("*")
        .gte("starts_at", cutoff.toISOString())
        .order("starts_at", { ascending: true }).limit(24);
      const rows = (data as EventRow[] | null) ?? [];
      if (rows.length === 0) return rows;
      // Prices live on ticket_types, so fold the cheapest paid tier back onto
      // each event; otherwise paid events render as "Free".
      const { data: tiers } = await supabase
        .from("ticket_types")
        .select("event_id, price_cents")
        .in("event_id", rows.map((r) => r.id));
      const minByEvent = new Map<string, number>();
      for (const t of (tiers as { event_id: string; price_cents: number | null }[] | null) ?? []) {
        const cents = t.price_cents ?? 0;
        if (cents <= 0) continue;
        const prev = minByEvent.get(t.event_id);
        if (prev === undefined || cents < prev) minByEvent.set(t.event_id, cents);
      }
      return rows.map((r) => {
        const min = minByEvent.get(r.id);
        return (r.price_cents ?? 0) > 0 || min === undefined ? r : { ...r, price_cents: min };
      });
    },

  );
  const events = cachedEvents ?? [];

  if (loading) return null;

  if (!signedIn) {
    const next = events[0];
    return (
      <PublicShell title="What's happening next" subtitle="Tickets for the best events in Baltimore." signedIn={false}>
        {dataLoading ? (
          <div className="text-paper/60 text-sm">Loading events…</div>
        ) : events.length === 0 ? (
          <div className="text-paper/60 text-sm">No upcoming events yet. Sign up to be the first to post one.</div>
        ) : (
          <>
            {next && (
              <div className="mb-10">
                <div className="text-xs uppercase tracking-wider text-paper/60 mb-3">Up next</div>
                <div className="rounded-3xl overflow-hidden border border-paper/15 bg-paper/5 md:grid md:grid-cols-2">
                  <div className="aspect-[16/10] md:aspect-auto bg-paper/10 overflow-hidden">
                    {next.image_url
                      ? <EventImage src={next.image_url} alt={next.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-paper/30"><Calendar className="w-16 h-16" /></div>}
                  </div>
                  <div className="p-6 md:p-10 flex flex-col justify-center">
                    <div className="text-sm text-paper/70 flex items-center gap-2"><Calendar className="w-4 h-4" /> {fmtDate(next.starts_at)}</div>
                    <h2 className="font-display text-2xl md:text-3xl font-extrabold mt-2">{next.title}</h2>
                    {next.location && <div className="text-sm text-paper/70 mt-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> {next.location}</div>}
                    {next.description && <p className="text-paper/80 mt-4 line-clamp-4">{next.description}</p>}
                  </div>
                </div>
              </div>
            )}
            {events.length > 1 && (
              <>
                <div className="text-xs uppercase tracking-wider text-paper/60 mb-3">More events</div>
                <PreviewGrid
                  items={events.slice(1)}
                  unlockedCount={5}
                  signedIn={false}
                  thing="event"
              render={(e) => <EventCard e={e as EventRow} variant="dark" />}
                />
              </>
            )}
          </>
        )}
      </PublicShell>
    );
  }

  return <SignedInEvents events={events} dataLoading={dataLoading} reload={refetch} />;
}

function SignedInEvents({ events, dataLoading, reload }: { events: EventRow[]; dataLoading: boolean; reload: () => void }) {
  const me = useCurrentProfile();
  const { isArtist } = useUserRole();
  const checkoutFn = useServerFn(createTicketCheckout);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", image_url: "", starts_at: "" });
  const [buying, setBuying] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (cat !== "All" && (e.category ?? "").toLowerCase() !== cat.toLowerCase()) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [events, query, cat]);

  const onPickImage = async (file: File) => {
    file = await compressImage(file);
    if (!me) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("event-images").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      // Store the storage path; EventImage signs it on render.
      setForm((f) => ({ ...f, image_url: path }));
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const buy = async (eventId: string) => {
    setBuying(eventId);
    try {
      const ev = events.find((e) => e.id === eventId);
      const isFree = !ev || !isPaidEvent(ev);
      if (isFree) {
        const { error } = await supabase.rpc("rsvp_free_event", { _event_id: eventId, _quantity: 1 });
        if (error) throw error;
        toast.success("You're going! Check your email for your ticket.");
        void emailMyTickets({ data: { eventId } }).catch((err) => {
        console.error("ticket email failed", err);
        toast.error("Your ticket is saved, but we could not email it just now. Open My Tickets to download it.");
      });
        return;
      }
      // Paid: ask how many tickets first, in a sleek sheet, then go to checkout.
      // Read the real per-buyer cap (event cap, else lowest tier cap) so the
      // picker never offers more than checkout will actually allow.
      const [{ data: evRow }, { data: tiers }] = await Promise.all([
        supabase.from("events").select("max_tickets_per_buyer").eq("id", eventId).maybeSingle(),
        supabase.from("ticket_types").select("max_per_buyer").eq("event_id", eventId),
      ]);
      const tierCaps = (tiers ?? []).map((t) => t.max_per_buyer).filter((n): n is number => !!n);
      const cap = (evRow as { max_tickets_per_buyer: number | null } | null)?.max_tickets_per_buyer
        ?? (tierCaps.length ? Math.min(...tierCaps) : null);
      setQtyMax(Math.max(1, Math.min(cap ?? 20, 100)));
      setQtyEvent(ev);
      setQty(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBuying(null);
    }
  };

  const [qtyEvent, setQtyEvent] = useState<EventRow | null>(null);
  const [qty, setQty] = useState(1);
  const [qtyMax, setQtyMax] = useState(20);
  const [checkingOut, setCheckingOut] = useState(false);

  const goToCheckout = async () => {
    if (!qtyEvent) return;
    setCheckingOut(true);
    const pre = openExternalWindow();
    try {
      const { url } = await checkoutFn({
        data: { eventId: qtyEvent.id, quantity: qty, returnOrigin: window.location.origin },
      });
      if (url) navigateExternal(url, pre);
      else closeExternalWindow(pre);
    } catch (e) {
      closeExternalWindow(pre);
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setCheckingOut(false);
    }
  };

  const navigate = useNavigate();

  const submit = async () => {
    if (!me) return;
    if (!form.title || !form.starts_at) { toast.error("Title and date required"); return; }
    const { data: created, error } = await supabase.from("events").insert({
      user_id: me.id,
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      image_url: form.image_url || null,
      starts_at: new Date(form.starts_at).toISOString(),
      price_cents: 0,
    }).select("id").maybeSingle();
    if (error) {
      toast.error(error.message.includes("row-level security")
        ? "Only Artists can post events. Upgrade in your profile."
        : error.message);
      return;
    }
    toast.success("Event created. Now set up your ticket types.");
    setOpen(false);
    setForm({ title: "", description: "", location: "", image_url: "", starts_at: "" });
    reload();
    const newId = (created as { id: string } | null)?.id;
    // Organizers continue in the studio so they can set up ticket types.
    navigate({ to: "/organizer-studio", search: newId ? { event: newId } : {} });
  };

  return (
    <AppLayout
    >
      <div className="space-y-6">
        <HeroBanner
          title="Your Next Event"
          subtitle="Tickets for the best events in Baltimore"
          cta={
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events, venues..."
                className="w-full rounded-2xl border border-neutral-200 bg-white py-3.5 pl-11 pr-4 text-sm placeholder:text-neutral-400 focus:border-orange-400 focus:outline-none"
              />
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            to="/organizer-studio"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 hover:border-[#d4580a] hover:text-[#d4580a]"
          >
            <TrendingUp className="h-4 w-4" /> Organizer Studio
          </Link>
          <Link
            to="/promoter-dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 hover:border-[#d4580a] hover:text-[#d4580a]"
          >
            <Megaphone className="h-4 w-4" /> Promoter Dashboard
          </Link>
          <Link
            to="/events/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d4580a] px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Create Event
          </Link>
        </div>

        <div className="relative hidden">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, venues..."
            className="w-full rounded-2xl border border-neutral-200 bg-white py-3.5 pl-11 pr-4 text-sm placeholder:text-neutral-400 focus:border-orange-400 focus:outline-none"
          />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {CATEGORIES.map((c, i) => (
            <Fragment key={c}>
              {i === 1 && (
                <>
                  <Link
                    to="/calendar"
                    className="whitespace-nowrap rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm font-semibold text-neutral-600 transition hover:border-orange-300"
                  >
                    Calendar
                  </Link>
                  <Link
                    to="/festivals"
                    className="whitespace-nowrap rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm font-semibold text-neutral-600 transition hover:border-orange-300"
                  >
                    Festivals
                  </Link>
                </>
              )}
              <button
                onClick={() => setCat(c)}
                className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition ${
                  cat === c
                    ? "bg-[#d4580a] text-white"
                    : "border border-neutral-200 bg-white text-neutral-600 hover:border-orange-300"
                }`}
              >
                {c}
              </button>
            </Fragment>
          ))}
        </div>

        <div className="flex items-baseline gap-2 pt-2">
          {/* moved into sticky header below */}
        </div>
        <div className="sticky top-0 z-20 -mx-4 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/70 sm:mx-0 sm:rounded-xl sm:border sm:px-4">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-xl font-extrabold text-neutral-900 sm:text-2xl">{cat === "All" ? "All Events" : cat}</h2>
            <span className="text-sm text-neutral-500">({filtered.length})</span>
          </div>
        </div>

        {dataLoading ? (
          <div className="py-10 text-sm text-neutral-500">Loading events…</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-sm text-neutral-500">No upcoming events. Be the first to post one!</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {filtered.map((e) => (
              <div key={e.id} className={buying === e.id ? "pointer-events-none opacity-60" : ""}>
                <BigEventCard e={e} onBuy={buy} buying={buying === e.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!qtyEvent} onOpenChange={(o) => { if (!o && !checkingOut) setQtyEvent(null); }}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-base font-bold">{qtyEvent?.title}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 pt-4">
            <p className="text-sm text-neutral-500">How many tickets?</p>
            <div className="mt-4 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                disabled={qty <= 1}
                className="h-11 w-11 rounded-full border border-neutral-200 text-xl font-bold transition active:scale-90 disabled:opacity-40"
              >
                −
              </button>
              <span className="w-10 text-center text-3xl font-extrabold tabular-nums transition-all">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((n) => Math.min(qtyMax, n + 1))}
                disabled={qty >= qtyMax}
                className="h-11 w-11 rounded-full border border-neutral-200 text-xl font-bold transition active:scale-90 disabled:opacity-40"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={goToCheckout}
              disabled={checkingOut}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#d4580a] px-5 py-3 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
              Continue · ${(((qtyEvent?.price_cents ?? 0) * qty) / 100).toFixed(2)}
            </button>
            <p className="mt-2 text-center text-[11px] text-neutral-400">
              Fees calculated at checkout{qtyMax < 20 ? ` · limit ${qtyMax} per person` : ""}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-background text-foreground rounded-2xl w-full max-w-lg p-6 border" onClick={(e) => e.stopPropagation()}>
            {/* create event modal */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold">Create event</h3>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-lg border bg-transparent px-3 py-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input type="datetime-local" className="w-full rounded-lg border bg-transparent px-3 py-2" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              <input className="w-full rounded-lg border bg-transparent px-3 py-2" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <div className="rounded-lg border border-[#d4580a]/25 bg-[#d4580a]/[0.06] p-3">
                <div className="text-sm font-semibold">Tickets are set up next</div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  When you create this event we take you to Organizer Studio, where you add your ticket types
                  (free RSVP, tiers, prices, and quantities).
                </p>
              </div>

              <div className="rounded-lg border bg-transparent p-3">
                <div className="flex items-center gap-3">
                  {form.image_url ? (
                    <EventImage src={form.image_url} alt="" className="h-16 w-16 rounded-md object-cover border" />
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center text-muted-foreground"><ImagePlus className="w-5 h-5" /></div>
                  )}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                      {form.image_url ? "Replace image" : "Upload event image"}
                    </button>
                    {form.image_url && (
                      <button type="button" onClick={() => setForm({ ...form, image_url: "" })} className="ml-2 text-xs text-muted-foreground hover:text-foreground">Remove</button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickImage(f); e.target.value = ""; }}
                    />
                  </div>
                </div>
              </div>
              <textarea className="w-full rounded-lg border bg-transparent px-3 py-2 min-h-[100px]" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <button onClick={submit} className="w-full rounded-full bg-foreground text-background px-5 py-2 font-medium inline-flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Post event</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
