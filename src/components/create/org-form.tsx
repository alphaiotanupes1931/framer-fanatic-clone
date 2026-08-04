import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "org";
}

export type OrgType = "arts_org" | "business" | "community_assoc" | "group";

export function OrgForm({ type, kindLabel }: { type: OrgType; kindLabel: string }) {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    bio: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    neighborhood: "",
    avatar_url: "",
    banner_url: "",
    mission: "",
  });
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const uploadImage = async (field: "avatar_url" | "banner_url", file: File) => {
    if (!me) return;
    const maxMb = field === "banner_url" ? 10 : 5;
    if (file.size > maxMb * 1024 * 1024) { toast.error(`Image must be under ${maxMb}MB`); return; }
    const setBusy = field === "banner_url" ? setUploadingBanner : setUploading;
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${me.id}/org-${field}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: signErr } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("Could not sign URL");
      set(field, signed.signedUrl);
      toast.success(field === "banner_url" ? "Background uploaded" : "Logo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = form.name.trim().length > 1;

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!canSubmit) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const baseSlug = slugify(form.name);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from("organizations").insert({
        owner_id: me.id,
        type,
        name: form.name.trim(),
        slug,
        tagline: form.tagline.trim() || null,
        bio: form.bio.trim() || null,
        website: form.website.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        banner_url: form.banner_url.trim() || null,
        mission: form.mission.trim() || null,
      }).select("slug").single();
      if (error) throw error;
      toast.success(`${kindLabel} created`);
      navigate({ to: "/o/$slug", params: { slug: data.slug } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/row-level security|permission denied|policy/i.test(msg)) {
        toast.error(`Your account is not allowed to create a ${kindLabel.toLowerCase()} yet. Switch your profile role in Settings, or contact Planet Baltimore for access.`);
      } else if (/duplicate key|unique/i.test(msg)) {
        toast.error("That name is already taken. Try a slightly different one.");
      } else {
        toast.error(msg || "Could not create");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
      <Field label="Name" required>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder={`Your ${kindLabel.toLowerCase()} name`} />
      </Field>
      <Field label="Tagline">
        <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={160} placeholder="One line describing what you do" />
      </Field>
      <Field label="About">
        <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={4} maxLength={2000} />
      </Field>
      {(type === "arts_org" || type === "community_assoc" || type === "group") && (
        <Field label="Mission">
          <Textarea value={form.mission} onChange={(e) => set("mission", e.target.value)} rows={3} maxLength={2000} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Neighborhood">
          <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} maxLength={80} />
        </Field>
        <Field label="Website">
          <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" maxLength={200} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={200} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={200} />
        </Field>
        <Field label="Logo / avatar">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage("avatar_url", f); }} />
          {form.avatar_url ? (
            <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              <span className="truncate">Logo attached</span>
              <button type="button" onClick={() => set("avatar_url", "")} className="text-neutral-500 hover:text-neutral-900"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
              Upload logo
            </Button>
          )}
        </Field>
        <Field label="Banner image">
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage("banner_url", f); }} />
          {form.banner_url ? (
            <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              <span className="truncate">Background attached</span>
              <button type="button" onClick={() => set("banner_url", "")} className="text-neutral-500 hover:text-neutral-900"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => bannerRef.current?.click()} disabled={uploadingBanner} className="w-full">
              {uploadingBanner ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
              Upload background
            </Button>
          )}
        </Field>
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={!canSubmit || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create {kindLabel}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-orange"> *</span>}
      </Label>
      {children}
    </div>
  );
}