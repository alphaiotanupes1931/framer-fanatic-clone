import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Img } from "@/components/shared/smart-img";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { pageHead } from "@/lib/seo";
import { externalShare } from "@/lib/share-preview";
import { siteUrl, titleCase } from "@/lib/utils";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { EventSocial } from "@/components/event-social";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Bookmark,
  BarChart3,
  CalendarDays,
  ImagePlus,
  Megaphone,
  Music,
  Search,
  Check,
  Clock,
  Compass,
  Eye,
  EyeOff,
  ExternalLink,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Send,
  Settings,
  Share2,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import { PageBackButton } from "@/components/shared/page-back-button";
import { useUserRole } from "@/hooks/use-user-role";
import { EditableList, ImagePickerField, uploadFestivalImage, type FieldSpec } from "@/components/festival/festival-editing";
import { EditFestivalDialog } from "@/components/festival/edit-festival-dialog";


export const Route = createFileRoute("/festivals/$eventId")({
  component: FestivalDetailPage,
  head: () =>
    pageHead({
      path: "/festivals",
      title: "Festival | Planet Baltimore",
      description:
        "Festival lineup, schedule, tickets, food, vendors and everything to know before you go.",
    }),
});

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  gallery_urls: string[];
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  address: string | null;
  location: string | null;
  neighborhood: string | null;
  category: string | null;
  price_cents: number;
  pricing_mode: string | null;
  capacity: number | null;
  user_id: string;
  organization_id: string | null;
  latitude: number | null;
  longitude: number | null;
  donations_enabled: boolean | null;
  is_published: boolean | null;
};

type DetailsRow = {
  event_id: string;
  tagline: string | null;
  hours: string | null;
  price_label: string | null;
  age_range: string | null;
  format: string | null;
  accessibility: string[];
  rain_or_shine: string | null;
  pet_policy: string | null;
  expected_attendance: string | null;
  footprint: string | null;
  website: string | null;
  schedule: unknown;
  performers: unknown;
  vendors: unknown;
  food: unknown;
  experiences: unknown;
  faqs: unknown;
};

type TicketType = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  shipping_cents: number | null;
  quantity: number | null;
  category: string;
};

type Organizer = {
  kind: "org" | "person";
  name: string;
  bio: string | null;
  avatar: string | null;
  href: string;
  website: string | null;
};

type NearbyOrg = {
  id: string;
  name: string;
  slug: string;
  type: string;
  subtype: string | null;
  tagline: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
};

type NearbyArtist = {
  id: string;
  display_name: string | null;
  username: string | null;
  category: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
};

type ProgramItem = {
  name: string;
  when: string;
  venue: string;
  description: string;
  price: string;
  type: string;
  image: string;
};

type Experience = ProgramItem;
type ScheduleItem = {
  name: string;
  date: string;
  time: string;
  venue: string;
  type: string;
  price: string;
  description: string;
  image: string;
};
type Faq = { q: string; a: string };
type UpdateItem = { type: string; title: string; date: string; body: string; image: string; created_at?: string };

type VendorItem = {
  category: string;
  name: string;
  booth: string;
  description: string;
  image: string;
};

const PROGRAM_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image", aspect: 4 / 3 },
  { key: "name", label: "Name", placeholder: "Right Now Rouge" },
  { key: "type", label: "Type", placeholder: "Music, dance, poetry" },
  { key: "when", label: "Date and time", placeholder: "Sat, Jun 14 · 7:00 pm" },
  { key: "venue", label: "Venue or stage", placeholder: "Main Stage" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "price", label: "Admission label", placeholder: "Free, RSVP or $25" },
];

const SCHEDULE_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image", aspect: 4 / 3 },
  { key: "name", label: "What is happening", placeholder: "Opening parade" },
  { key: "date", label: "Date", placeholder: "2026-06-14" },
  { key: "time", label: "Time", placeholder: "1:00 pm" },
  { key: "venue", label: "Venue or stage", placeholder: "Patriot Plaza" },
  { key: "type", label: "Type", placeholder: "Performance, workshop, parade" },
  { key: "price", label: "Admission label", placeholder: "Free or $10" },
  { key: "description", label: "Description", type: "textarea" },
];

const VENDOR_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image", aspect: 4 / 3 },
  { key: "category", label: "Category", placeholder: "Jewelry, apparel, art" },
  { key: "name", label: "Name", placeholder: "Charm City Ceramics" },
  { key: "booth", label: "Booth", placeholder: "Booth 14" },
  { key: "description", label: "Description", type: "textarea" },
];

const FOOD_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image", aspect: 4 / 3 },
  { key: "category", label: "Category", placeholder: "Food truck, dessert, drinks" },
  { key: "name", label: "Name", placeholder: "Sweet Pea BBQ" },
  { key: "booth", label: "Booth", placeholder: "Food row 3" },
  { key: "description", label: "Description", type: "textarea" },
];

const FAQ_FIELDS: FieldSpec[] = [
  { key: "q", label: "Question" },
  { key: "a", label: "Answer", type: "textarea" },
];

const UPDATE_TYPES = ["Announcement", "Schedule Change", "Weather Alert", "Emergency"];

const UPDATE_FIELDS: FieldSpec[] = [
  { key: "type", label: "Type", type: "select", options: UPDATE_TYPES },
  { key: "image", label: "Photo", type: "image", aspect: 16 / 9 },
  { key: "title", label: "Headline", placeholder: "Rain plan in effect" },
  { key: "date", label: "Date", placeholder: "June 14" },
  { key: "body", label: "Update", type: "textarea" },
];

function asUpdates(v: unknown): UpdateItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => x as Partial<UpdateItem>)
    .filter((x) => x && typeof x.title === "string" && x.title.trim())
    .map((x) => ({
      type: (x.type ?? "Announcement").trim(),
      title: x.title!.trim(),
      date: (x.date ?? "").trim(),
      body: (x.body ?? "").trim(),
      image: (x.image ?? "").trim(),
      created_at: (x.created_at ?? "").trim(),
    }));
}

function formatUpdateDate(iso?: string) {
  if (!iso) return "";
  try {
    return format(new Date(iso), "MMM d, h:mm a");
  } catch {
    return iso;
  }
}

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : ((x as { name?: string })?.name ?? "")))
    .map((s) => s.trim())
    .filter(Boolean);
}

function asVendors(v: unknown): VendorItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x === "string") {
        const [category = "", name = "", booth = "", description = ""] = x.split("|").map((s) => s.trim());
        if (!name) return { category: "", name: category, booth: "", description: "", image: "" };
        return { category, name, booth, description, image: "" };
      }
      const item = x as Partial<VendorItem>;
      return {
        category: (item.category ?? "").trim(),
        name: (item.name ?? "").trim(),
        booth: (item.booth ?? "").trim(),
        description: (item.description ?? "").trim(),
        image: (item.image ?? "").trim(),
      };
    })
    .filter((x) => x.name.length > 0);
}

