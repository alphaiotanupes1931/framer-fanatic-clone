import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, Palette, Landmark, Building2, Calendar as CalendarIcon, ShieldCheck,
  Compass, Ticket, Users, MessageSquare, MapPin, Bell, User, Search,
  BookOpen, Video as VideoIcon, Trophy, Settings as SettingsIcon, LogOut,
  Plus, TrendingUp, Sparkles, ChevronLeft,
} from "lucide-react";
import pbLogo from "@/assets/pb-logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  neighborhood: string | null;
  bio: string | null;
  website: string | null;
  banner_url: string | null;
};

const NAV = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/artists", icon: Palette, label: "Artists" },
  { to: "/arts-orgs", icon: Landmark, label: "Arts Orgs" },
  { to: "/businesses", icon: Building2, label: "Businesses" },
  { to: "/calendar", icon: CalendarIcon, label: "Calendar" },
  { to: "/community-associations", icon: ShieldCheck, label: "Community Associations" },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/events", icon: Ticket, label: "Events" },
  { to: "/groups", icon: Users, label: "Groups/Communities" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/neighborhoods", icon: MapPin, label: "Neighborhoods" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/stories", icon: BookOpen, label: "Stories" },
  { to: "/videos", icon: VideoIcon, label: "Videos" },
  { to: "/leaderboard", icon: Trophy, label: "Baltimore 100" },
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
] as const;

export function useCurrentProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/auth" }); return; }
      const { data: p } = await supabase.from("profiles")
        .select("id, display_name, username, email, avatar_url, role, neighborhood, bio, website, banner_url")
        .eq("id", data.session.user.id).maybeSingle();
      if (p) setProfile(p as Profile);
    })();
  }, [navigate]);
  return profile;
}

export function AppLayout({
  title, subtitle, cta, ctaTo, onCta, hero = true, children,
}: {
  title: string;
  subtitle?: string;
  cta?: string;
  ctaTo?: string;
  onCta?: () => void;
  hero?: boolean;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const profile = useCurrentProfile();
  const [collapsed, setCollapsed] = useState(false);

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };
  const initials = useMemo(() => {
    const n = profile?.display_name || profile?.email || "U";
    return n.slice(0, 2).toUpperCase();
  }, [profile]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`sticky top-0 hidden h-screen ${collapsed ? "w-16" : "w-64"} shrink-0 flex-col border-r border-neutral-200 bg-white px-3 py-5 md:flex transition-all`}>
          <div className="mb-6 flex items-center gap-2 px-1">
            <img src={pbLogo} alt="" className="h-8 w-8 shrink-0" />
            {!collapsed && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight">
                  <span className="text-orange-600">Planet</span> Baltimore
                </span>
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">BETA</span>
              </div>
            )}
          </div>

          {!collapsed && (
            <button className="mb-5 w-full rounded-full border-2 border-orange-500 px-4 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-500 hover:text-white">
              + Create Post
            </button>
          )}

          <nav className="flex-1 space-y-0.5 overflow-y-auto">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <item.icon className={`h-5 w-5 shrink-0 ${active ? "text-orange-600" : ""}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={signOut}
            className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            <LogOut className="h-5 w-5 shrink-0" /> {!collapsed && "Logout"}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mt-2 flex items-center justify-center rounded-lg px-3 py-2 text-neutral-400 hover:bg-neutral-100"
          >
            <ChevronLeft className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 pb-24 md:pb-6">
          {hero && (
            <div className="relative overflow-hidden rounded-3xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-white to-orange-50 px-8 py-10">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-orange-200/50 blur-2xl" />
              <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-orange-100 blur-3xl" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-orange-600 sm:text-4xl">{title}</h1>
                  {subtitle && <p className="mt-2 max-w-xl text-neutral-600">{subtitle}</p>}
                </div>
                {cta && (onCta ? (
                  <button
                    onClick={onCta}
                    className="inline-flex items-center gap-2 self-start rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4" /> {cta}
                  </button>
                ) : (
                  <Link
                    to={ctaTo || "#"}
                    className="inline-flex items-center gap-2 self-start rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4" /> {cta}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className={hero ? "mt-6" : ""}>{children}</div>
        </main>

        <aside className="sticky top-0 hidden h-screen w-80 shrink-0 overflow-y-auto border-l border-neutral-200 bg-white px-5 py-6 xl:block">
          <RightRail />
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-neutral-200 bg-white py-2 md:hidden">
        {[
          { to: "/dashboard", icon: Home, label: "Home" },
          { to: "/discover", icon: Compass, label: "Discover" },
          { to: "/events", icon: Ticket, label: "Events" },
          { to: "/messages", icon: MessageSquare, label: "Inbox" },
          { to: "/profile", icon: User, label: "Me" },
        ].map((t) => {
          const active = pathname === t.to;
          return (
            <Link key={t.to} to={t.to} className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${active ? "text-orange-600" : "text-neutral-500"}`}>
              <t.icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
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
          <Link to="/stories" className="text-xs font-semibold text-orange-600 hover:underline">See all</Link>
        </div>
        <ul className="space-y-3">
          {[
            { t: "The Crab Cake Debate Continues", a: "Priya Patel" },
            { t: "Baltimore Club Music: Untold", a: "Nadia Okonkwo" },
            { t: "The Baltimore Art Review", a: "Marcus J. Reed" },
            { t: "Hidden Gems: A Local's Guide", a: "Priya Patel" },
            { t: "A Walking Tour of Fells", a: "Robert Chen" },
          ].map((x, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-orange-300 to-orange-500" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{x.t}</div>
                <div className="text-xs text-neutral-500">by {x.a}</div>
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
          <Link to="/artists" className="text-xs font-semibold text-orange-600 hover:underline">See all</Link>
        </div>
        <ul className="space-y-3">
          {[
            { n: "RDG", t: "Music · Abell" },
            { n: "Jada Davis", t: "Podcaster · Baltimore Peninsula" },
            { n: "Ada Pinkston", t: "Mixed Media · Waverly" },
            { n: "Young Vader", t: "Podcaster · Barclay" },
            { n: "Marcus Wash.", t: "Music · Cherry Hill" },
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
          <Link to="/events" className="text-xs font-semibold text-orange-600 hover:underline">See all</Link>
        </div>
        <div className="rounded-xl border border-neutral-200 p-3">
          <div className="text-sm font-semibold">First Friday Art Walk</div>
          <div className="text-xs text-neutral-500">Fri, Jul 3 · Station North</div>
        </div>
      </section>
    </div>
  );
}

// Generic placeholder card grid for sections still being built out
export function PlaceholderGrid({ label }: { label: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="h-40 bg-gradient-to-br from-orange-200 via-orange-100 to-white" />
          <div className="p-4">
            <div className="text-sm font-semibold">{label} #{i + 1}</div>
            <div className="mt-1 text-xs text-neutral-500">Coming soon — full {label.toLowerCase()} experience.</div>
          </div>
        </div>
      ))}
    </div>
  );
}