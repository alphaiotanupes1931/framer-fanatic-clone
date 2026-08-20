import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { siteUrl } from "@/lib/utils";
import { Img } from "@/components/shared/smart-img";
import { CheckCircle2, XCircle, Printer, MapPin } from "lucide-react";

type Verified = {
  ticket_id: string;
  status: string;
  checked_in_at: string | null;
  created_at: string;
  paid_cents: number | null;
  event_id: string | null;
  event_title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  address: string | null;
  location: string | null;
  image_url: string | null;
  holder_name: string | null;
  holder_email: string | null;
};

export function TicketVerifyView({ ticketId }: { ticketId: string }) {
  const [t, setT] = useState<Verified | null | undefined>(undefined);

  useEffect(() => {
    supabase.rpc("verify_ticket", { _ticket_id: ticketId }).then(({ data }) => {
      const row = ((data ?? []) as Verified[])[0];
      setT(row ?? null);
    });
  }, [ticketId]);

  if (t === undefined) {
    return (
      <div className="min-h-dvh bg-neutral-100 px-4 py-10">
        <div className="mx-auto h-96 w-full max-w-md animate-pulse rounded-3xl bg-white" />
      </div>
    );
  }

  if (!t) {
    return (
      <div className="grid min-h-dvh place-items-center bg-neutral-100 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#d4580a]">Planet Baltimore</div>
          <h1 className="mt-3 text-xl font-bold text-neutral-900">Ticket not valid</h1>
          <p className="mt-2 text-sm text-neutral-500">
            This ticket code was not recognized. Ask the guest to open the ticket in their Planet Baltimore account.
          </p>
          <div className="mt-4 break-all font-mono text-[11px] text-neutral-400">#{ticketId}</div>
        </div>
      </div>
    );
  }

  const when = t.starts_at ? new Date(t.starts_at) : null;
  const cancelled = t.status === "cancelled";
  const valid = !cancelled && (t.status === "paid" || t.status === "rsvp" || t.status === "free" || t.status === "confirmed");
  const selfUrl = siteUrl(`/tickets/${t.ticket_id}?verify=1`);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=0&ecc=M&format=png&data=${encodeURIComponent(selfUrl)}`;

  return (
    <div className="min-h-dvh bg-neutral-100 px-4 py-8 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl print:shadow-none">
        <div className={`px-6 py-4 text-center text-white ${cancelled ? "bg-red-600" : valid ? "bg-emerald-600" : "bg-neutral-700"}`}>
          <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider">
            {cancelled ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {cancelled ? "Cancelled ticket" : t.checked_in_at ? "Already checked in" : valid ? "Valid ticket" : t.status}
          </div>
          {cancelled && <div className="mt-1 text-[11px] text-white/80">This RSVP was cancelled. Do not admit.</div>}
          {t.checked_in_at && (
            <div className="mt-1 text-[11px] text-white/80">
              Scanned {new Date(t.checked_in_at).toLocaleString()}
            </div>
          )}
        </div>

        <div className="px-6 pt-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4580a]">Planet Baltimore</div>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-neutral-900">{t.event_title ?? "Event"}</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 px-6 py-5 text-sm">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Date</div>
            <div className="font-semibold text-neutral-900">
              {when?.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) ?? "TBA"}
            </div>
            <div className="text-xs text-neutral-500">
              {when?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Admission</div>
            <div className="font-semibold text-neutral-900">General Admission</div>
            <div className="text-xs text-neutral-500">Admit One</div>
          </div>
          <div className="col-span-2">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Venue</div>
            <div className="font-semibold text-neutral-900">{t.venue_name ?? t.location ?? "TBA"}</div>
            {t.address && (
              <div className="flex items-center gap-1 text-xs text-neutral-500">
                <MapPin className="h-3 w-3" /> {t.address}
              </div>
            )}
          </div>
          <div className="col-span-2 rounded-2xl bg-neutral-50 p-4">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Ticket holder</div>
            <div className="font-semibold text-neutral-900">{t.holder_name ?? "Guest"}</div>
            {t.holder_email && <div className="break-all text-xs text-neutral-500">{t.holder_email}</div>}
            <div className="mt-2 text-[11px] text-neutral-500">
              Issued {new Date(t.created_at).toLocaleDateString()}
              {typeof t.paid_cents === "number" && ` · ${t.paid_cents > 0 ? `$${(t.paid_cents / 100).toFixed(2)} paid` : "Free RSVP"}`}
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-neutral-100 print:hidden" />
          <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-neutral-100 print:hidden" />
          <div className="mx-6 border-t-2 border-dashed border-neutral-200" />
        </div>

        <div className="flex flex-col items-center px-6 py-6">
          <div className="relative">
            <Img src={qr} alt="Ticket QR code" width={220} height={220} />
            {cancelled && (
              <div className="absolute inset-0 grid place-items-center bg-white/70">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-red-600" aria-hidden>
                  <line x1="8" y1="8" x2="92" y2="92" stroke="currentColor" strokeWidth="6" />
                  <line x1="92" y1="8" x2="8" y2="92" stroke="currentColor" strokeWidth="6" />
                </svg>
                <span className="relative rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">Cancelled</span>
              </div>
            )}
          </div>
          <div className="mt-3 break-all text-center font-mono text-xs uppercase tracking-widest text-neutral-500">
            #{t.ticket_id}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-400">
            {cancelled ? "Not valid for entry" : "Present this at the door"}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 w-full max-w-md print:hidden">
        <button
          onClick={() => window.print()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>
    </div>
  );
}
