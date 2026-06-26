import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import {
  User, Shield, Moon, Bell, Lock, CreditCard, LogOut, Check, HelpCircle,
  ChevronDown, ExternalLink, CheckCircle2, AlertCircle, Sun, Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  ensureConnectAccount,
  createConnectOnboardingLink,
  refreshConnectStatus,
} from "@/lib/stripe.functions";
import { useTheme, type Theme } from "@/hooks/use-theme";

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
  { id: "stripe", label: "Stripe Payments", sub: "Connect Stripe to sell tickets", icon: CreditCard },
  { id: "help", label: "Help & FAQ", sub: "Guides, answers, and support", icon: HelpCircle },
];

const FAQS = [
  { q: "How do I get started on Planet Baltimore?", a: "Sign up, complete your profile in Settings, pick your neighborhood, and follow the onboarding tour. You can replay the tour any time from this Help page." },
  { q: "What is the difference between an Artist and an Attendee?", a: "Artists can post, create events, sell tickets, and appear on the Baltimore 100. Attendees can browse, follow, and buy tickets. You can request an artist upgrade from your Profile." },
  { q: "How do I post or create an event?", a: "Go to the Dashboard and use the composer at the top to post. To create an event, open the Events tab and tap Create Event. Only artists can post and host events." },
  { q: "How do I sell tickets?", a: "Open Settings, go to Stripe Payments, and connect your Stripe account. Once connected, you can set a ticket price on any event. Stripe fees and Baltimore city tax are added automatically." },
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
    try { localStorage.removeItem("pb_onboarding_done"); } catch {}
    window.location.href = "/dashboard";
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Help & FAQ</h2>
        <p className="text-sm text-muted-foreground">Quick answers to the things people ask the most. Still stuck? Reach out and we will help.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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