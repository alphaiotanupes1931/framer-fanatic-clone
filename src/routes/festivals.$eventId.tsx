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
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Bookmark,
  BarChart3,
  CalendarDays,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  MapPin,
  Navigation,
  Pencil,
  Send,
  Settings,
  Share2,
  Ticket,
  Users,
} from "lucide-react";
import { PageBackButton } from "@/components/shared/page-back-button";

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

type Experience = { name: string; description: string };
type ScheduleItem = { label: string; detail: string };
type Faq = { q: string; a: string };

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : ((x as { name?: string })?.name ?? "")))
    .map((s) => s.trim())
    .filter(Boolean);
}

function asExperiences(v: unknown): Experience[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => x as Partial<Experience>)
    .filter((x) => x && typeof x.name === "string" && x.name.trim())
    .map((x) => ({ name: x.name!.trim(), description: (x.description ?? "").trim() }));
}

function asSchedule(v: unknown): ScheduleItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => x as Partial<ScheduleItem>)
    .filter((x) => x && typeof x.label === "string" && x.label.trim())
    .map((x) => ({ label: x.label!.trim(), detail: (x.detail ?? "").trim() }));
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
          ? "border-[#d4580a] text-[#d4580a]"
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
      <h4 className="text-xs font-bold uppercase tracking-wide text-[#d4580a]">{title}</h4>
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

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const { data, refetch } = useCachedFetch(`pb:festival:${eventId}`, async () => {
    const { data: ev } = await supabase
      .from("events")
      .select(
        "id,title,description,image_url,video_url,gallery_urls,starts_at,ends_at,venue_name,address,location,neighborhood,category,price_cents,pricing_mode,capacity,user_id,organization_id,latitude,longitude",
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
    if (event.neighborhood) {
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id,name,slug,type,subtype,tagline,bio")
        .eq("is_public", true)
        .ilike("neighborhood", event.neighborhood)
        .limit(12);
      nearby = (orgs as NearbyOrg[] | null) ?? [];
    }

    return {
      event,
      details: (detailsRes.data as DetailsRow | null) ?? null,
      tickets: (ticketsRes.data as TicketType[] | null) ?? [],
      organizer,
      nearby,
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

  const performers = useMemo(() => asStringList(details?.performers), [details]);
  const vendors = useMemo(() => asStringList(details?.vendors), [details]);
  const food = useMemo(() => asStringList(details?.food), [details]);
  const schedule = useMemo(() => asSchedule(details?.schedule), [details]);
  const experiences = useMemo(() => asExperiences(details?.experiences), [details]);
  const faqs = useMemo(() => asFaqs(details?.faqs), [details]);
  const gallery = event?.gallery_urls ?? [];
  const tickets = data?.tickets ?? [];

  const tabs = useMemo(() => {
    const t: { id: string; label: string }[] = [{ id: "overview", label: "Overview" }];
    if (schedule.length > 0) t.push({ id: "schedule", label: "Schedule" });
    if (performers.length > 0) t.push({ id: "performers", label: "Performers" });
    if (vendors.length > 0) t.push({ id: "vendors", label: "Vendors" });
    if (food.length > 0) t.push({ id: "food", label: "Food + Drink" });
    if (tickets.length > 0) t.push({ id: "tickets", label: "Tickets" });
    if (gallery.length > 0 || event?.video_url) t.push({ id: "gallery", label: "Gallery" });
    if (faqs.length > 0) t.push({ id: "faq", label: "FAQ" });
    return t;
  }, [schedule, performers, vendors, food, tickets, gallery, event, faqs]);

  const [activeTab, setActiveTab] = useState("overview");
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

        <div className="grid gap-0 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main column */}
          <div className="min-w-0 space-y-10 p-5 sm:p-8 lg:border-r lg:border-border">
            <section id="festival-overview" className="scroll-mt-24 space-y-6">
              {event.description && (
                <div>
                  <h2 className="font-display text-2xl font-extrabold text-foreground">About the festival</h2>
                  <div className="prose prose-sm mt-4 max-w-none text-muted-foreground sm:prose-base" dangerouslySetInnerHTML={{ __html: event.description }} />
                </div>
              )}
              {(performers.length > 0 || vendors.length > 0 || food.length > 0) && (
                <div className="border-t border-border pt-8">
                  <h2 className="font-display text-lg font-extrabold text-foreground">
                    Festival Headliners
                  </h2>
                  <div className="mt-4 grid gap-6 sm:grid-cols-2">
                    <ListColumn title="Performances" items={performers} />
                    <ListColumn title="Vendors" items={vendors} />
                    <ListColumn title="Food + Drink" items={food} />
                  </div>
                </div>
              )}

              {experiences.length > 0 && (
                <div>
                  <h2 className="font-display text-lg font-extrabold text-foreground">
                    Featured Experiences
                  </h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {experiences.map((x) => (
                      <div key={x.name} className="rounded-2xl border border-border bg-card p-4">
                        <h3 className="text-sm font-bold text-foreground">{x.name}</h3>
                        {x.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{x.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {schedule.length > 0 && (
              <section id="festival-schedule" className="scroll-mt-24">
                <h2 className="font-display text-lg font-extrabold text-foreground">Schedule</h2>
                <div className="mt-4 space-y-2">
                  {schedule.map((s, i) => (
                    <div
                      key={`${s.label}-${i}`}
                      className="flex items-baseline justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-foreground">{s.label}</span>
                      {s.detail && (
                        <span className="text-right text-sm text-muted-foreground">{s.detail}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {performers.length > 0 && (
              <section id="festival-performers" className="scroll-mt-24">
                <h2 className="font-display text-lg font-extrabold text-foreground">Performers</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {performers.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {vendors.length > 0 && (
              <section id="festival-vendors" className="scroll-mt-24">
                <h2 className="font-display text-lg font-extrabold text-foreground">Vendors</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {vendors.map((v) => (
                    <span
                      key={v}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {food.length > 0 && (
              <section id="festival-food" className="scroll-mt-24">
                <h2 className="font-display text-lg font-extrabold text-foreground">Food + Drink</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {food.map((f) => (
                    <span
                      key={f}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {tickets.length > 0 && (
              <section id="festival-tickets" className="scroll-mt-24">
                <h2 className="font-display text-lg font-extrabold text-foreground">Tickets</h2>
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
                        <span className="text-sm font-bold text-[#d4580a]">
                          {t.price_cents > 0 ? `$${(t.price_cents / 100).toFixed(2)}` : "Free"}
                        </span>
                        <Button asChild size="sm" className="bg-[#d4580a] text-white hover:bg-[#b8490a]">
                          <Link to="/events/$eventId" params={{ eventId: event.id }}>
                            Get
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(gallery.length > 0 || event.video_url) && (
              <section id="festival-gallery" className="scroll-mt-24">
                <h2 className="font-display text-lg font-extrabold text-foreground">Gallery</h2>
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
              </section>
            )}

            {faqs.length > 0 && (
              <section id="festival-faq" className="scroll-mt-24">
                <h2 className="font-display text-lg font-extrabold text-foreground">FAQ</h2>
                <div className="mt-4 space-y-3">
                  {faqs.map((f) => (
                    <div key={f.q} className="rounded-xl border border-border bg-card p-4">
                      <div className="text-sm font-bold text-foreground">{f.q}</div>
                      {f.a && <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data!.nearby.length > 0 && (
              <section className="scroll-mt-24">
                <h2 className="font-display text-lg font-extrabold text-foreground">
                  Nearby on Planet Baltimore
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {data!.nearby.map((o) => (
                    <Link
                      key={o.id}
                      to="/o/$slug"
                      params={{ slug: o.slug }}
                      className="rounded-xl border border-border bg-card p-4 transition hover:border-[#d4580a]"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#d4580a]">
                        {o.subtype || o.type}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-foreground">{o.name}</div>
                      {(o.tagline || o.bio) && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {o.tagline || o.bio}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-8 bg-muted/35 p-5 sm:p-8 lg:sticky lg:top-16 lg:self-start">
            <div>
              <h3 className="text-xs font-extrabold uppercase text-muted-foreground">Festival snapshot</h3>
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
              </div>
            </div>

            {(details?.expected_attendance || details?.footprint) && (
              <div className="border-t border-border pt-6">
                {details?.expected_attendance && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#d4580a]" />
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
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d4580a]/10 text-sm font-bold text-[#d4580a]">
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
                        <Link to={data!.organizer.href} className="text-[#d4580a] hover:underline">
                          View {data!.organizer.kind === "org" ? "Organization" : "Profile"} →
                        </Link>
                      )}
                      {(details?.website || data!.organizer.website) && (
                        <a
                          href={details?.website || data!.organizer.website!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#d4580a] hover:underline"
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

function listToLines(list: string[]): string {
  return list.join("\n");
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
    schedule: asSchedule(details?.schedule)
      .map((s) => `${s.label} | ${s.detail}`)
      .join("\n"),
    performers: listToLines(asStringList(details?.performers)),
    vendors: listToLines(asStringList(details?.vendors)),
    food: listToLines(asStringList(details?.food)),
    experiences: asExperiences(details?.experiences)
      .map((x) => `${x.name} | ${x.description}`)
      .join("\n"),
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
      schedule: pairsToObjects(form.schedule, ["label", "detail"]),
      performers: linesToList(form.performers),
      vendors: linesToList(form.vendors),
      food: linesToList(form.food),
      experiences: pairsToObjects(form.experiences, ["name", "description"]),
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
            <Area label="Schedule" value={form.schedule} onChange={set("schedule")} hint="One per line: Day or time | Details" />
          </div>
          <div className="sm:col-span-2">
            <Area label="Performers" value={form.performers} onChange={set("performers")} hint="One per line" />
          </div>
          <div className="sm:col-span-2">
            <Area label="Vendors" value={form.vendors} onChange={set("vendors")} hint="One per line" />
          </div>
          <div className="sm:col-span-2">
            <Area label="Food + Drink" value={form.food} onChange={set("food")} hint="One per line" />
          </div>
          <div className="sm:col-span-2">
            <Area label="Featured Experiences" value={form.experiences} onChange={set("experiences")} hint="One per line: Name | Description" />
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
            className="bg-[#d4580a] text-white hover:bg-[#b8490a]"
          >
            {saving ? "Saving…" : "Save Details"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
