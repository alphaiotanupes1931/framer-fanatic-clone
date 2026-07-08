import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/create-artist")({
  component: CreateArtistPage,
  head: () => ({
    meta: [
      { title: "Create Artist Profile - Planet Baltimore" },
      { name: "description", content: "Set up your artist profile on Planet Baltimore." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const CATEGORIES = ["Music", "Visual Art", "Photography", "Film", "Writing", "Design", "Fashion", "Food", "Performance", "Other"];

function CreateArtistPage() {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    category: "Music",
    neighborhood: "",
    bio: "",
    website: "",
    avatar_url: "",
  });
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (me) {
      setForm((f) => ({
        ...f,
        display_name: me.display_name || f.display_name,
        neighborhood: me.neighborhood || f.neighborhood,
        bio: me.bio || f.bio,
        website: me.website || f.website,
        avatar_url: me.avatar_url || f.avatar_url,
      }));
    }
  }, [me]);

  const canSubmit = form.display_name.trim().length > 1;

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!canSubmit) { toast.error("Display name is required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        display_name: form.display_name.trim(),
        category: form.category,
        neighborhood: form.neighborhood.trim() || null,
        bio: form.bio.trim() || null,
        website: form.website.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
      }).eq("id", me.id);
      if (error) throw error;
      toast.success("Artist profile saved");
      navigate({ to: "/profile" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Artist Profile" subtitle="Claim your spot on the Baltimore scene." />
        <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Display name<span className="text-orange"> *</span></Label>
            <Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} maxLength={80} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Category</Label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Neighborhood</Label>
              <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} maxLength={80} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Bio</Label>
            <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={4} maxLength={1000} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Website</Label>
              <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Avatar image URL</Label>
              <Input value={form.avatar_url} onChange={(e) => set("avatar_url", e.target.value)} placeholder="https://" maxLength={500} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={!canSubmit || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Artist Profile
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}