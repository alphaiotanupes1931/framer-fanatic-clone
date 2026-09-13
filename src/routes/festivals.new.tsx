import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";
import { EventImage } from "@/components/event-image";
import { compressImage } from "@/lib/image-compress";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { RichTextEditor } from "@/components/rich-text-editor";
import { PageBackButton } from "@/components/shared/page-back-button";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/shared/chip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";

export const Route = createFileRoute("/festivals/new")({
  component: NewFestivalPage,
  head: () => ({
    meta: [
      { title: "Create a Festival - Planet Baltimore" },
      { name: "description", content: "Set up your festival on Planet Baltimore with a full schedule, artists, vendors and more." },
      { property: "og:title", content: "Create a Festival - Planet Baltimore" },
      { property: "og:description", content: "Set up your festival on Planet Baltimore." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CATEGORIES = [
  "Arts", "Music", "Food", "Film", "Books & Poetry", "Poetry", "Dance", "Theater",
  "Cultural", "Caribbean", "African Diaspora", "Latino", "Asian", "Pride",
  "Family", "Wellness", "Holiday", "Neighborhood", "Markets",
];

const AUDIENCES = ["All Ages", "Family Friendly", "21+"];

const SUGGESTED_TAGS = [
  "Family Friendly", "Free", "Outdoor", "Indoor", "Live Music", "Local Vendors",
  "Street Fair", "Block Party", "Food Trucks", "Kids Activities", "Dog Friendly",
  "Craft Market", "Dance", "Parade", "Fireworks", "Wellness", "Pop-Up", "Nightlife",
];

type Neighborhood = { id: string; name: string };

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:border-orange focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h2 className="mb-4 text-base font-bold text-foreground">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">
        {label} {required && <span className="text-orange">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function NewFestivalPage() {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    image_url: "",
    starts_at: "",
    ends_at: "",
    hours: "",
    venue_name: "",
    neighborhood: "",
    latitude: "",
    longitude: "",
    categories: [] as string[],
    tags: "",
    format: "",
    audience: "All Ages",
    admission: "free" as "free" | "paid" | "donation",
    price: "",
    ticket_url: "",
    organizer_name: "",
    organizer_description: "",
    organizer_website: "",
    website: "",
    expected_attendance: "",
    age_restriction: "",
    pet_policy: "",
    rain_or_shine: "",
    published: true,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("neighborhoods").select("id,name").order("name");
      setNeighborhoods((data ?? []) as Neighborhood[]);
    })();
  }, []);

  const toggleCategory = (c: string) =>
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c],
    }));

  const [customTag, setCustomTag] = useState("");
  const tagList: string[] = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
  const setTags = (list: string[]) => set("tags", list.join(", "));
  const toggleTag = (t: string) =>
    setTags(tagList.includes(t) ? tagList.filter((x) => x !== t) : [...tagList, t]);
  const addCustomTag = () => {
    const t = customTag.trim();
    if (!t) return;
    if (!tagList.some((x) => x.toLowerCase() === t.toLowerCase())) setTags([...tagList, t]);
    setCustomTag("");
  };

  const onPickImage = (file: File) => {
    if (!me) return;
    setCropFile(file);
  };

  const onCropped = async (file: File) => {
    setCropFile(null);
    if (!me) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const ext = (compressed.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("event-images")
        .upload(path, compressed, { upsert: false, contentType: compressed.type });
      if (error) throw error;
      set("image_url", path);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!me) { toast.error("Sign in to create a festival"); return; }
    if (!form.name.trim()) { toast.error("Give your festival a name"); return; }
    if (!form.starts_at) { toast.error("Pick a start date"); return; }
    const startDate = new Date(form.starts_at);
    if (Number.isNaN(startDate.getTime())) { toast.error("Pick a valid start date"); return; }
    if (startDate.getTime() < Date.now() - 60000) { toast.error("Start date cannot be in the past"); return; }
    if (form.ends_at) {
      const endDate = new Date(form.ends_at);
      if (Number.isNaN(endDate.getTime())) { toast.error("Pick a valid end date"); return; }
      if (endDate.getTime() <= startDate.getTime()) { toast.error("End date must be after the start date"); return; }
    }
    const lat = form.latitude.trim() ? Number(form.latitude) : null;
    const lng = form.longitude.trim() ? Number(form.longitude) : null;
    if ((lat != null && Number.isNaN(lat)) || (lng != null && Number.isNaN(lng))) {
      toast.error("Latitude and longitude must be numbers");
      return;
    }

    setSaving(true);
    try {
      const pricingMode = form.admission === "paid" ? "paid" : "free";
      const { data, error } = await supabase
        .from("events")
        .insert({
          user_id: me.id,
          title: form.name.trim(),
          description: form.description.trim() || null,
          image_url: form.image_url || null,
          starts_at: startDate.toISOString(),
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          venue_name: form.venue_name.trim() || null,
          location: form.venue_name.trim() || null,
          neighborhood: form.neighborhood || null,
          latitude: lat,
          longitude: lng,
          category: "festival",
          price_cents:
            form.admission === "paid"
              ? Math.max(0, Math.round(Number(form.price || 0) * 100))
              : 0,
          pricing_mode: pricingMode,
          donations_enabled: form.admission === "donation",
          is_published: form.published,
        })
        .select("id")
        .single();

      if (error) {
        toast.error(error.message.includes("row-level security")
          ? "Only Artists can post festivals. Upgrade in your profile."
          : error.message);
        return;
      }

      const eventId = (data as { id: string }).id;
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const { error: detailError } = await supabase.from("festival_details").insert({
        event_id: eventId,
        tagline: form.tagline.trim() || null,
        hours: form.hours.trim() || null,
        format: form.format.trim() || null,
        audience: form.audience,
        admission_type: form.admission,
        ticket_url: form.ticket_url.trim() || null,
        categories: form.categories,
        tags,
        expected_attendance: form.expected_attendance.trim() || null,
        age_range: form.age_restriction.trim() || null,
        pet_policy: form.pet_policy.trim() || null,
        rain_or_shine: form.rain_or_shine.trim() || null,
        website: form.website.trim() || null,
        organizer_name: form.organizer_name.trim() || null,
        organizer_description: form.organizer_description.trim() || null,
        organizer_website: form.organizer_website.trim() || null,
      });
      if (detailError) {
        toast.error("Festival created, but the extra details did not save. You can add them from the festival page.");
      } else {
        toast.success(form.published ? "Festival published" : "Festival saved as draft");
      }
      navigate({ to: "/festivals/$eventId", params: { eventId } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
        <div>
          <PageHeader
            title="Create a Festival"
            description="Set up your festival on Planet Baltimore. You can add the full schedule, artists, vendors, and more from the festival profile after publishing."
            back={<PageBackButton destination="festivals" />}
          />
        </div>

        <Section title="Festival Basics">
          <Field label="Festival name" required>
            <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={140} placeholder="What's your festival called?" />
          </Field>
          <Field label="Short description">
            <input className={inputCls} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={200} placeholder="One line that sums it up" />
          </Field>
          <Field label="About the festival">
            <RichTextEditor value={form.description} onChange={(v) => set("description", v)} placeholder="Tell people about your festival..." minHeight={140} />
          </Field>
          <Field label="Festival image">
            <Button
              variant="outline"
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-auto w-full aspect-[16/9] overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/40 text-muted-foreground hover:border-orange hover:bg-orange/5 hover:text-orange"
            >
              {form.image_url ? (
                <EventImage src={form.image_url} alt="Festival image" className="w-full h-full object-cover" />
              ) : uploading ? (
                <><Loader2 className="w-6 h-6 animate-spin mb-2" /><span className="text-sm">Uploading…</span></>
              ) : (
                <><ImagePlus className="w-8 h-8 mb-2" /><span className="text-sm font-medium">Upload image</span></>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ""; }}
              />
            </Button>
          </Field>
        </Section>

        <Section title="Date & Location">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" required>
              <input type="datetime-local" className={inputCls} value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
            </Field>
            <Field label="End date">
              <input type="datetime-local" className={inputCls} value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
            </Field>
          </div>
          <Field label="Hours" hint="For example: Sat 12pm-10pm, Sun 11am-6pm">
            <input className={inputCls} value={form.hours} onChange={(e) => set("hours", e.target.value)} />
          </Field>
          <Field label="Venue">
            <input className={inputCls} value={form.venue_name} onChange={(e) => set("venue_name", e.target.value)} placeholder="Where is it happening?" />
          </Field>
          <Field label="Neighborhood">
            <select className={inputCls} value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)}>
              <option value="">Select a neighborhood</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.name}>{n.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Latitude" hint="Optional, pins the festival on the map">
              <input className={inputCls} inputMode="decimal" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="39.2904" />
            </Field>
            <Field label="Longitude">
              <input className={inputCls} inputMode="decimal" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="-76.6122" />
            </Field>
          </div>
        </Section>

        <Section title="Categories & Audience">
          <Field label="Categories">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const on = form.categories.includes(c);
                return (
                  <Chip
                    key={c}
                    selected={on}
                    onClick={() => toggleCategory(c)}
                  >
                    {c}
                  </Chip>
                );
              })}
            </div>
          </Field>
          <Field label="Tags" hint="Pick the ones that fit. These help people find your festival in the filters.">
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TAGS.map((t) => {
                const on = tagList.includes(t);
                return (
                  <Chip
                    key={t}
                    selected={on}
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </Chip>
                );
              })}
            </div>
            {tagList.filter((t) => !SUGGESTED_TAGS.includes(t)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tagList.filter((t) => !SUGGESTED_TAGS.includes(t)).map((t) => (
                  <Chip key={t} removable selected onClick={() => toggleTag(t)} aria-label={`Remove ${t}`}>{t}</Chip>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <Input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                placeholder="Add your own tag"
                maxLength={30}
              />
              <Button
                variant="outline"
                onClick={addCustomTag}
              >
                Add
              </Button>
            </div>
          </Field>
          <Field label="Format" hint="For example: Outdoor street festival, Indoor market">
            <input className={inputCls} value={form.format} onChange={(e) => set("format", e.target.value)} />
          </Field>
          <Field label="Audience">
            <select className={inputCls} value={form.audience} onChange={(e) => set("audience", e.target.value)}>
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Admission">
          <Field label="Admission type">
            <div className="flex flex-wrap gap-2">
              {([["free", "Free"], ["paid", "Paid / Ticketed"], ["donation", "Donation-based"]] as const).map(([v, label]) => (
                <Chip
                  key={v}
                  selected={form.admission === v}
                  onClick={() => set("admission", v)}
                >
                  {label}
                </Chip>
              ))}
            </div>
          </Field>
          {form.admission !== "free" && (
            <Field label="Ticket / registration link">
              <input className={inputCls} type="url" value={form.ticket_url} onChange={(e) => set("ticket_url", e.target.value)} placeholder="https://" />
            </Field>
          )}
        </Section>

        <Section title="Organizer">
          <Field label="Organizer name">
            <input className={inputCls} value={form.organizer_name} onChange={(e) => set("organizer_name", e.target.value)} />
          </Field>
          <Field label="Organizer description">
            <textarea className={`${inputCls} min-h-[90px]`} value={form.organizer_description} onChange={(e) => set("organizer_description", e.target.value)} />
          </Field>
          <Field label="Organizer website">
            <input className={inputCls} type="url" value={form.organizer_website} onChange={(e) => set("organizer_website", e.target.value)} placeholder="https://" />
          </Field>
        </Section>

        <Section title="Extra Details">
          <Field label="Festival website">
            <input className={inputCls} type="url" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Expected attendance">
              <input className={inputCls} value={form.expected_attendance} onChange={(e) => set("expected_attendance", e.target.value)} placeholder="e.g. 5,000" />
            </Field>
            <Field label="Age restriction">
              <input className={inputCls} value={form.age_restriction} onChange={(e) => set("age_restriction", e.target.value)} placeholder="e.g. 21+ after 8pm" />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pet policy">
              <input className={inputCls} value={form.pet_policy} onChange={(e) => set("pet_policy", e.target.value)} placeholder="e.g. Leashed pets welcome" />
            </Field>
            <Field label="Rain or shine">
              <input className={inputCls} value={form.rain_or_shine} onChange={(e) => set("rain_or_shine", e.target.value)} placeholder="e.g. Rain or shine" />
            </Field>
          </div>
        </Section>

        <Section title="Publish status">
          <div className="flex flex-wrap gap-2">
            <Chip
              selected={form.published}
              onClick={() => set("published", true)}
            >
              Published (visible publicly)
            </Chip>
            <Chip
              selected={!form.published}
              onClick={() => set("published", false)}
            >
              Draft (hidden from directory)
            </Chip>
          </div>
        </Section>

        <div className="flex items-center justify-end gap-3 pb-10">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/festivals" })}
          >
            Cancel
          </Button>
          <Button
            variant="brand"
            onClick={submit}
            disabled={saving || uploading}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {form.published ? "Create & Publish Festival" : "Save Draft"}
          </Button>
        </div>
      </div>

      <ImageCropDialog
        file={cropFile}
        open={!!cropFile}
        onOpenChange={(o) => { if (!o) setCropFile(null); }}
        onCropped={onCropped}
        aspect={16 / 9}
        title="Crop your festival image"
      />
    </AppLayout>
  );
}
