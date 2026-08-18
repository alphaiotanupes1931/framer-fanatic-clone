import { siteUrl } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Clock, Bookmark, Send, Share2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useEventImageUrl } from "@/components/event-image";
import { useEffect, useState } from "react";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { toast } from "sonner";
import { externalShare } from "@/lib/share-preview";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Img } from "@/components/shared/smart-img";

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
  user_id?: string | null;
};

export function EventCard({ event, compact = false, onDeleted }: { event: EventRow; compact?: boolean; onDeleted?: (id: string) => void }) {
  const when = event.date ?? event.starts_at ?? null;
  const eventDate = when ? new Date(when) : null;
  const resolvedImage = useEventImageUrl(event.image_url);
  const [imgOk, setImgOk] = useState(false);
  useEffect(() => {
    setImgOk(false);
    if (!resolvedImage) return;
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => { if (!cancelled) setImgOk(true); };
    probe.onerror = () => { if (!cancelled) setImgOk(false); };
    probe.src = resolvedImage;
    return () => { cancelled = true; };
  }, [resolvedImage]);
  const showImage = !!resolvedImage && imgOk;
  const me = useCurrentProfile();
  const isAdmin = useIsAdmin();
  const isOwner = !!me?.id && !!event.user_id && me.id === event.user_id;
  const canDelete = isOwner || isAdmin;
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const eventUrl = siteUrl(`/events/${event.id}`);

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

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!canDelete || deleting) return;
    const msg = isOwner ? "Delete this event? This can't be undone." : "Delete this event as admin? This can't be undone.";
    if (!window.confirm(msg)) return;
    setDeleting(true);
    const res = isOwner
      ? await supabase.from("events").delete().eq("id", event.id)
      : await supabase.rpc("admin_delete_event", { _id: event.id });
    setDeleting(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Event deleted");
    onDeleted?.(event.id);
  };

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
          <Img
            src={resolvedImage}
            alt={event.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
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
        <button type="button" onClick={toggleSave} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${saved ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : "border-border hover:border-[#d4580a] hover:text-[#d4580a]"}`} aria-label="Save">
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
          {saved ? "Saved" : "Save"}
        </button>
        <button type="button" onClick={openShare} className="flex items-center gap-2 transition hover:text-foreground" aria-label="Share in app" title="Share in app">
          <Send className="h-5 w-5 -rotate-45" />
        </button>
        <button type="button" onClick={sendExternal} className="flex items-center gap-2 transition hover:text-foreground" aria-label="Share outside the app" title="Share outside the app">
          <Share2 className="h-5 w-5" />
        </button>
        {canDelete && (
          <button type="button" onClick={handleDelete} disabled={deleting} className="ml-auto flex items-center text-red-600 transition hover:text-red-700 disabled:opacity-50" aria-label={isOwner ? "Delete" : "Admin delete"} title={isOwner ? "Delete" : "Admin delete"}>
            <Trash2 className="h-5 w-5" />
          </button>
        )}
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