import { siteUrl } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Clock, Bookmark, Send, Share2, Trash2, Repeat2, CalendarPlus } from "lucide-react";
import { downloadIcs } from "@/lib/ics";
import { ReportButton } from "@/components/shared/report-button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useEventImageUrl } from "@/components/event-image";
import { useEffect, useState } from "react";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { toast } from "sonner";
import { externalShare } from "@/lib/share-preview";
import { myRepostId, toggleRepostEvent } from "@/lib/repost";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Img } from "@/components/shared/smart-img";
import { stripHtml, stripUrls } from "@/lib/text-utils";

type EventRow = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  date?: string | null;
  venue_name?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  neighborhood_name?: string | null;
  category?: string | null;
  is_free?: boolean;
  price_cents?: number | null;
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
  const [reposting, setReposting] = useState(false);
  const [reposted, setReposted] = useState(false);
  const eventUrl = siteUrl(`/events/${event.id}`);
  const previewText = stripUrls(stripHtml(event.description));

  useEffect(() => {
    if (!me?.id) { setReposted(false); return; }
    let cancelled = false;
    void myRepostId({ eventId: event.id }).then((id) => { if (!cancelled) setReposted(!!id); });
    return () => { cancelled = true; };
  }, [me?.id, event.id]);

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
      : await supabase.from("event_saves").upsert({ event_id: event.id, user_id: me.id }, { onConflict: "event_id,user_id", ignoreDuplicates: true });
    if (res.error) { setSaved(was); toast.error(res.error.message); }
    else toast.success(was ? "Removed from saved" : "Saved");
  };

  const openShare = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setShareOpen(true); };
  const doRepost = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (reposting) return;
    setReposting(true);
    try {
      const now = await toggleRepostEvent(event.id);
      setReposted(now);
      toast.success(now ? "Reposted to your page" : "Repost removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : ((err as any)?.message || "Could not repost"));
    } finally {
      setReposting(false);
    }
  };
  const sendExternal = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); void externalShare(eventUrl, event.title, event.description || undefined); };

  const addToCalendar = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!eventDate) { toast.error("This event has no date yet"); return; }
    downloadIcs(
      {
        uid: `event-${event.id}@planetbaltimore.com`,
        title: event.title,
        start: eventDate,
        end: event.ends_at ? new Date(event.ends_at) : null,
        location: event.address || event.venue_name || event.neighborhood_name || event.neighborhood || "Baltimore",
        description: previewText || null,
        url: eventUrl,
      },
      event.title.replace(/[^\w\s-]/g, "").trim() || "event",
    );
    toast.success("Added to your calendar");
  };

  const tags = [
    event.is_free ? "Free" : event.price_cents ? `$${Math.round(event.price_cents / 100)}` : null,
    event.category,
    event.neighborhood_name || event.neighborhood,
  ].filter(Boolean) as string[];

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
        {showImage ? (
        <div className="relative aspect-[16/7] overflow-hidden bg-muted">
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
        ) : (
          <div className="relative flex aspect-[16/6] flex-col justify-end overflow-hidden bg-gradient-to-br from-[#d4580a] to-[#7a2f04] p-4 sm:p-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              {eventDate ? format(eventDate, "EEE, MMM d") : "Date TBD"}
            </span>
            <span className="line-clamp-2 text-base font-extrabold leading-tight text-white sm:text-lg">{event.title}</span>
            {event.is_free && (
              <Badge className="absolute left-3 top-3 border-0 bg-green-500/90 text-xs text-white">Free</Badge>
            )}
            {event.category && (
              <Badge variant="secondary" className="absolute right-3 top-3 border-0 bg-black/30 text-xs capitalize text-white">{event.category}</Badge>
            )}
          </div>
        )}
        <div className="p-3.5 sm:p-4">
        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold sm:text-xs" style={{ color: "#d4580a" }}>
          <Clock className="h-3.5 w-3.5" />
          <span className="truncate">{eventDate ? format(eventDate, "EEE, MMM d · h:mm a") : "Date TBD"}</span>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-[#d4580a]">{event.title}</h3>
        {previewText && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{previewText}</p>}
        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{event.venue_name || event.neighborhood_name || event.neighborhood || "Baltimore"}</span>
        </div>
        {tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        )}
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-2 border-t border-border/50 px-3.5 py-2.5 sm:px-4">
        <button type="button" onClick={toggleSave} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${saved ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : "border-border text-muted-foreground hover:border-[#d4580a] hover:text-[#d4580a]"}`} aria-label="Save">
          <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
          {saved ? "Saved" : "Save"}
        </button>
        <button type="button" onClick={sendExternal} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-[#d4580a] hover:text-[#d4580a]" aria-label="Share outside the app">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
        <button type="button" onClick={addToCalendar} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-[#d4580a] hover:text-[#d4580a]" aria-label="Add to calendar">
          <CalendarPlus className="h-3.5 w-3.5" />
          Calendar
        </button>
        <div className="ml-auto flex items-center gap-2 text-muted-foreground">
          <button type="button" onClick={openShare} className="rounded-full p-1.5 transition hover:text-[#d4580a]" aria-label="Send in app" title="Send in app">
            <Send className="h-4 w-4 -rotate-45" />
          </button>
          <button type="button" onClick={doRepost} disabled={reposting} aria-pressed={reposted} className={`rounded-full p-1.5 transition disabled:opacity-50 ${reposted ? "text-[#d4580a]" : "hover:text-[#d4580a]"}`} aria-label={reposted ? "Remove repost" : "Repost to your page"} title={reposted ? "Remove repost" : "Repost to your page"}>
            <Repeat2 className="h-4 w-4" />
          </button>
          <ReportButton contentType="event" contentId={event.id} />
          {canDelete && (
            <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-full p-1.5 text-red-600 transition hover:text-red-700 disabled:opacity-50" aria-label={isOwner ? "Delete" : "Admin delete"} title={isOwner ? "Delete" : "Admin delete"}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
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