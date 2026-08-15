import { useEffect, useRef, useState } from "react";
import { Film, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmartVideo } from "@/components/shared/smart-img";
import { uploadMediaFile } from "@/components/org/media-upload";

type OrgVideo = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
};

export function OrgVideosTab({
  orgId,
  canManage = false,
  title = "Videos",
}: { orgId: string; canManage?: boolean; title?: string }) {
  const [videos, setVideos] = useState<OrgVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organization_videos")
      .select("id,title,description,video_url")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setVideos((data ?? []) as OrgVideo[]);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const reset = () => { setForm({ title: "", description: "" }); setFile(null); setOpen(false); };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Add a video title"); return; }
    if (!file) { toast.error("Upload a video file"); return; }
    setBusy(true);
    try {
      const url = await uploadMediaFile(file, orgId, "video");
      const { error } = await supabase.from("organization_videos").insert({
        org_id: orgId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        video_url: url,
      });
      if (error) throw error;
      toast.success("Video published");
      reset();
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload video");
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    const { error } = await supabase.from("organization_videos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setVideos((v) => v.filter((x) => x.id !== id));
  };

  if (loading) return <div className="py-14 text-center text-sm text-muted-foreground">Loading {title.toLowerCase()}…</div>;

  return (
    <div className="space-y-5">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => (open ? reset() : setOpen(true))}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {open ? "Close" : "+ Upload Video"}
          </button>
        </div>
      )}

      {canManage && open && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Video title"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            ref={fileRef}
            type="file"
            accept="video/*,.mp4,.mov,.webm"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-3 py-6 text-sm text-muted-foreground hover:bg-muted"
          >
            <Upload className="h-4 w-4" /> {file ? file.name : "Upload a video file (up to 200MB)"}
          </button>
          <div className="flex justify-end gap-2">
            <button onClick={reset} className="rounded-full px-4 py-2 text-sm">Cancel</button>
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Publish
            </button>
          </div>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <Film className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No videos yet.</p>
          {canManage && <p className="mt-1 text-xs text-muted-foreground">Upload a video file to publish it here.</p>}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {videos.map((v) => (
            <div key={v.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <SmartVideo src={v.video_url} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-contain" />
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{v.title}</div>
                  {v.description && <p className="mt-1 text-sm text-muted-foreground">{v.description}</p>}
                </div>
                {canManage && (
                  <button onClick={() => remove(v.id)} aria-label="Delete video" className="shrink-0 text-muted-foreground hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
