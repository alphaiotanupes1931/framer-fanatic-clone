import { createFileRoute, Link } from "@tanstack/react-router";
import { Img } from "@/components/shared/smart-img";
import { useEffect, useMemo, useState } from "react";
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
  Check,
  Clock,
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
  Ticket,
  Users,
} from "lucide-react";
import { PageBackButton } from "@/components/shared/page-back-button";
import { EditableList, ImagePickerField, type FieldSpec } from "@/components/festival/festival-editing";

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
};

type NearbyArtist = {
  id: string;
  display_name: string | null;
  username: string | null;
  category: string | null;
  bio: string | null;
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
type UpdateItem = { title: string; date: string; body: string; image: string };

type VendorItem = {
  category: string;
  name: string;
  booth: string;
  description: string;
  image: string;
};

const PROGRAM_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image" },
  { key: "name", label: "Name", placeholder: "Right Now Rouge" },
  { key: "type", label: "Type", placeholder: "Music, dance, poetry" },
  { key: "when", label: "Date and time", placeholder: "Sat, Jun 14 · 7:00 pm" },
  { key: "venue", label: "Venue or stage", placeholder: "Main Stage" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "price", label: "Admission label", placeholder: "Free, RSVP or $25" },
];

const SCHEDULE_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image" },
  { key: "name", label: "What is happening", placeholder: "Opening parade" },
  { key: "date", label: "Date", placeholder: "2026-06-14" },
  { key: "time", label: "Time", placeholder: "1:00 pm" },
  { key: "venue", label: "Venue or stage", placeholder: "Patriot Plaza" },
  { key: "type", label: "Type", placeholder: "Performance, workshop, parade" },
  { key: "price", label: "Admission label", placeholder: "Free or $10" },
  { key: "description", label: "Description", type: "textarea" },
];

const VENDOR_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image" },
  { key: "category", label: "Category", placeholder: "Jewelry, apparel, art" },
  { key: "name", label: "Name", placeholder: "Charm City Ceramics" },
  { key: "booth", label: "Booth", placeholder: "Booth 14" },
  { key: "description", label: "Description", type: "textarea" },
];

const FOOD_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image" },
  { key: "category", label: "Category", placeholder: "Food truck, dessert, drinks" },
  { key: "name", label: "Name", placeholder: "Sweet Pea BBQ" },
  { key: "booth", label: "Booth", placeholder: "Food row 3" },
  { key: "description", label: "Description", type: "textarea" },
];

const FAQ_FIELDS: FieldSpec[] = [
  { key: "q", label: "Question" },
  { key: "a", label: "Answer", type: "textarea" },
];

const UPDATE_FIELDS: FieldSpec[] = [
  { key: "image", label: "Photo", type: "image" },
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
      title: x.title!.trim(),
      date: (x.date ?? "").trim(),
      body: (x.body ?? "").trim(),
      image: (x.image ?? "").trim(),
    }));
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

