import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { Calendar, MapPin, Plus, X, Ticket, ImagePlus, Loader2, Search, Share2, Clock, TrendingUp, Megaphone, Send } from "lucide-react";
import { HeroBanner } from "@/components/shared/hero-banner";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";
import { useServerFn } from "@tanstack/react-start";
import { createTicketCheckout, rsvpFreeEvent } from "@/lib/stripe.functions";
import { EventImage } from "@/components/event-image";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";

type EventRow = {
  id: string; user_id: string; title: string; description: string | null;
  location: string | null; image_url: string | null; starts_at: string;
  price_cents?: number | null;
};

export const Route = createFileRoute("/events/")({
  component: EventsPage,
  head: () => ({
    meta: [
      { title: "Events - Planet Baltimore" },
      { name: "description", content: "What's happening next in Baltimore - concerts, openings, meetups and more." },
    ],
  }),
});

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function EventCard({ e, onBuy, variant = "light" }: { e: EventRow; onBuy?: (id: string) => void; variant?: "light" | "dark" }) {
  const priced = (e.price_cents ?? 0) > 0;
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
            {priced ? `$${((e.price_cents ?? 0)/100).toFixed(2)}` : "Free"}
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

const CATEGORIES = ["All", "Music", "Art", "Community", "Nightlife", "Food", "Wellness", "Education", "Sports", "Networking", "Festival"] as const;

function BigEventCard({ e, onBuy, buying }: { e: EventRow; onBuy: (id: string) => void; buying: boolean }) {
  const priced = (e.price_cents ?? 0) > 0;
  const [shareOpen, setShareOpen] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/events/${e.id}` : `/events/${e.id}`;
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
            {priced ? `From $${((e.price_cents ?? 0) / 100).toFixed(2)}` : "Free"}
          </div>
          <button
            onClick={() => onBuy(e.id)}
            disabled={buying}
            className="inline-flex items-center gap-1.5 rounded-full bg-neutral-500 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-600 disabled:opacity-60"
          >
            <Ticket className="h-3.5 w-3.5" /> {priced ? "Get Tickets" : "RSVP"}
          </button>
        </div>
        <div className="flex items-center justify-end gap-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500">
          <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1 hover:text-neutral-800"><Send className="h-4 w-4" /> Share</button>
        </div>
      </div>
      <ShareToUsersDialog open={shareOpen} onClose={() => setShareOpen(false)} url={shareUrl} title={e.title} />
    </div>
  );
}

function EventsPage() {
  const { loading, signedIn } = useAuthState();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events").select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true }).limit(24);
      setEvents((data as EventRow[] | null) ?? []);
      setDataLoading(false);
    })();
  }, []);

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
                  unlockedCount={0}
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

  return <SignedInEvents events={events} dataLoading={dataLoading} reload={() => {
    setDataLoading(true);
    supabase.from("events").select("*").gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true }).limit(50)
      .then(({ data }) => { setEvents((data as EventRow[] | null) ?? []); setDataLoading(false); });
  }} />;
}

function SignedInEvents({ events, dataLoading, reload }: { events: EventRow[]; dataLoading: boolean; reload: () => void }) {
  const me = useCurrentProfile();
  const { isArtist } = useUserRole();
  const checkoutFn = useServerFn(createTicketCheckout);
  const rsvpFn = useServerFn(rsvpFreeEvent);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", image_url: "", starts_at: "", price: "" });
  const [buying, setBuying] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [events, query]);

  const onPickImage = async (file: File) => {
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
      const isFree = !ev || (ev.price_cents ?? 0) <= 0;
      if (isFree) {
        const res = await rsvpFn({ data: { eventId } });
        toast.success(res.alreadyRsvped ? "You're already on the list" : "You're going!");
      } else {
        const { url } = await checkoutFn({ data: { eventId, returnOrigin: window.location.origin } });
        if (url) window.location.href = url;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBuying(null);
    }
  };

  const submit = async () => {
    if (!me) return;
    if (!form.title || !form.starts_at) { toast.error("Title and date required"); return; }
    const priceCents = Math.max(0, Math.round(parseFloat(form.price || "0") * 100));
    const { error } = await supabase.from("events").insert({
      user_id: me.id,
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      image_url: form.image_url || null,
      starts_at: new Date(form.starts_at).toISOString(),
      price_cents: priceCents,
    });
    if (error) {
      toast.error(error.message.includes("row-level security")
        ? "Only Artists can post events. Upgrade in your profile."
        : error.message);
      return;
    }
    toast.success("Event posted");
    setOpen(false);
    setForm({ title: "", description: "", location: "", image_url: "", starts_at: "", price: "" });
    reload();
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
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition ${
                cat === c
                  ? "bg-[#d4580a] text-white"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:border-orange-300"
              }`}
            >
              {c}
            </button>
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

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-background text-foreground rounded-2xl w-full max-w-lg p-6 border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold">Create event</h3>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-lg border bg-transparent px-3 py-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input type="datetime-local" className="w-full rounded-lg border bg-transparent px-3 py-2" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              <input className="w-full rounded-lg border bg-transparent px-3 py-2" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <div>
                <input
                  type="number" step="0.01" min="0"
                  className="w-full rounded-lg border bg-transparent px-3 py-2"
                  placeholder="Ticket price you want to NET in USD (0 = free)"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Stripe fees and the platform fee are added on top automatically, you net the
                  exact amount you enter.
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
