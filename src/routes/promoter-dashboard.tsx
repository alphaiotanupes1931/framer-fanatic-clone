import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy, Megaphone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/promoter-dashboard")({
  component: PromoterDashboardPage,
  head: () => ({
    meta: [
      { title: "Promoter Dashboard - Planet Baltimore" },
      { name: "description", content: "Share your events and track promoter reach." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Row = { id: string; title: string; starts_at: string; sold: number; revenue_cents: number };

function PromoterDashboardPage() {
  const me = useCurrentProfile();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!me) return;
    (async () => {
      const { data: events } = await supabase.from("events").select("id,title,starts_at").eq("user_id", me.id).order("starts_at", { ascending: false });
      const list = events ?? [];
      const withSales: Row[] = await Promise.all(list.map(async (e) => {
        const { data: t } = await supabase.from("tickets").select("buyer_total_cents,status").eq("event_id", e.id).eq("status", "paid");
        const paid = (t ?? []) as { buyer_total_cents: number }[];
        return { id: e.id, title: e.title, starts_at: e.starts_at, sold: paid.length, revenue_cents: paid.reduce((s, x) => s + x.buyer_total_cents, 0) };
      }));
      setRows(withSales);
    })();
  }, [me?.id]);

  const share = (eventId: string) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/events/${eventId}?ref=${me?.username ?? me?.id ?? ""}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Share link copied"));
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <HeroBanner title="Promoter Dashboard" subtitle="Copy share links and see how your events are converting." />
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {!rows ? (
            <div className="p-10 text-center text-sm text-neutral-500">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-neutral-500">
              <Megaphone className="h-8 w-8 text-neutral-300" />
              No events yet. <Link to="/events/new" className="text-[#d4580a] hover:underline">Create one</Link> to start promoting.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">When</th><th className="px-4 py-3 text-right">Sold</th><th className="px-4 py-3 text-right">Revenue</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100">
                    <td className="px-4 py-3 font-medium text-neutral-900">{r.title}</td>
                    <td className="px-4 py-3 text-neutral-700">{new Date(r.starts_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">{r.sold}</td>
                    <td className="px-4 py-3 text-right text-neutral-700">${(r.revenue_cents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => share(r.id)}><Copy className="mr-1 h-3 w-3" />Share link</Button>
                    </td>
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
