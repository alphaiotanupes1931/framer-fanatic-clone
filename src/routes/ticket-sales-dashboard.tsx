import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ticket-sales-dashboard")({
  component: TicketSalesDashboardPage,
  head: () => ({
    meta: [
      { title: "Ticket Sales - Planet Baltimore" },
      { name: "description", content: "Track ticket sales and revenue for your Baltimore events." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Row = {
  id: string;
  status: string;
  buyer_total_cents: number;
  artist_net_cents: number;
  created_at: string;
  event: { title: string } | null;
  buyer: { display_name: string | null; username: string | null } | null;
};

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

function TicketSalesDashboardPage() {
  const me = useCurrentProfile();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!me) return;
    supabase.from("tickets")
      .select("id,status,buyer_total_cents,artist_net_cents,created_at,event:events(title),buyer:profiles!tickets_buyer_id_fkey(display_name,username)")
      .eq("artist_id", me.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setRows((data as unknown as Row[]) ?? []));
  }, [me?.id]);

  const paid = (rows ?? []).filter((r) => r.status === "paid");
  const revenue = paid.reduce((s, r) => s + r.buyer_total_cents, 0);
  const net = paid.reduce((s, r) => s + r.artist_net_cents, 0);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <HeroBanner title="Ticket Sales" subtitle="Revenue and orders across your events." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Tickets sold" value={paid.length.toString()} />
          <Stat label="Gross revenue" value={fmt(revenue)} />
          <Stat label="Your net" value={fmt(net)} />
        </div>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {!rows ? (
            <div className="p-10 text-center text-sm text-neutral-500">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-neutral-500">No ticket sales yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Net</th><th className="px-4 py-3">Date</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100">
                    <td className="px-4 py-3 font-medium text-neutral-900">{r.event?.title ?? "Event"}</td>
                    <td className="px-4 py-3 text-neutral-700">{r.buyer?.display_name ?? r.buyer?.username ?? "Buyer"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${r.status === "paid" ? "bg-emerald-50 text-emerald-700" : r.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-neutral-100 text-neutral-600"}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-700">{fmt(r.buyer_total_cents)}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{fmt(r.artist_net_cents)}</td>
                    <td className="px-4 py-3 text-neutral-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900">{value}</div>
    </div>
  );
}
