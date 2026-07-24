import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy, Megaphone, DollarSign, Ticket, Users, TrendingUp, Share2, MessageSquare, BarChart3, ExternalLink } from "lucide-react";
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
type TabId = "events" | "analytics" | "message" | "social";

const COMMISSION_RATE = 0.10; // 10% of gross for the promoter (indicative)

function PromoterDashboardPage() {
  const me = useCurrentProfile();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<TabId>("events");

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

  const webShare = async (r: Row) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/events/${r.id}?ref=${me?.username ?? me?.id ?? ""}`;
    if (navigator.share) {
      try { await navigator.share({ title: r.title, url }); return; } catch { /* cancelled */ }
    }
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
  };

  const stats = useMemo(() => {
    const list = rows ?? [];
    const sold = list.reduce((s, r) => s + r.sold, 0);
    const revenue = list.reduce((s, r) => s + r.revenue_cents, 0);
    const commission = Math.round(revenue * COMMISSION_RATE);
    const avg = list.length ? sold / list.length : 0;
    return { events: list.length, sold, commission, avg };
  }, [rows]);

  const TABS: { id: TabId; label: string }[] = [
    { id: "events", label: "My Events" },
    { id: "analytics", label: "Analytics" },
    { id: "message", label: "Message" },
    { id: "social", label: "Social" },
  ];

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        {/* Header banner */}
        <div className="rounded-2xl border border-[#d4580a]/40 bg-gradient-to-br from-[#fff4ec] to-white p-6">
          <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">Promoter Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">Track your sales, commissions, and event performance</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Commission earned" value={`$${(stats.commission / 100).toFixed(2)}`} icon={DollarSign} />
          <StatCard label="Tickets sold" value={stats.sold.toString()} icon={Ticket} />
          <StatCard label="Events promoting" value={stats.events.toString()} icon={Users} />
          <StatCard label="Avg per event" value={`${stats.avg.toFixed(1)} tickets`} icon={TrendingUp} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-full bg-neutral-100 p-1 text-sm overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 font-semibold transition ${tab === t.id ? "bg-[#d4580a] text-white shadow" : "text-neutral-600 hover:text-neutral-900"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "events" && (
          !rows ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white p-14 text-center text-sm text-neutral-500">
              <Megaphone className="h-10 w-10 text-neutral-300" />
              You're not promoting any events yet.
              <Link to="/events/new" className="font-semibold text-[#d4580a] hover:underline">Create an event</Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
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
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => share(r.id)}><Copy className="mr-1 h-3 w-3" />Copy link</Button>
                          <Button size="sm" variant="outline" onClick={() => webShare(r)}><Share2 className="mr-1 h-3 w-3" />Share</Button>
                          <Link to="/events/$eventId" params={{ eventId: r.id }} className="inline-flex items-center rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]">
                            <ExternalLink className="mr-1 h-3 w-3" /> View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === "analytics" && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-900"><BarChart3 className="h-4 w-4 text-[#d4580a]" /> Performance</div>
            {!rows || rows.length === 0 ? (
              <div className="py-6 text-center text-sm text-neutral-500">No performance data yet.</div>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => {
                  const max = Math.max(1, ...rows.map((x) => x.sold));
                  const pct = Math.round((r.sold / max) * 100);
                  return (
                    <div key={r.id}>
                      <div className="flex justify-between text-xs text-neutral-600"><span className="truncate pr-2">{r.title}</span><span>{r.sold} sold · ${(r.revenue_cents/100).toFixed(2)}</span></div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-[#d4580a]" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {tab === "message" && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-900"><MessageSquare className="h-4 w-4 text-[#d4580a]" /> Message your network</div>
            <p className="text-sm text-neutral-600">Send your promo link directly to followers and friends.</p>
            <Link to="/messages" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">Open Messages</Link>
          </div>
        )}

        {tab === "social" && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-900"><Share2 className="h-4 w-4 text-[#d4580a]" /> Share on social</div>
            {!rows || rows.length === 0 ? (
              <p className="text-sm text-neutral-500">Create an event first, then share it here.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {rows.map((r) => (
                  <button key={r.id} onClick={() => webShare(r)} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:border-[#d4580a]">
                    <span className="truncate pr-2 font-medium text-neutral-900">{r.title}</span>
                    <Share2 className="h-4 w-4 text-neutral-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#d4580a]">{label}</div>
        <Icon className="h-4 w-4 text-neutral-300" />
      </div>
      <div className="mt-2 text-2xl font-bold text-neutral-900">{value}</div>
    </div>
  );
}
