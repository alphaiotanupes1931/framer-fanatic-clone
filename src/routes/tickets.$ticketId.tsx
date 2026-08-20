import { siteUrl } from "@/lib/utils";
import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "@/components/smart-image";
import { MapPin, Calendar, CalendarPlus, Download, Send, ArrowLeft, Share as ShareIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { externalShare } from "@/lib/share-preview";
import { Img } from "@/components/shared/smart-img";
import { QrDisplay } from "@/components/tickets/qr-display";
import { downloadIcs } from "@/lib/ics";
import { TicketVerifyView } from "@/components/tickets/ticket-verify-view";
import { emailMyCancellation } from "@/lib/tickets.functions";
import pbLogoWhite from "@/assets/pb-logo-white.png";

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
  const navigate = useNavigate();
  const [verifyMode, setVerifyMode] = useState<boolean | null>(null);
  useEffect(() => {
    setVerifyMode(new URLSearchParams(window.location.search).get("verify") === "1");
  }, []);
  const [t, setT] = useState<TicketDetail | null | undefined>(undefined);
  const [shareOpen, setShareOpen] = useState(false);
  const [holder, setHolder] = useState<{ display_name: string | null; email: string | null } | null>(null);
  // Sibling tickets let the holder flip through every pass without going back.
  const [siblings, setSiblings] = useState<string[]>([]);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    supabase.from("tickets")
      .select("id,status,buyer_total_cents,artist_net_cents,buyer_id,created_at,events(id,title,starts_at,ends_at,location,venue_name,address,image_url)")
      .eq("id", ticketId)
      .maybeSingle()
      .then(({ data }) => setT((data as TicketDetail | null) ?? null));
  }, [ticketId]);

  useEffect(() => {
    if (!t?.buyer_id) return;
    supabase.from("profiles").select("display_name,email").eq("id", t.buyer_id).maybeSingle()
      .then(({ data }) => setHolder((data as { display_name: string | null; email: string | null } | null) ?? null));
  }, [t?.buyer_id]);

  useEffect(() => {
    if (verifyMode !== false) return;
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return;
      const { data } = await supabase
        .from("tickets")
        .select("id")
        .eq("buyer_id", uid)
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      if (!cancelled) setSiblings(((data ?? []) as { id: string }[]).map((r) => r.id));
    })();
    return () => { cancelled = true; };
  }, [verifyMode]);

  const idx = siblings.indexOf(ticketId);
  const prevId = idx > 0 ? siblings[idx - 1] : null;
  const nextId = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && prevId) navigate({ to: "/tickets/$ticketId", params: { ticketId: prevId } });
      if (e.key === "ArrowRight" && nextId) navigate({ to: "/tickets/$ticketId", params: { ticketId: nextId } });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevId, nextId, navigate]);

  const cancelRsvp = async () => {
    if (!window.confirm("Cancel this RSVP? Your spot will be released.")) return;
    setCancelling(true);
    const { error } = await supabase.rpc("cancel_my_rsvp", { _ticket_id: ticketId });
    setCancelling(false);
    if (error) { toast.error(error.message || "Could not cancel this RSVP"); return; }
    void emailMyCancellation({ data: { ticketId } }).catch((err) => console.error("cancellation email failed", err));
    toast.success("RSVP cancelled");
    navigate({ to: "/profile" });
  };

  const shareExternal = () => {
    const url = t?.events?.id ? siteUrl(`/events/${t.events.id}`) : window.location.href;
    void externalShare(url, t?.events?.title || "Event", undefined);
  };

  if (verifyMode === null) return (
    <div className="min-h-dvh bg-neutral-100 px-4 py-10">
      <div className="mx-auto h-96 w-full max-w-md animate-pulse rounded-3xl bg-white" />
    </div>
  );
  if (verifyMode) return <TicketVerifyView ticketId={ticketId} />;

  if (t === undefined) return (
    <AppLayout>
      <div className="mx-auto w-full max-w-lg animate-pulse px-4 py-6 space-y-4">
        <div className="h-64 rounded-3xl bg-muted" />
        <div className="h-10 rounded-xl bg-muted" />
      </div>
    </AppLayout>
  );
  if (!t) return <AppLayout><div className="py-24 text-center text-neutral-500">Ticket not found.</div></AppLayout>;

  const when = t.events ? new Date(t.events.starts_at) : null;
  // Scanning the QR opens a public verification page anyone at the door can read.
  const ticketUrl = siteUrl(`/tickets/${t.id}?verify=1`);

  return (
    <>
    <AppLayout>
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-[#d4580a]">
            <ArrowLeft className="h-4 w-4" /> My tickets
          </Link>
          {siblings.length > 1 && idx >= 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous ticket"
                disabled={!prevId}
                onClick={() => prevId && navigate({ to: "/tickets/$ticketId", params: { ticketId: prevId } })}
                className="rounded-full border border-neutral-200 bg-white p-1.5 text-neutral-600 transition hover:border-[#d4580a] hover:text-[#d4580a] disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[64px] text-center text-xs font-semibold text-neutral-500">{idx + 1} of {siblings.length}</span>
              <button
                type="button"
                aria-label="Next ticket"
                disabled={!nextId}
                onClick={() => nextId && navigate({ to: "/tickets/$ticketId", params: { ticketId: nextId } })}
                className="rounded-full border border-neutral-200 bg-white p-1.5 text-neutral-600 transition hover:border-[#d4580a] hover:text-[#d4580a] disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-[32px] bg-neutral-950 text-white shadow-[0_24px_70px_-24px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#d4580a]/25 blur-3xl" />
          {/* Cover */}
          {t.events?.image_url && (
            <div className="relative h-44 w-full sm:h-52">
              <SmartImage src={t.events.image_url} alt="" bucket="event-images" className="h-full w-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
            </div>
          )}

          {/* Header */}
          <div className="relative px-5 pt-5 sm:px-6 sm:pt-6">
            <div className="flex items-center gap-2">
              <img src={pbLogoWhite} alt="Planet Baltimore" className="-my-3 h-14 w-auto shrink-0 sm:h-16" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/50">Planet Baltimore</span>
            </div>
            <h1 className="mt-2 text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">{t.events?.title ?? "Event"}</h1>
          </div>

          {/* Details */}
          <div className="relative grid grid-cols-2 gap-3 px-5 pb-6 pt-5 text-sm sm:px-6">
            <div className="rounded-2xl bg-white/[0.06] p-3.5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Date</div>
              <div className="font-semibold">{when?.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
              <div className="text-xs text-white/60">{when?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
            </div>
            <div className="rounded-2xl bg-white/[0.06] p-3.5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Section</div>
              <div className="font-semibold">General Admission</div>
              <div className="text-xs text-white/60">Admit One</div>
            </div>
            <div className="col-span-2 rounded-2xl bg-white/[0.06] p-3.5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Venue</div>
              <div className="font-semibold">{t.events?.venue_name ?? t.events?.location ?? "TBA"}</div>
              {t.events?.address && <div className="text-xs text-white/60">{t.events.address}</div>}
            </div>
            <div className="col-span-2 rounded-2xl bg-white/[0.06] p-3.5">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Ticket holder</div>
              <div className="font-semibold">{holder?.display_name ?? "Guest"}</div>
              {holder?.email && <div className="break-all text-xs text-white/60">{holder.email}</div>}
            </div>
          </div>

          {/* Perforation */}
          <div className="relative">
            <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white" />
            <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white" />
            <div className="mx-5 border-t border-dashed border-white/15 sm:mx-6" />
          </div>

          {/* QR */}
          <div className="relative flex flex-col items-center px-5 py-6 sm:px-6">
            <div className="relative rounded-3xl bg-white p-3 shadow-[0_0_60px_-12px_rgba(255,255,255,0.25)] sm:p-4">
              <QrDisplay value={ticketUrl} />
              {t.status === "cancelled" && (
                <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-red-600" aria-hidden>
                    <line x1="8" y1="8" x2="92" y2="92" stroke="currentColor" strokeWidth="6" />
                    <line x1="92" y1="8" x2="8" y2="92" stroke="currentColor" strokeWidth="6" />
                  </svg>
                  <span className="relative rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">Cancelled</span>
                </div>
              )}
            </div>
            <div className="mt-3 break-all text-center font-mono text-[11px] uppercase tracking-widest text-white/70 sm:text-xs">#{t.id.slice(0, 12)}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
              {t.status === "cancelled" ? "This ticket is no longer valid" : "Show this QR code at the door"}
            </div>
          </div>

          {/* Footer */}
          <div className="relative flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-xs sm:px-6">
            <div>
              <div className="text-white/40">Paid</div>
              <div className="font-semibold">${(t.buyer_total_cents / 100).toFixed(2)}</div>
            </div>
            <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${t.status === "cancelled" ? "bg-red-500/20 text-red-300" : t.status === "paid" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"}`}>
              {t.status === "cancelled" ? "Cancelled" : t.status === "paid" ? "Confirmed" : t.status}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button onClick={() => setShareOpen(true)} className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"><Send className="h-4 w-4 -rotate-45" /> Invite a friend</button>
          <button onClick={shareExternal} className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"><ShareIcon className="h-4 w-4" /> Share externally</button>
          <a href={ticketUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"><Download className="h-4 w-4" /> Printable ticket</a>
          {t.events?.id ? (
            <Link to="/events/$eventId" params={{ eventId: t.events.id }} className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"><Calendar className="h-4 w-4" /> Event</Link>
          ) : <span />}
          {t.events && when && (
            <button
              type="button"
              onClick={saveToCalendar}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a] sm:col-span-2"
            >
              <CalendarPlus className="h-4 w-4" /> Download calendar (.ics)
            </button>
          )}
        </div>

        {t.events?.address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(t.events.address)}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-200">
            <MapPin className="h-4 w-4" /> Directions
          </a>
        )}

        {t.buyer_total_cents === 0 && t.status !== "cancelled" && when && when.getTime() >= Date.now() && (
          <button
            type="button"
            onClick={cancelRsvp}
            disabled={cancelling}
            className="mt-3 w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Cancel RSVP"}
          </button>
        )}
      </div>
    </AppLayout>
      {t.events?.id && (
        <ShareToUsersDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={siteUrl(`/events/${t.events.id}`)}
          title={t.events.title}
          preview={{
            type: "event",
            id: t.events.id,
            url: siteUrl(`/events/${t.events.id}`),
            title: t.events.title,
            excerpt: t.events.venue_name || t.events.location || null,
            image: t.events.image_url,
            author: null,
          }}
        />
      )}
    </>
  );
}