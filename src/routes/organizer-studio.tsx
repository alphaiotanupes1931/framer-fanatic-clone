import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Ticket, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/organizer-studio")({
  component: OrganizerStudioPage,
  head: () => ({
    meta: [
      { title: "Organizer Studio - Planet Baltimore" },
      { name: "description", content: "Manage your Baltimore events and organizer profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type MyEvent = { id: string; title: string; starts_at: string; venue_name: string | null; price_cents: number; is_published: boolean };

function OrganizerStudioPage() {
  const me = useCurrentProfile();
  const [events, setEvents] = useState<MyEvent[] | null>(null);

  useEffect(() => {
    if (!me) return;
    supabase.from("events")
      .select("id,title,starts_at,venue_name,price_cents,is_published")
      .eq("user_id", me.id)
      .order("starts_at", { ascending: false })
      .then(({ data }) => setEvents((data as MyEvent[] | null) ?? []));
  }, [me?.id]);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <HeroBanner title="Organizer Studio" subtitle="Every event you host in one place." />
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-600">{events ? `${events.length} event${events.length === 1 ? "" : "s"}` : "Loading events..."}</div>
          <Link to="/events/new"><Button size="sm"><Plus className="mr-2 h-4 w-4" />New Event</Button></Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {!events || events.length === 0 ? (
            <div className="p-10 text-center text-sm text-neutral-500">
              {events === null ? "Loading..." : "No events yet. Create your first one to get started."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
                <tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">When</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-t border-neutral-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{e.title}</div>
                      {e.venue_name && <div className="text-xs text-neutral-500">{e.venue_name}</div>}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{new Date(e.starts_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-neutral-700">{e.price_cents > 0 ? `$${(e.price_cents / 100).toFixed(2)}` : "Free"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${e.is_published ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
                        {e.is_published ? "Live" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to="/ticket-sales-dashboard" className="inline-flex items-center gap-1 text-xs text-[#d4580a] hover:underline"><Ticket className="h-3 w-3" />Sales</Link>
                        <Link to="/events/$eventId" params={{ eventId: e.id }} className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:underline"><ExternalLink className="h-3 w-3" />View</Link>
                      </div>
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
