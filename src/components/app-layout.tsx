import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, Palette, Landmark, Building2, Calendar as CalendarIcon, ShieldCheck,
  Compass, Ticket, Users, MessageSquare, MapPin, Bell, User, Search,
  BookOpen, Video as VideoIcon, Trophy, Settings as SettingsIcon, LogOut,
  Plus, Sparkles, ChevronLeft,
} from "lucide-react";
import pbLogo from "@/assets/pb-logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe } from "@/components/globe";
import { motion } from "motion/react";

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
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`sticky top-0 hidden h-screen ${collapsed ? "w-16" : "w-60"} shrink-0 flex-col border-r border-neutral-100 bg-white px-3 py-6 md:flex transition-all`}>
          <Link to="/dashboard" className="mb-8 flex items-center justify-center px-1">
            <img src={pbLogo} alt="Planet Baltimore" className="h-14 w-14 shrink-0" />
          </Link>

          <nav className="flex-1 space-y-0.5 overflow-y-auto pr-1">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                    active
                      ? "bg-orange text-white"
                      : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-neutral-100 pt-3">
            {!collapsed && profile && (
              <Link to="/profile" className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50">
                <Avatar className="h-8 w-8">
                  {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="bg-neutral-900 text-[11px] text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{profile.display_name || "You"}</div>
                  <div className="truncate text-[11px] text-neutral-500">{profile.neighborhood || "Baltimore"}</div>
                </div>
              </Link>
            )}
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} /> {!collapsed && "Sign out"}
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="mt-1 flex w-full items-center justify-center rounded-lg px-3 py-2 text-neutral-300 hover:bg-neutral-50 hover:text-neutral-500"
            >
              <ChevronLeft className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} />
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-8 md:px-10 pb-24 md:pb-10">
          <div className="mb-4 flex justify-end">
            <Link
              to="/notifications"
              aria-label="Notifications"
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:border-orange hover:text-orange ${pathname === "/notifications" ? "border-orange text-orange" : ""}`}
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange" />
            </Link>
          </div>
          {hero && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3 border-b border-neutral-100 pb-6 sm:flex-row sm:items-end sm:justify-between"
            >
              <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 sm:text-[34px]">{title}</h1>
                {subtitle && <p className="mt-1.5 max-w-xl text-sm text-neutral-500">{subtitle}</p>}
              </div>
              {cta && (onCta ? (
              <button
                  onClick={onCta}
                  className="inline-flex items-center gap-2 self-start rounded-full bg-orange px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                >
                  <Plus className="h-4 w-4" /> {cta}
                </button>
              ) : (
                <Link
                  to={ctaTo || "#"}
                  className="inline-flex items-center gap-2 self-start rounded-full bg-orange px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                >
                  <Plus className="h-4 w-4" /> {cta}
                </Link>
              ))}
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={hero ? "mt-8" : ""}
          >
            {children}
          </motion.div>
        </main>

        <aside className="sticky top-0 hidden h-screen w-80 shrink-0 overflow-y-auto border-l border-neutral-100 bg-white px-5 py-8 xl:block">
          <RightRail />
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-neutral-100 bg-white py-2 md:hidden">
        {[
          { to: "/dashboard", icon: Home, label: "Home" },
          { to: "/discover", icon: Compass, label: "Discover" },
          { to: "/events", icon: Ticket, label: "Events" },
          { to: "/messages", icon: MessageSquare, label: "Inbox" },
          { to: "/profile", icon: User, label: "Me" },
        ].map((t) => {
          const active = pathname === t.to;
          return (
            <Link key={t.to} to={t.to} className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${active ? "text-neutral-900" : "text-neutral-400"}`}>
              <t.icon className="h-5 w-5" strokeWidth={1.75} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function RightRail() {
  const [artists, setArtists] = useState<{ id: string; display_name: string | null; username: string | null; neighborhood: string | null; avatar_url: string | null }[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; starts_at: string | null; location: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: e }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, username, neighborhood, avatar_url")
          .eq("role", "artist")
          .limit(5),
        supabase
          .from("events")
          .select("id, title, starts_at, location")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(3),
      ]);
      setArtists((a as typeof artists) || []);
      setEvents((e as typeof events) || []);
    })();
  }, []);

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
          Planet Baltimore
        </div>
        <Globe size={280} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            <Sparkles className="h-3 w-3" /> Artists nearby
          </h3>
          <Link to="/artists" className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900">All</Link>
        </div>
        {artists.length === 0 ? (
          <p className="text-xs text-neutral-400">No artists yet.</p>
        ) : (
          <ul className="space-y-3">
            {artists.map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                  <AvatarFallback className="bg-neutral-100 text-[11px] text-neutral-700">
                    {(a.display_name || a.username || "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{a.display_name || a.username || "Anonymous"}</div>
                  <div className="truncate text-[11px] text-neutral-500">{a.neighborhood || "Baltimore"}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
            <CalendarIcon className="h-3 w-3" /> Up next
          </h3>
          <Link to="/events" className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900">All</Link>
        </div>
        {events.length === 0 ? (
          <p className="text-xs text-neutral-400">No upcoming events.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="border-b border-neutral-100 pb-3 last:border-b-0">
                <div className="text-[13px] font-medium">{e.title}</div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  {e.starts_at ? new Date(e.starts_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : ""}
                  {e.location ? ` · ${e.location}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Generic placeholder card grid for sections still being built out
export function PlaceholderGrid({ label }: { label: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-neutral-100 bg-white">
          <div className="h-40 bg-gradient-to-br from-neutral-100 to-white" />
          <div className="p-4">
            <div className="text-sm font-semibold">{label} #{i + 1}</div>
            <div className="mt-1 text-xs text-neutral-500">Coming soon - full {label.toLowerCase()} experience.</div>
          </div>
        </div>
      ))}
    </div>
  );
}