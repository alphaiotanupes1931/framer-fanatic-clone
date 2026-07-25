import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { MapPin, Navigation, Ticket, ArrowLeft, Send, Trash2, Edit3, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createTicketCheckout, rsvpFreeEvent } from "@/lib/stripe.functions";
import { EventImage, useEventImageUrl } from "@/components/event-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { externalShare } from "@/lib/share-preview";

type EventRow = {
  id: string; user_id: string; title: string; description: string | null;
  venue_name: string | null; address: string | null; location: string | null;
  image_url: string | null; starts_at: string; ends_at: string | null;
  price_cents: number | null; status: string; is_published: boolean;
  neighborhood: string | null; video_url: string | null;
};

type Host = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetail,
  head: () => ({ meta: [{ title: "Event - Planet Baltimore" }] }),
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
  const rsvpFn = useServerFn(rsvpFreeEvent);
  const [shareOpen, setShareOpen] = useState(false);

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
      }
      setLoading(false);
    })();
  }, [eventId]);

  const buy = async () => {
    if (!evt) return;
    setBuying(true);
    try {
      const { url } = await checkoutFn({ data: { eventId: evt.id, returnOrigin: window.location.origin } });
      if (url) window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBuying(false);
    }
  };

  const rsvp = async () => {
    if (!evt) return;
    if (!me) { toast.error("Sign in to RSVP"); return; }
    setRsvping(true);
    try {
      const res = await rsvpFn({ data: { eventId: evt.id } });
      setRsvped(true);
      toast.success(res.alreadyRsvped ? "You're already on the list" : "You're going!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not RSVP");
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

  const priced = (evt.price_cents ?? 0) > 0;
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
      <div className="space-y-6">
        <button onClick={() => navigate({ to: "/events" })} aria-label="Go back" className="p-2 rounded-full hover:bg-secondary active:scale-90 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {evt.image_url && (
          <div className="aspect-[16/9] rounded-xl overflow-hidden">
            <EventImage src={evt.image_url} alt={evt.title} className="w-full h-full object-cover" />
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
              <AvatarImage src={host.avatar_url ?? undefined} />
              <AvatarFallback style={{ backgroundColor: "rgba(212,88,10,0.1)", color: "#d4580a" }}>{(host.display_name || host.username || "?").charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Hosted by</p>
              <p className="font-medium text-foreground transition-colors">{host.display_name || host.username || "Organizer"}</p>
            </div>
          </Link>
        )}

        {evt.description && (
          <div>
            <h2 className="font-semibold text-foreground mb-2">About this event</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{evt.description}</p>
          </div>
        )}

        {evt.video_url && <EventVideo path={evt.video_url} />}

        <div className="flex flex-col gap-3 border-t border-border pt-6">
          {priced ? (
            <Button onClick={buy} disabled={buying} className="w-full rounded-lg h-11 font-medium gap-2 text-white" style={{ backgroundColor: "#d4580a" }}>
              <Ticket className="w-4 h-4" />
              {buying ? "Loading…" : `Buy Ticket · $${((evt.price_cents ?? 0) / 100).toFixed(2)}`}
            </Button>
          ) : (
            <Button onClick={rsvp} disabled={rsvping || rsvped} className="w-full rounded-lg h-11 font-medium gap-2 text-white" style={{ backgroundColor: "#d4580a" }}>
              {rsvped ? "You're going ✓" : rsvping ? "Saving…" : "I'm going"}
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setShareOpen(true)} variant="outline" className="rounded-lg h-10 font-medium gap-2" aria-label="Send to friends">
              <Send className="w-4 h-4" />Send
            </Button>
            <Button onClick={shareExternal} variant="outline" className="rounded-lg h-10 font-medium gap-2" aria-label="Share outside the app">
              <Send className="w-4 h-4 -rotate-45" />Share
            </Button>
          </div>
        </div>

        {canDelete && (
          <div className="flex gap-3">
            {isOwner && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate({ to: "/edit-event/$eventId", params: { eventId: evt.id } })}>
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
      <div className="overflow-hidden rounded-2xl border border-border bg-black">
        {url ? (
          <video src={url} controls playsInline className="w-full aspect-video bg-black" />
        ) : (
          <div className="w-full aspect-video grid place-items-center text-xs text-white/70">Loading…</div>
        )}
      </div>
    </div>
  );
}