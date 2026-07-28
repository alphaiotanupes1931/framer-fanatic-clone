import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "@/components/smart-image";
import { MapPin, Calendar, Download, Send, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/tickets/$ticketId")({
  component: TicketDetailPage,
  head: () => ({
    meta: [
      { title: "Your Ticket - Planet Baltimore" },
      { name: "description", content: "Digital event ticket." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type TicketDetail = {
  id: string; status: string; buyer_total_cents: number; artist_net_cents: number;
  buyer_id: string; created_at: string;
  events: { id: string; title: string; starts_at: string; ends_at: string | null; location: string | null; venue_name: string | null; address: string | null; image_url: string | null } | null;
};

function TicketDetailPage() {
  const { ticketId } = useParams({ from: "/tickets/$ticketId" });
  const [t, setT] = useState<TicketDetail | null | undefined>(undefined);

  useEffect(() => {
    supabase.from("tickets")
      .select("id,status,buyer_total_cents,artist_net_cents,buyer_id,created_at,events(id,title,starts_at,ends_at,location,venue_name,address,image_url)")
      .eq("id", ticketId)
      .maybeSingle()
      .then(({ data }) => setT((data as TicketDetail | null) ?? null));
  }, [ticketId]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: t?.events?.title ?? "My ticket", url });
      else { await navigator.clipboard.writeText(url); }
    } catch { /* cancelled */ }
  };

  if (t === undefined) return <AppLayout><div className="py-24 text-center text-neutral-500">Loading…</div></AppLayout>;
  if (!t) return <AppLayout><div className="py-24 text-center text-neutral-500">Ticket not found.</div></AppLayout>;

  const when = t.events ? new Date(t.events.starts_at) : null;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=0&data=${encodeURIComponent(t.id)}`;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <Link to="/profile" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-[#d4580a]">
          <ArrowLeft className="h-4 w-4" /> My tickets
        </Link>

        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 text-white shadow-2xl">
          {/* Cover */}
          {t.events?.image_url && (
            <div className="relative h-40 w-full">
              <SmartImage src={t.events.image_url} alt="" bucket="event-images" className="h-full w-full object-cover opacity-70" />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
            </div>
          )}

          {/* Header */}
          <div className="px-6 pt-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-300">Planet Baltimore</div>
            <h1 className="mt-2 text-2xl font-bold leading-tight">{t.events?.title ?? "Event"}</h1>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 px-6 pb-6 pt-5 text-sm">
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Date</div>
              <div className="font-semibold">{when?.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
              <div className="text-xs text-white/60">{when?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Section</div>
              <div className="font-semibold">General Admission</div>
              <div className="text-xs text-white/60">Admit One</div>
            </div>
            <div className="col-span-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Venue</div>
              <div className="font-semibold">{t.events?.venue_name ?? t.events?.location ?? "TBA"}</div>
              {t.events?.address && <div className="text-xs text-white/60">{t.events.address}</div>}
            </div>
          </div>

          {/* Perforation */}
          <div className="relative">
            <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white" />
            <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white" />
            <div className="mx-6 border-t-2 border-dashed border-white/20" />
          </div>

          {/* QR */}
          <div className="flex flex-col items-center px-6 py-6">
            <div className="rounded-2xl bg-white p-4">
              <img src={qr} alt="Ticket QR code" width={220} height={220} />
            </div>
            <div className="mt-3 font-mono text-xs uppercase tracking-widest text-white/70">#{t.id.slice(0, 12)}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-white/40">Show this QR code at the door</div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 text-xs">
            <div>
              <div className="text-white/40">Paid</div>
              <div className="font-semibold">${(t.buyer_total_cents / 100).toFixed(2)}</div>
            </div>
            <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${t.status === "paid" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"}`}>
              {t.status === "paid" ? "Confirmed" : t.status}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button onClick={share} className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"><Send className="h-4 w-4 -rotate-45" /> Share</button>
          <a href={qr} download={`ticket-${t.id.slice(0, 8)}.png`} className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"><Download className="h-4 w-4" /> Save QR</a>
          {t.events?.id ? (
            <Link to="/events/$eventId" params={{ eventId: t.events.id }} className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"><Calendar className="h-4 w-4" /> Event</Link>
          ) : <span />}
        </div>

        {t.events?.address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(t.events.address)}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-200">
            <MapPin className="h-4 w-4" /> Directions
          </a>
        )}
      </div>
    </AppLayout>
  );
}