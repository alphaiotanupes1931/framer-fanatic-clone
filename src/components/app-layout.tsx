import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, Palette, Landmark, Building2, Calendar as CalendarIcon, ShieldCheck,
  Ticket, Users, MessageSquare, MapPin, Bell, User,
  BookOpen, Video as VideoIcon, Trophy, Settings as SettingsIcon, LogOut,
  Plus, X, Menu, Shield, Sun, Moon, Bookmark, HandHeart,
} from "lucide-react";
import pbLogo from "@/assets/pb-logo.png";
import pbLogoDark from "@/assets/pb-logo-dark.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe } from "@/components/globe";
import { motion, AnimatePresence } from "motion/react";
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
  ]},
  { section: "Account", items: [
    { to: "/saved", icon: Bookmark, label: "Saved" },
    { to: "/support", icon: HandHeart, label: "Support" },
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
          <img src={theme === "dark" ? pbLogoDark : pbLogo} alt="Planet Baltimore" className="h-7 w-7" />
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
                <img src={theme === "dark" ? pbLogoDark : pbLogo} alt="Planet Baltimore" className="h-10 w-10" />
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
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-background px-3 py-6 md:flex">
          <Link to="/dashboard" className="mb-8 flex items-center justify-center px-1">
            <img src={theme === "dark" ? pbLogoDark : pbLogo} alt="Planet Baltimore" className="h-14 w-14 shrink-0" />
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
              <span className="truncate">{HOME.label}</span>
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
                        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 ${
                          active
                            ? "bg-orange text-white"
                            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
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

          <div className="mt-4 border-t border-neutral-100 pt-3">
            {profile && (
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
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} /> Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-4 sm:px-6 md:px-10 md:py-8 md:pb-10 bg-background">
          <div className="mb-4 hidden justify-end md:flex">
            <NotificationsBell />
          </div>
          {hero && (
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
              <div className="min-w-0">
                <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground sm:text-[34px]">{title}</h1>
                {subtitle && <p className="mt-1 max-w-xl text-[12.5px] leading-snug text-muted-foreground sm:mt-1.5 sm:text-sm">{subtitle}</p>}
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
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={hero ? "mt-5 md:mt-8" : ""}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <aside className="sticky top-0 hidden h-screen w-80 shrink-0 overflow-y-auto border-l border-border bg-background px-5 py-8 xl:block">
          <RightRail />
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-background py-2 md:hidden">
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
  const profile = useCurrentProfile();
  const navigate = useNavigate();
  const [items] = useState<{ id: string; title: string; body: string; time: string }[]>([]);
  const missing: { key: string; title: string; body: string }[] = [];
  if (profile) {
    if (!profile.avatar_url) missing.push({ key: "avatar", title: "Add a profile photo", body: "Help neighbors recognize you in the feed." });
    if (!profile.neighborhood) missing.push({ key: "neighborhood", title: "Set your neighborhood", body: "Show up on the Baltimore map." });
    if (!profile.display_name) missing.push({ key: "name", title: "Add your display name", body: "Use your real name or stage name." });
  }
  const totalCount = items.length + missing.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          data-tour="notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-card-foreground/80 transition hover:bg-accent hover:text-orange md:h-10 md:w-10 md:border md:border-border"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          {totalCount > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <span className="text-[11px] text-neutral-400">{totalCount} new</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {totalCount === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-neutral-400">
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-white/10">
              {missing.length > 0 && (
                <li className="bg-red-500/5 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-red-500">Complete your profile</div>
                  <ul className="mt-2 space-y-2">
                    {missing.map((m) => (
                      <li key={m.key}>
                        <button
                          onClick={() => navigate({ to: "/profile" })}
                          className="w-full text-left rounded-md px-2 py-1.5 hover:bg-red-500/10"
                        >
                          <div className="text-sm font-medium">{m.title}</div>
                          <div className="text-xs text-muted-foreground">{m.body}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
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
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const compute = async () => {
      const { data: auth } = await supabase.auth.getSession();
      const uid = auth.session?.user.id;
      if (!uid) { if (!cancelled) setUnread(0); return; }
      const { data: convos } = await supabase
        .from("conversations")
        .select("id, user_a, user_b, last_message_at, last_read_at_a, last_read_at_b")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`);
      if (!convos || cancelled) return;
      const count = convos.filter((c) => {
        const mine = c.user_a === uid ? c.last_read_at_a : c.last_read_at_b;
        return c.last_message_at && (!mine || new Date(c.last_message_at) > new Date(mine));
      }).length;
      setUnread(count);
    };
    void compute();
    const ch = supabase
      .channel("msg-bubble-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void compute())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, () => void compute())
      .subscribe();
    const t = setInterval(compute, 30_000);
    return () => { cancelled = true; clearInterval(t); void supabase.removeChannel(ch); };
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Messages"
        className="fixed bottom-[68px] right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange text-white shadow-lg transition hover:brightness-110 md:bottom-6 md:right-6 md:h-14 md:w-14"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
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
  const [leaders, setLeaders] = useState<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null; category: string | null; score: number }[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; starts_at: string | null; location: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: e }] = await Promise.all([
        supabase.rpc("top_creators", { lim: 20 }),
        supabase
          .from("events")
          .select("id, title, starts_at, location")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(3),
      ]);
      setLeaders((a as typeof leaders) || []);
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
            <Trophy className="h-3 w-3" /> Top 20 Creators
          </h3>
          <Link to="/artists" className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900">All</Link>
        </div>
        {leaders.length === 0 ? (
          <p className="text-xs text-neutral-400">No creators yet.</p>
        ) : (
          <ol className="space-y-2">
            {leaders.map((a, i) => {
              const medal =
                i === 0 ? "bg-amber-400 text-amber-950"
                : i === 1 ? "bg-zinc-300 text-zinc-800"
                : i === 2 ? "bg-orange-400 text-orange-950"
                : "bg-muted text-muted-foreground";
              return (
                <li key={a.id}>
                  <Link
                    to="/u/$username"
                    params={{ username: a.username || a.id }}
                    className="flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-accent"
                  >
                    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${medal}`}>
                      {i + 1}
                    </span>
                    <Avatar className="h-8 w-8">
                      {a.avatar_url && <AvatarImage src={a.avatar_url} />}
                      <AvatarFallback className="bg-muted text-[11px] text-muted-foreground">
                        {(a.display_name || a.username || "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium text-foreground">{a.display_name || a.username || "Anonymous"}</div>
                      <div className="truncate text-[10.5px] capitalize text-muted-foreground">{(a.category || "Artist").replace(/_/g, " ")}</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
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

function ArtistMiniRow({ artist }: { artist: { display_name: string | null; username: string | null; neighborhood: string | null; avatar_url: string | null } }) {
  return (
    <>
      <Avatar className="h-9 w-9">
        {artist.avatar_url && <AvatarImage src={artist.avatar_url} />}
        <AvatarFallback className="bg-muted text-[11px] text-muted-foreground">
          {(artist.display_name || artist.username || "?").slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-foreground">{artist.display_name || artist.username || "Anonymous"}</div>
        <div className="truncate text-[11px] text-muted-foreground">{artist.neighborhood || "Baltimore"}</div>
      </div>
    </>
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