import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { QrScanner } from "@/components/tickets/qr-scanner";
import { TicketVerifyView } from "@/components/tickets/ticket-verify-view";
import { QrCode, RotateCcw } from "lucide-react";
import pbLogoMark from "@/assets/pb-logo.png";

export const Route = createFileRoute("/scan")({
  component: ScanPage,
  head: () => ({
    meta: [
      { title: "Scan Tickets - Planet Baltimore" },
      { name: "description", content: "Scan a guest's QR code to verify ticket status and check them in at the door." },
      { property: "og:title", content: "Scan Tickets - Planet Baltimore" },
      { property: "og:description", content: "Scan a guest's QR code to verify ticket status and check them in at the door." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function parseTicketId(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const match = text.match(UUID_RE);
  if (match) return match[0];
  const last = text.split("?")[0].split("/").filter(Boolean).pop();
  return last && last.length >= 6 ? last : null;
}

function ScanPage() {
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const handleResult = useCallback((text: string) => {
    const id = parseTicketId(text);
    if (!id) {
      setErr("That QR code is not a Planet Baltimore ticket.");
      return;
    }
    setErr(null);
    setTicketId(id);
  }, []);

  if (ticketId) {
    return (
      <div className="min-h-dvh bg-neutral-100">
        <TicketVerifyView ticketId={ticketId} />
        <div className="mx-auto max-w-md px-4 pb-10">
          <button
            onClick={() => { setTicketId(null); setCode(""); }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
          >
            <RotateCcw className="h-4 w-4" /> Scan another ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-neutral-100 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <img src={pbLogoMark} alt="Planet Baltimore" className="mx-auto h-11 w-auto" />
          <h1 className="mt-3 text-2xl font-bold text-neutral-900">Scan tickets</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Point the camera at a guest's ticket QR code to see its status and check them in.
          </p>
        </div>

        <div className="mt-6">
          <QrScanner onResult={handleResult} />
        </div>

        {err && <p className="mt-3 text-center text-sm font-medium text-red-600">{err}</p>}

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <QrCode className="h-4 w-4 text-[#d4580a]" /> Enter code manually
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleResult(code); }}
              placeholder="Ticket code or link"
              className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm"
            />
            <button
              onClick={() => handleResult(code)}
              disabled={!code.trim()}
              className="rounded-lg bg-[#d4580a] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              Look up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
