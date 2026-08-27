import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, CreditCard, ImagePlus, Loader2, Save, Video as VideoIcon, X } from "lucide-react";
import { EventImage } from "@/components/event-image";
import { useEventImageUrl } from "@/components/event-image";
import { compressImage } from "@/lib/image-compress";
import { SmartVideo } from "@/components/shared/smart-img";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useServerFn } from "@tanstack/react-start";
import { ensureConnectAccount, createConnectOnboardingLink } from "@/lib/stripe.functions";
import { closeExternalWindow, navigateExternal, openExternalWindow } from "@/lib/external-nav";
import { deleteEventDraft, draftHasContent, getEventDraft, saveEventDraft } from "@/lib/event-drafts";

export const Route = createFileRoute("/events/new")({
  component: NewEventPage,
  head: () => ({ meta: [{ title: "Create Event - Planet Baltimore" }] }),
  validateSearch: (s: Record<string, unknown>): { org?: string; kind?: "exhibition"; draft?: string } => ({
    ...(typeof s.org === "string" ? { org: s.org } : {}),
    ...(s.kind === "exhibition" ? { kind: "exhibition" as const } : {}),
    ...(typeof s.draft === "string" ? { draft: s.draft } : {}),
  }),
});


type Neighborhood = { id: string; name: string };

const CATEGORIES = ["community", "music", "art", "food", "wellness", "family", "nightlife", "sports", "education", "other"];

