import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { Calendar, MapPin, Plus, X } from "lucide-react";
import { toast } from "sonner";

type EventRow = {
  id: string; user_id: string; title: string; description: string | null;
  location: string | null; image_url: string | null; starts_at: string;
};

export const Route = createFileRoute("/events")({
  component: EventsPage,
  head: () => ({
    meta: [
      { title: "Events - Planet Baltimore" },
      { name: "description", content: "What's happening next in Baltimore - concerts, openings, meetups and more." },
    ],
  }),
});

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function EventCard({ e }: { e: EventRow }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-paper/10 bg-paper/5 h-full">
      <div className="aspect-[16/10] bg-paper/10 overflow-hidden">
        {e.image_url
          ? <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-paper/30"><Calendar className="w-10 h-10" /></div>}
      </div>
      <div className="p-4">
        <div className="text-xs text-paper/60 flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDate(e.starts_at)}</div>
        <div className="font-semibold mt-1 line-clamp-2">{e.title}</div>
        {e.location && <div className="text-xs text-paper/60 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location}</div>}
        {e.description && <p className="text-sm text-paper/70 mt-2 line-clamp-2">{e.description}</p>}
      </div>
    </div>
  );
}

function EventsPage() {
  const { loading, signedIn } = useAuthState();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events").select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true }).limit(24);
      setEvents((data as EventRow[] | null) ?? []);
      setDataLoading(false);
    })();
  }, []);

  if (loading) return null;

  if (!signedIn) {
    const next = events[0];
    return (
      <PublicShell title="What's happening next" subtitle="Tickets for the best events in Baltimore." signedIn={false}>
        {dataLoading ? (
          <div className="text-paper/60 text-sm">Loading events…</div>
        ) : events.length === 0 ? (
          <div className="text-paper/60 text-sm">No upcoming events yet - sign up to be the first to post one.</div>
        ) : (
          <>
            {next && (
              <div className="mb-10">
                <div className="text-xs uppercase tracking-wider text-paper/60 mb-3">Up next</div>
                <div className="rounded-3xl overflow-hidden border border-paper/15 bg-paper/5 md:grid md:grid-cols-2">
                  <div className="aspect-[16/10] md:aspect-auto bg-paper/10 overflow-hidden">
                    {next.image_url
                      ? <img src={next.image_url} alt={next.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-paper/30"><Calendar className="w-16 h-16" /></div>}
                  </div>
                  <div className="p-6 md:p-10 flex flex-col justify-center">
                    <div className="text-sm text-paper/70 flex items-center gap-2"><Calendar className="w-4 h-4" /> {fmtDate(next.starts_at)}</div>
                    <h2 className="font-display text-2xl md:text-3xl font-extrabold mt-2">{next.title}</h2>
                    {next.location && <div className="text-sm text-paper/70 mt-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> {next.location}</div>}
                    {next.description && <p className="text-paper/80 mt-4 line-clamp-4">{next.description}</p>}
                  </div>
                </div>
              </div>
            )}
            {events.length > 1 && (
              <>
                <div className="text-xs uppercase tracking-wider text-paper/60 mb-3">More events</div>
                <PreviewGrid
                  items={events.slice(1)}
                  unlockedCount={0}
                  signedIn={false}
                  thing="event"
                  render={(e) => <EventCard e={e as EventRow} />}
                />
              </>
            )}
          </>
        )}
      </PublicShell>
    );
  }

  return <SignedInEvents events={events} dataLoading={dataLoading} reload={() => {
    setDataLoading(true);
    supabase.from("events").select("*").gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true }).limit(50)
      .then(({ data }) => { setEvents((data as EventRow[] | null) ?? []); setDataLoading(false); });
  }} />;
}

function SignedInEvents({ events, dataLoading, reload }: { events: EventRow[]; dataLoading: boolean; reload: () => void }) {
  const me = useCurrentProfile();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", image_url: "", starts_at: "" });

  const submit = async () => {
    if (!me) return;
    if (!form.title || !form.starts_at) { toast.error("Title and date required"); return; }
    const { error } = await supabase.from("events").insert({
      user_id: me.id,
      title: form.title,
      description: form.description || null,
      location: form.location || null,
      image_url: form.image_url || null,
      starts_at: new Date(form.starts_at).toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Event posted");
    setOpen(false);
    setForm({ title: "", description: "", location: "", image_url: "", starts_at: "" });
    reload();
  };

  return (
    <AppLayout title="What's happening next" subtitle="Tickets for the best events in Baltimore." cta="Create Event" ctaTo="#" onCta={() => setOpen(true)}>
      {dataLoading ? (
        <div className="text-muted-foreground text-sm">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="text-muted-foreground text-sm">No upcoming events. Be the first to post one!</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((e) => <EventCard key={e.id} e={e} />)}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-background text-foreground rounded-2xl w-full max-w-lg p-6 border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-bold">Create event</h3>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full rounded-lg border bg-transparent px-3 py-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input type="datetime-local" className="w-full rounded-lg border bg-transparent px-3 py-2" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              <input className="w-full rounded-lg border bg-transparent px-3 py-2" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <input className="w-full rounded-lg border bg-transparent px-3 py-2" placeholder="Image URL (optional)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <textarea className="w-full rounded-lg border bg-transparent px-3 py-2 min-h-[100px]" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <button onClick={submit} className="w-full rounded-full bg-foreground text-background px-5 py-2 font-medium inline-flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Post event</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
