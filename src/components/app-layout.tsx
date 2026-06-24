import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, Palette, Landmark, Building2, Calendar as CalendarIcon, ShieldCheck,
  Ticket, Users, MessageSquare, MapPin, Bell, User,
  BookOpen, Video as VideoIcon, Trophy, Settings as SettingsIcon, LogOut,
  Plus, Sparkles, ChevronLeft, X, Menu, Shield, Sun, Moon,
} from "lucide-react";
import pbLogo from "@/assets/pb-logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe } from "@/components/globe";
import { motion } from "motion/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OnboardingTour } from "@/components/onboarding-tour";
import { useUserRole } from "@/hooks/use-user-role";
import { useTheme } from "@/hooks/use-theme";

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
  stripe_account_id: string | null;
  stripe_account_status: string | null;
  stripe_charges_enabled: boolean;
};

const HOME = { to: "/dashboard", icon: Home, label: "Home", tour: "nav-home" } as const;

const NAV = [
  { section: "Explore", items: [
    { to: "/events", icon: Ticket, label: "Events", tour: "nav-events" },
    { to: "/calendar", icon: CalendarIcon, label: "Calendar", tour: "nav-calendar" },
    { to: "/neighborhoods", icon: MapPin, label: "Neighborhoods", tour: "nav-neighborhoods" },
  ]},
  { section: "Community", items: [
    { to: "/artists", icon: Palette, label: "Artists", tour: "nav-artists" },
    { to: "/arts-orgs", icon: Landmark, label: "Arts Orgs" },
    { to: "/businesses", icon: Building2, label: "Businesses" },
    { to: "/community-associations", icon: ShieldCheck, label: "Community Associations" },
    { to: "/groups", icon: Users, label: "Groups" },
  ]},
  { section: "Content", items: [
    { to: "/stories", icon: BookOpen, label: "Stories", tour: "nav-stories" },
    { to: "/videos", icon: VideoIcon, label: "Videos" },
    { to: "/leaderboard", icon: Trophy, label: "Baltimore 100", tour: "nav-leaderboard" },
  ]},
  { section: "Account", items: [
    { to: "/settings", icon: SettingsIcon, label: "Settings" },
  ]},
] as const;

