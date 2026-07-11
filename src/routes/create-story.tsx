import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2 } from "lucide-react";
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
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Story" subtitle="Publish a long-form piece for Baltimore." />
        <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Title<span className="text-orange"> *</span></Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={160} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Excerpt</Label>
            <Textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} maxLength={280} placeholder="A one-line summary that appears in the story list" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Story<span className="text-orange"> *</span></Label>
            <Textarea value={form.content} onChange={(e) => set("content", e.target.value)} rows={14} placeholder="Write your story. Plain text or basic HTML." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Format</Label>
              <select
                value={form.format}
                onChange={(e) => set("format", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="blog">Blog</option>
                <option value="essay">Essay</option>
                <option value="interview">Interview</option>
                <option value="review">Review</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Cover image</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickCover(f); }}
              />
              {form.cover_url ? (
                <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                  <img src={form.cover_url} alt="Cover preview" className="max-h-64 w-full object-cover" />
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-neutral-600">
                    <span className="truncate">Preview</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium hover:bg-neutral-100">
                        Replace
                      </button>
                      <button type="button" onClick={() => set("cover_url", "")} className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full">
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                  Upload cover
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={!canSubmit || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish Story
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}