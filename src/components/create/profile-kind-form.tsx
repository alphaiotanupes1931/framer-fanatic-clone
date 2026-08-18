import { useEffect, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/shared/image-upload";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/categories";

export function ProfileKindForm({ kind, saveLabel }: { kind: "resident" | "visitor"; saveLabel: string }) {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("neighborhoods").select("id,name").order("name");
      setNeighborhoods((data ?? []) as Array<{ id: string; name: string }>);
    })();
  }, []);
  const [form, setForm] = useState({
    display_name: "",
    neighborhood: "",
    city: "",
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
        city: (me as { city?: string }).city || f.city,
        bio: me.bio || f.bio,
        website: me.website || f.website,
        avatar_url: me.avatar_url || f.avatar_url,
        banner_url: (me as { banner_url?: string }).banner_url || f.banner_url,
      }));
    }
  }, [me]);

  const isVisitor = kind === "visitor";
  const canSubmit =
    form.display_name.trim().length > 1 &&
    (isVisitor ? form.city.trim().length > 1 : form.neighborhood.trim().length > 1);

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (form.display_name.trim().length < 2) { toast.error("Display name is required"); return; }
    if (isVisitor && form.city.trim().length < 2) { toast.error("City is required"); return; }
    if (!isVisitor && form.neighborhood.trim().length < 2) { toast.error("Neighborhood is required"); return; }
    setSaving(true);
    try {
      // Resident/Visitor pages are standalone pages (like artist pages).
      // They must NOT modify the account profile the user signed up with.
      const slug = `${slugify(form.display_name) || kind}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from("organizations").insert({
        owner_id: me.id,
        type: kind,
        subtype: kind === "resident" ? "Resident" : "Visitor",
        name: form.display_name.trim(),
        slug,
        neighborhood: isVisitor ? form.city.trim() || null : form.neighborhood.trim() || null,
        bio: form.bio.trim() || null,
        website: form.website.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        banner_url: form.banner_url.trim() || null,
      }).select("slug").single();
      if (error) throw error;
      toast.success(kind === "resident" ? "Resident page created" : "Visitor page created");
      await router.invalidate();
      await navigate({ to: "/o/$slug", params: { slug: data.slug } });
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
      {isVisitor ? (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">City<span className="text-orange"> *</span></Label>
          <Input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={80} placeholder="Where are you visiting from?" />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Neighborhood<span className="text-orange"> *</span></Label>
          <select
            value={form.neighborhood}
            onChange={(e) => set("neighborhood", e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select neighborhood...</option>
            {neighborhoods.map((n) => (
              <option key={n.id} value={n.name}>{n.name}</option>
            ))}
          </select>
        </div>
      )}
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