function asExperiences(v: unknown): Experience[] {
  return asProgramItems(v);
}

function asProgramItems(v: unknown): ProgramItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => typeof x === "string" ? { name: x } : x as Partial<ProgramItem>)
    .filter((x) => x && typeof x.name === "string" && x.name.trim())
    .map((x) => ({
      name: String(x.name).trim(),
      when: (x.when ?? "").trim(),
      venue: (x.venue ?? "").trim(),
      description: (x.description ?? "").trim(),
      price: (x.price ?? "").trim(),
      type: (x.type ?? "").trim(),
      image: (x.image ?? "").trim(),
    }));
}

function ProgramCard({ item, fallbackAction, eventId }: { item: ProgramItem; fallbackAction: string; eventId: string }) {
  const action = item.price || fallbackAction;
  const isFreeAction = action.toLowerCase() === "free";
  return (
    <article className="group relative aspect-[1.05/1] min-h-64 overflow-hidden rounded-lg border border-border bg-foreground">
      {item.image ? (
        <Img src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
      ) : (
        <div className="absolute inset-0 bg-primary/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-background">
        <h3 className="font-display text-xl font-extrabold leading-tight sm:text-2xl">{item.name}</h3>
        {(item.when || item.venue) && <p className="mt-1 text-xs font-semibold">{[item.when, item.venue].filter(Boolean).join(" · ")}</p>}
        {item.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-background/85">{item.description}</p>}
        <Button
          asChild
          variant={isFreeAction ? "outline" : "brand"}
          size="xs"
          className={isFreeAction ? "mt-2 w-fit border-orange text-orange hover:bg-orange hover:text-orange-foreground" : "mt-2 w-fit"}
        >
          <Link to="/events/$eventId" params={{ eventId }}><Ticket /> {action}</Link>
        </Button>
      </div>
    </article>
  );
}

function NearbyCard({ href, image, label, title, description }: { href: string; image: string | null; label?: string | null; title: string; description?: string | null }) {
  return (
    <Link to={href} className="block w-56 shrink-0 overflow-hidden rounded-lg border border-border bg-card transition hover:border-orange sm:w-64">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {image ? <Img src={image} alt={title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl font-bold text-muted-foreground">{title.charAt(0)}</div>}
        {label && <span className="absolute left-2 top-2 rounded-full bg-foreground/70 px-2 py-1 text-[10px] font-semibold text-background">{label.replaceAll("_", " ")}</span>}
      </div>
      <div className="p-3">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        {description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>}
        <span className="mt-2 inline-block text-xs font-semibold text-orange">View →</span>
      </div>
    </Link>
  );
}

function PerformerCard({ item, event, isFree }: { item: ProgramItem; event: EventRow; isFree: boolean }) {
  const performerUrl = `${siteUrl()}/festivals/${event.id}#festival-performers`;
  const sharePerformer = async () => {
    await externalShare(performerUrl, `${item.name} at ${event.title}`, item.description || undefined);
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative">
        {item.image ? (
          <Img src={item.image} alt={item.name} className="h-72 w-full object-cover" />
        ) : (
          <div className="h-72 w-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
        <span className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-bold text-white">
          {item.type || event.category || "Performer"}
        </span>
        <h3 className="absolute bottom-3 left-4 right-4 font-display text-xl font-extrabold text-white">{item.name}</h3>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {(item.when || item.venue) && (
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" />
            {[item.when, item.venue].filter(Boolean).join(" · ")}
          </p>
        )}
        {item.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" aria-label="Save performer">
              <Bookmark />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void sharePerformer()}>
              <Share2 /> Share
            </Button>
          </div>
          <Button asChild variant="outline" size="sm" className="border-orange text-orange">
            <Link to="/events/$eventId" params={{ eventId: event.id }}>
              <Ticket /> {isFree ? "RSVP" : "Tickets"}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function VendorCard({ item }: { item: VendorItem }) {
  return (
    <article className="flex gap-4 border-b border-border py-6 first:pt-2 last:border-0">
      {item.image && (
        <Img src={item.image} alt={item.name} className="h-24 w-24 shrink-0 rounded-xl object-cover" />
      )}
      <div className="min-w-0">
        {item.category && <div className="text-[11px] font-bold uppercase text-orange">{item.category}</div>}
        <h3 className="mt-1 font-display text-2xl font-extrabold text-foreground">{item.name}</h3>
        {(item.category || item.booth) && (
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            {[item.category, item.booth].filter(Boolean).join(" · ")}
          </p>
        )}
        {item.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
      </div>
    </article>
  );
}

function asSchedule(v: unknown): ScheduleItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => x as Partial<ScheduleItem> & { label?: string; detail?: string })
    .filter((x) => x && (typeof x.name === "string" || typeof x.label === "string"))
    .map((x) => ({
      name: (x.name ?? x.detail ?? x.label ?? "").trim(),
      date: (x.date ?? "").trim(),
      time: (x.time ?? x.label ?? "").trim(),
      venue: (x.venue ?? "").trim(),
      type: (x.type ?? "").trim(),
      price: (x.price ?? "").trim(),
      description: (x.description ?? "").trim(),
      image: (x.image ?? "").trim(),
    }))
    .filter((x) => x.name.length > 0);
}

function scheduleDateLabel(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, "EEE, MMM d");
}

function ScheduleRow({
  item,
  saved,
  onToggleSave,
}: {
  item: ScheduleItem;
  saved: boolean;
  onToggleSave: () => void;
}) {
  return (
    <article className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[58px_minmax(0,1fr)_auto] sm:items-start">
      <div className="text-sm font-extrabold text-orange">{item.time}</div>
      <div className="flex min-w-0 gap-3">
        {item.image && (
          <Img src={item.image} alt={item.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground">{item.name}</h3>
          {(item.venue || item.type || item.price) && (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
              {item.venue && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {item.venue}</span>
              )}
              {item.type && (
                <span className="inline-flex items-center gap-1"><Music className="h-3.5 w-3.5" /> {item.type}</span>
              )}
              {item.price && <span className="text-orange">{item.price}</span>}
            </div>
          )}
          {item.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:w-40">
        {/* This saves the whole festival to the visitor's Saved list, so once it is
            saved the button stays in the saved state instead of un-saving it. */}
        <Button
          type="button"
          variant={saved ? "default" : "outline"}
          size="sm"
          disabled={saved}
          onClick={() => { if (!saved) onToggleSave(); }}
        >
          {saved ? <Check /> : <Bookmark />} {saved ? "Festival saved" : "Save festival"}
        </Button>
      </div>
    </article>
  );
}

function asFaqs(v: unknown): Faq[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => x as Partial<Faq>)
    .filter((x) => x && typeof x.q === "string" && x.q.trim())
    .map((x) => ({ q: x.q!.trim(), a: (x.a ?? "").trim() }));
}

function dateRange(e: EventRow) {
  const s = new Date(e.starts_at);
  const en = e.ends_at ? new Date(e.ends_at) : null;
  if (en && en.toDateString() !== s.toDateString()) {
    return `${format(s, "MMMM d, yyyy")} – ${format(en, "MMMM d, yyyy")}`;
  }
  return format(s, "MMMM d, yyyy");
}

function defaultHours(e: EventRow) {
  const s = new Date(e.starts_at);
  const en = e.ends_at ? new Date(e.ends_at) : null;
  if (en && en.toDateString() !== s.toDateString()) {
    return `${format(s, "EEE h:mm a")} – ${format(en, "EEE h:mm a")}`;
  }
  return en ? `${format(s, "h:mm a")} – ${format(en, "h:mm a")}` : format(s, "h:mm a");
}

function Tab({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-orange text-orange"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function GlanceRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-b border-border py-2.5 last:border-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-right text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

/** Lets the festival creator add a photo to the gallery. */
function GalleryUploadButton({ onAdd }: { onAdd: (path: string) => void | Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button type="button" variant="brand" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Plus /> {busy ? "Uploading…" : "Add photo"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          void uploadFestivalImage(f)
            .then((p) => onAdd(p))
            .catch((err) => toast.error(err instanceof Error ? err.message : "Upload failed"))
            .finally(() => setBusy(false));
        }}
      />
    </>
  );
}

function ListColumn({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-orange">{title}</h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((it) => (
          <li key={it} className="text-sm text-foreground">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabEmpty({ message, canEdit, onEdit }: { message: string; canEdit?: boolean; onEdit?: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/25 px-5 py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {canEdit && onEdit && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onEdit}>
          <Pencil /> Add content
        </Button>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <Input value={value} onChange={onChange} placeholder={placeholder} className="mt-1" />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <Textarea value={value} onChange={onChange} rows={4} className="mt-1" />
      {hint && <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function FestivalDetailPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const { isAdmin } = useUserRole();
  const [saved, setSaved] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [basicsOpen, setBasicsOpen] = useState(false);
  const [fullEditOpen, setFullEditOpen] = useState(false);
  const openFullEdit = () => void navigate({ to: "/festivals/$eventId/edit", params: { eventId } });
  const [shareOpen, setShareOpen] = useState(false);
  const [previewAsVisitor, setPreviewAsVisitor] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const { data, refetch } = useCachedFetch(`pb:festival:${eventId}`, async () => {
    const { data: ev } = await supabase
      .from("events")
      .select(
        "id,title,description,image_url,video_url,gallery_urls,starts_at,ends_at,venue_name,address,location,neighborhood,category,price_cents,pricing_mode,donations_enabled,is_published,capacity,user_id,organization_id,latitude,longitude",
      )
      .eq("id", eventId)
      .maybeSingle();
    if (!ev) return null;
    const event = ev as unknown as EventRow;

    const [detailsRes, ticketsRes] = await Promise.all([
      supabase.from("festival_details").select("*").eq("event_id", eventId).maybeSingle(),
      supabase
        .from("ticket_types")
        .select("id,name,description,price_cents,shipping_cents,quantity,category")
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true }),
    ]);

    let organizer: Organizer | null = null;
    if (event.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name,slug,bio,avatar_url,website")
        .eq("id", event.organization_id)
        .maybeSingle();
      if (org) {
        organizer = {
          kind: "org",
          name: org.name,
          bio: org.bio,
          avatar: org.avatar_url,
          href: `/o/${org.slug}`,
          website: org.website,
        };
      }
    }
    if (!organizer) {
      const { data: prof } = await supabase
        .from("profiles_public")
        .select("display_name,username,bio,avatar_url,website")
        .eq("id", event.user_id)
        .maybeSingle();
      if (prof) {
        organizer = {
          kind: "person",
          name: titleCase(prof.display_name || prof.username || "Organizer"),
          bio: prof.bio,
          avatar: prof.avatar_url,
          href: prof.username ? `/u/${prof.username}` : "#",
          website: prof.website,
        };
      }
    }

    let nearby: NearbyOrg[] = [];
    let nearbyArtists: NearbyArtist[] = [];
    if (event.neighborhood) {
      const [orgsRes, artistsRes] = await Promise.all([
        supabase.from("organizations").select("id,name,slug,type,subtype,tagline,bio,avatar_url,banner_url").eq("is_public", true).ilike("neighborhood", event.neighborhood).limit(12),
        supabase.from("profiles_public").select("id,display_name,username,category,bio,avatar_url,banner_url").ilike("neighborhood", event.neighborhood).not("username", "is", null).limit(8),
      ]);
      nearby = (orgsRes.data as NearbyOrg[] | null) ?? [];
      nearbyArtists = ((artistsRes.data as NearbyArtist[] | null) ?? []).filter((artist) => artist.id !== event.user_id);
    }

    return {
      event,
      details: (detailsRes.data as DetailsRow | null) ?? null,
      tickets: (ticketsRes.data as TicketType[] | null) ?? [],
      organizer,
      nearby,
      nearbyArtists,
    };
  });

  useEffect(() => {
    if (!me) return;
    void supabase
      .from("event_saves")
      .select("event_id")
      .eq("event_id", eventId)
      .eq("user_id", me)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [me, eventId]);

  const isOwner = !!me && !!data && (data.event.user_id === me || isAdmin);
  const showCreatorTools = isOwner && !previewAsVisitor;
  const event = data?.event ?? null;
  const details = data?.details ?? null;

  const headliners = useMemo(() => asProgramItems(details?.performers), [details]);
  const vendors = useMemo(() => asVendors(details?.vendors), [details]);
  const food = useMemo(() => asVendors(details?.food), [details]);
  const schedule = useMemo(() => asSchedule(details?.schedule), [details]);
  const experiences = useMemo(() => asExperiences(details?.experiences), [details]);
  const faqs = useMemo(() => asFaqs(details?.faqs), [details]);
  const updates = useMemo(() => asUpdates((details as { updates?: unknown } | null)?.updates), [details]);
  const gallery = event?.gallery_urls ?? [];
  const tickets = data?.tickets ?? [];

  /** Saves one part of the festival content and refreshes the page. */
  const saveDetails = async (patch: Record<string, unknown>) => {
    const res = await supabase
      .from("festival_details")
      .upsert({ event_id: eventId, ...patch, updated_at: new Date().toISOString() } as never, {
        onConflict: "event_id",
      });
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Saved");
    await refetch();
  };

  const saveGallery = async (next: string[]) => {
    const res = await supabase.from("events").update({ gallery_urls: next }).eq("id", eventId);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    await refetch();
  };

  const tabs = useMemo(() => {
    return [
      { id: "overview", label: "Overview" },
      { id: "schedule", label: "Schedule" },
      { id: "performers", label: "Performers" },
      { id: "vendors", label: "Vendors" },
      { id: "food", label: "Food + Drink" },
      { id: "tickets", label: "Tickets" },
      { id: "gallery", label: "Gallery" },
      { id: "updates", label: "Updates" },
      { id: "comments", label: "Comments" },
      { id: "faq", label: "FAQ" },
    ];
  }, []);

  const [activeTab, setActiveTab] = useState("overview");
  const [scheduleRange, setScheduleRange] = useState("all");
  const [scheduleDate, setScheduleDate] = useState("all");
  const [scheduleQuery, setScheduleQuery] = useState("");
  const [updateType, setUpdateType] = useState("Announcement");
  const [updateBody, setUpdateBody] = useState("");
  const [updateImage, setUpdateImage] = useState<string | null>(null);
  const [updatePosting, setUpdatePosting] = useState(false);
  const [editingUpdateIdx, setEditingUpdateIdx] = useState<number | null>(null);
  const scheduleDates = useMemo(
    () => Array.from(new Set(schedule.map((item) => item.date).filter(Boolean))),
    [schedule],
  );
  const visibleSchedule = useMemo(() => {
    const now = new Date();
    const q = scheduleQuery.trim().toLowerCase();
    return schedule.filter((item) => {
      if (q && ![item.name, item.venue, item.type, item.description].some((v) => (v ?? "").toLowerCase().includes(q))) {
        return false;
      }
      if (scheduleDate !== "all" && item.date !== scheduleDate) return false;
      if (scheduleRange === "all" || !item.date) return true;
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return true;
      if (scheduleRange === "today") return date.toDateString() === now.toDateString();
      const day = date.getDay();
      return day === 0 || day === 6;
    });
  }, [schedule, scheduleDate, scheduleRange, scheduleQuery]);

  const scrollTo = (id: string) => {
    setActiveTab(id);
    document.getElementById(`festival-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return;
    const id = raw.replace(/^festival-/, "");
    if (!tabs.some((t) => t.id === id)) return;
    const timer = window.setTimeout(() => {
      setActiveTab(id);
      document.getElementById(`festival-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [tabs]);


  if (data === undefined) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">
          Loading festival…
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">This festival could not be found.</p>
          <PageBackButton />
        </div>
      </AppLayout>
    );
  }

  const isFree = event.pricing_mode !== "paid" && (!event.price_cents || event.price_cents <= 0);
  const priceLabel = details?.price_label || (isFree ? "Free" : `From $${(event.price_cents / 100).toFixed(0)}`);
  const tagChips = [event.category, ...(details?.accessibility ?? [])]
    .filter(Boolean)
    .map((s) => s!.trim())
    .filter(Boolean);
  const pageUrl = `${siteUrl()}/festivals/${event.id}`;
  const directionsUrl = event.latitude && event.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        [event.venue_name, event.address, event.neighborhood, "Baltimore, MD"].filter(Boolean).join(", "),
      )}`;

  const toggleSave = async () => {
    if (!me) {
      toast.error("Sign in to save this festival");
      return;
    }
    const next = !saved;
    setSaved(next);
    const res = next
      ? await supabase.from("event_saves").insert({ event_id: event.id, user_id: me })
      : await supabase.from("event_saves").delete().eq("event_id", event.id).eq("user_id", me);
    if (res.error) {
      setSaved(!next);
      toast.error(res.error.message);
    } else {
      toast.success(next ? "Saved" : "Removed from saved");
    }
  };

  const share = async () => {
    await externalShare(pageUrl, event.title, details?.tagline || event.description || undefined);
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <PageBackButton />

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {showCreatorTools && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-foreground px-4 py-3 text-background sm:px-6">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs font-bold uppercase">Creator tools</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => openFullEdit()}>
                  <Pencil /> Edit Festival
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/organizer-studio" search={{ event: event.id }}>
                    <Settings /> Event setup
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/ticket-sales-dashboard">
                    <BarChart3 /> Ticket sales
                  </Link>
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setPreviewAsVisitor(true)}>
                  <Eye /> Preview as visitor
                </Button>
                {event.is_published === false && (
                  <Button
                    size="sm"
                    variant="brand"
                    disabled={publishing}
                    onClick={async () => {
                      setPublishing(true);
                      const { error } = await supabase
                        .from("events")
                        .update({ is_published: true })
                        .eq("id", event.id);
                      setPublishing(false);
                      if (error) {
                        toast.error(error.message);
                        return;
                      }
                      toast.success("Festival published.");
                      void refetch();
                    }}
                  >
                    {publishing ? "Publishing..." : "Publish festival"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {isOwner && previewAsVisitor && (
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-2.5 sm:px-6">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Eye className="h-4 w-4" /> You are previewing the visitor view
              </span>
              <Button size="sm" variant="outline" onClick={() => setPreviewAsVisitor(false)}>
                <EyeOff /> Exit preview
              </Button>
            </div>
          )}

          <div className="relative min-h-[390px] bg-muted sm:min-h-[460px]">
            {event.image_url ? (
              <Img src={event.image_url} alt={event.title} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-primary/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3 text-background">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                    {isFree ? "Free" : "Ticketed"}
                  </span>
                  {tagChips.slice(0, 3).map((chip) => (
                    <span key={chip} className="rounded border border-background/30 bg-foreground/35 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
                      {chip}
                    </span>
                  ))}
                </div>
                <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">{event.title}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-background/85">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{dateRange(event)}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{details?.hours || defaultHours(event)}</span>
                  {(event.neighborhood || event.venue_name) && (
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.neighborhood || event.venue_name}</span>
                  )}
                </div>
                {details?.tagline && <p className="max-w-2xl text-sm leading-relaxed text-background/80 sm:text-base">{details.tagline}</p>}
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto lg:flex-nowrap">
                <Button size="lg" variant="brand" className="w-full sm:w-auto" onClick={() => scrollTo("overview")}>
                  <Compass /> Explore Festival
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => scrollTo("schedule")}>
                  <CalendarDays /> View Schedule
                </Button>
                {showCreatorTools && (
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => openFullEdit()}>
                    <Pencil /> Edit
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-6">
            <Button variant={saved ? "default" : "outline"} size="sm" onClick={() => void toggleSave()}>
              <Bookmark className={saved ? "fill-current" : ""} /> {saved ? "Saved" : "Save"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Send /> Send
            </Button>
            <Button variant="outline" size="sm" onClick={() => void share()}>
              <Share2 /> Share
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer"><Navigation /> Directions</a>
            </Button>
          </div>
        </section>

        {/* Tabs */}
        <div className="sticky top-0 z-10 -mx-4 overflow-x-auto border-b border-border bg-background/95 px-4 backdrop-blur">
          <div className="flex">
            {tabs.map((t) => (
              <Tab key={t.id} id={t.id} label={t.label} active={activeTab === t.id} onClick={scrollTo} />
            ))}
          </div>
        </div>

        <div className={`grid gap-4 ${activeTab === "overview" ? "lg:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
          {/* Main column */}
          <div className={`min-w-0 ${activeTab === "overview" ? "space-y-5" : "rounded-lg border border-border bg-card p-5 sm:p-8"}`}>
            <section id="festival-overview" className={`scroll-mt-24 space-y-6 ${activeTab !== "overview" ? "hidden" : ""}`}>
              {(headliners.length > 0 || showCreatorTools) && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-foreground"><Star className="h-5 w-5" /> Festival Headliners</h2>
                  <div className="mt-3">
                    <EditableList
                      items={headliners}
                      canEdit={showCreatorTools}
                      addLabel="Add headliner"
                      dialogTitle="Headliner"
                      fields={PROGRAM_FIELDS}
                      onChange={(next) => saveDetails({ performers: next })}
                      reorderable
                      listClassName="grid gap-3 sm:grid-cols-2"
                      emptyState={<TabEmpty message="No headliners added yet." />}
                      renderItem={(item) => (
                        <ProgramCard item={item} fallbackAction={isFree ? "RSVP" : "Tickets"} eventId={event.id} />
                      )}
                    />
                  </div>
                </div>
              )}

              {(experiences.length > 0 || showCreatorTools) && (
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-foreground"><Sparkles className="h-5 w-5" /> Featured Experiences</h2>
                  <div className="mt-3">
                    <EditableList
                      items={experiences}
                      canEdit={showCreatorTools}
                      addLabel="Add experience"
                      dialogTitle="Featured experience"
                      fields={PROGRAM_FIELDS}
                      onChange={(next) => saveDetails({ experiences: next })}
                      reorderable
                      listClassName="grid gap-3 sm:grid-cols-2"
                      emptyState={<TabEmpty message="No featured experiences added yet." />}
                      renderItem={(item) => (
                        <ProgramCard item={item} fallbackAction={isFree ? "Free" : "Tickets"} eventId={event.id} />
                      )}
                    />
                  </div>
                </div>
              )}

              {(vendors.length > 0 || food.length > 0) && (
                <div className="grid gap-6 border-t border-border pt-8 sm:grid-cols-2">
                  <ListColumn title="Vendors" items={vendors.map((v) => v.name)} />
                  <ListColumn title="Food + Drink" items={food.map((v) => v.name)} />
                </div>
              )}
            </section>

            <section id="festival-schedule" className={`scroll-mt-24 ${activeTab !== "schedule" ? "hidden" : ""}`}>
              <div className="space-y-8">
                {schedule.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[["all", "All Time"], ["today", "Today"], ["weekend", "This Weekend"]].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setScheduleRange(value)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${scheduleRange === value ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {scheduleDates.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {scheduleDates.map((date) => (
                          <button
                            key={date}
                            type="button"
                            onClick={() => setScheduleDate(scheduleDate === date ? "all" : date)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${scheduleDate === date ? "bg-orange text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                          >
                            {scheduleDateLabel(date)}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={scheduleQuery}
                        onChange={(e) => setScheduleQuery(e.target.value)}
                        placeholder="Search schedule..."
                        className="rounded-xl bg-muted/50 pl-9"
                      />
                    </div>
                  </div>
                )}

                {headliners.length > 0 && (
                  <div>
                    <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <Star className="h-4 w-4" /> Featured at the festival
                    </h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {headliners.map((item, index) => (
                        <article key={`${item.name}-${index}`} className="overflow-hidden rounded-xl border border-orange/40 bg-card">
                          <div className="relative">
                            {item.image ? (
                              <Img src={item.image} alt={item.name} className="h-40 w-full object-cover" />
                            ) : (
                              <div className="h-40 w-full bg-muted" />
                            )}
                            <span className="absolute left-3 top-3 rounded-md bg-orange px-2 py-1 text-[11px] font-bold text-white">Headliner</span>
                          </div>
                          <div className="p-4">
                            <h3 className="text-base font-extrabold text-foreground">{item.name}</h3>
                            {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                <EditableList
                  items={schedule}
                  canEdit={showCreatorTools}
                  addLabel="Add happening"
                  dialogTitle="Event or happening"
                  fields={SCHEDULE_FIELDS}
                  onChange={(next) => saveDetails({ schedule: next })}
                  listClassName="space-y-3"
                  emptyState={<TabEmpty message="The festival schedule has not been posted yet." />}
                  renderItem={(item, index) => {
                    if (!visibleSchedule.includes(item)) return null;
                    return (
                      <ScheduleRow
                        item={item}
                        saved={saved}
                        onToggleSave={toggleSave}
                      />
                    );
                  }}
                />
                {schedule.length > 0 && visibleSchedule.length === 0 && (
                  <TabEmpty message="No scheduled activities match these filters." />
                )}
              </div>
            </section>

            <section id="festival-performers" className={`scroll-mt-24 ${activeTab !== "performers" ? "hidden" : ""}`}>
              <EditableList
                items={headliners}
                canEdit={showCreatorTools}
                addLabel="Add performer"
                dialogTitle="Performer"
                fields={PROGRAM_FIELDS}
                onChange={(next) => saveDetails({ performers: next })}
                reorderable
                listClassName="grid gap-4 sm:grid-cols-2"
                emptyState={<div className="mt-4"><TabEmpty message="Performers have not been announced yet." /></div>}
                renderItem={(item) => <PerformerCard item={item} event={event} isFree={isFree} />}
              />
            </section>

            <section id="festival-vendors" className={`scroll-mt-24 ${activeTab !== "vendors" ? "hidden" : ""}`}>
              <EditableList
                items={vendors}
                canEdit={showCreatorTools}
                addLabel="Add vendor"
                dialogTitle="Vendor"
                fields={VENDOR_FIELDS}
                onChange={(next) => saveDetails({ vendors: next })}
                emptyState={<div className="mt-4"><TabEmpty message="Vendors have not been announced yet." /></div>}
                renderItem={(item) => <VendorCard item={item} />}
              />
            </section>

            <section id="festival-food" className={`scroll-mt-24 ${activeTab !== "food" ? "hidden" : ""}`}>
              <h2 className="font-display text-lg font-extrabold text-foreground">Food + Drink</h2>
              <div className="mt-4">
                <EditableList
                  items={food}
                  canEdit={showCreatorTools}
                  addLabel="Add food or drink"
                  dialogTitle="Food and drink vendor"
                  fields={FOOD_FIELDS}
                  onChange={(next) => saveDetails({ food: next })}
                  emptyState={<TabEmpty message="Food and drink vendors have not been announced yet." />}
                  renderItem={(item) => <VendorCard item={item} />}
                />
              </div>
            </section>

            <section id="festival-tickets" className={`scroll-mt-24 ${activeTab !== "tickets" ? "hidden" : ""}`}>
              <h2 className="font-display text-lg font-extrabold text-foreground">Tickets</h2>
              {tickets.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground">{t.name}</div>
                        {t.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        <span className="text-sm font-bold text-orange">
                          {t.price_cents > 0 ? `$${(t.price_cents / 100).toFixed(2)}` : "Free"}
                          {t.shipping_cents ? (
                            <span className="block text-right text-[11px] font-normal text-muted-foreground">
                              + ${(t.shipping_cents / 100).toFixed(2)} shipping
                            </span>
                          ) : null}
                        </span>
                        <Button asChild variant="brand" size="sm">
                          <Link to="/events/$eventId" params={{ eventId: event.id }}>
                            Get
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-border bg-muted/25 p-5">
                  <p className="text-sm text-muted-foreground">{isFree ? "This festival uses free RSVP admission." : "Ticket options have not been posted yet."}</p>
                  <Button asChild variant="brand" size="sm" className="mt-4"><Link to="/events/$eventId" params={{ eventId: event.id }}>{isFree ? "RSVP" : "View admission"}</Link></Button>
                </div>
              )}
            </section>

            <section id="festival-gallery" className={`scroll-mt-24 ${activeTab !== "gallery" ? "hidden" : ""}`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-extrabold text-foreground">Gallery</h2>
                {showCreatorTools && (
                  <GalleryUploadButton onAdd={(path) => saveGallery([...gallery, path])} />
                )}
              </div>
              {(gallery.length > 0 || event.video_url) ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {event.video_url && (
                    <video
                      src={event.video_url}
                      controls
                      className="col-span-2 aspect-video w-full rounded-xl bg-black object-cover sm:col-span-3"
                    />
                  )}
                  {gallery.map((u) => (
                    <div key={u} className="relative">
                      <Img
                        src={u}
                        alt={`${event.title} photo`}
                        loading="lazy"
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                      {showCreatorTools && (
                        <button
                          type="button"
                          aria-label="Remove photo"
                          onClick={() => void saveGallery(gallery.filter((g) => g !== u))}
                          className="absolute right-2 top-2 rounded-full bg-foreground/70 p-1.5 text-background"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : <div className="mt-4"><TabEmpty message="Festival photos and videos have not been added yet." /></div>}
            </section>

            <section id="festival-updates" className={`scroll-mt-24 ${activeTab !== "updates" ? "hidden" : ""}`}>
              <div className="space-y-4">
                {showCreatorTools && (
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-foreground">
                      <Megaphone className="h-4 w-4 text-orange" />
                      <h3 className="font-display text-base font-extrabold">{editingUpdateIdx !== null ? "Edit Update" : "Post an Update"}</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Followers of this festival receive a notification when you post.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {UPDATE_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setUpdateType(t)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                            updateType === t
                              ? "border-orange bg-orange text-white"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      className="mt-3 min-h-[96px]"
                      placeholder="Share a schedule change, weather alert, or announcement..."
                      value={updateBody}
                      onChange={(e) => setUpdateBody(e.target.value)}
                    />
                    {updateImage && (
                      <div className="relative mt-3 inline-block">
                        <Img src={updateImage} alt="" className="h-24 w-24 rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => setUpdateImage(null)}
                          className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <ImagePickerField
                        label=""
                        value={updateImage ?? ""}
                        onChange={(v) => setUpdateImage(v || null)}
                        trigger={
                          <Button type="button" variant="outline" size="sm" className="gap-1.5">
                            <ImagePlus className="h-4 w-4" /> Add Photos
                          </Button>
                        }
                      />
                      <div className="flex items-center gap-2">
                        {editingUpdateIdx !== null && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingUpdateIdx(null);
                              setUpdateBody("");
                              setUpdateImage(null);
                              setUpdateType("Announcement");
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="brand"
                          size="sm"
                          disabled={updatePosting || !updateBody.trim()}
                          onClick={() => {
                            setUpdatePosting(true);
                            let next: UpdateItem[];
                            if (editingUpdateIdx !== null) {
                              next = updates.map((u, i) =>
                                i === editingUpdateIdx
                                  ? { ...u, type: updateType, title: updateType, body: updateBody.trim(), image: updateImage ?? "" }
                                  : u,
                              );
                            } else {
                              next = [
                                {
                                  type: updateType,
                                  title: updateType,
                                  body: updateBody.trim(),
                                  date: "",
                                  image: updateImage ?? "",
                                  created_at: new Date().toISOString(),
                                },
                                ...updates,
                              ];
                            }
                            void saveDetails({ updates: next }).then(() => {
                              setUpdateBody("");
                              setUpdateImage(null);
                              setUpdateType("Announcement");
                              setEditingUpdateIdx(null);
                              setUpdatePosting(false);
                            });
                          }}
                        >
                          <Megaphone className="mr-1.5 h-4 w-4" />
                          {updatePosting ? "Saving…" : editingUpdateIdx !== null ? "Save Changes" : "Post & Notify"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {updates.length === 0 ? (
                  <TabEmpty message="There are no festival updates yet." canEdit={showCreatorTools} />
                ) : (
                  updates.map((item, idx) => (
                    <article
                      key={idx}
                      className="relative rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            item.type === "Emergency"
                              ? "bg-red-100 text-red-700"
                              : item.type === "Weather Alert"
                                ? "bg-blue-100 text-blue-700"
                                : item.type === "Schedule Change"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-orange/10 text-orange"
                          }`}
                        >
                          {item.type || "Announcement"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.created_at ? formatUpdateDate(item.created_at) : item.date}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-foreground">{item.title}</p>
                      {item.body && <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>}
                      {item.image && (
                        <Img src={item.image} alt="" className="mt-3 max-h-64 w-full rounded-lg object-cover" />
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() =>
                            externalShare(
                              siteUrl(`/festivals/${eventId}`),
                              `${event.title} update`,
                              item.body || item.title,
                            )
                          }
                        >
                          <Share2 className="h-3.5 w-3.5" /> Share
                        </Button>
                        {showCreatorTools && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUpdateIdx(idx);
                                setUpdateType(item.type || "Announcement");
                                setUpdateBody(item.body || "");
                                setUpdateImage(item.image || null);
                                document.getElementById("festival-updates")?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                const next = updates.filter((_, i) => i !== idx);
                                void saveDetails({ updates: next });
                              }}
                            >
                              Remove
                            </Button>
                          </>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section id="festival-comments" className={`scroll-mt-24 ${activeTab !== "comments" ? "hidden" : ""}`}>
              <h2 className="font-display text-lg font-extrabold text-foreground">Comments</h2>
              <EventSocial eventId={event.id} hostId={event.user_id} />
            </section>

            <section id="festival-faq" className={`scroll-mt-24 ${activeTab !== "faq" ? "hidden" : ""}`}>
              <h2 className="font-display text-lg font-extrabold text-foreground">FAQ</h2>
              <div className="mt-4">
                <EditableList
                  items={faqs}
                  canEdit={showCreatorTools}
                  addLabel="Add question"
                  dialogTitle="Frequently asked question"
                  fields={FAQ_FIELDS}
                  onChange={(next) => saveDetails({ faqs: next })}
                  emptyState={<TabEmpty message="Frequently asked questions have not been added yet." />}
                  renderItem={(f) => (
                    <div className="mb-3 rounded-xl border border-border bg-card p-4">
                      <div className="text-sm font-bold text-foreground">{f.q}</div>
                      {f.a && <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>}
                    </div>
                  )}
                />
              </div>
            </section>

          </div>

          {/* Sidebar */}
          <aside className={`space-y-4 lg:sticky lg:top-16 lg:self-start ${activeTab !== "overview" ? "hidden" : ""}`}>
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="font-display text-lg font-extrabold text-foreground">At a Glance</h2>
              <div className="mt-2">
                <GlanceRow label="Dates" value={dateRange(event)} />
                <GlanceRow label="Hours" value={details?.hours || defaultHours(event)} />
                <GlanceRow label="Price" value={priceLabel} />
                <GlanceRow label="Neighborhood" value={event.neighborhood || ""} />
                <GlanceRow label="Venue" value={event.venue_name || ""} />
                <GlanceRow label="Age" value={details?.age_range || ""} />
                <GlanceRow label="Format" value={details?.format || ""} />
                {(details?.accessibility?.length ?? 0) > 0 && (
                  <GlanceRow label="Accessibility" value={details!.accessibility.join(", ")} />
                )}
                <GlanceRow label="Rain or Shine" value={details?.rain_or_shine || ""} />
                <GlanceRow label="Pet Policy" value={details?.pet_policy || ""} />
                <GlanceRow label="Capacity" value={event.capacity ? `${event.capacity}` : ""} />
                {details?.website && (
                  <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 border-t border-border py-2.5">
                    <div className="text-sm text-muted-foreground">Website</div>
                    <a
                      href={details.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-end gap-1 break-all text-right text-sm font-medium text-orange"
                    >
                      {details.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-foreground"><Sparkles className="h-5 w-5" /> About the Festival</h2>
                {showCreatorTools && <Button type="button" variant="ghost" size="icon-sm" onClick={() => openFullEdit()} aria-label="Edit festival details"><Pencil /></Button>}
              </div>
              {event.description ? <div className="prose prose-sm mt-3 max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: event.description }} /> : <div className="mt-3"><TabEmpty message="No description has been added yet." canEdit={showCreatorTools} onEdit={() => openFullEdit()} /></div>}
              {(details?.expected_attendance || details?.footprint || data!.organizer || details?.website) && (
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                  {details?.expected_attendance && <div><dt className="text-xs text-muted-foreground">Expected Attendance</dt><dd className="text-sm font-semibold text-foreground">{details.expected_attendance}</dd></div>}
                  {details?.footprint && <div><dt className="text-xs text-muted-foreground">Festival Footprint</dt><dd className="text-sm font-semibold text-foreground">{details.footprint}</dd></div>}
                  {data!.organizer && <div><dt className="text-xs text-muted-foreground">Organizer</dt><dd className="text-sm font-semibold text-foreground">{data!.organizer.name}</dd></div>}
                  {details?.website && <div><dt className="text-xs text-muted-foreground">Website</dt><dd><a href={details.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-orange"><ExternalLink className="h-3 w-3" /> Visit</a></dd></div>}
                </dl>
              )}
              </div>

            {data!.organizer && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-foreground"><Users className="h-5 w-5" /> Organizer</h3>
                <div className="mt-3 flex items-start gap-3">
                  {data!.organizer.avatar ? (
                    <Img
                      src={data!.organizer.avatar}
                      alt={data!.organizer.name}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange/10 text-sm font-bold text-orange">
                      {data!.organizer.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground">{data!.organizer.name}</div>
                    {data!.organizer.bio && (
                      <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">
                        {data!.organizer.bio}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                      {data!.organizer.href !== "#" && (
                        <Link to={data!.organizer.href} className="text-orange hover:underline">
                          View {data!.organizer.kind === "org" ? "Organization" : "Profile"} →
                        </Link>
                      )}
                      {(details?.website || data!.organizer.website) && (
                        <a
                          href={details?.website || data!.organizer.website!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-orange hover:underline"
                        >
                          Website <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {activeTab === "overview" && (data!.nearby.length > 0 || data!.nearbyArtists.length > 0) && (
          <section className="mt-8 scroll-mt-24">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-foreground"><MapPin className="h-5 w-5" /> Nearby on Planet Baltimore</h2>
            <div className="mt-6 space-y-7">
              {data!.nearby.length > 0 && <div><h3 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground"><Sparkles className="h-4 w-4" /> Nearby Arts Organizations <span className="text-xs font-normal text-muted-foreground">({data!.nearby.length})</span></h3><div className="flex gap-3 overflow-x-auto pb-2">{data!.nearby.map((o) => <NearbyCard key={o.id} href={`/o/${o.slug}`} image={o.banner_url || o.avatar_url} label={o.subtype || o.type} title={o.name} description={o.tagline || o.bio} />)}</div></div>}
              {data!.nearbyArtists.length > 0 && <div><h3 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground"><Users className="h-4 w-4" /> Nearby Artists <span className="text-xs font-normal text-muted-foreground">({data!.nearbyArtists.length})</span></h3><div className="flex gap-3 overflow-x-auto pb-2">{data!.nearbyArtists.map((artist) => <NearbyCard key={artist.id} href={`/u/${artist.username ?? ""}`} image={artist.banner_url || artist.avatar_url} label={artist.category} title={titleCase(artist.display_name || artist.username || "Artist")} description={artist.bio} />)}</div></div>}
            </div>
          </section>
        )}
      </div>

      {isOwner && details !== undefined && (
        <EditFestivalDetails
          open={editOpen}
          onOpenChange={setEditOpen}
          eventId={event.id}
          details={details}
          onSaved={() => void refetch()}
        />
      )}
      {isOwner && (
        <EditFestivalBasics
          open={basicsOpen}
          onOpenChange={setBasicsOpen}
          event={event}
          onSaved={() => void refetch()}
        />
      )}
      {isOwner && (
        <EditFestivalDialog
          open={fullEditOpen}
          onOpenChange={setFullEditOpen}
          eventId={event.id}
          onSaved={() => void refetch()}
        />
      )}
      <ShareToUsersDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={pageUrl}
        title={event.title}
        preview={{
          type: "event",
          id: event.id,
          url: pageUrl,
          title: event.title,
          image: event.image_url,
          excerpt: details?.tagline || event.description?.replace(/<[^>]+>/g, "").slice(0, 160) || null,
        }}
      />
    </AppLayout>
  );
}

function EditFestivalDetails({
  open,
  onOpenChange,
  eventId,
  details,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  details: DetailsRow | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => ({
    tagline: details?.tagline ?? "",
    hours: details?.hours ?? "",
    price_label: details?.price_label ?? "",
    age_range: details?.age_range ?? "",
    format: details?.format ?? "",
    accessibility: (details?.accessibility ?? []).join(", "),
    rain_or_shine: details?.rain_or_shine ?? "",
    pet_policy: details?.pet_policy ?? "",
    expected_attendance: details?.expected_attendance ?? "",
    footprint: details?.footprint ?? "",
    website: details?.website ?? "",
  }));
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    const payload = {
      event_id: eventId,
      tagline: form.tagline.trim() || null,
      hours: form.hours.trim() || null,
      price_label: form.price_label.trim() || null,
      age_range: form.age_range.trim() || null,
      format: form.format.trim() || null,
      accessibility: form.accessibility.split(",").map((s) => s.trim()).filter(Boolean),
      rain_or_shine: form.rain_or_shine.trim() || null,
      pet_policy: form.pet_policy.trim() || null,
      expected_attendance: form.expected_attendance.trim() || null,
      footprint: form.footprint.trim() || null,
      website: form.website.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const res = await supabase
      .from("festival_details")
      .upsert(payload as never, { onConflict: "event_id" });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Festival details saved");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>At a Glance</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">Tagline</span>
            <Textarea value={form.tagline} onChange={set("tagline")} rows={2} className="mt-1" />
          </label>
          <Field label="Hours" value={form.hours} onChange={set("hours")} placeholder="Fri 11am-9pm, Sat 11am-9pm" />
          <Field label="Price label" value={form.price_label} onChange={set("price_label")} placeholder="Free or $55 to $120" />
          <Field label="Age" value={form.age_range} onChange={set("age_range")} placeholder="All ages" />
          <Field label="Format" value={form.format} onChange={set("format")} placeholder="Street Festival" />
          <Field label="Accessibility (comma separated)" value={form.accessibility} onChange={set("accessibility")} placeholder="wheelchair, asl, restrooms" />
          <Field label="Rain or Shine" value={form.rain_or_shine} onChange={set("rain_or_shine")} placeholder="Yes" />
          <Field label="Pet Policy" value={form.pet_policy} onChange={set("pet_policy")} />
          <Field label="Expected Attendance" value={form.expected_attendance} onChange={set("expected_attendance")} placeholder="5,000+" />
          <Field label="Website" value={form.website} onChange={set("website")} placeholder="https://" />
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">Festival Footprint</span>
            <Textarea value={form.footprint} onChange={set("footprint")} rows={2} className="mt-1" />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving} variant="brand">
            {saving ? "Saving..." : "Save Details"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Lets the page creator change the headline parts of the festival itself. */
function EditFestivalBasics({
  open,
  onOpenChange,
  event,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: EventRow;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: event.title,
    description: event.description ?? "",
    image_url: event.image_url ?? "",
    starts_at: toLocalInput(event.starts_at),
    ends_at: toLocalInput(event.ends_at),
    venue_name: event.venue_name ?? "",
    address: event.address ?? "",
    neighborhood: event.neighborhood ?? "",
    category: event.category ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: event.title,
      description: event.description ?? "",
      image_url: event.image_url ?? "",
      starts_at: toLocalInput(event.starts_at),
      ends_at: toLocalInput(event.ends_at),
      venue_name: event.venue_name ?? "",
      address: event.address ?? "",
      neighborhood: event.neighborhood ?? "",
      category: event.category ?? "",
    });
  }, [open, event]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Give your festival a title");
      return;
    }
    if (!form.starts_at) {
      toast.error("Pick a start date and time");
      return;
    }
    setSaving(true);
    const res = await supabase
      .from("events")
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        venue_name: form.venue_name.trim() || null,
        address: form.address.trim() || null,
        location: form.venue_name.trim() || form.address.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        category: form.category.trim() || null,
      })
      .eq("id", event.id);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Festival page updated");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Festival page</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImagePickerField
              label="Cover photo"
              value={form.image_url}
              onChange={(v) => setForm((f) => ({ ...f, image_url: v }))}
              aspect={16 / 9}
            />
          </div>
          <div className="sm:col-span-2">
            <Field label="Title" value={form.title} onChange={set("title")} />
          </div>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">About the festival</span>
            <Textarea value={form.description} onChange={set("description")} rows={6} className="mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Starts</span>
            <Input type="datetime-local" className="mt-1" value={form.starts_at} onChange={set("starts_at")} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Ends</span>
            <Input type="datetime-local" className="mt-1" value={form.ends_at} onChange={set("ends_at")} />
          </label>
          <Field label="Venue" value={form.venue_name} onChange={set("venue_name")} />
          <Field label="Address" value={form.address} onChange={set("address")} />
          <Field label="Neighborhood" value={form.neighborhood} onChange={set("neighborhood")} />
          <Field label="Category" value={form.category} onChange={set("category")} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving} variant="brand">
            {saving ? "Saving..." : "Save page"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
