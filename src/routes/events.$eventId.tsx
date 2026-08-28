import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { navigateExternal, openExternalWindow, closeExternalWindow } from "@/lib/external-nav";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/shared/follow-button";
import { AppLayout } from "@/components/app-layout";
import { MapPin, Navigation, Ticket, ArrowLeft, Send, Trash2, Edit3, EyeOff, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createTicketCheckout } from "@/lib/stripe.functions";
import { EventImage, useEventImageUrl } from "@/components/event-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportButton } from "@/components/shared/report-button";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { externalShare } from "@/lib/share-preview";
import { SmartAvatarImage, SmartVideo } from "@/components/shared/smart-img";
import { EventSocial } from "@/components/event-social";
import { RichHtml } from "@/components/rich-html";
import { getPublicEvent } from "@/lib/events.functions";
import { emailMyTickets } from "@/lib/tickets.functions";

type EventRow = {
  id: string; user_id: string; title: string; description: string | null;
  venue_name: string | null; address: string | null; location: string | null;
  image_url: string | null; starts_at: string; ends_at: string | null;
  price_cents: number | null; status: string; is_published: boolean;
  neighborhood: string | null; video_url: string | null; gallery_urls: string[] | null;
};

type TicketTier = {
  id: string; name: string; description: string | null; price_cents: number;
  quantity: number | null; max_per_buyer: number | null;
  sale_starts_at: string | null; sale_ends_at: string | null; perks: string[] | null;
};

type Host = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

const SITE = "https://planetbaltimore.com";

