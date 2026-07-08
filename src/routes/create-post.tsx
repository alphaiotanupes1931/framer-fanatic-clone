import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/create-post")({
  component: CreatePostPage,
  head: () => ({
    meta: [
      { title: "Create Post - Planet Baltimore" },
      { name: "description", content: "Share an update with the Planet Baltimore community." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CreatePostPage() {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = content.trim().length > 0 && content.trim().length <= 2000;

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!canSubmit) { toast.error("Add some content (max 2000 chars)"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: me.id,
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        neighborhood: neighborhood.trim() || null,
      });
      if (error) throw error;
      toast.success("Posted");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Create Post" subtitle="Share what's happening in Baltimore." />
        <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">What's on your mind?<span className="text-orange"> *</span></Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} maxLength={2000} placeholder="Say something to the Baltimore feed" />
            <p className="text-xs text-neutral-500">{content.length}/2000</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Image URL</Label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://" maxLength={500} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Neighborhood</Label>
              <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} maxLength={80} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={!canSubmit || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}