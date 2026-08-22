import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { navigateExternal, openExternalWindow, closeExternalWindow } from "@/lib/external-nav";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import {
  User, Shield, Moon, Sun, Bell, Lock, CreditCard, LogOut, Check, HelpCircle,
  ChevronDown, ExternalLink, CheckCircle2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  ensureConnectAccount,
  createConnectOnboardingLink,
  refreshConnectStatus,
} from "@/lib/stripe.functions";
import { useTheme, THEMES, type Theme } from "@/hooks/use-theme";
import { sanitizeErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings - Planet Baltimore" }] }),
});

const SECTIONS = [
  { id: "profile", label: "Profile", sub: "Display name, bio, links", icon: User },
  { id: "account", label: "Account", sub: "Email, neighborhood, role", icon: Shield },
  { id: "appearance", label: "Appearance", sub: "Dark mode & theme", icon: Moon },
  { id: "notifications", label: "Notifications", sub: "In-app & email preferences", icon: Bell },
  { id: "privacy", label: "Privacy & Safety", sub: "Visibility and data", icon: Lock },
  { id: "stripe", label: "Payouts", sub: "Get paid for tickets and sales", icon: CreditCard },
  { id: "help", label: "Help & FAQ", sub: "Guides, answers, and support", icon: HelpCircle },
];

const FAQS = [
  { q: "How do I get started on Planet Baltimore?", a: "Sign up, complete your profile in Settings, pick your neighborhood, and follow the onboarding tour. You can replay the tour any time from this Help page." },
  { q: "What is the difference between an Artist, a Resident, and a Visitor?", a: "Artists can post, create events, sell tickets, and appear on the Baltimore 100. Residents and Visitors can browse, follow, and buy tickets. You can request an artist upgrade from your Profile." },
  { q: "How do I post or create an event?", a: "Go to the Dashboard and use the composer at the top to post. To create an event, open the Events tab and tap Create Event. Only artists can post and host events." },
  { q: "How do I sell tickets?", a: "Open Settings, go to Payouts, and set up your payout account. Once it is active, you can set a ticket price on any event. Processing fees and Baltimore city tax are added automatically." },
  { q: "Why can I not see certain neighborhoods or artists?", a: "Planet Baltimore is Baltimore only. Make sure your neighborhood is set in Settings to Account. Use the Neighborhoods tab to explore artists and events by area." },
  { q: "How do I switch between light and dark mode?", a: "Use the Sun or Moon button in the sidebar footer. Your preference is saved to this device." },
  { q: "I forgot my password.", a: "Sign out, go to the Auth page, and use the reset link. A reset email will be sent to the address on your account." },
  { q: "How do I delete my account?", a: "Email us at help@planetbaltimore.com and we will remove your data within 7 days." },
  { q: "Something is broken or feels off.", a: "Tell us at help@planetbaltimore.com with a quick description and a screenshot. We read every message." },
];

