import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { User, Shield, Moon, Bell, Lock, CreditCard, LogOut, Check } from "lucide-react";
import { toast } from "sonner";

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
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${section===s.id ? "border-orange-300 bg-orange-50" : "border-neutral-200 bg-white hover:bg-neutral-50"}`}>
              <s.icon className={`h-4 w-4 ${section===s.id ? "text-orange-600" : "text-neutral-500"}`} />
              <div className="flex-1">
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-xs text-neutral-500">{s.sub}</div>
              </div>
            </button>
          ))}
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </aside>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          {section === "profile" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">Public Profile</h2>
                <p className="text-sm text-neutral-500">This information is visible to other members.</p>
              </div>
              <Field label="Display Name"><input value={form.display_name} onChange={(e) => update("display_name", e.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></Field>
              <Field label="Bio"><textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} rows={4} placeholder="Tell the community about yourself…" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></Field>
              <Field label="Website"><input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://yoursite.com" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" /></Field>
              <Field label="Email"><input value={profile?.email || ""} disabled className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500" /><p className="mt-1 text-xs text-neutral-400">Email is managed by your account provider.</p></Field>
              <button onClick={save} disabled={!dirty} className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-orange-700">
                <Check className="h-4 w-4" /> Save Changes
              </button>
            </div>
          )}
          {section === "account" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold">Account</h2>
              <Field label="Neighborhood">
                <select value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  {neighborhoods.map((n) => <option key={n.name}>{n.name}</option>)}
                </select>
              </Field>
              <Field label="Role"><div className="text-sm capitalize">{profile?.role}</div></Field>
              <button onClick={save} disabled={!dirty} className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-orange-700">
                <Check className="h-4 w-4" /> Save Changes
              </button>
            </div>
          )}
          {!["profile","account"].includes(section) && (
            <div className="py-12 text-center text-neutral-500">
              <h3 className="text-lg font-semibold">{SECTIONS.find((s) => s.id===section)?.label}</h3>
              <p className="mt-1 text-sm">Coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}