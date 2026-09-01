import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, Loader2, Video as VideoIcon, X } from "lucide-react";
import { EventImage, useEventImageUrl } from "@/components/event-image";
import { compressImage } from "@/lib/image-compress";
import { SmartVideo } from "@/components/shared/smart-img";
import { RichTextEditor } from "@/components/rich-text-editor";
import { hasCapacityErrors, parseLimit, validateCapacityFields, type CapacityErrors } from "@/lib/capacity-limits";

type Neighborhood = { id: string; name: string };

const CATEGORIES = ["community", "music", "art", "food", "wellness", "family", "nightlife", "sports", "education", "other"];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


export function EventEditForm({ eventId, onSaved, onCancel }: { eventId: string; onSaved?: () => void; onCancel?: () => void }) {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [capErrors, setCapErrors] = useState<CapacityErrors>({});

  const [form, setForm] = useState({
    image_url: "",
    video_url: "",
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
    per_person: "",
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
        video_url: (e.video_url as string | null) ?? "",
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
        per_person: e.max_tickets_per_buyer != null ? String(e.max_tickets_per_buyer) : "",
      });
      setLoading(false);
    })();
  }, [me, eventId, navigate]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onPickImage = async (file: File) => {
    file = await compressImage(file);
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

  const onPickVideo = async (file: File) => {
    file = await compressImage(file);
    if (!me) return;
    if (file.size > 200 * 1024 * 1024) { toast.error("Video must be under 200MB"); return; }
    setUploadingVideo(true);
    try {
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("event-images").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      set("video_url", path);
      toast.success("Video uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingVideo(false);
    }
  };

  const canSubmit = form.title.trim().length > 0 && form.starts_at.length > 0;

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!canSubmit) { toast.error("Title and start date are required"); return; }
    // Rescheduling into the past is not allowed.
    const startsDate = new Date(form.starts_at);
    if (Number.isNaN(startsDate.getTime())) { toast.error("Pick a valid start date and time"); return; }
    if (form.ends_at) {
      const endsDate = new Date(form.ends_at);
      if (Number.isNaN(endsDate.getTime()) || endsDate.getTime() <= startsDate.getTime()) {
        toast.error("End time must be after the start time");
        return;
      }
    }

    const limitErrors = validateCapacityFields(form.capacity, form.per_person);
    setCapErrors(limitErrors);
    if (hasCapacityErrors(limitErrors)) {
      toast.error("Please fix the ticket limits before you save this event.");
      return;
    }

    setSaving(true);
    const savingToast = toast.loading("Saving your event…");
    try {
      const starts = new Date(form.starts_at).toISOString();
      const ends = form.ends_at ? new Date(form.ends_at).toISOString() : null;
      const priceCents = form.ticketing === "paid" ? Math.max(0, Math.round(parseFloat(form.price || "0") * 100)) : 0;
      const capacity = parseLimit(form.capacity);
      const maxPerBuyer = parseLimit(form.per_person);

      const { error } = await supabase.from("events").update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url || null,
        video_url: form.video_url || null,
        starts_at: starts,
        ends_at: ends,
        venue_name: form.venue_name.trim() || null,
        address: form.address.trim() || null,
        location: form.venue_name.trim() || form.address.trim() || null,
        neighborhood: form.neighborhood || null,
        category: form.category || null,
        price_cents: priceCents,
        capacity,
        max_tickets_per_buyer: maxPerBuyer,
      }).eq("id", eventId);

      if (error) {
        toast.error(`We could not save your event. ${error.message}`, {
          description: "Your changes are still on screen, so you can fix the issue and save again.",
        });
        return;
      }
      toast.dismiss(savingToast);
      toast.success("Event updated");
      if (onSaved) onSaved();
      else navigate({ to: "/events/$eventId", params: { eventId } });
    } catch (e) {
      toast.error(`We could not save your event. ${e instanceof Error ? e.message : "Please try again."}`);
    } finally {
      toast.dismiss(savingToast);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => (onCancel ? onCancel() : navigate({ to: "/events/$eventId", params: { eventId } }))} className="rounded-full px-3 py-2 text-sm font-semibold text-neutral-500 hover:text-[#d4580a]">
            Cancel
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
            <EventImage src={form.image_url} alt="Exhibition flyer" className="w-full h-full object-cover" />
          ) : uploading ? (
            <><Loader2 className="w-6 h-6 animate-spin mb-2" /><span className="text-sm">Uploading…</span></>
          ) : (
            <><ImagePlus className="w-8 h-8 mb-2" /><span className="text-sm font-medium">Change Exhibition flyer</span></>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickImage(f); e.target.value = ""; }}
          />
        </button>

        <div className="mb-8">
          <label className="block text-sm font-semibold mb-2">Exhibition Video <span className="ml-2 text-xs font-normal text-neutral-400">(optional)</span></label>
          <VideoField value={form.video_url} uploading={uploadingVideo} onPick={onPickVideo} onClear={() => set("video_url", "")} inputRef={videoRef} />
        </div>

        <div className="space-y-6">
          <Field label="Exhibition Title" required>
            <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={140} />
          </Field>

          <Field label="Description" optional>
            <RichTextEditor value={form.description} onChange={(v) => set("description", v)} placeholder="Tell people about your event..." minHeight={140} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start Date & Time" required>
              <input type="datetime-local" className={inputCls} value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
            </Field>
            <Field label="End Date & Time" optional>
              <input type="datetime-local" min={form.starts_at || undefined} className={inputCls} value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Capacity" optional error={capErrors.capacity} hint="Total tickets this event can sell before it shows Sold out. Leave blank for unlimited.">
              <input
                type="number" min="1" step="1"
                className={capErrors.capacity ? inputErrCls : inputCls}
                placeholder="Leave blank for unlimited"
                value={form.capacity}
                onChange={(e) => { set("capacity", e.target.value); setCapErrors(validateCapacityFields(e.target.value, form.per_person)); }}
              />
            </Field>
            <Field label="Tickets per person" optional error={capErrors.per_person} hint="The most tickets one guest can get. Leave blank for no limit.">
              <input
                type="number" min="1" step="1"
                className={capErrors.per_person ? inputErrCls : inputCls}
                placeholder="No limit"
                value={form.per_person}
                onChange={(e) => { set("per_person", e.target.value); setCapErrors(validateCapacityFields(form.capacity, e.target.value)); }}
              />
            </Field>
          </div>
        </div>

        <div className="h-12" />
      </div>
    </div>
  );
}

