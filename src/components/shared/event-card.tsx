import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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

  if (compact) {
    return (
      <Link to="/events/$eventId" params={{ eventId: event.id }} className="group flex gap-3 rounded-xl border border-border bg-card p-2.5 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 sm:p-3">
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
    <Link to="/events/$eventId" params={{ eventId: event.id }} className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md active:translate-y-0">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#d4580a]/20 to-primary/10">
            <Calendar className="h-12 w-12 text-[#d4580a]/40" />
          </div>
        )}
        {event.is_free && (
          <Badge className="absolute left-3 top-3 border-0 bg-green-500/90 text-xs text-white">Free</Badge>
        )}
        {event.category && (
          <Badge variant="secondary" className="absolute right-3 top-3 border-0 bg-black/50 text-xs capitalize text-white backdrop-blur-sm">{event.category}</Badge>
        )}
      </div>
      <div className="p-3 sm:p-4">
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
  );
}