function stripHtml(v: string) {
  return v.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetail,
  loader: ({ params }) => getPublicEvent({ data: { eventId: params.eventId } }),
  errorComponent: () => (
    <AppLayout>
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">We could not load this event</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please refresh the page or head back to all events.</p>
        <Link to="/events" className="mt-4 inline-block text-sm font-semibold text-[#d4580a]">Browse events</Link>
      </div>
    </AppLayout>
  ),
  notFoundComponent: () => (
    <AppLayout>
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Event not found</h1>
        <Link to="/events" className="mt-4 inline-block text-sm font-semibold text-[#d4580a]">Browse events</Link>
      </div>
    </AppLayout>
  ),
  head: ({ params, loaderData }) => {
    const url = `${SITE}/events/${params.eventId}`;
    if (!loaderData) {
      return {
        meta: [
          { title: "Event unavailable | Planet Baltimore" },
          { name: "robots", content: "noindex" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const e = loaderData;
    const where = [e.venueName, e.location || e.neighborhood].filter(Boolean).join(", ");
    const when = new Date(e.startsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
    const description = (e.description ? stripHtml(e.description) : `${e.title} on ${when}${where ? ` at ${where}` : ""} in Baltimore.`).slice(0, 155);
    const suffix = " | Planet Baltimore";
    const venue = where ? ` at ${where.split(", ")[0]}` : "";
    let base = `${e.title}${venue}`;
    if (base.length > 60 - suffix.length) {
      base = base.slice(0, 60 - suffix.length - 1);
      base = base.slice(0, base.lastIndexOf(" ") > 20 ? base.lastIndexOf(" ") : base.length).replace(/[,\s]+$/, "");
    }
    const title = `${base}${suffix}`;
    const image = e.imageUrl && /^https?:\/\//.test(e.imageUrl) ? e.imageUrl : null;

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: e.title,
      description,
      url,
      startDate: e.startsAt,
      eventStatus: e.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: e.venueName || e.location || e.neighborhood || "Baltimore",
        address: {
          "@type": "PostalAddress",
          streetAddress: e.address || undefined,
          addressLocality: "Baltimore",
          addressRegion: "MD",
          addressCountry: "US",
        },
      },
      organizer: {
        "@type": "Organization",
        name: e.hostName || "Planet Baltimore",
        url: e.hostUsername ? `${SITE}/u/${e.hostUsername}` : SITE,
      },
    };
    if (e.endsAt) jsonLd.endDate = e.endsAt;
    if (image) jsonLd.image = [image];
    jsonLd.offers = {
      "@type": "Offer",
      url,
      price: ((e.priceCents ?? 0) / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      validFrom: new Date().toISOString(),
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
        ...(e.isPublished ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const [evt, setEvt] = useState<EventRow | null>(null);
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [rsvping, setRsvping] = useState(false);
  const [rsvped, setRsvped] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const checkoutFn = useServerFn(createTicketCheckout);
  const [shareOpen, setShareOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingBk, setSavingBk] = useState(false);
  const [qty, setQty] = useState(1);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [tierId, setTierId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id ?? null;
      setMe(uid);
      if (uid) {
        const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
        setIsAdmin(!!r);
      }
      const { data } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (data) {
        setEvt(data as EventRow);
        const { data: h } = await (supabase as any).from("profiles_public").select("id, display_name, username, avatar_url").eq("id", (data as EventRow).user_id).maybeSingle();
        setHost((h as Host) || null);
        if (uid) {
          const { data: sv } = await supabase.from("event_saves").select("event_id").eq("event_id", eventId).eq("user_id", uid).maybeSingle();
          setSaved(!!sv);
        }
      }
      const { data: tt } = await supabase
        .from("ticket_types")
        .select("id, name, description, price_cents, quantity, max_per_buyer, sale_starts_at, sale_ends_at, perks")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      const list = (tt as TicketTier[] | null) ?? [];
      setTiers(list);
      if (list.length) setTierId(list[0].id);
      setLoading(false);
    })();
  }, [eventId]);

  // Guests who tap a ticket action get sent to sign up, then straight back here.
  const sendToSignUp = () => {
    const dest = `/events/${eventId}`;
    try { sessionStorage.setItem("pb_post_auth_redirect", dest); } catch { /* ignore */ }
    toast.message("Create a free account to get your ticket");
    navigate({ to: "/auth", search: { redirect: dest } });
  };

  const buy = async () => {
    if (!evt) return;
    if (!me) { sendToSignUp(); return; }
    setBuying(true);
    const pre = openExternalWindow();
    try {
      const { url } = await checkoutFn({
        data: {
          eventId: evt.id,
          returnOrigin: window.location.origin,
          quantity: qty,
          ...(selectedTier ? { ticketTypeId: selectedTier.id } : {}),
        },
      });
      if (url) navigateExternal(url, pre);
      else closeExternalWindow(pre);
    } catch (e) {
      closeExternalWindow(pre);
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBuying(false);
    }
  };

  const selectedTier = tiers.find((t) => t.id === tierId) ?? null;
  const tierOnSale = (t: TicketTier) => {
    const now = Date.now();
    if (t.sale_starts_at && new Date(t.sale_starts_at).getTime() > now) return false;
    if (t.sale_ends_at && new Date(t.sale_ends_at).getTime() < now) return false;
    return true;
  };
  // The organizer decides the per-person limit. No cap set means a generous default.
  const eventCap = (evt as (EventRow & { max_tickets_per_buyer?: number | null }) | null)?.max_tickets_per_buyer ?? null;
  const maxQty = selectedTier?.max_per_buyer ?? eventCap ?? 20;

  const rsvp = async () => {
    if (!evt) return;
    if (!me) { sendToSignUp(); return; }
    setRsvping(true);
    try {
      const { data, error } = await supabase.rpc("rsvp_free_event", {
        _event_id: evt.id,
        _quantity: qty,
        ...(selectedTier?.id ? { _ticket_type_id: selectedTier.id } : {}),
      });
      if (error) throw error;
      const result = data as { quantity?: number } | null;
      const n = result?.quantity ?? qty;
      setRsvped(true);
      toast.success(n > 1 ? `${n} tickets reserved. Check your email for your tickets.` : "You're going! Check your email for your ticket.");
      void emailMyTickets({ data: { eventId: evt.id } }).catch((err) => console.error("ticket email failed", err));
    } catch (e) {
      const msg = (e as { message?: string } | null)?.message;
      toast.error(msg || "Planet Baltimore could not complete your RSVP. Please try again.");
    } finally {
      setRsvping(false);
    }
  };

  const shareExternal = () => {
    void externalShare(window.location.href, evt?.title || "Event", evt?.description || undefined);
  };

  const remove = async () => {
    if (!evt || !window.confirm("Delete this event?")) return;
    const isOwnerLocal = !!me && evt.user_id === me;
    let error: { message: string } | null = null;
    if (isOwnerLocal) {
      const res = await supabase.from("events").delete().eq("id", evt.id);
      error = res.error;
    } else if (isAdmin) {
      const res = await supabase.rpc("admin_delete_event", { _id: evt.id });
      error = res.error;
    } else {
      toast.error("Not allowed");
      return;
    }
    if (error) { toast.error(error.message); return; }
    toast.success("Event deleted");
    navigate({ to: "/events" });
  };

  if (loading) return (
    <AppLayout>
      <div className="space-y-4">
        <Skeleton className="aspect-[16/9] rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </AppLayout>
  );
  if (!evt) return (
    <AppLayout>
      <div className="text-center py-16">
        <h3 className="font-semibold text-foreground mb-1">Event not found</h3>
        <Button variant="ghost" onClick={() => navigate({ to: "/events" })} className="mt-4">Back to Events</Button>
      </div>
    </AppLayout>
  );

  const priced = (evt.price_cents ?? 0) > 0 || tiers.some((t) => (t.price_cents ?? 0) > 0);
  const eventDate = evt.starts_at ? new Date(evt.starts_at) : null;
  const endsDate = evt.ends_at ? new Date(evt.ends_at) : null;
  const locationText = evt.address || evt.location;
  const mapsUrl = locationText ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}` : "";
  const isOwner = me && evt.user_id === me;
  const canDelete = isOwner || isAdmin;

  const monthShort = eventDate ? eventDate.toLocaleString(undefined, { month: "short" }).toUpperCase() : "";
  const dayNum = eventDate ? eventDate.getDate() : "";
  const fullDate = eventDate ? eventDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date TBD";
  const startTime = eventDate ? eventDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
  const endTime = endsDate ? endsDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[600px] space-y-6">
        <button onClick={() => navigate({ to: "/events" })} aria-label="Go back" className="p-2 rounded-full hover:bg-secondary active:scale-90 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {evt.image_url && (
          <div className="overflow-hidden rounded-2xl border border-border bg-muted">
            <EventImage src={evt.image_url} alt={evt.title} className="max-h-[520px] w-full object-cover" />
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-2">
            {!priced && <Badge className="bg-green-500/10 text-green-600 border-0">Free</Badge>}
            {!evt.is_published && isOwner && (
              <Badge className="bg-muted text-muted-foreground border-0 flex items-center gap-1">
                <EyeOff className="w-3 h-3" />Hidden from public
              </Badge>
            )}
            {evt.neighborhood && <Badge variant="outline" className="border-0 bg-accent/10 text-accent">{evt.neighborhood}</Badge>}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{evt.title}</h1>
        </div>

        <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-xl">
          <div className="w-14 h-14 bg-accent/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(212,88,10,0.1)" }}>
            <span className="text-xs font-bold uppercase" style={{ color: "#d4580a" }}>{monthShort}</span>
            <span className="text-xl font-bold text-foreground">{dayNum}</span>
          </div>
          <div>
            <p className="font-medium text-foreground">{fullDate}</p>
            <p className="text-sm text-muted-foreground">{startTime}{endTime ? ` – ${endTime}` : ""}</p>
          </div>
        </div>

        {(evt.venue_name || locationText) && (
          <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-xl">
            <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#d4580a" }} />
            <div className="flex-1 min-w-0">
              {evt.venue_name && <p className="font-medium text-foreground">{evt.venue_name}</p>}
              {locationText && <p className="text-sm text-muted-foreground">{locationText}</p>}
            </div>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm hover:underline flex-shrink-0" style={{ color: "#d4580a" }}>
                <Navigation className="w-4 h-4" />Directions
              </a>
            )}
          </div>
        )}

        {host && (
          <Link to="/u/$username" params={{ username: host.username || host.id }} className="flex items-center gap-3 p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors">
            <Avatar className="w-10 h-10">
              <SmartAvatarImage src={host.avatar_url ?? undefined} />
              <AvatarFallback style={{ backgroundColor: "rgba(212,88,10,0.1)", color: "#d4580a" }}>{(host.display_name || host.username || "?").charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">Hosted by</p>
              <p className="truncate font-medium text-foreground transition-colors">{host.display_name || host.username || "Organizer"}</p>
            </div>
            <FollowButton userId={host.id} currentUserId={me} className="flex-shrink-0" />
          </Link>
        )}

        {evt.description && (
          <div>
            <h2 className="font-semibold text-foreground mb-2">About this event</h2>
            {/<[a-z][\s\S]*>/i.test(evt.description) ? (
              <RichHtml html={evt.description} className="text-sm text-muted-foreground" />
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{evt.description}</p>
            )}
          </div>
        )}

        {evt.video_url && <EventVideo path={evt.video_url} />}

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:p-5">
          {tiers.length > 0 ? (
            <>
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Choose your ticket</span>
                {tiers.map((t) => {
                  const onSale = tierOnSale(t);
                  const active = t.id === tierId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={!onSale}
                      onClick={() => { setTierId(t.id); setQty(1); }}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        active ? "border-[#d4580a] bg-[#d4580a]/5 ring-1 ring-[#d4580a]/30" : "border-border hover:border-[#d4580a]/50"
                      } ${onSale ? "" : "opacity-50"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground">{t.name}</span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {t.price_cents > 0 ? `$${(t.price_cents / 100).toFixed(2)}` : "Free"}
                        </span>
                      </div>
                      {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
                      {t.perks && t.perks.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">Includes: {t.perks.join(", ")}</p>
                      )}
                      {!onSale && <p className="mt-1 text-xs text-muted-foreground">Not on sale right now</p>}
                    </button>
                  );
                })}
              </div>

              {selectedTier && selectedTier.price_cents > 0 ? (
                <>
                  <QtyStepper label="How many tickets?" qty={qty} max={maxQty} onChange={setQty} />
                  <BuyButton
                    onClick={buy}
                    disabled={buying || !tierOnSale(selectedTier)}
                    loading={buying}
                    label={`Buy ${qty > 1 ? `${qty} tickets` : "ticket"}`}
                    amount={`$${((selectedTier.price_cents * qty) / 100).toFixed(2)}`}
                  />
                </>
              ) : (
                <>
                  <QtyStepper label="How many tickets?" qty={qty} max={maxQty} onChange={setQty} />
                  <BuyButton
                    onClick={rsvp}
                    disabled={rsvping || rsvped}
                    loading={rsvping}
                    label={rsvped ? "You're going" : qty > 1 ? `Reserve ${qty} free tickets` : "Reserve free ticket"}
                  />
                </>
              )}
            </>
          ) : priced ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">General admission</span>
                <span className="text-lg font-bold tabular-nums text-foreground">${((evt.price_cents ?? 0) / 100).toFixed(2)}</span>
              </div>
              <QtyStepper label="How many tickets?" qty={qty} max={maxQty} onChange={setQty} />
              <BuyButton
                onClick={buy}
                disabled={buying}
                loading={buying}
                label={`Buy ${qty > 1 ? `${qty} tickets` : "ticket"}`}
                amount={`$${(((evt.price_cents ?? 0) * qty) / 100).toFixed(2)}`}
              />
            </>
          ) : (
            <>
              <QtyStepper label="How many tickets?" qty={qty} max={maxQty} onChange={setQty} />
              <BuyButton
                onClick={rsvp}
                disabled={rsvping || rsvped}
                loading={rsvping}
                label={rsvped ? "You're going" : qty > 1 ? `Reserve ${qty} tickets` : "I'm going"}
              />
            </>
          )}
          {(priced || tiers.some((t) => t.price_cents > 0)) && (
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              Secure checkout by Stripe. You'll see the seller's business name and contact details before you pay.
            </p>
          )}
          <div className="flex items-center gap-2">
          <Button onClick={() => setShareOpen(true)} variant="outline" className="h-10 flex-1 rounded-full font-medium gap-2" aria-label="Share">
            <Send className="w-4 h-4 -rotate-45" />Share
          </Button>
          <Button
            onClick={async () => {
              if (!me) { toast.error("Sign in to save"); return; }
              if (savingBk) return;
              setSavingBk(true);
              const prev = saved;
              setSaved(!prev);
              const { error } = prev
                ? await supabase.from("event_saves").delete().eq("event_id", eventId).eq("user_id", me)
                : await supabase.from("event_saves").insert({ event_id: eventId, user_id: me });
              if (error) { setSaved(prev); toast.error("Couldn't update save"); }
              else toast.success(prev ? "Removed from saved" : "Saved");
              setSavingBk(false);
            }}
            variant="outline"
            className="h-10 flex-1 rounded-full font-medium gap-2"
            aria-label="Save"
          >
            <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />{saved ? "Saved" : "Save"}
          </Button>
          </div>
          <div className="flex justify-center">
            <ReportButton contentType="event" contentId={eventId} label="Report this event" />
          </div>
          </div>
        </div>

        {evt.gallery_urls && evt.gallery_urls.length > 0 && (
          <div>
            <h2 className="font-semibold text-foreground mb-2">Photos</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {evt.gallery_urls.map((p) => (
                <div key={p} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <EventImage src={p} alt="Event photo" className="h-40 w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        <EventSocial eventId={evt.id} hostId={evt.user_id} />

        {canDelete && (
          <div className="flex gap-3">
            {isOwner && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate({ to: "/organizer-studio", search: { event: evt.id, edit: true } })}>
                <Edit3 className="w-4 h-4" />Edit Event
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={remove} className="text-destructive hover:bg-destructive/10 hover:border-destructive transition-all duration-150">
              <Trash2 className="w-4 h-4 mr-2" />Delete Event
            </Button>
          </div>
        )}
      </div>
      <ShareToUsersDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={typeof window !== "undefined" ? window.location.href : `/events/${eventId}`}
        title={evt.title}
        preview={{
          type: "event",
          id: evt.id,
          url: typeof window !== "undefined" ? window.location.href : `/events/${eventId}`,
          title: evt.title,
          excerpt: evt.description || null,
          image: evt.image_url || null,
          author: host?.display_name || host?.username || evt.venue_name || null,
        }}
      />
    </AppLayout>
  );
}

function EventVideo({ path }: { path: string }) {
  const url = useEventImageUrl(path);
  return (
    <div>
      <h2 className="font-semibold text-foreground mb-2">Video</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {url ? (
          <SmartVideo src={url} controls playsInline className="w-full aspect-video bg-white" />
        ) : (
          <div className="w-full aspect-video grid place-items-center text-xs text-white/70">Loading…</div>
        )}
      </div>
    </div>
  );
}

function QtyStepper({ label, qty, max, onChange }: { label: string; qty: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-1 rounded-full bg-background p-1 shadow-sm">
        <button type="button" onClick={() => onChange(Math.max(1, qty - 1))} disabled={qty <= 1}
          className="grid h-8 w-8 place-items-center rounded-full text-lg leading-none transition hover:bg-secondary disabled:opacity-30" aria-label="Fewer tickets">−</button>
        <span className="w-7 text-center text-sm font-bold tabular-nums">{qty}</span>
        <button type="button" onClick={() => onChange(Math.min(max, qty + 1))} disabled={qty >= max}
          className="grid h-8 w-8 place-items-center rounded-full text-lg leading-none transition hover:bg-secondary disabled:opacity-30" aria-label="More tickets">+</button>
      </div>
    </div>
  );
}

function BuyButton({ onClick, disabled, loading, label, amount }: { onClick: () => void; disabled?: boolean; loading?: boolean; label: string; amount?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
      style={{ backgroundColor: "#d4580a" }}
    >
      <Ticket className="h-4 w-4" />
      {loading ? "Loading…" : label}
      {amount && !loading && <span className="tabular-nums opacity-90">· {amount}</span>}
    </button>
  );
}

