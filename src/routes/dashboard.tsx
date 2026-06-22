import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  Palette,
  Landmark,
  Building2,
  Calendar as CalendarIcon,
  ShieldCheck,
  Compass,
  Ticket,
  Users,
  MessageSquare,
  MapPin,
  Bell,
  User,
  Search,
  BookOpen,
  LogOut,
  Plus,
  TrendingUp,
  Sparkles,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
} from "lucide-react";
import pbLogo from "@/assets/pb-logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Planet Baltimore — Your feed" }] }),
});

type Section =
  | "home"
  | "artists"
  | "arts-orgs"
  | "businesses"
  | "calendar"
  | "community-associations"
  | "discover"
  | "events"
  | "groups"
  | "messages"
  | "neighborhoods"
  | "notifications"
  | "profile"
  | "search"
  | "stories";

type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
};

function Dashboard() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("home");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_url, role")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (p) setProfile(p as Profile);
    })();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const initials = useMemo(() => {
    const n = profile?.display_name || profile?.email || "U";
    return n.slice(0, 2).toUpperCase();
  }, [profile]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex max-w-[1600px]">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-neutral-200 bg-white px-4 py-5 md:flex">
          <div className="mb-6 flex items-center gap-2 px-2">
            <img src={pbLogo} alt="" className="h-8 w-8" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight">
                <span className="text-orange-600">Planet</span> Baltimore
              </span>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                BETA
              </span>
            </div>
          </div>

          <button className="mb-5 w-full rounded-full border-2 border-orange-500 px-4 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-500 hover:text-white">
            + Create Post
          </button>

          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            <NavItem icon={Home} label="Home" active={section === "home"} onClick={() => setSection("home")} />
            <NavItem icon={Palette} label="Artists" active={section === "artists"} onClick={() => setSection("artists")} />
            <NavItem icon={Landmark} label="Arts Orgs" active={section === "arts-orgs"} onClick={() => setSection("arts-orgs")} />
            <NavItem icon={Building2} label="Businesses" active={section === "businesses"} onClick={() => setSection("businesses")} />
            <NavItem icon={CalendarIcon} label="Calendar" active={section === "calendar"} onClick={() => setSection("calendar")} />
            <NavItem icon={ShieldCheck} label="Community Associations" active={section === "community-associations"} onClick={() => setSection("community-associations")} />
            <NavItem icon={Compass} label="Discover" active={section === "discover"} onClick={() => setSection("discover")} />
            <NavItem icon={Ticket} label="Events" active={section === "events"} onClick={() => setSection("events")} />
            <NavItem icon={Users} label="Groups/Communities" active={section === "groups"} onClick={() => setSection("groups")} />
            <NavItem icon={MessageSquare} label="Messages" active={section === "messages"} onClick={() => setSection("messages")} />
            <NavItem icon={MapPin} label="Neighborhoods" active={section === "neighborhoods"} onClick={() => setSection("neighborhoods")} />
            <NavItem icon={Bell} label="Notifications" active={section === "notifications"} onClick={() => setSection("notifications")} />
            <NavItem icon={User} label="Profile" active={section === "profile"} onClick={() => setSection("profile")} />
            <NavItem icon={Search} label="Search" active={section === "search"} onClick={() => setSection("search")} />
            <NavItem icon={BookOpen} label="Stories" active={section === "stories"} onClick={() => setSection("stories")} />
          </nav>

          <button
            onClick={signOut}
            className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            <LogOut className="h-5 w-5" /> Logout
          </button>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
          <HeroBanner section={section} />

          <div className="mt-6">
            <SectionView section={section} profile={profile} initials={initials} />
          </div>
        </main>

        {/* Right rail */}
        <aside className="sticky top-0 hidden h-screen w-80 shrink-0 overflow-y-auto border-l border-neutral-200 bg-white px-5 py-6 xl:block">
          <RightRail />
        </aside>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-neutral-200 bg-white py-2 md:hidden">
        {[
          { s: "home" as Section, icon: Home, label: "Home" },
          { s: "discover" as Section, icon: Compass, label: "Discover" },
          { s: "events" as Section, icon: Ticket, label: "Events" },
          { s: "messages" as Section, icon: MessageSquare, label: "Inbox" },
          { s: "profile" as Section, icon: User, label: "Me" },
        ].map((t) => (
          <button
            key={t.s}
            onClick={() => setSection(t.s)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
              section === t.s ? "text-orange-600" : "text-neutral-500"
            }`}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-neutral-100 text-neutral-900"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-orange-600" : ""}`} />
      <span className="truncate">{label}</span>
    </button>
  );
}

const SECTION_META: Record<Section, { title: string; subtitle: string; cta?: string }> = {
  home: { title: "Planet Baltimore", subtitle: "Your city. Your community. Your feed." },
  artists: { title: "Artists", subtitle: "Discover Baltimore's creative voices — visual art, music, photography & more.", cta: "Create Artist Page" },
  "arts-orgs": { title: "Arts Organizations", subtitle: "The living cultural map of Baltimore.", cta: "Create Arts Org Page" },
  businesses: { title: "Businesses", subtitle: "Discover and support local Baltimore businesses.", cta: "Create Business Page" },
  calendar: { title: "Calendar", subtitle: "Events from local businesses, organizations & communities.", cta: "Create Event" },
  "community-associations": { title: "Community Associations", subtitle: "Official community governance hubs for Baltimore neighborhoods.", cta: "Create Community Association" },
  discover: { title: "Discover Baltimore", subtitle: "Find events, artists, communities, and stories across the city." },
  events: { title: "Your Next Event", subtitle: "Tickets for the best events in Baltimore.", cta: "Create Event" },
  groups: { title: "Groups / Communities", subtitle: "Find your people and build something together in Baltimore.", cta: "Create Group/Community" },
  messages: { title: "Messages", subtitle: "Conversations with your community." },
  neighborhoods: { title: "Neighborhoods", subtitle: "Explore every block of Baltimore." },
  notifications: { title: "Notifications", subtitle: "What's new in your network." },
  profile: { title: "Your Profile", subtitle: "How Baltimore sees you." },
  search: { title: "Search", subtitle: "Find anything across Planet Baltimore." },
  stories: { title: "Stories", subtitle: "Long-form journalism from the city." },
};

function HeroBanner({ section }: { section: Section }) {
  const meta = SECTION_META[section];
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-white to-orange-50 px-8 py-10">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-orange-200/50 blur-2xl" />
      <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-orange-100 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">{meta.title}</h1>
          <p className="mt-2 max-w-xl text-neutral-600">{meta.subtitle}</p>
        </div>
        {meta.cta && (
          <button className="inline-flex items-center gap-2 self-start rounded-full border-2 border-orange-500 px-5 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-500 hover:text-white">
            <Plus className="h-4 w-4" /> {meta.cta}
          </button>
        )}
      </div>
    </div>
  );
}

