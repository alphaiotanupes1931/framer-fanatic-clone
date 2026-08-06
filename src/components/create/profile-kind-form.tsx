import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/shared/image-upload";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setMyProfileKind } from "@/lib/profile-kind";

export function ProfileKindForm({ kind, saveLabel }: { kind: "resident" | "visitor"; saveLabel: string }) {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    neighborhood: "",
    bio: "",
    website: "",
    avatar_url: "",
    banner_url: "",
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
        banner_url: (me as { banner_url?: string }).banner_url || f.banner_url,
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
        category: kind === "resident" ? "Resident" : "Visitor",
        neighborhood: form.neighborhood.trim() || null,
        bio: form.bio.trim() || null,
        website: form.website.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        banner_url: form.banner_url.trim() || null,
      }).eq("id", me.id);
      if (error) throw error;
      await setMyProfileKind(kind);
      toast.success("Profile saved");
      window.location.href = "/profile";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Display name<span className="text-orange"> *</span></Label>
        <Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} maxLength={80} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Neighborhood</Label>
        <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} maxLength={80} placeholder={kind === "visitor" ? "Where are you visiting from?" : ""} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Bio</Label>
        <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={4} maxLength={1000} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Website</Label>
        <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" maxLength={200} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Avatar image</Label>
          <ImageUpload value={form.avatar_url} onChange={(v) => set("avatar_url", v)} label="Upload avatar image" bucket="avatars" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Banner image</Label>
          <ImageUpload value={form.banner_url} onChange={(v) => set("banner_url", v)} label="Upload banner image" bucket="avatars" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={!canSubmit || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}