function SettingsPage() {
  const profile = useCurrentProfile();
  const navigate = useNavigate();
  const [section, setSection] = useState("profile");
  useEffect(() => {
    const applyHash = () => {
      const h = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
      if (h) setSection(h);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);
  const [form, setForm] = useState({ display_name: "", bio: "", website: "", neighborhood: "" });
  const [dirty, setDirty] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<{ name: string }[]>([]);

  useEffect(() => {
    if (profile) setForm({
      display_name: profile.display_name || "", bio: profile.bio || "",
      website: profile.website || "", neighborhood: profile.neighborhood || "",
    });
  }, [profile]);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("neighborhoods").select("name").order("name");
    setNeighborhoods(data || []);
  })(); }, []);

  const save = async () => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update(form).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Settings saved"); setDirty(false);
  };
  const update = (k: string, v: string) => { setForm({...form, [k]: v}); setDirty(true); };
  const logout = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  return (
    <AppLayout title="Settings" subtitle="Manage your account and preferences">
      <div className="mb-6">
        <HeroBanner title="Settings" subtitle="Manage your account, appearance, notifications, and payments." />
      </div>
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${section===s.id ? "border-orange/40 bg-orange/10 text-foreground" : "border-border bg-card text-foreground hover:bg-accent"}`}>
              <s.icon className={`h-4 w-4 ${section===s.id ? "text-orange" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.sub}</div>
              </div>
            </button>
          ))}
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left text-sm font-semibold text-red-500 hover:bg-red-500/10">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </aside>

        <div className="rounded-2xl border border-border bg-card p-6">
          {section === "profile" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">Public Profile</h2>
                <p className="text-sm text-muted-foreground">This information is visible to other members.</p>
              </div>
              <Field label="Display Name"><input value={form.display_name} onChange={(e) => update("display_name", e.target.value)} className={fieldClass} /></Field>
              <Field label="Bio"><textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} rows={4} placeholder="Tell the community about yourself…" className={fieldClass} /></Field>
              <Field label="Website"><input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://yoursite.com" className={fieldClass} /></Field>
              <Field label="Email"><input value={profile?.email || ""} disabled className={`${fieldClass} bg-muted text-muted-foreground`} /><p className="mt-1 text-xs text-muted-foreground">Email is managed by your account provider.</p></Field>
              <button onClick={save} disabled={!dirty} className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:brightness-110">
                <Check className="h-4 w-4" /> Save Changes
              </button>
            </div>
          )}
          {section === "account" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-foreground">Account</h2>
              <Field label="Neighborhood">
                <select value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} className={fieldClass}>
                  <option value="">Select…</option>
                  {neighborhoods.map((n) => <option key={n.name}>{n.name}</option>)}
                </select>
              </Field>
              <Field label="Role"><div className="text-sm capitalize text-foreground">{profile?.role}</div></Field>
              <button onClick={save} disabled={!dirty} className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:brightness-110">
                <Check className="h-4 w-4" /> Save Changes
              </button>
            </div>
          )}
          {section === "appearance" && <AppearanceSection />}
          {section === "notifications" && <NotificationsSection />}
          {section === "privacy" && <PrivacySafetySection />}
          {section === "stripe" && <StripeSection />}
          {section === "help" && <HelpSection />}
        </div>
      </div>
    </AppLayout>
  );
}

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}

