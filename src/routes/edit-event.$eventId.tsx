import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Loader2 } from "lucide-react";
import { EventImage } from "@/components/event-image";

export const Route = createFileRoute("/edit-event/$eventId")({
  component: EditEventPage,
  head: () => ({ meta: [{ title: "Edit Event - Planet Baltimore" }] }),
});

type Neighborhood = { id: string; name: string };

const CATEGORIES = ["community", "music", "art", "food", "wellness", "family", "nightlife", "sports", "education", "other"];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditEventPage() {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const { eventId } = Route.useParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);

  const [form, setForm] = useState({
    image_url: "",
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    venue_name: "",
    address: "",
    neighborhood: "",
    category: "community",
    ticketing: "rsvp" as "rsvp" | "paid",
    price: "",
    capacity: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("neighborhoods").select("id,name").order("name");
      setNeighborhoods((data ?? []) as Neighborhood[]);
    })();
  }, []);

  useEffect(() => {
    if (!me) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
      if (error || !data) {
        toast.error("Event not found");
        navigate({ to: "/calendar" });
        return;
      }
      const e = data as Record<string, unknown>;
      if (e.user_id !== me.id) {
        toast.error("You can only edit your own events");
        navigate({ to: "/events/$eventId", params: { eventId } });
        return;
      }
      const priceCents = (e.price_cents as number | null) ?? 0;
      setForm({
        image_url: (e.image_url as string | null) ?? "",
        title: (e.title as string | null) ?? "",
        description: (e.description as string | null) ?? "",
        starts_at: toLocalInput(e.starts_at as string | null),
        ends_at: toLocalInput(e.ends_at as string | null),
        venue_name: (e.venue_name as string | null) ?? "",
        address: (e.address as string | null) ?? "",
        neighborhood: (e.neighborhood as string | null) ?? "",
        category: (e.category as string | null) ?? "community",
        ticketing: priceCents > 0 ? "paid" : "rsvp",
        price: priceCents > 0 ? (priceCents / 100).toFixed(2) : "",
        capacity: e.capacity != null ? String(e.capacity) : "",
      });
      setLoading(false);
    })();
  }, [me, eventId, navigate]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onPickImage = async (file: File) => {
    if (!me) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("event-images").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      set("image_url", path);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = form.title.trim().length > 0 && form.starts_at.length > 0;

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!canSubmit) { toast.error("Title and start date are required"); return; }

    setSaving(true);
    try {
      const starts = new Date(form.starts_at).toISOString();
      const ends = form.ends_at ? new Date(form.ends_at).toISOString() : null;
      const priceCents = form.ticketing === "paid" ? Math.max(0, Math.round(parseFloat(form.price || "0") * 100)) : 0;
      const capacity = form.capacity ? Math.max(0, parseInt(form.capacity, 10)) : null;

      const { error } = await supabase.from("events").update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url || null,
        starts_at: starts,
        ends_at: ends,
        venue_name: form.venue_name.trim() || null,
        address: form.address.trim() || null,
        location: form.venue_name.trim() || form.address.trim() || null,
        neighborhood: form.neighborhood || null,
        price_cents: priceCents,
        capacity,
      }).eq("id", eventId);

      if (error) { toast.error(error.message); return; }
      toast.success("Event updated");
      navigate({ to: "/events/$eventId", params: { eventId } });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate({ to: "/events/$eventId", params: { eventId } })} className="p-2 -ml-2 rounded-full hover:bg-secondary" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Edit Event</h1>
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="rounded-full px-5 py-2 text-sm font-semibold disabled:bg-neutral-200 disabled:text-neutral-500 bg-[#d4580a] text-white hover:brightness-110 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 hover:border-[#d4580a]/40 hover:bg-[#d4580a]/[0.03] flex flex-col items-center justify-center text-neutral-500 mb-8 overflow-hidden"
        >
          {form.image_url ? (
            <EventImage src={form.image_url} alt="Event flyer" className="w-full h-full object-cover" />
          ) : uploading ? (
            <><Loader2 className="w-6 h-6 animate-spin mb-2" /><span className="text-sm">Uploading…</span></>
          ) : (
            <><ImagePlus className="w-8 h-8 mb-2" /><span className="text-sm font-medium">Change event flyer</span></>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickImage(f); e.target.value = ""; }}
          />
        </button>

        <div className="space-y-6">
          <Field label="Event Title" required>
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={140} />
          </Field>

          <Field label="Description" optional>
            <textarea className={`${inputCls} min-h-[120px]`} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start Date & Time" required>
              <input type="datetime-local" className={inputCls} value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
            </Field>
            <Field label="End Date & Time" optional>
              <input type="datetime-local" className={inputCls} value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
            </Field>
          </div>

          <Field label="Venue Name" optional>
            <input className={inputCls} value={form.venue_name} onChange={(e) => set("venue_name", e.target.value)} maxLength={140} />
          </Field>

          <Field label="Address" optional>
            <input className={inputCls} value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={240} />
          </Field>

          <Field label="Neighborhood" optional>
            <select className={inputCls} value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)}>
              <option value="">Select neighborhood...</option>
              {neighborhoods.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}
            </select>
          </Field>

          <Field label="Category" required>
            <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Ticketing Mode" required>
            <select className={inputCls} value={form.ticketing} onChange={(e) => set("ticketing", e.target.value as "rsvp" | "paid")}>
              <option value="rsvp">RSVP Only</option>
              <option value="paid">Paid Tickets</option>
            </select>
          </Field>

          {form.ticketing === "paid" && (
            <Field label="Ticket Price (USD you net)" required>
              <input type="number" step="0.01" min="0" className={inputCls} value={form.price} onChange={(e) => set("price", e.target.value)} />
            </Field>
          )}

          <Field label="Capacity" optional>
            <input type="number" min="0" className={inputCls} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </Field>
        </div>

        <div className="h-12" />
      </div>
    </AppLayout>
  );
}

const inputCls = "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-[#d4580a] focus:outline-none focus:ring-1 focus:ring-[#d4580a]/30";

function Field({ label, children, required, optional }: { label: string; children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">
        {label}
        {required && <span className="ml-1 text-[#d4580a]">*</span>}
        {optional && <span className="ml-2 text-xs font-normal text-neutral-400">(optional)</span>}
      </label>
      {children}
    </div>
  );
}