const inputErrCls = "w-full rounded-lg border border-red-500 bg-white px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-300";
const inputCls = "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-[#d4580a] focus:outline-none focus:ring-1 focus:ring-[#d4580a]/30";

function Field({ label, children, required, optional, hint, error }: { label: string; children: React.ReactNode; required?: boolean; optional?: boolean; hint?: string; error?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">
        {label}
        {required && <span className="ml-1 text-[#d4580a]">*</span>}
        {optional && <span className="ml-2 text-xs font-normal text-neutral-400">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-[11px] font-normal text-neutral-500">{hint}</p>
      )}
    </div>
  );
}

function VideoField({
  value, uploading, onPick, onClear, inputRef,
}: {
  value: string; uploading: boolean; onPick: (f: File) => void; onClear: () => void; inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const url = useEventImageUrl(value || null);
  if (value) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {url ? (
          <SmartVideo src={url} controls className="w-full aspect-video bg-white" />
        ) : (
          <div className="w-full aspect-video grid place-items-center text-xs text-white/70">Loading preview…</div>
        )}
        <button type="button" onClick={onClear} className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-white" aria-label="Remove video">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-full rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 hover:border-[#d4580a]/40 hover:bg-[#d4580a]/[0.03] flex flex-col items-center justify-center text-neutral-500 py-8"
    >
      {uploading ? (
        <><Loader2 className="w-6 h-6 animate-spin mb-2" /><span className="text-sm">Uploading…</span></>
      ) : (
        <><VideoIcon className="w-7 h-7 mb-2" /><span className="text-sm font-medium">Add event video</span><span className="text-xs text-neutral-400 mt-0.5">Up to 200MB</span></>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }}
      />
    </button>
  );
}