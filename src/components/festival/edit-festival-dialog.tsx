import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { EditableList, ImagePickerField, type FieldSpec, type ItemRecord } from "@/components/festival/festival-editing";

const CATEGORY_OPTIONS = [
  "Arts", "Music", "Food", "Film", "Books & Poetry", "Poetry", "Dance", "Theater",
  "Cultural", "Caribbean", "African Diaspora", "Latino", "Asian", "Pride", "Family",
  "Wellness", "Holiday", "Neighborhood", "Markets",
];

const ACCESS_OPTIONS: { key: string; label: string }[] = [
  { key: "wheelchair", label: "Wheelchair accessible" },
  { key: "asl", label: "ASL interpretation" },
  { key: "restrooms", label: "Accessible restrooms" },
  { key: "seating", label: "Accessible seating" },
  { key: "sensory", label: "Sensory friendly" },
  { key: "transit", label: "Transit accessible" },
];

const TRANSIT_FIELDS: { key: string; label: string }[] = [
  { key: "light_rail", label: "Light Rail" },
  { key: "metro", label: "Metro" },
  { key: "bus", label: "Bus" },
  { key: "rideshare", label: "Rideshare" },
  { key: "bike", label: "Bike Parking" },
  { key: "walking", label: "Walking" },
  { key: "parking", label: "Parking" },
  { key: "notes", label: "Notes" },
];

const RULE_FIELDS: { key: string; label: string }[] = [
  { key: "bags", label: "Bags" },
  { key: "chairs", label: "Chairs" },
  { key: "outside_food", label: "Outside Food" },
  { key: "alcohol", label: "Alcohol" },
  { key: "smoking", label: "Smoking" },
  { key: "pets", label: "Pets" },
  { key: "reentry", label: "Reentry" },
  { key: "children", label: "Children" },
  { key: "photography", label: "Photography" },
];

const HIGHLIGHT_FIELDS: { key: string; label: string }[] = [
  { key: "installations", label: "Installations" },
  { key: "performances", label: "Performances" },
  { key: "family", label: "Family" },
  { key: "food", label: "Food" },
];

const PROGRAM_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image" },
  { key: "name", label: "Name" },
  { key: "type", label: "Type / discipline", placeholder: "Music, dance, poetry" },
  { key: "when", label: "Date and time", placeholder: "Sat, Sep 22 · 9:00 pm" },
  { key: "venue", label: "Venue or stage", placeholder: "Main Stage" },
  { key: "description", label: "Bio / description", type: "textarea" },
  { key: "price", label: "Admission label", placeholder: "Free, RSVP or $25" },
];

const SCHEDULE_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image" },
  { key: "name", label: "What is happening" },
  { key: "date", label: "Date", placeholder: "2026-09-22" },
  { key: "time", label: "Time", placeholder: "1:00 pm" },
  { key: "venue", label: "Venue or stage" },
  { key: "type", label: "Type" },
  { key: "price", label: "Admission label" },
  { key: "description", label: "Description", type: "textarea" },
];

const VENDOR_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image" },
  { key: "category", label: "Category" },
  { key: "name", label: "Name" },
  { key: "booth", label: "Booth" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "website", label: "Website" },
];

const FAQ_FIELDS: FieldSpec[] = [
  { key: "q", label: "Question" },
  { key: "a", label: "Answer", type: "textarea" },
];

const UPDATE_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image" },
  { key: "title", label: "Headline" },
  { key: "date", label: "Timestamp" },
  { key: "body", label: "Message", type: "textarea" },
];

const GARAGE_FIELDS: FieldSpec[] = [
  { key: "name", label: "Garage" },
  { key: "address", label: "Address" },
  { key: "price", label: "Price" },
];

type TicketTypeRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  quantity: number | null;
  max_per_buyer: number | null;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function asRecords(v: unknown): ItemRecord[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => {
    if (typeof x === "string") return { name: x };
    const out: ItemRecord = {};
    for (const [k, val] of Object.entries((x ?? {}) as Record<string, unknown>)) {
      out[k] = typeof val === "string" ? val : val == null ? "" : String(val);
    }
    return out;
  });
}

function asStringMap(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    out[k] = Array.isArray(val) ? val.join("\n") : typeof val === "string" ? val : "";
  }
  return out;
}

