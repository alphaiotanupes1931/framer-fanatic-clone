import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile, AppLayout } from "@/components/app-layout";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { ImageUpload } from "@/components/shared/image-upload";
import { BANNER_SPEC } from "@/lib/media-guidelines";
import { RichTextEditor } from "@/components/rich-text-editor";

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

  if (loading) return <AppLayout hero={false}><div className="mx-auto max-w-2xl p-6 text-sm text-muted-foreground">Loading...</div></AppLayout>;

  return (
    <AppLayout hero={false}>
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/profile" className="rounded-full bg-secondary p-2 hover:bg-secondary/80" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      <div className="mb-6 space-y-5 rounded-xl border border-border p-4">
        <div>
          <div className="mb-2 text-sm font-semibold">Banner</div>
          <ImageUpload value={form.banner_url} onChange={(banner_url) => setForm((f) => ({ ...f, banner_url }))} label="Upload banner" bucket="avatars" aspect={3} hint={BANNER_SPEC} />
        </div>
        <div className="max-w-xs">
          <div className="mb-2 text-sm font-semibold">Profile photo</div>
          <ImageUpload value={form.avatar_url} onChange={(avatar_url) => setForm((f) => ({ ...f, avatar_url }))} label="Upload profile photo" bucket="avatars" aspect={1} circleGuide />
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Display name" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
        <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
        <div>
          <label className="mb-1 block text-sm font-semibold">Bio</label>
          <RichTextEditor value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} placeholder="Tell people about yourself..." minHeight={120} />
        </div>
        <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        <Field label="Neighborhood" value={form.neighborhood} onChange={(v) => setForm({ ...form, neighborhood: v })} />
        <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} placeholder="https://" />
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link to="/profile" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-hover">Cancel</Link>
        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-[#d4580a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b8480a] disabled:opacity-60">
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
    </AppLayout>
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