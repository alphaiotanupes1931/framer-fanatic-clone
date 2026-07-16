import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";

export const Route = createFileRoute("/edit-profile")({
  head: () => ({ meta: [{ title: "Edit Profile - Planet Baltimore" }, { name: "robots", content: "noindex" }] }),
  component: EditProfilePage,
});

function EditProfilePage() {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    bio: "",
    city: "",
    neighborhood: "",
    website: "",
    avatar_url: "",
    banner_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | null>(null);

  useEffect(() => {
    if (!me?.id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name,username,bio,city,neighborhood,website,avatar_url,banner_url")
        .eq("id", me.id)
        .maybeSingle();
      if (data) {
        setForm({
          display_name: data.display_name ?? "",
          username: data.username ?? "",
          bio: data.bio ?? "",
          city: data.city ?? "",
          neighborhood: data.neighborhood ?? "",
          website: data.website ?? "",
          avatar_url: data.avatar_url ?? "",
          banner_url: data.banner_url ?? "",
        });
      }
      setLoading(false);
    })();
  }, [me?.id]);

  const uploadImage = async (file: File, kind: "avatar" | "banner") => {
    if (!me?.id) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setUploading(kind);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${me.id}/${kind}-${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setForm((f) => ({ ...f, [kind === "avatar" ? "avatar_url" : "banner_url"]: data.publicUrl }));
      toast.success(`${kind === "avatar" ? "Photo" : "Banner"} uploaded`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!me?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        display_name: form.display_name.trim() || null,
        username: form.username.trim() || null,
        bio: form.bio.trim() || null,
        city: form.city.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        website: form.website.trim() || null,
        avatar_url: form.avatar_url || null,
        banner_url: form.banner_url || null,
      }).eq("id", me.id);
      if (error) throw error;
      toast.success("Profile saved");
      navigate({ to: "/profile" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-2xl p-6 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/profile" className="rounded-full bg-secondary p-2 hover:bg-secondary/80" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-border">
        <div className="relative h-40 w-full bg-secondary">
          {form.banner_url && <img src={form.banner_url} alt="" className="h-full w-full object-cover" />}
          <label className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black">
            <Upload className="h-3.5 w-3.5" />
            {uploading === "banner" ? "Uploading..." : "Change banner"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f, "banner"); e.target.value = ""; }} />
          </label>
        </div>
        <div className="flex items-center gap-4 p-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-secondary ring-2 ring-background">
            {form.avatar_url && <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8480a]">
            <Upload className="h-4 w-4" />
            {uploading === "avatar" ? "Uploading..." : "Change photo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f, "avatar"); e.target.value = ""; }} />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Display name" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
        <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
        <div>
          <label className="mb-1 block text-sm font-semibold">Bio</label>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#d4580a] focus:outline-none" />
        </div>
        <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        <Field label="Neighborhood" value={form.neighborhood} onChange={(v) => setForm({ ...form, neighborhood: v })} />
        <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} placeholder="https://" />
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link to="/profile" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary">Cancel</Link>
        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-[#d4580a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8480a] disabled:opacity-60">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#d4580a] focus:outline-none" />
    </div>
  );
}