function lines(v: string): string[] {
  return v.split("\n").map((s) => s.trim()).filter(Boolean);
}

function LabeledInput({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <Input className="mt-1" type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function LabeledArea({ label, value, onChange, rows = 3, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <Textarea className="mt-1" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h3 className="font-display text-lg font-extrabold text-foreground">{title}</h3>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

function ListRow({ item }: { item: ItemRecord }) {
  const title = item.name || item.title || item.q || "Untitled";
  const meta = [item.type || item.category, item.when || [item.date, item.time].filter(Boolean).join(" "), item.venue || item.booth, item.price]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="pt-2">
      <div className="text-sm font-bold text-foreground">{title}</div>
      {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
    </div>
  );
}

const emptyRows = <p className="text-sm text-muted-foreground">No entries yet.</p>;

/** One place for a festival creator to edit every part of their festival page. */
export function EditFestivalDialog({
  open,
  onOpenChange,
  eventId,
  onSaved,
  asPage = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  onSaved: () => void;
  /** Render inline as a full page instead of inside a modal. */
  asPage?: boolean;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ev, setEv] = useState<Record<string, string>>({});
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [det, setDet] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [accessibility, setAccessibility] = useState<string[]>([]);
  const [transit, setTransit] = useState<Record<string, string>>({});
  const [rules, setRules] = useState<Record<string, string>>({});
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const [garages, setGarages] = useState<ItemRecord[]>([]);
  const [schedule, setSchedule] = useState<ItemRecord[]>([]);
  const [performers, setPerformers] = useState<ItemRecord[]>([]);
  const [experiences, setExperiences] = useState<ItemRecord[]>([]);
  const [vendors, setVendors] = useState<ItemRecord[]>([]);
  const [food, setFood] = useState<ItemRecord[]>([]);
  const [faqs, setFaqs] = useState<ItemRecord[]>([]);
  const [updates, setUpdates] = useState<ItemRecord[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [galleryText, setGalleryText] = useState("");
  const [tickets, setTickets] = useState<TicketTypeRow[]>([]);
  const [ticketForm, setTicketForm] = useState({ name: "", description: "", price: "", quantity: "", max: "" });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const [e, d, t] = await Promise.all([
        supabase.from("events").select("*").eq("id", eventId).maybeSingle(),
        supabase.from("festival_details").select("*").eq("event_id", eventId).maybeSingle(),
        supabase.from("ticket_types").select("id,name,description,price_cents,quantity,max_per_buyer").eq("event_id", eventId).order("sort_order"),
      ]);
      if (cancelled) return;
      const row = (e.data ?? {}) as Record<string, unknown>;
      const dr = (d.data ?? {}) as Record<string, unknown>;
      setEv({
        title: String(row.title ?? ""),
        description: String(row.description ?? ""),
        image_url: String(row.image_url ?? ""),
        starts_at: toLocalInput((row.starts_at as string) ?? null),
        ends_at: toLocalInput((row.ends_at as string) ?? null),
        venue_name: String(row.venue_name ?? ""),
        address: String(row.address ?? ""),
        neighborhood: String(row.neighborhood ?? ""),
        category: String(row.category ?? ""),
        latitude: row.latitude == null ? "" : String(row.latitude),
        longitude: row.longitude == null ? "" : String(row.longitude),
        price: row.price_cents ? String(Number(row.price_cents) / 100) : "",
        admission: row.donations_enabled ? "donation" : row.pricing_mode === "paid" ? "paid" : "free",
      });
      setPublished(row.is_published !== false);
      setGallery(Array.isArray(row.gallery_urls) ? (row.gallery_urls as string[]) : []);
      setGalleryText("");
      setDet({
        tagline: String(dr.tagline ?? ""),
        hours: String(dr.hours ?? ""),
        price_label: String(dr.price_label ?? ""),
        age_range: String(dr.age_range ?? ""),
        format: String(dr.format ?? ""),
        audience: String(dr.audience ?? ""),
        rain_or_shine: String(dr.rain_or_shine ?? ""),
        pet_policy: String(dr.pet_policy ?? ""),
        expected_attendance: String(dr.expected_attendance ?? ""),
        footprint: String(dr.footprint ?? ""),
        website: String(dr.website ?? ""),
        instagram: String(dr.instagram ?? ""),
        facebook: String(dr.facebook ?? ""),
        organizer_name: String(dr.organizer_name ?? ""),
        organizer_description: String(dr.organizer_description ?? ""),
        organizer_website: String(dr.organizer_website ?? ""),
        ticket_url: String(dr.ticket_url ?? ""),
        badges: Array.isArray(dr.badges) ? (dr.badges as string[]).join(", ") : "",
        tags: Array.isArray(dr.tags) ? (dr.tags as string[]).join("\n") : "",
      });
      setFeatured(dr.featured === true);
      setCategories(Array.isArray(dr.categories) ? (dr.categories as string[]) : []);
      setAccessibility(Array.isArray(dr.accessibility) ? (dr.accessibility as string[]) : []);
      setTransit(asStringMap(dr.transit));
      setRules(asStringMap(dr.rules));
      setHighlights(asStringMap(dr.highlights));
      setGarages(asRecords(dr.garages));
      setSchedule(asRecords(dr.schedule));
      setPerformers(asRecords(dr.performers));
      setExperiences(asRecords(dr.experiences));
      setVendors(asRecords(dr.vendors));
      setFood(asRecords(dr.food));
      setFaqs(asRecords(dr.faqs));
      setUpdates(asRecords(dr.updates));
      setTickets((t.data ?? []) as TicketTypeRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, eventId]);

  const setEvField = (k: string) => (v: string) => setEv((f) => ({ ...f, [k]: v }));
  const setDetField = (k: string) => (v: string) => setDet((f) => ({ ...f, [k]: v }));

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) =>
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const galleryFinal = useMemo(() => [...gallery, ...lines(galleryText)], [gallery, galleryText]);

  const addTicketType = async () => {
    if (!ticketForm.name.trim() || !ticketForm.price) {
      toast.error("Ticket types need a name and a price");
      return;
    }
    const res = await supabase
      .from("ticket_types")
      .insert({
        event_id: eventId,
        name: ticketForm.name.trim(),
        description: ticketForm.description.trim() || null,
        price_cents: Math.max(0, Math.round(Number(ticketForm.price) * 100)),
        quantity: ticketForm.quantity ? Number(ticketForm.quantity) : null,
        max_per_buyer: ticketForm.max ? Number(ticketForm.max) : null,
        sort_order: tickets.length,
      } as never)
      .select("id,name,description,price_cents,quantity,max_per_buyer")
      .single();
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setTickets((t) => [...t, res.data as TicketTypeRow]);
    setTicketForm({ name: "", description: "", price: "", quantity: "", max: "" });
    toast.success("Ticket type added");
  };

  const removeTicketType = async (id: string) => {
    const res = await supabase.from("ticket_types").delete().eq("id", id);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setTickets((t) => t.filter((x) => x.id !== id));
  };

  const save = async () => {
    if (!ev.title?.trim()) {
      toast.error("Give your festival a name");
      return;
    }
    if (!ev.starts_at) {
      toast.error("Pick a start date");
      return;
    }
    setSaving(true);
    const priceCents = ev.admission === "paid" ? Math.max(0, Math.round(Number(ev.price || 0) * 100)) : 0;
    const evRes = await supabase
      .from("events")
      .update({
        title: ev.title.trim(),
        description: ev.description?.trim() || null,
        image_url: ev.image_url || null,
        starts_at: new Date(ev.starts_at).toISOString(),
        ends_at: ev.ends_at ? new Date(ev.ends_at).toISOString() : null,
        venue_name: ev.venue_name?.trim() || null,
        address: ev.address?.trim() || null,
        location: ev.venue_name?.trim() || ev.address?.trim() || null,
        neighborhood: ev.neighborhood?.trim() || null,
        category: ev.category?.trim() || categories[0] || null,
        latitude: ev.latitude ? Number(ev.latitude) : null,
        longitude: ev.longitude ? Number(ev.longitude) : null,
        pricing_mode: ev.admission === "paid" ? "paid" : "free",
        donations_enabled: ev.admission === "donation",
        price_cents: priceCents,
        gallery_urls: galleryFinal,
        is_published: published,
      } as never)
      .eq("id", eventId);
    if (evRes.error) {
      setSaving(false);
      toast.error(evRes.error.message);
      return;
    }
    const detRes = await supabase.from("festival_details").upsert(
      {
        event_id: eventId,
        tagline: det.tagline?.trim() || null,
        hours: det.hours?.trim() || null,
        price_label: det.price_label?.trim() || null,
        age_range: det.age_range?.trim() || null,
        format: det.format?.trim() || null,
        audience: det.audience?.trim() || null,
        rain_or_shine: det.rain_or_shine?.trim() || null,
        pet_policy: det.pet_policy?.trim() || null,
        expected_attendance: det.expected_attendance?.trim() || null,
        footprint: det.footprint?.trim() || null,
        website: det.website?.trim() || null,
        instagram: det.instagram?.trim() || null,
        facebook: det.facebook?.trim() || null,
        organizer_name: det.organizer_name?.trim() || null,
        organizer_description: det.organizer_description?.trim() || null,
        organizer_website: det.organizer_website?.trim() || null,
        ticket_url: det.ticket_url?.trim() || null,
        admission_type: ev.admission,
        badges: (det.badges ?? "").split(",").map((s) => s.trim()).filter(Boolean),
        tags: lines(det.tags ?? ""),
        categories,
        accessibility,
        featured,
        transit,
        rules,
        garages,
        highlights: Object.fromEntries(HIGHLIGHT_FIELDS.map((f) => [f.key, lines(highlights[f.key] ?? "")])),
        schedule,
        performers,
        experiences,
        vendors,
        food,
        faqs,
        updates,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "event_id" },
    );
    setSaving(false);
    if (detRes.error) {
      toast.error(detRes.error.message);
      return;
    }
    toast.success("Festival updated");
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!window.confirm("Delete this festival? This cannot be undone.")) return;
    const res = await supabase.from("events").delete().eq("id", eventId);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Festival deleted");
    onOpenChange(false);
    void navigate({ to: "/festivals" });
  };

  const listProps = {
    canEdit: true,
    renderItem: (item: ItemRecord) => <ListRow item={item} />,
    emptyState: emptyRows,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Festival</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Update every part of your festival page. Changes go live immediately.</p>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading festival…
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            <section>
              <h3 className="font-display text-lg font-extrabold text-foreground">Festival Basics</h3>
              <div className="mt-3 space-y-4">
                <LabeledInput label="Name" value={ev.title ?? ""} onChange={setEvField("title")} />
                <LabeledArea label="Short description" rows={2} value={det.tagline ?? ""} onChange={setDetField("tagline")} />
                <LabeledArea label="About the festival" rows={6} value={ev.description ?? ""} onChange={setEvField("description")} />
                <ImagePickerField label="Festival image" value={ev.image_url ?? ""} onChange={setEvField("image_url")} />
                <LabeledInput label="Status badges (comma separated)" value={det.badges ?? ""} onChange={setDetField("badges")} placeholder="Free, Family friendly" />
              </div>
            </section>

            <Section title="Date & Location">
              <div className="grid gap-4 sm:grid-cols-2">
                <LabeledInput label="Start date" type="datetime-local" value={ev.starts_at ?? ""} onChange={setEvField("starts_at")} />
                <LabeledInput label="End date" type="datetime-local" value={ev.ends_at ?? ""} onChange={setEvField("ends_at")} />
                <LabeledInput label="Hours" value={det.hours ?? ""} onChange={setDetField("hours")} placeholder="Fri 11am-9pm" />
                <LabeledInput label="Venue" value={ev.venue_name ?? ""} onChange={setEvField("venue_name")} />
                <LabeledInput label="Address" value={ev.address ?? ""} onChange={setEvField("address")} />
                <LabeledInput label="Neighborhood" value={ev.neighborhood ?? ""} onChange={setEvField("neighborhood")} />
                <LabeledInput label="Latitude" value={ev.latitude ?? ""} onChange={setEvField("latitude")} />
                <LabeledInput label="Longitude" value={ev.longitude ?? ""} onChange={setEvField("longitude")} />
              </div>
              <LabeledArea label="Footprint" rows={2} value={det.footprint ?? ""} onChange={setDetField("footprint")} />
            </Section>

            <Section title="Categories & Audience">
              <div>
                <span className="text-xs font-semibold text-muted-foreground">Categories</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((c) => (
                    <Button
                      key={c}
                      type="button"
                      size="xs"
                      variant={categories.includes(c) ? "brand" : "outline"}
                      onClick={() => toggle(categories, c, setCategories)}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
              <LabeledArea label="Tags" rows={3} hint="One per line." value={det.tags ?? ""} onChange={setDetField("tags")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <LabeledInput label="Format" value={det.format ?? ""} onChange={setDetField("format")} placeholder="Street festival" />
                <LabeledInput label="Audience" value={det.audience ?? ""} onChange={setDetField("audience")} placeholder="All ages" />
                <LabeledInput label="Expected attendance" value={det.expected_attendance ?? ""} onChange={setDetField("expected_attendance")} />
                <LabeledInput label="Age restriction" value={det.age_range ?? ""} onChange={setDetField("age_range")} />
                <LabeledInput label="Pet policy" value={det.pet_policy ?? ""} onChange={setDetField("pet_policy")} />
                <LabeledInput label="Rain or shine" value={det.rain_or_shine ?? ""} onChange={setDetField("rain_or_shine")} />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured
              </label>
            </Section>

            <Section title="Admission">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">Admission type</span>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={ev.admission ?? "free"}
                    onChange={(e) => setEvField("admission")(e.target.value)}
                  >
                    <option value="free">Free / RSVP</option>
                    <option value="paid">Paid / Ticketed</option>
                    <option value="donation">Donation based</option>
                  </select>
                </label>
                {ev.admission === "paid" && (
                  <LabeledInput label="Price (USD)" value={ev.price ?? ""} onChange={setEvField("price")} placeholder="25" />
                )}
                <LabeledInput label="Price label" value={det.price_label ?? ""} onChange={setDetField("price_label")} placeholder="Free or $55 to $120" />
                <LabeledInput label="Ticket / registration link" value={det.ticket_url ?? ""} onChange={setDetField("ticket_url")} placeholder="https://" />
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">Status</span>
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={published ? "published" : "draft"}
                    onChange={(e) => setPublished(e.target.value === "published")}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
              </div>
            </Section>

            <Section title="Ticket Types">
              <div className="rounded-xl border border-border p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <LabeledInput label="Name *" value={ticketForm.name} onChange={(v) => setTicketForm((f) => ({ ...f, name: v }))} />
                  <LabeledInput label="Description" value={ticketForm.description} onChange={(v) => setTicketForm((f) => ({ ...f, description: v }))} />
                  <LabeledInput label="Price ($) *" value={ticketForm.price} onChange={(v) => setTicketForm((f) => ({ ...f, price: v }))} />
                  <LabeledInput label="Quantity" value={ticketForm.quantity} onChange={(v) => setTicketForm((f) => ({ ...f, quantity: v }))} />
                  <LabeledInput label="Max / buyer" value={ticketForm.max} onChange={(v) => setTicketForm((f) => ({ ...f, max: v }))} />
                </div>
                <Button type="button" variant="brand" size="sm" className="mt-3" onClick={() => void addTicketType()}>
                  Add Ticket Type
                </Button>
              </div>
              <div className="space-y-2">
                {tickets.length === 0 ? (
                  emptyRows
                ) : (
                  tickets.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground">{t.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[`$${(t.price_cents / 100).toFixed(2).replace(/\.00$/, "")}`, t.quantity != null ? `${t.quantity} available` : null, t.max_per_buyer ? `max ${t.max_per_buyer}/buyer` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="xs" onClick={() => void removeTicketType(t.id)}>
                        <Trash2 /> Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section title="Organizer & Social">
              <div className="grid gap-4 sm:grid-cols-2">
                <LabeledInput label="Organizer name" value={det.organizer_name ?? ""} onChange={setDetField("organizer_name")} />
                <LabeledInput label="Organizer website" value={det.organizer_website ?? ""} onChange={setDetField("organizer_website")} />
                <LabeledInput label="Festival website" value={det.website ?? ""} onChange={setDetField("website")} />
                <LabeledInput label="Instagram" value={det.instagram ?? ""} onChange={setDetField("instagram")} />
                <LabeledInput label="Facebook" value={det.facebook ?? ""} onChange={setDetField("facebook")} />
              </div>
              <LabeledArea label="Organizer description" rows={3} value={det.organizer_description ?? ""} onChange={setDetField("organizer_description")} />
            </Section>

            <Section title="Schedule">
              <EditableList {...listProps} items={schedule} addLabel="Add schedule item" dialogTitle="Schedule item" fields={SCHEDULE_FIELDS} reorderable onChange={async (n) => setSchedule(n)} />
            </Section>

            <Section title="Artists / Lineup">
              <EditableList {...listProps} items={performers} addLabel="Add artist" dialogTitle="Artist" fields={PROGRAM_FIELDS} reorderable onChange={async (n) => setPerformers(n)} />
            </Section>

            <Section title="Featured Experiences">
              <EditableList {...listProps} items={experiences} addLabel="Add experience" dialogTitle="Featured experience" fields={PROGRAM_FIELDS} reorderable onChange={async (n) => setExperiences(n)} />
            </Section>

            <Section title="Vendors">
              <EditableList {...listProps} items={vendors} addLabel="Add vendor" dialogTitle="Vendor" fields={VENDOR_FIELDS} reorderable onChange={async (n) => setVendors(n)} />
            </Section>

            <Section title="Food + Drink">
              <EditableList {...listProps} items={food} addLabel="Add food vendor" dialogTitle="Food vendor" fields={VENDOR_FIELDS} reorderable onChange={async (n) => setFood(n)} />
            </Section>

            <Section title="Highlights">
              <div className="grid gap-4 sm:grid-cols-2">
                {HIGHLIGHT_FIELDS.map((f) => (
                  <LabeledArea
                    key={f.key}
                    label={f.label}
                    hint="One per line."
                    value={highlights[f.key] ?? ""}
                    onChange={(v) => setHighlights((h) => ({ ...h, [f.key]: v }))}
                  />
                ))}
              </div>
            </Section>

            <Section title="Gallery">
              <ImagePickerField
                label="Upload image"
                value=""
                onChange={(v) => {
                  if (v) setGallery((g) => [...g, v]);
                }}
              />
              {gallery.length > 0 && (
                <div className="space-y-1">
                  {gallery.map((g, i) => (
                    <div key={`${g}-${i}`} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{g}</span>
                      <Button type="button" variant="outline" size="xs" onClick={() => setGallery((list) => list.filter((_, idx) => idx !== i))}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <LabeledArea label="Or paste URLs" hint="One per line." value={galleryText} onChange={setGalleryText} />
            </Section>

            <Section title="FAQ">
              <EditableList {...listProps} items={faqs} addLabel="Add question" dialogTitle="Question" fields={FAQ_FIELDS} reorderable onChange={async (n) => setFaqs(n)} />
            </Section>

            <Section title="Updates / Announcements">
              <EditableList {...listProps} items={updates} addLabel="Add update" dialogTitle="Update" fields={UPDATE_FIELDS} reorderable onChange={async (n) => setUpdates(n)} />
            </Section>

            <Section title="Getting There">
              <div className="grid gap-4 sm:grid-cols-2">
                {TRANSIT_FIELDS.map((f) => (
                  <LabeledInput key={f.key} label={f.label} value={transit[f.key] ?? ""} onChange={(v) => setTransit((t) => ({ ...t, [f.key]: v }))} />
                ))}
              </div>
              <EditableList {...listProps} items={garages} addLabel="Add garage" dialogTitle="Garage" fields={GARAGE_FIELDS} onChange={async (n) => setGarages(n)} />
            </Section>

            <Section title="Festival Rules">
              <div className="grid gap-4 sm:grid-cols-2">
                {RULE_FIELDS.map((f) => (
                  <LabeledInput key={f.key} label={f.label} value={rules[f.key] ?? ""} onChange={(v) => setRules((r) => ({ ...r, [f.key]: v }))} />
                ))}
              </div>
            </Section>

            <Section title="Accessibility">
              <div className="grid gap-2 sm:grid-cols-2">
                {ACCESS_OPTIONS.map((o) => (
                  <label key={o.key} className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={accessibility.includes(o.key)}
                      onChange={() => toggle(accessibility, o.key, setAccessibility)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </Section>

            <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => void remove()}>
                <Trash2 /> Delete Festival
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" variant="brand" disabled={saving} onClick={() => void save()}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
