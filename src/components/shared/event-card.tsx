import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Clock, Share2, Bookmark, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useEventImageUrl } from "@/components/event-image";
import { useEffect, useState } from "react";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { toast } from "sonner";
import { externalShare } from "@/lib/share-preview";

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  starts_at?: string | null;
  date?: string | null;
  venue_name?: string | null;
  neighborhood?: string | null;
  neighborhood_name?: string | null;
  category?: string | null;
  is_free?: boolean;
};

export function EventCard({ event, compact = false }: { event: EventRow; compact?: boolean }) {
  const when = event.date ?? event.starts_at ?? null;
  const eventDate = when ? new Date(when) : null;
  const resolvedImage = useEventImageUrl(event.image_url);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { setImgFailed(false); }, [resolvedImage]);
  const showImage = !!resolvedImage && !imgFailed;
  const me = useCurrentProfile();
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const eventUrl = typeof window !== "undefined" ? `${window.location.origin}/events/${event.id}` : `/events/${event.id}`;

  useEffect(() => {
    if (compact || !me?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("event_saves").select("event_id").eq("event_id", event.id).eq("user_id", me.id).maybeSingle();
      if (!cancelled && data) setSaved(true);
    })();
    return () => { cancelled = true; };
  }, [me?.id, event.id, compact]);

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!me?.id) { toast.error("Sign in to save"); return; }
    const was = saved;
    setSaved(!was);
    const res = was
      ? await supabase.from("event_saves").delete().eq("event_id", event.id).eq("user_id", me.id)
      : await supabase.from("event_saves").insert({ event_id: event.id, user_id: me.id });
    if (res.error) { setSaved(was); toast.error(res.error.message); }
    else toast.success(was ? "Removed from saved" : "Saved");
  };

  const openShare = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setShareOpen(true); };
  const sendExternal = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); void externalShare(eventUrl, event.title, event.description || undefined); };

  if (compact) {
    return (
      <Link to="/events/$eventId" params={{ eventId: event.id }} className="group flex gap-3 rounded-2xl border border-border bg-card p-3 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm active:translate-y-0 sm:p-3.5">
        <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg bg-[#d4580a]/10 sm:h-16 sm:w-16">
          {eventDate ? (
            <>
              <span className="text-[10px] font-bold uppercase text-[#d4580a] sm:text-xs">{format(eventDate, "MMM")}</span>
              <span className="text-base font-bold text-foreground sm:text-lg">{format(eventDate, "d")}</span>
            </>
          ) : (
            <Calendar className="h-5 w-5 text-[#d4580a] sm:h-6 sm:w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xs font-semibold text-foreground transition-colors group-hover:text-[#d4580a] sm:text-sm">{event.title}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">{eventDate ? format(eventDate, "EEE, MMM d · h:mm a") : ""}</p>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{event.venue_name || event.neighborhood_name || event.neighborhood || "Baltimore"}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-[1px] hover:shadow-sm active:translate-y-0">
      <Link to="/events/$eventId" params={{ eventId: event.id }} className="block">
        {showImage && (
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={resolvedImage}
            alt={event.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
          {event.is_free && (
            <Badge className="absolute left-3 top-3 border-0 bg-green-500/90 text-xs text-white">Free</Badge>
          )}
          {event.category && (
            <Badge variant="secondary" className="absolute right-3 top-3 border-0 bg-black/50 text-xs capitalize text-white backdrop-blur-sm">{event.category}</Badge>
          )}
        </div>
        )}
        <div className="p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold sm:text-xs" style={{ color: "#d4580a" }}>
          <Clock className="h-3.5 w-3.5" />
          <span className="truncate">{eventDate ? format(eventDate, "EEE, MMM d · h:mm a") : "Date TBD"}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-[#d4580a]">{event.title}</h3>
        {event.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{event.description}</p>}
        <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{event.venue_name || event.neighborhood_name || event.neighborhood || "Baltimore"}</span>
        </div>
        </div>
      </Link>
      <div className="flex items-center gap-5 border-t border-border/50 px-4 py-3 text-sm text-muted-foreground sm:gap-7 sm:px-5">
        <button type="button" onClick={openShare} className="flex items-center gap-2 transition hover:text-foreground" aria-label="Share in app">
          <Share2 className="h-5 w-5" />
        </button>
        <button type="button" onClick={sendExternal} className="flex items-center gap-2 transition hover:text-foreground" aria-label="Share outside the app" title="Share outside the app">
          <Send className="h-5 w-5" />
        </button>
        <button type="button" onClick={toggleSave} className={`ml-auto flex items-center gap-2 transition ${saved ? "text-[#d4580a]" : "hover:text-foreground"}`} aria-label="Save">
          <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
        </button>
      </div>
      <ShareToUsersDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={eventUrl}
        title={event.title}
        preview={{
          type: "event",
          id: event.id,
          url: eventUrl,
          title: event.title,
          excerpt: event.description || null,
          image: resolvedImage || null,
          author: event.venue_name || event.neighborhood_name || event.neighborhood || null,
        }}
      />
    </article>
  );
}