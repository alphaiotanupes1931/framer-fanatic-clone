import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { BANNER_SPEC } from "@/lib/media-guidelines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { STORED_URL_TTL, compressImage } from "@/lib/image-compress";
import { setStaffLogin } from "@/lib/staff-login.functions";

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
  const [neighborhoods, setNeighborhoods] = useState<Array<{ id: string; name: string }>>([]);
  // Arts organizations are public-facing listings, so they need enough detail
  // to be useful in the directory.
  const strict = type === "arts_org";
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
  const [staff, setStaff] = useState({ username: "", password: "" });
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("neighborhoods").select("id,name").order("name");
      setNeighborhoods((data ?? []) as Array<{ id: string; name: string }>);
    })();
  }, []);

  const uploadImage = async (field: "avatar_url" | "banner_url", file: File) => {
    file = await compressImage(file);
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
      const { data: signed, error: signErr } = await supabase.storage.from("avatars").createSignedUrl(path, STORED_URL_TTL);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("Could not sign URL");
      set(field, signed.signedUrl);
      toast.success(field === "banner_url" ? "Background uploaded" : "Logo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = strict
    ? form.name.trim().length > 1 &&
      form.tagline.trim().length > 1 &&
      form.bio.trim().length > 9 &&
      form.mission.trim().length > 9 &&
      form.neighborhood.trim().length > 0 &&
      /.+@.+\..+/.test(form.email.trim())
    : type === "group"
      ? form.name.trim().length > 1
      : form.name.trim().length > 1 && form.neighborhood.trim().length > 0;

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!form.neighborhood.trim() && type !== "group") { toast.error("Neighborhood is required"); return; }
    if (!canSubmit) {
      toast.error(strict ? "Please fill in every required field" : type === "group" ? "Name is required" : "Name and neighborhood are required");
      return;
    }
    setSaving(true);
    try {
      const baseSlug = slugify(form.name);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      if (type === "business" && (staff.username.trim() || staff.password)) {
        if (staff.username.trim().length < 3 || staff.password.length < 8) {
          toast.error("Staff username needs 3+ characters and the password 8+ characters");
          setSaving(false);
          return;
        }
      }
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
      }).select("id, slug").single();
      if (error) throw error;
      if (type === "business" && staff.username.trim() && staff.password) {
        try {
          await setStaffLogin({ data: { organizationId: data.id, username: staff.username.trim(), password: staff.password } });
          toast.success("Staff login created");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Business created, but the staff login could not be saved");
        }
      }
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
      <Field label="Tagline" required={strict}>
        <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={160} placeholder="One line describing what you do" />
      </Field>
      <Field label="About" required={strict}>
        <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={4} maxLength={2000} />
      </Field>
      {(type === "arts_org" || type === "community_assoc" || type === "group") && (
        <Field label="Mission" required={strict}>
          <Textarea value={form.mission} onChange={(e) => set("mission", e.target.value)} rows={3} maxLength={2000} />
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Neighborhood" required>
          <select
            value={form.neighborhood}
            onChange={(e) => set("neighborhood", e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[#d4580a] focus:outline-none focus:ring-1 focus:ring-[#d4580a]/30"
          >
            <option value="">Select neighborhood...</option>
            {neighborhoods.map((n) => <option key={n.id} value={n.name}>{n.name}</option>)}
          </select>
        </Field>
        <Field label="Email" required={strict}>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={200} placeholder="contact@yourorg.org" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Website">
          <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" maxLength={200} />
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
          {!form.banner_url && (
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{BANNER_SPEC}</p>
          )}
        </Field>
      </div>
      {type === "business" && (
        <div className="space-y-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Staff login (optional)</h3>
            <p className="mt-1 text-xs text-neutral-600">
              Create a separate username and password your employees can use to sign in and manage this business page,
              without ever using your own login. You can change or remove it later from the business page.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Staff username">
              <Input
                value={staff.username}
                autoComplete="off"
                maxLength={40}
                placeholder="e.g. joescafe-team"
                onChange={(e) => setStaff((s) => ({ ...s, username: e.target.value }))}
              />
            </Field>
            <Field label="Staff password">
              <Input
                type="password"
                value={staff.password}
                autoComplete="new-password"
                maxLength={72}
                placeholder="At least 8 characters"
                onChange={(e) => setStaff((s) => ({ ...s, password: e.target.value }))}
              />
            </Field>
          </div>
          <p className="text-xs text-neutral-500">Employees sign in at planetbaltimore.com/business-login</p>
        </div>
      )}
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