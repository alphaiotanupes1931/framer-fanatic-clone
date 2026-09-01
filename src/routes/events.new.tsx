import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, ImagePlus, Loader2, Save, Video as VideoIcon, X } from "lucide-react";
import { EventImage } from "@/components/event-image";
import { useEventImageUrl } from "@/components/event-image";
import { compressImage } from "@/lib/image-compress";
import { SmartVideo } from "@/components/shared/smart-img";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useServerFn } from "@tanstack/react-start";
import { ensureConnectAccount, createConnectOnboardingLink, refreshConnectStatus } from "@/lib/stripe.functions";
import { closeExternalWindow, navigateExternal, openExternalWindow } from "@/lib/external-nav";
import { deleteEventDraft, draftHasContent, getEventDraft, saveEventDraft } from "@/lib/event-drafts";
import { hasCapacityErrors, parseLimit, validateCapacityFields, type CapacityErrors } from "@/lib/capacity-limits";

/** `datetime-local` value for "now" in the user's own timezone. */
function localNowValue(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [capErrors, setCapErrors] = useState<CapacityErrors>({});
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [startMode, setStartMode] = useState<"set" | "now">("set");
  const [isOnline, setIsOnline] = useState(false);
  const [pricing, setPricing] = useState<"free" | "paid">("free");
  const [donation, setDonation] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [created, setCreated] = useState(false);
  const [checkingStripe, setCheckingStripe] = useState(false);
  const [stripeVerified, setStripeVerified] = useState(false);
  const [stripeGate, setStripeGate] = useState(false);
  const [venueBook, setVenueBook] = useState<Array<{ venue_name: string; address: string | null; neighborhood: string | null }>>([]);
  const draftIdRef = useRef<string>(draftId ?? crypto.randomUUID());
  const createdRef = useRef(false);

  const ensureFn = useServerFn(ensureConnectAccount);
  const linkFn = useServerFn(createConnectOnboardingLink);
  const refreshStripeFn = useServerFn(refreshConnectStatus);

  const payoutsReady = !!me?.stripe_charges_enabled || stripeVerified;
  const requiresStripe = pricing === "paid" || donation;
  const needsStripe = requiresStripe && !!me && !payoutsReady;

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
    per_person: "",
    gallery_urls: [] as string[],
  });

  // Resume a saved draft (for example after connecting payouts).
  useEffect(() => {
    if (!draftId) return;
    const d = getEventDraft(draftId);
    if (!d) return;
    setForm({ gallery_urls: [], ...d.form });
    setStartMode(d.startMode);
    setIsOnline(d.isOnline);
    setPricing(d.pricing);
    setDonation(!!d.donation);
  }, [draftId]);

  const snapshot = useCallback(() => ({
    id: draftIdRef.current,
    org: orgId,
    kind,
    startMode,
    isOnline,
    pricing,
    donation,
    form,
  }), [orgId, kind, startMode, isOnline, pricing, donation, form]);

  const persistDraft = useCallback(() => {
    const snap = snapshot();
    if (!draftHasContent(snap)) return null;
    return saveEventDraft(snap);
  }, [snapshot]);

  // Leaving before creating the event keeps the work safe in Drafts.
  const latest = useRef(persistDraft);
  latest.current = persistDraft;
  useEffect(() => () => { if (!createdRef.current) latest.current(); }, []);


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

  const onPickGallery = async (files: File[]) => {
    if (!me || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const paths: string[] = [];
      for (const raw of files) {
        const file = await compressImage(raw);
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("event-images").upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        paths.push(path);
      }
      setForm((f) => ({ ...f, gallery_urls: [...f.gallery_urls, ...paths] }));
      toast.success(paths.length > 1 ? `${paths.length} photos added` : "Photo added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingGallery(false);
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
    form.image_url.trim().length > 0 &&
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

  const saveDraft = () => {
    const saved = persistDraft();
    if (!saved) { toast.error("Add a title first so the draft has a name"); return; }
    toast.success("Saved to drafts in Organizer Studio");
    createdRef.current = true; // already persisted, don't double-save on unmount
    navigate({ to: "/organizer-studio" });
  };

  // Save the work, then hand the organizer to the secure payout form. When they
  // finish, Stripe returns them to the studio.
  const connectStripe = async () => {
    persistDraft();
    const pre = openExternalWindow();
    setConnecting(true);
    try {
      const account = await ensureFn();
      if (!account.ok) {
        closeExternalWindow(pre);
        toast.error(account.message);
        setConnecting(false);
        return;
      }
      const { url } = await linkFn({ data: {
        returnUrl: `${window.location.origin}/organizer-studio?stripe=ok`,
        refreshUrl: `${window.location.origin}/organizer-studio?stripe=refresh`,
      }});
      createdRef.current = true; // draft already stored above
      navigateExternal(url, pre);
    } catch (e) {
      closeExternalWindow(pre);
      toast.error(e instanceof Error ? e.message : "Could not start payout setup");
      setConnecting(false);
    }
  };

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!canSubmit) {
      toast.error(
        !form.image_url
          ? "Add a photo or flyer for your event"
          : !isOnline && !form.neighborhood.trim()
            ? "Neighborhood is required (or mark the event as online)"
            : "Title and start date are required",
      );
      return;
    }
    // Paid events need a live payout account. Re-check Stripe directly (the
    // cached profile flag can lag the webhook) with a short loading animation
    // so the organizer can see the check happening.
    if (requiresStripe && !payoutsReady) {
      setCheckingStripe(true);
      const startedAt = Date.now();
      try {
        const res = await refreshStripeFn();
        const elapsed = Date.now() - startedAt;
        if (elapsed < 2200) await new Promise((r) => setTimeout(r, 2200 - elapsed));
        if (res.chargesEnabled) {
          setStripeVerified(true);
        } else {
          setCheckingStripe(false);
          setStripeGate(true);
          return;
        }
      } catch {
        setCheckingStripe(false);
        setStripeGate(true);
        return;
      }
      setCheckingStripe(false);
    }

    // Events cannot be scheduled in the past.
    if (startMode === "set") {
      const startsDate = new Date(form.starts_at);
      if (Number.isNaN(startsDate.getTime())) { toast.error("Pick a valid start date and time"); return; }
      if (startsDate.getTime() < Date.now() - 60000) {
        toast.error("Start date and time cannot be in the past");
        return;
      }
    }
    if (form.ends_at) {
      const endsDate = new Date(form.ends_at);
      const startsRef = startMode === "now" ? new Date() : new Date(form.starts_at);
      if (Number.isNaN(endsDate.getTime())) { toast.error("Pick a valid end date and time"); return; }
      if (endsDate.getTime() < Date.now() - 60000) { toast.error("End date and time cannot be in the past"); return; }
      if (endsDate.getTime() <= startsRef.getTime()) { toast.error("End time must be after the start time"); return; }
    }

    const limitErrors = validateCapacityFields(form.capacity, form.per_person);
    setCapErrors(limitErrors);
    if (hasCapacityErrors(limitErrors)) {
      toast.error("Please fix the ticket limits before you publish this event.");
      return;
    }

    setSaving(true);
    try {
      const starts = startMode === "now" ? new Date().toISOString() : new Date(form.starts_at).toISOString();
      const ends = form.ends_at ? new Date(form.ends_at).toISOString() : null;
      const capacity = parseLimit(form.capacity);
      const maxPerBuyer = parseLimit(form.per_person);

      const { data, error } = await supabase.from("events").insert({
        user_id: me.id,
        organization_id: orgId ?? null,
        is_exhibition: isExhibition,
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url || null,
        video_url: form.video_url || null,
        gallery_urls: form.gallery_urls,
        starts_at: starts,
        ends_at: ends,
        venue_name: isOnline ? null : form.venue_name.trim() || null,
        address: isOnline ? null : form.address.trim() || null,
        location: isOnline ? "Online" : form.venue_name.trim() || form.address.trim() || null,
        neighborhood: isOnline ? "Online" : form.neighborhood || null,
        category: form.category || null,
        price_cents: 0,
        pricing_mode: pricing,
        donations_enabled: donation,
        capacity,
        max_tickets_per_buyer: maxPerBuyer,
      }).select("id").single();

      if (error) {
        toast.error(error.message.includes("row-level security")
          ? "Only Artists can post events. Upgrade in your profile."
          : error.message);
        return;
      }
      createdRef.current = true;
      deleteEventDraft(draftIdRef.current);
      setCreated(true);
      const id = (data as { id: string }).id;
      // Short, smooth confirmation before the studio opens.
      window.setTimeout(() => {
        navigate({ to: "/organizer-studio", search: { event: id } });
      }, 1400);
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
          <div className="flex items-center gap-2">
            <button
              onClick={saveDraft}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-2 text-sm font-semibold text-neutral-600 hover:border-[#d4580a]/50 hover:text-[#d4580a]"
            >
              <Save className="h-4 w-4" /> Draft
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit || saving || needsStripe}
              className="rounded-full px-5 py-2 text-sm font-semibold disabled:bg-neutral-200 disabled:text-neutral-500 bg-[#d4580a] text-white hover:brightness-110 disabled:cursor-not-allowed"
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </div>

        </div>

        <p className="text-xs text-neutral-500 mb-4">
          Fields marked with <span className="text-[#d4580a]">*</span> are required. Everything else is optional.
        </p>

        {/* Flyer (required) */}
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
            <><ImagePlus className="w-8 h-8 mb-2" /><span className="text-sm font-medium">Add Event photo or flyer <span className="text-[#d4580a]">*</span></span><span className="text-xs text-neutral-400 mt-0.5">Required, shows on the event page and in shares</span></>
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
            <p className="mt-1 text-[11px] text-neutral-500">Supported formats: MP4, MOV. Up to 200MB.</p>

          </Field>

          <Field label="Event Photos" optional>
            <div className="grid grid-cols-3 gap-2">
              {form.gallery_urls.map((p) => (
                <div key={p} className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                  <EventImage src={p} alt="Event photo" className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, gallery_urls: f.gallery_urls.filter((x) => x !== p) }))}
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                    aria-label="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="h-24 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 hover:border-[#d4580a]/40 flex flex-col items-center justify-center text-neutral-500"
              >
                {uploadingGallery ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ImagePlus className="w-5 h-5 mb-1" /><span className="text-[11px] font-medium">Add photos</span></>}
              </button>
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) void onPickGallery(fs); e.target.value = ""; }}
              />
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">Supported formats: JPEG, JPG, PNG, WebP, GIF.</p>
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
                <input type="datetime-local" min={localNowValue()} className={inputCls} value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
              )}
            </Field>

            <Field label="End Date & Time" optional>
              <div className="h-[34px] mb-2" />
              <input type="datetime-local" min={form.starts_at || localNowValue()} className={inputCls} value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
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

          <Field label="Is this event free or paid?" required>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: "free", title: "Free", sub: "RSVP only, no payment" },
                { key: "paid", title: "Paid", sub: "Sell tickets and get paid" },
              ] as const).map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => { setPricing(o.key); setDonation(false); }}
                  aria-pressed={pricing === o.key}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    pricing === o.key
                      ? "border-[#d4580a] bg-[#d4580a]/[0.06] ring-1 ring-[#d4580a]/30"
                      : "border-neutral-200 bg-white hover:border-[#d4580a]/40"
                  }`}
                >
                  <div className="text-sm font-semibold text-neutral-900">{o.title}</div>
                  <div className="text-xs text-neutral-500">{o.sub}</div>
                </button>
              ))}
            </div>
          </Field>

          {needsStripe ? (
            <div className="rounded-2xl border border-[#d4580a]/30 bg-gradient-to-br from-[#fff4ec] to-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d4580a]/15 text-[#d4580a]">
                  <CreditCard className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-neutral-900">Connect your Stripe account to sell tickets and receive donations</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">
                     Ticket sales and donations pay out straight to your bank, so you need a payout account first. It takes about
                    3 minutes. Your event is saved to Drafts automatically, and you land back in Organizer Studio
                    when you're done.
                  </p>
                  <button
                    type="button"
                    onClick={connectStripe}
                    disabled={connecting}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
                  >
                    {connecting ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening secure form…</> : <>Connect Stripe account</>}
                  </button>
                </div>
              </div>
            </div>
          ) : pricing === "free" && !donation ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] text-neutral-600">
                  <span className="font-semibold text-neutral-900">Free event, but want support?</span>
                  <br />
                  Guests can give any amount from $1 alongside their free ticket.
                </p>
                <button
                  type="button"
                  onClick={() => setDonation(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                >
                  <CreditCard className="h-4 w-4" /> Add a donation button
                </button>
              </div>
            </div>
          ) : donation ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> Donation button added
              </div>
              <p className="mt-1 text-xs text-emerald-700">This remains a free event. Guests can optionally donate after choosing their free ticket.</p>
            </div>
          ) : null}



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

      {created && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#d4580a]" />
            <div className="text-base font-semibold text-neutral-900">Event has been created</div>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {pricing === "paid" ? "Stripe is connecting…" : "Opening Organizer Studio…"}
            </div>
          </div>
        </div>
      )}

      {checkingStripe && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-[#d4580a]" />
            <div className="text-base font-semibold text-neutral-900">Checking your Stripe connection…</div>
            <div className="text-sm text-neutral-500">Making sure payouts are ready for paid tickets</div>
          </div>
        </div>
      )}

      {stripeGate && !checkingStripe && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-50">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div className="text-base font-semibold text-neutral-900">Your Stripe account has not been set up</div>
            <p className="mt-1.5 text-sm text-neutral-500">
              Connect Stripe before creating a paid event so you can receive ticket payouts. Your event is saved as a draft, so you won't lose any progress.
            </p>
            <button
              type="button"
              onClick={() => { setStripeGate(false); connectStripe(); }}
              disabled={connecting}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#d4580a] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {connecting ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening secure form…</> : "Connect Stripe account"}
            </button>
            <button
              type="button"
              onClick={() => setStripeGate(false)}
              className="mt-2 w-full rounded-full px-4 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100"
            >
              Not now
            </button>
          </div>
        </div>
      )}



    </AppLayout>
  );
}

const inputCls = "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-[#d4580a] focus:outline-none focus:ring-1 focus:ring-[#d4580a]/30";
const inputErrCls = "w-full rounded-lg border border-red-500 bg-white px-3 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-300";

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