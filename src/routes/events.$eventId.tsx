import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { Calendar, MapPin, Ticket, ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { createTicketCheckout } from "@/lib/stripe.functions";
import { EventImage } from "@/components/event-image";

type EventRow = {
  id: string; user_id: string; title: string; description: string | null;
  location: string | null; image_url: string | null; starts_at: string;
  price_cents: number | null;
};

type Host = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

export const Route = createFileRoute("/events/$eventId")({
  component: EventDetail,
  head: () => ({ meta: [{ title: "Event - Planet Baltimore" }] }),
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function EventDetail() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const [evt, setEvt] = useState<EventRow | null>(null);
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const checkoutFn = useServerFn(createTicketCheckout);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (data) {
        setEvt(data as EventRow);
        const { data: h } = await supabase.from("profiles").select("id, display_name, username, avatar_url").eq("id", (data as EventRow).user_id).maybeSingle();
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

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: evt?.title || "Event", url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* user cancelled */ }
  };

  if (loading) return <AppLayout title="Loading…" hero={false}><div className="text-muted-foreground text-sm">Loading event…</div></AppLayout>;
  if (!evt) return <AppLayout title="Event not found" hero={false}>
    <button onClick={() => navigate({ to: "/events" })} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to events</button>
  </AppLayout>;

  const priced = (evt.price_cents ?? 0) > 0;

  return (
    <AppLayout title={evt.title} hero={false}>
      <Link to="/events" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5"><ArrowLeft className="h-4 w-4" /> All events</Link>
      <div className="rounded-3xl overflow-hidden border border-border bg-card">
        {evt.image_url ? (
          <div className="aspect-[16/9] bg-muted overflow-hidden">
            <EventImage src={evt.image_url} alt={evt.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-muted flex items-center justify-center text-muted-foreground">
            <Calendar className="w-16 h-16" />
          </div>
        )}
        <div className="p-6 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">{evt.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {fmtDate(evt.starts_at)}</span>
                {evt.location && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {evt.location}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent"><Share2 className="w-4 h-4" /> Share</button>
              {priced ? (
                <button onClick={buy} disabled={buying} className="inline-flex items-center gap-1.5 rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
                  <Ticket className="w-4 h-4" /> {buying ? "Loading…" : `Buy ticket · $${((evt.price_cents ?? 0)/100).toFixed(2)}`}
                </button>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-600">Free</span>
              )}
            </div>
          </div>

          {evt.description && (
            <div className="mt-8 max-w-3xl whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
              {evt.description}
            </div>
          )}

          {host && (
            <div className="mt-10 flex items-center gap-3 border-t border-border pt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Hosted by</div>
              <Link to="/artists" className="flex items-center gap-2 text-sm font-medium hover:text-orange">
                {host.avatar_url && <img src={host.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" / loading="lazy" decoding="async">}
                {host.display_name || host.username || "Artist"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}