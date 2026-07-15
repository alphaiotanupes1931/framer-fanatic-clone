import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, ArrowLeft, Save, Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/create-story")({
  component: CreateStoryPage,
  head: () => ({
    meta: [
      { title: "Create Story - Planet Baltimore" },
      { name: "description", content: "Publish a long-form story for Baltimore." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CreateStoryPage() {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    format: "blog",
    cover_url: "",
  });
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onPickCover = async (file: File) => {
    if (!me) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("story-covers").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage.from("story-covers").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed?.signedUrl) throw sErr || new Error("Could not sign URL");
      set("cover_url", signed.signedUrl);
      toast.success("Cover uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = form.title.trim().length > 0 && form.content.trim().length > 0;

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!canSubmit) { toast.error("Title and content are required"); return; }
    setSaving(true);
    try {
      const words = form.content.trim().split(/\s+/).length;
      const read_minutes = Math.max(1, Math.round(words / 220));
      const { data, error } = await supabase.from("stories").insert({
        user_id: me.id,
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        format: form.format,
        cover_url: form.cover_url || null,
        read_minutes,
      }).select("id").single();
      if (error) throw error;
      toast.success("Story published");
      navigate({ to: "/stories/$storyId", params: { storyId: data.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {/* Top bar: Back + Save / Publish */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/stories" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" disabled={saving}>
              <Save className="h-4 w-4" /> Save Draft
            </Button>
            <Button onClick={submit} disabled={!canSubmit || saving} className="gap-2 bg-neutral-800 text-white hover:bg-neutral-900">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Publish
            </Button>
          </div>
        </div>

        {/* Cover image dropzone */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-neutral-800">Cover Image</div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickCover(f); }}
          />
          {form.cover_url ? (
            <div className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
              <img src={form.cover_url} alt="Cover preview" className="max-h-80 w-full object-cover" />
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow hover:bg-white">
                  Replace
                </button>
                <button type="button" onClick={() => set("cover_url", "")}
                  className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-red-600 shadow hover:bg-white">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 transition hover:border-orange-300 hover:bg-orange-50/40"
            >
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
              <span className="text-sm font-medium">Click to add cover image</span>
            </button>
          )}
        </div>

        {/* Title + Subtitle, inline like a real editor */}
        <div className="mt-8 space-y-3">
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={160}
            placeholder="Story title..."
            className="w-full border-0 bg-transparent p-0 font-serif text-4xl font-bold leading-tight text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:ring-0 sm:text-5xl"
          />
          <input
            value={form.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            maxLength={280}
            placeholder="Add a subtitle (optional)..."
            className="w-full border-0 bg-transparent p-0 text-xl text-neutral-500 placeholder:text-neutral-300 focus:outline-none focus:ring-0"
          />
        </div>

        {/* Category + Visibility */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-neutral-800">Category</Label>
            <select
              value={form.format}
              onChange={(e) => set("format", e.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm"
            >
              <option value="blog">Blog</option>
              <option value="essay">Essay</option>
              <option value="interview">Interview</option>
              <option value="review">Review</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-neutral-800">Visibility</Label>
            <select className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm" defaultValue="public">
              <option value="public">Public</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="mt-8 space-y-2">
          <div className="text-sm font-semibold text-neutral-800">Content</div>
          <Textarea
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            rows={16}
            placeholder="Start writing your story..."
            className="min-h-[360px] resize-y rounded-xl border-neutral-200 bg-white p-4 text-base leading-relaxed focus-visible:ring-orange-300"
          />
        </div>
      </div>
    </AppLayout>
  );
}