function ProgramRow({ item, fallbackAction, eventId }: { item: ProgramItem; fallbackAction: string; eventId: string }) {
  const action = item.price || fallbackAction;
  return (
    <article className="grid gap-4 border-b border-border py-5 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <h3 className="text-base font-bold text-foreground">{item.name}</h3>
        {(item.when || item.venue) && (
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {[item.when, item.venue].filter(Boolean).join(" · ")}
          </p>
        )}
        {item.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
      </div>
      <Button asChild variant={action.toLowerCase() === "free" ? "outline" : "brand"} size="sm" className="w-fit">
        <Link to="/events/$eventId" params={{ eventId }}>{action}</Link>
      </Button>
    </article>
  );
}

function PerformerCard({ item, event, isFree }: { item: ProgramItem; event: EventRow; isFree: boolean }) {
  const performerUrl = `${siteUrl()}/festivals/${event.id}#festival-performers`;
  const sharePerformer = async () => {
    await externalShare(performerUrl, `${item.name} at ${event.title}`, item.description || undefined);
  };

  return (
    <article className="border-b border-border py-6 first:pt-2 last:border-0">
      <div className="text-[11px] font-bold uppercase text-orange">{item.type || event.category || "Performer"}</div>
      <h3 className="mt-1 font-display text-2xl font-extrabold text-foreground">{item.name}</h3>
      {(item.when || item.venue) && (
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          {[item.when, item.venue].filter(Boolean).join(" · ")}
        </p>
      )}
      {item.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void sharePerformer()}>
          <Share2 /> Share
        </Button>
        <Button asChild variant="brand" size="sm">
          <Link to="/events/$eventId" params={{ eventId: event.id }}>
            <Ticket /> {isFree ? "RSVP" : "Tickets"}
          </Link>
        </Button>
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

function ScheduleRow({ item, scheduled, onToggle }: { item: ScheduleItem; scheduled: boolean; onToggle: () => void }) {
  return (
    <article className="grid gap-4 border-b border-border py-5 last:border-0 sm:grid-cols-[70px_minmax(0,1fr)_auto] sm:items-start">
      <div className="text-lg font-extrabold text-foreground">{item.time}</div>
      <div className="min-w-0">
        <h3 className="text-base font-bold text-foreground">{item.name}</h3>
        {(item.venue || item.type || item.price) && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
            {item.venue && <span className="text-muted-foreground">{item.venue}</span>}
            {item.type && <span className="rounded bg-muted px-2 py-1 text-foreground">{item.type}</span>}
            {item.price && <span className="rounded bg-primary/10 px-2 py-1 text-orange">{item.price}</span>}
          </div>
        )}
        {item.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
      </div>
      <Button type="button" variant={scheduled ? "default" : "outline"} size="sm" onClick={onToggle}>
        {scheduled ? <Check /> : <Plus />} {scheduled ? "In My Schedule" : "My Schedule"}
      </Button>
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
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
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
  const [me, setMe] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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
        .select("id,name,description,price_cents,quantity,category")
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
        supabase.from("organizations").select("id,name,slug,type,subtype,tagline,bio").eq("is_public", true).ilike("neighborhood", event.neighborhood).limit(12),
        supabase.from("profiles_public").select("id,display_name,username,category,bio").ilike("neighborhood", event.neighborhood).not("username", "is", null).limit(8),
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

  const isOwner = !!me && !!data && data.event.user_id === me;
  const showCreatorTools = isOwner && !previewAsVisitor;
  const event = data?.event ?? null;
  const details = data?.details ?? null;

  const headliners = useMemo(() => asProgramItems(details?.performers), [details]);
  const vendors = useMemo(() => asVendors(details?.vendors), [details]);
  const food = useMemo(() => asStringList(details?.food), [details]);
  const schedule = useMemo(() => asSchedule(details?.schedule), [details]);
  const experiences = useMemo(() => asExperiences(details?.experiences), [details]);
  const faqs = useMemo(() => asFaqs(details?.faqs), [details]);
  const gallery = event?.gallery_urls ?? [];
  const tickets = data?.tickets ?? [];

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
  const [mySchedule, setMySchedule] = useState<number[]>([]);
  const scheduleDates = useMemo(
    () => Array.from(new Set(schedule.map((item) => item.date).filter(Boolean))),
    [schedule],
  );
  const visibleSchedule = useMemo(() => {
    const now = new Date();
    return schedule.filter((item) => {
      if (scheduleDate !== "all" && item.date !== scheduleDate) return false;
      if (scheduleRange === "all" || !item.date) return true;
      const date = new Date(item.date);
      if (Number.isNaN(date.getTime())) return true;
      if (scheduleRange === "today") return date.toDateString() === now.toDateString();
      const day = date.getDay();
      return day === 0 || day === 6;
    });
  }, [schedule, scheduleDate, scheduleRange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(`festival-schedule:${eventId}`);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) setMySchedule(parsed.filter((value): value is number => typeof value === "number"));
    } catch {
      setMySchedule([]);
    }
  }, [eventId]);

  const toggleMySchedule = (index: number) => {
    setMySchedule((current) => {
      const next = current.includes(index) ? current.filter((value) => value !== index) : [...current, index];
      window.localStorage.setItem(`festival-schedule:${eventId}`, JSON.stringify(next));
      return next;
    });
  };
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
          <PageBackButton destination="festivals" />
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
        <PageBackButton destination="festivals" />

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {showCreatorTools && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-foreground px-4 py-3 text-background sm:px-6">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs font-bold uppercase">Creator tools</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil /> Edit content
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
              <Button asChild size="lg" className="w-full shrink-0 sm:w-auto">
                <Link to="/events/$eventId" params={{ eventId: event.id }}>
                  <Ticket /> {isFree ? "RSVP" : "Buy tickets"}
                </Link>
              </Button>
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

        <div className={`grid gap-0 overflow-hidden rounded-2xl border border-border bg-card ${activeTab === "overview" ? "lg:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
          {/* Main column */}
          <div className="min-w-0 space-y-10 p-5 sm:p-8 lg:border-r lg:border-border">
            <section id="festival-overview" className={`scroll-mt-24 space-y-6 ${activeTab !== "overview" ? "hidden" : ""}`}>
              {headliners.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-extrabold text-foreground">Festival Headliners</h2>
                  <div className="mt-2">
                    {headliners.map((item, index) => (
                      <ProgramRow key={`${item.name}-${index}`} item={item} fallbackAction={isFree ? "RSVP" : "Tickets"} eventId={event.id} />
                    ))}
                  </div>
                </div>
              )}

              {experiences.length > 0 && (
                <div className="border-t border-border pt-8">
                  <h2 className="font-display text-2xl font-extrabold text-foreground">Featured Experiences</h2>
                  <div className="mt-2">
                    {experiences.map((item, index) => (
                      <ProgramRow key={`${item.name}-${index}`} item={item} fallbackAction={isFree ? "Free" : "Tickets"} eventId={event.id} />
                    ))}
                  </div>
                </div>
              )}

              {event.description && (
                <div className="border-t border-border pt-8">
                  <h2 className="font-display text-2xl font-extrabold text-foreground">About the Festival</h2>
                  <div className="prose prose-sm mt-4 max-w-none text-muted-foreground sm:prose-base" dangerouslySetInnerHTML={{ __html: event.description }} />
                </div>
              )}

              {(vendors.length > 0 || food.length > 0) && (
                <div className="grid gap-6 border-t border-border pt-8 sm:grid-cols-2">
                  <ListColumn title="Vendors" items={vendors.map((v) => v.name)} />
                  <ListColumn title="Food + Drink" items={food} />
                </div>
              )}
            </section>

            <section id="festival-schedule" className={`scroll-mt-24 ${activeTab !== "schedule" ? "hidden" : ""}`}>
              {schedule.length > 0 ? (
                <div className="space-y-8">
                  <div className="space-y-4 border-b border-border pb-6">
                    <div className="flex flex-wrap gap-2">
                      {[["all", "All Time"], ["today", "Today"], ["weekend", "This Weekend"]].map(([value, label]) => (
                        <Button key={value} type="button" size="sm" variant={scheduleRange === value ? "default" : "outline"} onClick={() => setScheduleRange(value)}>{label}</Button>
                      ))}
                    </div>
                    {scheduleDates.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto border-b border-border">
                        <button type="button" onClick={() => setScheduleDate("all")} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${scheduleDate === "all" ? "border-orange text-orange" : "border-transparent text-muted-foreground"}`}>All dates</button>
                        {scheduleDates.map((date) => (
                          <button key={date} type="button" onClick={() => setScheduleDate(date)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${scheduleDate === date ? "border-orange text-orange" : "border-transparent text-muted-foreground"}`}>{scheduleDateLabel(date)}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {headliners.length > 0 && (
                    <div>
                      <h2 className="font-display text-2xl font-extrabold text-foreground">Featured at the Festival</h2>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {headliners.map((item, index) => (
                          <article key={`${item.name}-${index}`} className="border-l-4 border-orange bg-muted/30 p-4">
                            <span className="text-[11px] font-bold uppercase text-orange">Headliner</span>
                            <h3 className="mt-1 text-lg font-extrabold text-foreground">{item.name}</h3>
                            {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    {visibleSchedule.length > 0 ? visibleSchedule.map((item) => {
                      const index = schedule.indexOf(item);
                      return <ScheduleRow key={`${item.name}-${index}`} item={item} scheduled={mySchedule.includes(index)} onToggle={() => toggleMySchedule(index)} />;
                    }) : <TabEmpty message="No scheduled activities match these filters." />}
                  </div>
                </div>
              ) : <div className="mt-4"><TabEmpty message="The festival schedule has not been posted yet." canEdit={showCreatorTools} onEdit={() => setEditOpen(true)} /></div>}
            </section>

            <section id="festival-performers" className={`scroll-mt-24 ${activeTab !== "performers" ? "hidden" : ""}`}>
              {headliners.length > 0 ? (
                <div>
                  {headliners.map((item, index) => (
                    <PerformerCard key={`${item.name}-${index}`} item={item} event={event} isFree={isFree} />
                  ))}
                </div>
              ) : <div className="mt-4"><TabEmpty message="Performers have not been announced yet." canEdit={showCreatorTools} onEdit={() => setEditOpen(true)} /></div>}
            </section>

            <section id="festival-vendors" className={`scroll-mt-24 ${activeTab !== "vendors" ? "hidden" : ""}`}>
              {vendors.length > 0 ? (
                <div>
                  {vendors.map((item, index) => (
                    <VendorCard key={`${item.name}-${index}`} item={item} />
                  ))}
                </div>
              ) : <div className="mt-4"><TabEmpty message="Vendors have not been announced yet." canEdit={showCreatorTools} onEdit={() => setEditOpen(true)} /></div>}
            </section>

            <section id="festival-food" className={`scroll-mt-24 ${activeTab !== "food" ? "hidden" : ""}`}>
              <h2 className="font-display text-lg font-extrabold text-foreground">Food + Drink</h2>
              {food.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {food.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : <div className="mt-4"><TabEmpty message="Food and drink vendors have not been announced yet." canEdit={showCreatorTools} onEdit={() => setEditOpen(true)} /></div>}
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
              <h2 className="font-display text-lg font-extrabold text-foreground">Gallery</h2>
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
                    <Img
                      key={u}
                      src={u}
                      alt={`${event.title} photo`}
                      loading="lazy"
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  ))}
                </div>
              ) : <div className="mt-4"><TabEmpty message="Festival photos and videos have not been added yet." /></div>}
            </section>

            <section id="festival-updates" className={`scroll-mt-24 ${activeTab !== "updates" ? "hidden" : ""}`}>
              <h2 className="font-display text-lg font-extrabold text-foreground">Updates</h2>
              <div className="mt-4"><TabEmpty message="There are no festival updates yet." /></div>
            </section>

            <section id="festival-comments" className={`scroll-mt-24 ${activeTab !== "comments" ? "hidden" : ""}`}>
              <h2 className="font-display text-lg font-extrabold text-foreground">Comments</h2>
              <EventSocial eventId={event.id} hostId={event.user_id} />
            </section>

            <section id="festival-faq" className={`scroll-mt-24 ${activeTab !== "faq" ? "hidden" : ""}`}>
              <h2 className="font-display text-lg font-extrabold text-foreground">FAQ</h2>
              {faqs.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {faqs.map((f) => (
                    <div key={f.q} className="rounded-xl border border-border bg-card p-4">
                      <div className="text-sm font-bold text-foreground">{f.q}</div>
                      {f.a && <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>}
                    </div>
                  ))}
                </div>
              ) : <div className="mt-4"><TabEmpty message="Frequently asked questions have not been added yet." canEdit={showCreatorTools} onEdit={() => setEditOpen(true)} /></div>}
            </section>

            {(data!.nearby.length > 0 || data!.nearbyArtists.length > 0) && (
              <section className="scroll-mt-24">
                <h2 className="font-display text-lg font-extrabold text-foreground">
                  Nearby on Planet Baltimore
                </h2>
                <div className="mt-4 space-y-6">
                  {data!.nearby.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-bold text-foreground">Nearby Arts Organizations ({data!.nearby.length})</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {data!.nearby.map((o) => (
                          <Link key={o.id} to="/o/$slug" params={{ slug: o.slug }} className="rounded-lg border border-border bg-card p-4 transition hover:border-orange">
                            <div className="text-[11px] font-semibold uppercase text-orange">{(o.subtype || o.type).replaceAll("_", " ")}</div>
                            <div className="mt-0.5 text-sm font-bold text-foreground">{o.name}</div>
                            {(o.tagline || o.bio) && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{o.tagline || o.bio}</p>}
                            <span className="mt-3 inline-block text-xs font-semibold text-orange">View</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {data!.nearbyArtists.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-bold text-foreground">Nearby Artists ({data!.nearbyArtists.length})</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {data!.nearbyArtists.map((artist) => (
                          <Link key={artist.id} to="/u/$username" params={{ username: artist.username ?? "" }} className="rounded-lg border border-border bg-card p-4 transition hover:border-orange">
                            {artist.category && <div className="text-[11px] font-semibold uppercase text-orange">{artist.category.replaceAll("_", " ")}</div>}
                            <div className="mt-0.5 text-sm font-bold text-foreground">{titleCase(artist.display_name || artist.username || "Artist")}</div>
                            {artist.bio && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{artist.bio}</p>}
                            <span className="mt-3 inline-block text-xs font-semibold text-orange">View</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className={`space-y-8 bg-muted/35 p-5 sm:p-8 lg:sticky lg:top-16 lg:self-start ${activeTab !== "overview" ? "hidden" : ""}`}>
            <div>
              <h2 className="font-display text-xl font-extrabold text-foreground">At a Glance</h2>
              <div className="mt-4 space-y-3">
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
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Website
                    </div>
                    <a
                      href={details.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 break-all text-sm font-medium text-orange underline underline-offset-2"
                    >
                      {details.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {(details?.expected_attendance || details?.footprint) && (
              <div className="border-t border-border pt-6">
                {details?.expected_attendance && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange" />
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Expected Attendance
                      </div>
                      <div className="text-sm font-bold text-foreground">
                        {details.expected_attendance}
                      </div>
                    </div>
                  </div>
                )}
                {details?.footprint && (
                  <p className="mt-3 text-sm text-muted-foreground">{details.footprint}</p>
                )}
              </div>
            )}

            {data!.organizer && (
              <div className="border-t border-border pt-6">
                <h3 className="font-display text-base font-extrabold text-foreground">Organizer</h3>
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

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function pairsToObjects(text: string, keys: [string, string]) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [a, b] = l.split("|").map((s) => s.trim());
      return { [keys[0]]: a ?? "", [keys[1]]: b ?? "" };
    })
    .filter((o) => (o as Record<string, string>)[keys[0]]);
}

function programLinesToObjects(text: string): ProgramItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", when = "", venue = "", description = "", price = "", type = ""] = line.split("|").map((part) => part.trim());
      return { name, when, venue, description, price, type };
    })
    .filter((item) => item.name.length > 0);
}

function programItemsToLines(items: ProgramItem[]): string {
  return items
    .map((item) => [item.name, item.when, item.venue, item.description, item.price, item.type].join(" | "))
    .join("\n");
}

function scheduleLinesToObjects(text: string): ScheduleItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", date = "", time = "", venue = "", type = "", price = "", description = ""] = line.split("|").map((part) => part.trim());
      return { name, date, time, venue, type, price, description };
    })
    .filter((item) => item.name.length > 0);
}

function scheduleItemsToLines(items: ScheduleItem[]): string {
  return items
    .map((item) => [item.name, item.date, item.time, item.venue, item.type, item.price, item.description].join(" | "))
    .join("\n");
}

function listToLines(list: string[]): string {
  return list.join("\n");
}

function vendorLinesToObjects(text: string): VendorItem[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [category = "", name = "", booth = "", description = ""] = line.split("|").map((part) => part.trim());
      return { category, name, booth, description };
    })
    .filter((item) => item.name.length > 0);
}

function vendorItemsToLines(items: VendorItem[]): string {
  return items
    .map((item) => [item.category, item.name, item.booth, item.description].join(" | "))
    .join("\n");
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
    schedule: scheduleItemsToLines(asSchedule(details?.schedule)),
    performers: programItemsToLines(asProgramItems(details?.performers)),
    vendors: vendorItemsToLines(asVendors(details?.vendors)),
    food: listToLines(asStringList(details?.food)),
    experiences: programItemsToLines(asExperiences(details?.experiences)),
    faqs: asFaqs(details?.faqs)
      .map((f) => `${f.q} | ${f.a}`)
      .join("\n"),
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
      schedule: scheduleLinesToObjects(form.schedule),
      performers: programLinesToObjects(form.performers),
      vendors: vendorLinesToObjects(form.vendors),
      food: linesToList(form.food),
      experiences: programLinesToObjects(form.experiences),
      faqs: pairsToObjects(form.faqs, ["q", "a"]),
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
          <DialogTitle>Festival Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">Tagline</span>
            <Textarea value={form.tagline} onChange={set("tagline")} rows={2} className="mt-1" />
          </label>
          <Field label="Hours" value={form.hours} onChange={set("hours")} placeholder="Fri 11am–9pm · Sat 11am–9pm" />
          <Field label="Price label" value={form.price_label} onChange={set("price_label")} placeholder="Free or $55–$120" />
          <Field label="Age" value={form.age_range} onChange={set("age_range")} placeholder="All ages" />
          <Field label="Format" value={form.format} onChange={set("format")} placeholder="Street Festival" />
          <Field label="Accessibility (comma separated)" value={form.accessibility} onChange={set("accessibility")} placeholder="wheelchair, asl, restrooms" />
          <Field label="Rain or Shine" value={form.rain_or_shine} onChange={set("rain_or_shine")} placeholder="Yes" />
          <Field label="Pet Policy" value={form.pet_policy} onChange={set("pet_policy")} />
          <Field label="Expected Attendance" value={form.expected_attendance} onChange={set("expected_attendance")} placeholder="5,000+" />
          <Field label="Website" value={form.website} onChange={set("website")} placeholder="https://…" />
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">Festival Footprint</span>
            <Textarea value={form.footprint} onChange={set("footprint")} rows={2} className="mt-1" />
          </label>
          <div className="sm:col-span-2">
            <Area label="Schedule" value={form.schedule} onChange={set("schedule")} hint="One per line: Name | Date | Time | Venue | Type | Free or price | Description" />
          </div>
          <div className="sm:col-span-2">
            <Area label="Festival Headliners and Performers" value={form.performers} onChange={set("performers")} hint="One per line: Name | Date and time | Venue | Description | RSVP, Free, or price | Type (dance, poetry, music)" />
          </div>
          <div className="sm:col-span-2">
            <Area label="Vendors" value={form.vendors} onChange={set("vendors")} hint="One per line: Category | Name | Booth | Description" />
          </div>
          <div className="sm:col-span-2">
            <Area label="Food + Drink" value={form.food} onChange={set("food")} hint="One per line" />
          </div>
          <div className="sm:col-span-2">
            <Area label="Featured Experiences" value={form.experiences} onChange={set("experiences")} hint="One per line: Name | Date and time | Venue | Description | Free or price | Type" />
          </div>
          <div className="sm:col-span-2">
            <Area label="FAQs" value={form.faqs} onChange={set("faqs")} hint="One per line: Question | Answer" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving}
            variant="brand"
          >
            {saving ? "Saving…" : "Save Details"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