function HelpSection() {
  const [open, setOpen] = useState<number | null>(0);
  const replayTour = () => {
    try {
      localStorage.removeItem("pb_onboarding_done");
      localStorage.removeItem("pb_onboarding_tour_v1");
      // Signal the OnboardingTour component to auto-run when dashboard mounts.
      localStorage.setItem("pb_new_signup", "1");
    } catch {}
    window.location.href = "/dashboard";
  };
  const redoOnboarding = () => {
    try {
      localStorage.removeItem("pb_onboarding_done");
      localStorage.removeItem("pb_onboarding_tour_v1");
    } catch {}
    window.location.href = "/onboarding";
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Help & FAQ</h2>
        <p className="text-sm text-muted-foreground">Quick answers to the things people ask the most. Still stuck? Reach out and we will help.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={redoOnboarding} className="rounded-xl border border-[#d4580a]/30 bg-[#d4580a]/5 p-4 text-left transition hover:bg-[#d4580a]/10">
          <div className="text-sm font-semibold text-[#d4580a]">Redo onboarding</div>
          <div className="mt-1 text-xs text-muted-foreground">Restart the full welcome flow, pick your neighborhood, and follow suggested artists again.</div>
        </button>
        <button onClick={replayTour} className="rounded-xl border border-border bg-card p-4 text-left transition hover:bg-accent">
          <div className="text-sm font-semibold text-foreground">Replay the onboarding tour</div>
          <div className="mt-1 text-xs text-muted-foreground">Walk through every feature again, step by step.</div>
        </button>
        <a href="mailto:help@planetbaltimore.com" className="rounded-xl border border-border bg-card p-4 text-left transition hover:bg-accent">
          <div className="text-sm font-semibold text-foreground">Contact support</div>
          <div className="mt-1 text-xs text-muted-foreground">help@planetbaltimore.com — we usually reply within a day.</div>
        </a>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {FAQS.map((f, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-foreground">{f.q}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && (
              <div className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
const THEME_META: Record<Theme, { label: string; desc: string; swatch: string; bg: string; fg: string; accent: string }> = {
  light:    { label: "Cream",    desc: "Warm cream surfaces, orange accents.",  swatch: "from-[#fdf6e8] to-[#f3e4c5]", bg: "#fdf6e8", fg: "#181410", accent: "#e8761e" },
  dark:     { label: "Midnight Blue", desc: "Deep navy, soft contrast.",       swatch: "from-[#1a2538] to-[#0a1320]", bg: "#1a2538", fg: "#e8edf5", accent: "#5b8def" },
  midnight: { label: "Violet",   desc: "Indigo backdrop, electric violet pop.", swatch: "from-[#1f1a40] to-[#0d0a1f]", bg: "#1f1a40", fg: "#ebe7f7", accent: "#9b6cff" },
  sunset:   { label: "Sunset",   desc: "Warm peach with crimson highlights.",   swatch: "from-[#ffe6c8] to-[#ffb693]", bg: "#ffe6c8", fg: "#2b1410", accent: "#d83a2e" },
  forest:   { label: "Forest",   desc: "Deep evergreen with mossy gold.",       swatch: "from-[#1c2e22] to-[#0b1611]", bg: "#1c2e22", fg: "#e7efe5", accent: "#c8b76b" },
  rose:     { label: "Rose",     desc: "Soft blush light theme, ruby accents.", swatch: "from-[#fde2e8] to-[#f6b8c4]", bg: "#fde2e8", fg: "#26101a", accent: "#d33a55" },
  ocean:    { label: "Ocean",    desc: "Deep teal with cyan highlights.",       swatch: "from-[#0f2a3a] to-[#06141d]", bg: "#0f2a3a", fg: "#dff1f5", accent: "#3fc2d9" },
  mono:     { label: "Mono",     desc: "Pure grayscale, high contrast.",        swatch: "from-[#1a1a1a] to-[#000000]", bg: "#1a1a1a", fg: "#f5f5f5", accent: "#ffffff" },
};

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const isDark = ["dark", "midnight", "forest", "ocean", "mono"].includes(theme);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Appearance</h2>
        <p className="text-sm text-muted-foreground">
          Pick how Planet Baltimore looks on this device. Themes affect the whole app except the public landing page. Current theme: <span className="font-medium text-foreground capitalize">{THEME_META[theme]?.label || theme}</span>.
        </p>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Mode</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme("light")}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${!isDark ? "border-orange ring-2 ring-orange/30" : "border-border hover:bg-accent"}`}
          >
            <Sun className="h-5 w-5 text-orange" />
            <div>
              <div className="text-sm font-semibold text-foreground">Light Mode</div>
              <div className="text-xs text-muted-foreground">Bright surfaces</div>
            </div>
            {!isDark && <Check className="ml-auto h-4 w-4 text-orange" />}
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${isDark ? "border-orange ring-2 ring-orange/30" : "border-border hover:bg-accent"}`}
          >
            <Moon className="h-5 w-5 text-orange" />
            <div>
              <div className="text-sm font-semibold text-foreground">Dark Mode</div>
              <div className="text-xs text-muted-foreground">Low-light friendly</div>
            </div>
            {isDark && <Check className="ml-auto h-4 w-4 text-orange" />}
          </button>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Themes</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {THEMES.map((id) => {
          const meta = THEME_META[id];
          const active = theme === id;
          return (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={`group rounded-xl border p-3 text-left transition ${active ? "border-orange ring-2 ring-orange/30" : "border-border hover:bg-accent"}`}
            >
              <div
                className="relative mb-3 h-20 w-full overflow-hidden rounded-lg border border-border"
                style={{ background: `linear-gradient(135deg, ${meta.bg}, ${meta.bg})` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${meta.swatch}`} />
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full" style={{ background: meta.accent }} />
                  <span className="h-2 flex-1 rounded-full" style={{ background: meta.fg, opacity: 0.85 }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{meta.label}</span>
                {active && <Check className="ml-auto h-4 w-4 text-orange" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{meta.desc}</p>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}

type NotifPrefs = {
  new_follower: boolean;
  new_message: boolean;
  event_reminders: boolean;
  post_likes: boolean;
  post_comments: boolean;
  email_digest: boolean;
};
const DEFAULT_NOTIFS: NotifPrefs = {
  new_follower: true, new_message: true, event_reminders: true,
  post_likes: true, post_comments: true, email_digest: false,
};

function NotificationsSection() {
  const me = useCurrentProfile();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIFS);

  useEffect(() => {
    if (!me) return;
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", me.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setPrefs({ ...DEFAULT_NOTIFS, ...(data as NotifPrefs) }); });
  }, [me?.id]);

  const toggle = async (k: keyof NotifPrefs) => {
    if (!me) { toast.error("Please sign in"); return; }
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: me.id, ...next });
    if (error) {
      setPrefs(prefs);
      toast.error(error.message);
      return;
    }
    toast.success("Preference saved");
  };

  const groups: { title: string; items: { k: keyof NotifPrefs; label: string; sub: string }[] }[] = [
    { title: "People", items: [
      { k: "new_follower", label: "New followers", sub: "When someone new follows your profile." },
      { k: "new_message", label: "Direct messages", sub: "When someone sends you a message." },
    ]},
    { title: "Activity", items: [
      { k: "post_likes", label: "Likes on my posts", sub: "When someone likes your post." },
      { k: "post_comments", label: "Comments and replies", sub: "When someone comments on your posts and events." },
      { k: "event_reminders", label: "Event reminders", sub: "Reminders for events you are going to." },
    ]},
    { title: "Digest", items: [
      { k: "email_digest", label: "Weekly Baltimore digest", sub: "A summary of the week in Baltimore: top artists, events, and stories." },
    ]},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground">Choose how Planet Baltimore reaches you. Preferences save automatically.</p>
      </div>
      {groups.map((g) => (
        <div key={g.title} className="rounded-xl border border-border">
          <div className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</div>
          <div className="divide-y divide-border">
            {g.items.map((it) => (
              <div key={it.k} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">{it.label}</div>
                  <div className="text-xs text-muted-foreground">{it.sub}</div>
                </div>
                <button
                  onClick={() => toggle(it.k)}
                  aria-pressed={prefs[it.k]}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${prefs[it.k] ? "bg-orange" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition ${prefs[it.k] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrivacySafetySection() {
  const items = [
    { title: "Who can see your profile",
      body: "Your display name, username, bio, neighborhood, photos, posts, and events are visible to anyone on Planet Baltimore. Your email and phone are never shown publicly." },
    { title: "Who can message you",
      body: "Any signed-in member of Planet Baltimore can start a conversation with you. We are working on per-account message controls. Until then, you can block individual users by reporting them." },
    { title: "Location and Baltimore verification",
      body: "We use your device location once, at sign-up and when you upgrade to Artist, to confirm you are inside Baltimore City. We do not track your live location, and your coordinates are never shown to other members." },
    { title: "Payments and tickets",
      body: "Ticket payments are processed by a PCI-compliant payments partner. Planet Baltimore never sees your full card number. Artists receive payouts directly to their own linked bank account." },
    { title: "Your data",
      body: "You own your content. You can edit or delete any post, event, message, or photo from your profile at any time. To delete your full account and all associated data, email help@planetbaltimore.com and we will remove everything within 7 days." },
    { title: "Safety and reporting",
      body: "If you see harassment, spam, impersonation, or anything that does not belong on Planet Baltimore, email help@planetbaltimore.com with a screenshot. Admins review reports daily and can ban accounts that break community rules." },
    { title: "Children",
      body: "Planet Baltimore is for people 13 and older. We remove any account we learn belongs to a child under 13." },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Privacy & Safety</h2>
        <p className="text-sm text-muted-foreground">How we handle your information and keep Planet Baltimore safe for everyone.</p>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((it) => (
          <div key={it.title} className="px-4 py-4">
            <div className="text-sm font-semibold text-foreground">{it.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{it.body}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <a href="/privacy" className="rounded-full border border-border px-4 py-2 font-medium text-foreground hover:bg-accent">Read full Privacy Policy</a>
        <a href="/terms" className="rounded-full border border-border px-4 py-2 font-medium text-foreground hover:bg-accent">Terms of Service</a>
        <a href="mailto:help@planetbaltimore.com" className="rounded-full bg-orange px-4 py-2 font-semibold text-white hover:brightness-110">Contact safety team</a>
      </div>
    </div>
  );
}

function StripeSection() {
  const profile = useCurrentProfile();
  const ensureFn = useServerFn(ensureConnectAccount);
  const linkFn = useServerFn(createConnectOnboardingLink);
  const refreshFn = useServerFn(refreshConnectStatus);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; chargesEnabled: boolean; status?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.stripe_account_id) { setStatus({ connected: false, chargesEnabled: false }); return; }
    refreshFn().then((s) => setStatus(s)).catch(() => setStatus({
      connected: !!profile?.stripe_account_id,
      chargesEnabled: !!profile?.stripe_charges_enabled,
    }));
  }, [profile?.id, profile?.stripe_account_id, profile?.stripe_charges_enabled, refreshFn]);

  const onboard = async () => {
    const pre = openExternalWindow();
    setBusy(true);
    setErrorMsg(null);
    try {
      const account = await ensureFn();
      if (!account.ok) {
        setErrorMsg(account.message);
        toast.error(account.message);
        closeExternalWindow(pre);
        setBusy(false);
        return;
      }
      const { url } = await linkFn({ data: {
        returnUrl: `${window.location.origin}/settings?stripe=ok`,
        refreshUrl: `${window.location.origin}/settings?stripe=refresh`,
      }});
      navigateExternal(url, pre);
    } catch (e) {
      closeExternalWindow(pre);
      const message = sanitizeErrorMessage(e, "Could not start payout setup");
      setErrorMsg(message);
      toast.error(message);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Payouts</h2>
        <p className="text-sm text-muted-foreground">Set up your payout account so you can sell tickets and get paid directly to your bank. Planet Baltimore never holds your money.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 text-orange" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Your payout account</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {status?.chargesEnabled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected & active
                </span>
              ) : status?.connected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5" /> Onboarding incomplete
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  Not connected
                </span>
              )}
              <button onClick={onboard} disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
                {busy ? "Opening secure form…" : status?.chargesEnabled ? "Update payout details" : "Set up payouts"} <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        {errorMsg ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="font-semibold">Payout setup is not available yet</div>
            <div className="mt-1">{errorMsg}</div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-foreground">
        <h4 className="mb-3 text-base font-semibold">How to set up payouts (3 minutes)</h4>
        <ol className="list-decimal space-y-3 pl-5 text-muted-foreground">
          <li><span className="font-semibold text-foreground">Tap "Set up payouts"</span> above. A secure form opens where you verify your identity.</li>
          <li><span className="font-semibold text-foreground">Enter your info.</span> You'll be asked for your legal name, date of birth, address, and the last 4 of your SSN. This is required by US law for anyone receiving money online. We never see this information.</li>
          <li><span className="font-semibold text-foreground">Add your bank account.</span> Choose the checking account where you want your money to land. Payouts arrive every 2 business days.</li>
          <li><span className="font-semibold text-foreground">Come back to Planet Baltimore.</span> You'll be sent back here automatically. The badge above turns green when you're ready to sell items on the platform.</li>
          <li><span className="font-semibold text-foreground">Create an event and set a price.</span> Enter the amount you want to net. We add the processing fee and the platform fee on top, so the buyer pays the total and you keep the full price you set. The total fee is the lowest in the industry.</li>
        </ol>
        <div className="mt-4 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
          Need help? Email <a href="mailto:help@planetbaltimore.com" className="font-semibold text-orange hover:underline">help@planetbaltimore.com</a> and we'll walk you through it over the phone.
        </div>
      </div>
    </div>
  );
}