export function useCurrentProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { navigate({ to: "/auth" }); return; }
      const { data: p } = await supabase.from("profiles")
        .select("id, display_name, username, email, avatar_url, role, neighborhood, bio, website, banner_url, stripe_account_id, stripe_account_status, stripe_charges_enabled")
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isAdmin } = useUserRole();
  const { theme, toggleTheme } = useTheme();

  // Heartbeat: ping last_seen_at so admins can see who is live.
  useEffect(() => {
    let active = true;
    const ping = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || !active) return;
      await supabase.rpc("touch_last_seen");
    };
    void ping();
    const t = setInterval(ping, 60_000);
    return () => { active = false; clearInterval(t); };
  }, []);

  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };
  const initials = useMemo(() => {
    const n = profile?.display_name || profile?.email || "U";
    return n.slice(0, 2).toUpperCase();
  }, [profile]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top header */}
      <header className="sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-background/90 px-3 py-2.5 backdrop-blur md:hidden">
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <Link to="/dashboard" className="flex items-center justify-center gap-1.5">
          <img src={pbLogo} alt="Planet Baltimore" className="h-7 w-7" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em]">Planet Baltimore</span>
        </Link>
        <div className="justify-self-end">
          <NotificationsBell />
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog">
          <button
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-full w-[82%] max-w-[320px] flex-col bg-background px-4 py-5"
          >
            <div className="mb-6 flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
                <img src={pbLogo} alt="Planet Baltimore" className="h-10 w-10" />
                <span className="text-sm font-semibold uppercase tracking-wide">Planet Baltimore</span>
              </Link>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
              <Link
                to={HOME.to}
                data-tour={HOME.tour}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition ${
                  pathname === HOME.to ? "bg-orange text-white" : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <Home className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                <span className="truncate">{HOME.label}</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition ${
                    pathname === "/admin" ? "bg-orange text-white" : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  <span className="truncate">Admin</span>
                </Link>
              )}
              {NAV.map((section) => (
                <div key={section.section}>
                  <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    {section.section}
                  </div>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = pathname === item.to;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          data-tour={(item as { tour?: string }).tour}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition ${
                            active ? "bg-orange text-white" : "text-neutral-700 hover:bg-neutral-100"
                          }`}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <button
              onClick={signOut}
              className="mt-3 flex w-full items-center gap-3 rounded-lg border-t border-neutral-100 px-3 pt-4 text-[14px] font-medium text-neutral-600"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} /> Sign out
            </button>
          </motion.aside>
        </div>
      )}

      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`sticky top-0 hidden h-screen ${collapsed ? "w-16" : "w-60"} shrink-0 flex-col border-r border-border bg-background px-3 py-6 md:flex transition-all`}>
          <Link to="/dashboard" className="mb-8 flex items-center justify-center px-1">
            <img src={pbLogo} alt="Planet Baltimore" className="h-14 w-14 shrink-0" />
          </Link>

          <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
            <Link
              key={HOME.to}
              to={HOME.to}
              data-tour={HOME.tour}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                pathname === HOME.to
                  ? "bg-orange text-white"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              <Home className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="truncate">{HOME.label}</span>}
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className={`group mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                  pathname === "/admin"
                    ? "bg-orange text-white"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <Shield className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="truncate">Admin</span>}
              </Link>
            )}
            {NAV.map((section) => (
              <div key={section.section}>
                {!collapsed && (
                  <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    {section.section}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        data-tour={(item as { tour?: string }).tour}
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
                </div>
              </div>
            ))}
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
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} /> : <Moon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />}
              {!collapsed && (theme === "dark" ? "Light mode" : "Dark mode")}
            </button>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} /> {!collapsed && "Sign out"}
            </button>
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="mt-1 flex w-full items-center justify-center rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} />
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-4 sm:px-6 md:px-10 md:py-8 md:pb-10 bg-background">
          <div className="mb-4 hidden justify-end md:flex">
            <NotificationsBell />
          </div>
          {hero && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-end sm:justify-between sm:pb-6"
            >
              <div className="min-w-0">
                <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-[34px]">{title}</h1>
                {subtitle && <p className="mt-1 max-w-xl text-[12.5px] leading-snug text-neutral-500 sm:mt-1.5 sm:text-sm">{subtitle}</p>}
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
            className={hero ? "mt-5 md:mt-8" : ""}
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
          { to: "/events", icon: Ticket, label: "Events" },
          { to: "/calendar", icon: CalendarIcon, label: "Calendar" },
          { to: "/leaderboard", icon: Trophy, label: "Top 100" },
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
      <MessageBubble />
      <OnboardingTour />
    </div>
  );
}

function NotificationsBell() {
  const [items] = useState<{ id: string; title: string; body: string; time: string }[]>([]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          data-tour="notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 transition hover:bg-neutral-100 hover:text-orange md:h-10 md:w-10 md:border md:border-neutral-200 md:bg-white md:text-neutral-600"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          {items.length > 0 && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <span className="text-[11px] text-neutral-400">{items.length} new</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-neutral-400">
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {items.map((n) => (
                <li key={n.id} className="px-4 py-3 hover:bg-neutral-50">
                  <div className="text-sm font-medium text-neutral-900">{n.title}</div>
                  <div className="text-xs text-neutral-500">{n.body}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-400">{n.time}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MessageBubble() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Messages"
        className="fixed bottom-[68px] right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange text-white shadow-lg transition hover:brightness-110 md:bottom-6 md:right-6 md:h-14 md:w-14"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-32 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl md:bottom-24 md:right-6 md:w-80"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <h3 className="text-sm font-semibold">Messages</h3>
            <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-900">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 py-10 text-center text-xs text-neutral-400">
            No messages yet.
          </div>
          <div className="border-t border-neutral-100 p-3">
            <button
              onClick={() => { setOpen(false); navigate({ to: "/messages" }); }}
              className="w-full rounded-full bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800"
            >
              Open inbox
            </button>
          </div>
        </motion.div>
      )}
    </>
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