import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/shared/image-upload";
import { Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { Img } from "@/components/shared/smart-img";
import { STORED_URL_TTL, compressAvatar } from "@/lib/image-compress";
import { setMyProfileKind } from "@/lib/profile-kind";

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

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "artist";
}

function CreateArtistPage() {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    display_name: "",
    category: "Music",
    neighborhood: "",
    bio: "",
    website: "",
    avatar_url: "",
    banner_url: "",
  });
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const uploadAvatar = async (file: File) => {
    file = await compressAvatar(file);
    if (!me) { toast.error("Please sign in"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image is too large (max 10MB)"); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${me.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type || "image/jpeg", cacheControl: "3600" });
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage.from("avatars").createSignedUrl(path, STORED_URL_TTL);
      if (signErr || !data) throw signErr || new Error("Could not sign URL");
      setForm((f) => ({ ...f, avatar_url: data.signedUrl }));
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (me) {
      setForm((f) => ({
        ...f,
        neighborhood: f.neighborhood || me.neighborhood || "",
      }));
    }
  }, [me]);

  const canSubmit = form.display_name.trim().length > 1;

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!canSubmit) { toast.error("Artist name is required"); return; }
    setSaving(true);
    try {
      // Artist pages are standalone organization pages. They must NOT change
      // the owner's personal (resident/visitor) profile in any way.
      const slug = `${slugify(form.display_name)}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from("organizations").insert({
        owner_id: me.id,
        type: "artist",
        subtype: form.category,
        name: form.display_name.trim(),
        slug,
        neighborhood: form.neighborhood.trim() || null,
        bio: form.bio.trim() || null,
        website: form.website.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        banner_url: form.banner_url.trim() || null,
      }).select("slug").single();
      if (error) throw error;
      toast.success("Artist page created");
      navigate({ to: "/o/$slug", params: { slug: data.slug } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Artist Page" subtitle="Make as many artist pages as you like, one for each project or alias." />
        <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Artist name<span className="text-orange"> *</span></Label>
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
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Website</Label>
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" maxLength={200} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Page photo</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100">
                {form.avatar_url ? (
                  <Img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-400"><Camera className="h-6 w-6" /></div>
                )}
              </div>
              <div>
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {form.avatar_url ? "Change photo" : "Upload photo"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); e.target.value = ""; }}
                />
                <p className="mt-1 text-xs text-neutral-500">PNG or JPG, up to 10MB.</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Banner image</Label>
            <ImageUpload value={form.banner_url} onChange={(v) => setForm((f) => ({ ...f, banner_url: v }))} label="Upload banner image" bucket="avatars" />
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={!canSubmit || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Artist Page
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}