function SectionView({
  section,
  profile,
  initials,
}: {
  section: Section;
  profile: Profile | null;
  initials: string;
}) {
  if (section === "home") return <HomeFeed profile={profile} initials={initials} />;
  if (section === "profile") return <ProfileView profile={profile} initials={initials} />;
  return <PlaceholderGrid section={section} />;
}

function HomeFeed({ profile, initials }: { profile: Profile | null; initials: string }) {
  const [tab, setTab] = useState<"for-you" | "following" | "nearby" | "discover">("for-you");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {([
          ["for-you", "For You"],
          ["following", "Following"],
          ["nearby", "Nearby"],
          ["discover", "Discover"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              tab === k ? "bg-orange-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-dashed border-orange-300 bg-orange-50/60 px-5 py-4 text-sm">
        <span className="flex items-center gap-2 text-orange-700">
          <MapPin className="h-4 w-4" /> Add your neighborhood to see local content
        </span>
        <button className="font-semibold text-orange-700 hover:underline">Set up →</button>
      </div>

      <FeedPost
        author={profile?.display_name || "Ainsley Burrows"}
        avatar={profile?.avatar_url || undefined}
        initials={initials}
        neighborhood="Harwood"
        date="Today"
        body="Happy Juneteenth Everyone"
        accent="bg-neutral-900"
      />
      <FeedPost
        author="Terell Reed"
        initials="TR"
        neighborhood="Station North"
        date="Yesterday"
        body="Pulled up to the mural workshop at Upton Arts House — Baltimore's young painters are SHIFTING things. Drop by Saturday if you can."
        accent="bg-orange-600"
      />
      <FeedPost
        author="Jada Davis"
        initials="JD"
        neighborhood="Baltimore Peninsula"
        date="2d"
        body="New episode of On Repeat dropped — talking with Baltimore producers about the sounds defining 2026. Link in profile."
        accent="bg-purple-700"
      />
    </div>
  );
}

function FeedPost({
  author,
  avatar,
  initials,
  neighborhood,
  date,
  body,
  accent,
}: {
  author: string;
  avatar?: string;
  initials: string;
  neighborhood: string;
  date: string;
  body: string;
  accent: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <header className="flex items-center gap-3 px-5 pt-5">
        <Avatar className="h-10 w-10">
          {avatar && <AvatarImage src={avatar} alt={author} />}
          <AvatarFallback className="bg-orange-100 text-orange-700">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {author}
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800">
              ★ Founding Member
            </span>
          </div>
          <div className="text-xs text-neutral-500">{neighborhood} · {date}</div>
        </div>
      </header>
      <div className={`mt-4 flex h-48 items-center justify-center px-6 text-center font-serif text-2xl text-white ${accent}`}>
        {body}
      </div>
      <footer className="flex items-center justify-between px-5 py-3 text-neutral-500">
        <div className="flex items-center gap-5 text-sm">
          <button className="flex items-center gap-1.5 hover:text-orange-600"><Heart className="h-4 w-4" /> 0</button>
          <button className="flex items-center gap-1.5 hover:text-orange-600"><MessageCircle className="h-4 w-4" /> 0</button>
          <button className="flex items-center gap-1.5 hover:text-orange-600"><Share2 className="h-4 w-4" /></button>
        </div>
        <button className="hover:text-orange-600"><Bookmark className="h-4 w-4" /></button>
      </footer>
    </article>
  );
}

function ProfileView({ profile, initials }: { profile: Profile | null; initials: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8">
      <div className="flex items-center gap-5">
        <Avatar className="h-24 w-24">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name || ""} />}
          <AvatarFallback className="bg-orange-100 text-2xl text-orange-700">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold">{profile?.display_name || "—"}</h2>
          <p className="text-neutral-500">{profile?.email}</p>
          <span className="mt-2 inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 capitalize">
            {profile?.role || "attendee"}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlaceholderGrid({ section }: { section: Section }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="h-40 bg-gradient-to-br from-orange-200 via-orange-100 to-white" />
          <div className="p-4">
            <div className="text-sm font-semibold capitalize">{section.replace("-", " ")} item #{i + 1}</div>
            <div className="mt-1 text-xs text-neutral-500">Coming soon — full {section.replace("-", " ")} experience.</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RightRail() {
  return (
    <div className="space-y-7">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <TrendingUp className="h-3.5 w-3.5" /> Trending Stories
          </h3>
          <button className="text-xs font-semibold text-orange-600 hover:underline">See all</button>
        </div>
        <ul className="space-y-3">
          {[
            "The Crab Cake Debate Continues",
            "Baltimore Club Music: The Untold Story",
            "Hidden Gems: A Local's Guide to Fells",
            "A Walking Tour of Fells Point",
          ].map((t, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-orange-300 to-orange-500" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{t}</div>
                <div className="text-xs text-neutral-500">by Priya Patel</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <Sparkles className="h-3.5 w-3.5" /> Artists to Follow
          </h3>
          <button className="text-xs font-semibold text-orange-600 hover:underline">See all</button>
        </div>
        <ul className="space-y-3">
          {[
            { n: "RDG", t: "Music · Abell" },
            { n: "Ada Pinkston", t: "Mixed Media · Waverly" },
            { n: "Young Vader", t: "Podcaster · Barclay" },
          ].map((a) => (
            <li key={a.n} className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-orange-100 text-orange-700">{a.n[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{a.n}</div>
                <div className="text-xs text-neutral-500">{a.t}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <CalendarIcon className="h-3.5 w-3.5" /> Upcoming Events
          </h3>
          <button className="text-xs font-semibold text-orange-600 hover:underline">See all</button>
        </div>
        <div className="rounded-xl border border-neutral-200 p-3">
          <div className="text-sm font-semibold">First Friday Art Walk</div>
          <div className="text-xs text-neutral-500">Fri, Jul 3 · Station North</div>
        </div>
      </section>
    </div>
  );
}