function NewEventPage() {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const { org: orgId, kind, draft: draftId } = Route.useSearch();
  const isExhibition = kind === "exhibition";
  const [orgName, setOrgName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [startMode, setStartMode] = useState<"set" | "now">("set");
  const [isOnline, setIsOnline] = useState(false);
  const [pricing, setPricing] = useState<"free" | "paid">("free");
  const [connecting, setConnecting] = useState(false);
  const [created, setCreated] = useState(false);
  const [venueBook, setVenueBook] = useState<Array<{ venue_name: string; address: string | null; neighborhood: string | null }>>([]);
  const draftIdRef = useRef<string>(draftId ?? crypto.randomUUID());
  const createdRef = useRef(false);

  const ensureFn = useServerFn(ensureConnectAccount);
  const linkFn = useServerFn(createConnectOnboardingLink);

  const payoutsReady = !!me?.stripe_charges_enabled;
  const needsStripe = pricing === "paid" && !!me && !payoutsReady;

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
    capacity: "",
  });


  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("neighborhoods").select("id,name").order("name");
      setNeighborhoods((data ?? []) as Neighborhood[]);
    })();
  }, []);

  // Venue book: previously used venues so organizers can auto-fill the
  // venue name, address and neighborhood in one pick.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("venue_name,address,neighborhood")
        .not("venue_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(300);
      const seen = new Set<string>();
      const list: Array<{ venue_name: string; address: string | null; neighborhood: string | null }> = [];
      for (const r of (data ?? []) as Array<{ venue_name: string | null; address: string | null; neighborhood: string | null }>) {
        const name = (r.venue_name ?? "").trim();
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        list.push({ venue_name: name, address: r.address, neighborhood: r.neighborhood });
      }
      setVenueBook(list);
    })();
  }, []);

  useEffect(() => {
    if (!orgId) { setOrgName(null); return; }
    (async () => {
      const { data } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
      setOrgName((data as { name: string } | null)?.name ?? null);
    })();
  }, [orgId]);

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
    if (file.size > 200 * 1024 * 1024) {
      toast.error("Video must be under 200MB");
      return;
    }
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

  const canSubmit =
    form.title.trim().length > 0 &&
    (startMode === "now" || form.starts_at.length > 0) &&
    (isOnline || form.neighborhood.trim().length > 0);

  const pickVenue = (name: string) => {
    set("venue_name", name);
    const hit = venueBook.find((v) => v.venue_name.toLowerCase() === name.trim().toLowerCase());
    if (!hit) return;
    setForm((f) => ({
      ...f,
      venue_name: hit.venue_name,
      address: hit.address ?? f.address,
      neighborhood: f.neighborhood || (hit.neighborhood ?? ""),
    }));
  };

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!canSubmit) {
      toast.error(
        !isOnline && !form.neighborhood.trim()
          ? "Neighborhood is required (or mark the event as online)"
          : "Title and start date are required",
      );
      return;
    }

    setSaving(true);
    try {
      const starts = startMode === "now" ? new Date().toISOString() : new Date(form.starts_at).toISOString();
      const ends = form.ends_at ? new Date(form.ends_at).toISOString() : null;
      const capacity = form.capacity ? Math.max(0, parseInt(form.capacity, 10)) : null;

      const { data, error } = await supabase.from("events").insert({
        user_id: me.id,
        organization_id: orgId ?? null,
        is_exhibition: isExhibition,
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url || null,
        video_url: form.video_url || null,
        starts_at: starts,
        ends_at: ends,
        venue_name: isOnline ? null : form.venue_name.trim() || null,
        address: isOnline ? null : form.address.trim() || null,
        location: isOnline ? "Online" : form.venue_name.trim() || form.address.trim() || null,
        neighborhood: isOnline ? "Online" : form.neighborhood || null,
        category: form.category || null,
        price_cents: 0,
        capacity,
      }).select("id").single();

      if (error) {
        toast.error(error.message.includes("row-level security")
          ? "Only Artists can post events. Upgrade in your profile."
          : error.message);
        return;
      }
      toast.success("Event created. Now set up your ticket types.");
      // Organizers land in the studio so they can set up ticket types right away.
      navigate({ to: "/organizer-studio", search: { event: (data as { id: string }).id } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate({ to: "/calendar" })} className="p-2 -ml-2 rounded-full hover:bg-secondary" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{isExhibition ? "Create Event" : "Create Event"}</h1>
          {orgName && (
            <span className="ml-2 hidden sm:inline text-xs font-medium text-neutral-500">for {orgName}</span>
          )}
          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="rounded-full px-5 py-2 text-sm font-semibold disabled:bg-neutral-200 disabled:text-neutral-500 bg-[#d4580a] text-white hover:brightness-110 disabled:cursor-not-allowed"
          >
            {saving ? "Creating…" : "Create"}
          </button>
        </div>

        <p className="text-xs text-neutral-500 mb-4">
          Fields marked with <span className="text-[#d4580a]">*</span> are required. Everything else is optional.
        </p>

        {/* Flyer (optional) */}
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
            <><ImagePlus className="w-8 h-8 mb-2" /><span className="text-sm font-medium">Add Event flyer</span><span className="text-xs text-neutral-400 mt-0.5">Optional</span></>
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
            <input className={inputCls} placeholder="What's your event called?" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={140} />
          </Field>

          <Field label="Description" optional>
            <RichTextEditor value={form.description} onChange={(v) => set("description", v)} placeholder="Tell people about your event..." minHeight={140} />
          </Field>

          <Field label="Event Video" optional>
            <VideoPicker
              value={form.video_url}
              uploading={uploadingVideo}
              onPick={(f) => void onPickVideo(f)}
              onClear={() => set("video_url", "")}
              inputRef={videoRef}
            />
            <p className="mt-1 text-[11px] text-neutral-500">Shows below the event description. MP4 / MOV up to 200MB.</p>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start Date & Time" required>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setStartMode("set")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium ${startMode === "set" ? "bg-neutral-700 text-white" : "bg-neutral-100 text-neutral-600"}`}>Set Date</button>
                <button type="button" onClick={() => setStartMode("now")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium ${startMode === "now" ? "bg-neutral-700 text-white" : "bg-neutral-100 text-neutral-600"}`}>Immediately</button>
              </div>
              {startMode === "set" && (
                <input type="datetime-local" className={inputCls} value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
              )}
            </Field>

            <Field label="End Date & Time" optional>
              <div className="h-[34px] mb-2" />
              <input type="datetime-local" className={inputCls} value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
            </Field>
          </div>

          <Field label="Neighborhood" required={!isOnline}>
            <div className="flex gap-2">
              <select
                className={`${inputCls} flex-1`}
                value={form.neighborhood}
                disabled={isOnline}
                onChange={(e) => set("neighborhood", e.target.value)}
              >
                <option value="">Select neighborhood...</option>
                {neighborhoods.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => {
                  setIsOnline((v) => {
                    const next = !v;
                    if (next) setForm((f) => ({ ...f, neighborhood: "", venue_name: "", address: "" }));
                    return next;
                  });
                }}
                aria-pressed={isOnline}
                className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${isOnline ? "bg-[#d4580a] text-white" : "border border-neutral-200 bg-white text-neutral-700 hover:border-[#d4580a]/50"}`}
              >
                Online
              </button>
            </div>
            {isOnline && <p className="mt-1 text-[11px] text-neutral-500">This is an online event, so venue and address are not needed.</p>}
          </Field>

          {!isOnline && (
            <>
              <Field label="Venue Name" optional>
                <input
                  className={inputCls}
                  list="pb-venue-book"
                  placeholder="Where is it happening?"
                  value={form.venue_name}
                  onChange={(e) => pickVenue(e.target.value)}
                  maxLength={140}
                />
                <datalist id="pb-venue-book">
                  {venueBook.map((v) => <option key={v.venue_name} value={v.venue_name} />)}
                </datalist>
              </Field>

              <Field label="Address" optional>
                <input
                  className={inputCls}
                  list="pb-address-book"
                  placeholder="Full address"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  maxLength={240}
                />
                <datalist id="pb-address-book">
                  {venueBook.filter((v) => v.address).map((v) => <option key={v.venue_name} value={v.address as string} />)}
                </datalist>
              </Field>
            </>
          )}

          <Field label="Category" required>
            <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <div className="rounded-xl border border-[#d4580a]/25 bg-[#d4580a]/[0.06] p-4">
            <div className="text-sm font-semibold text-neutral-900">Tickets are set up next</div>
            <p className="mt-1 text-[13px] text-neutral-600">
              After you create this event you go straight to Organizer Studio, where you add your ticket types
              (free RSVP, general admission, tiers, prices, and quantities).
            </p>
          </div>


          <Field label="Capacity" optional>
            <input type="number" min="0" className={inputCls} placeholder="Leave blank for unlimited" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
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

function VideoPicker({
  value,
  uploading,
  onPick,
  onClear,
  inputRef,
}: {
  value: string;
  uploading: boolean;
  onPick: (f: File) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
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
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-white"
          aria-label="Remove video"
        >
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
        <><VideoIcon className="w-7 h-7 mb-2" /><span className="text-sm font-medium">Add event video</span><span className="text-xs text-neutral-400 mt-0.5">Optional</span></>
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