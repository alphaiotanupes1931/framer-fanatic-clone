import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic, Pencil, Play, Trash2, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { Img, SmartVideo } from "@/components/shared/smart-img";
import { PlayButton } from "@/components/org/audio-player";
import { ImageUpload } from "@/components/shared/image-upload";
import { formatDuration, readDuration, uploadMediaFile } from "@/components/org/media-upload";

type Episode = {
  id: string;
  title: string;
  description: string | null;
  audio_url: string | null;
  video_url: string | null;
  cover_url: string | null;
  duration_seconds: number | null;
  episode_number: number | null;
  published_at: string | null;
};

const emptyForm = { title: "", description: "", cover_url: "" };

export function PodcastEpisodesTab({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<"all" | "video" | "audio">("all");
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("podcast_episodes")
      .select("id,title,description,audio_url,video_url,cover_url,duration_seconds,episode_number,published_at")
      .eq("user_id", userId)
      .order("episode_number", { ascending: false })
      .order("created_at", { ascending: false });
    setEpisodes((data ?? []) as Episode[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [userId]);

  const reset = () => {
    setOpen(false); setEditId(null); setForm(emptyForm);
    setAudioFile(null); setVideoFile(null);
  };

  const startEdit = (ep: Episode) => {
    setEditId(ep.id);
    setForm({ title: ep.title, description: ep.description ?? "", cover_url: ep.cover_url ?? "" });
    setAudioFile(null); setVideoFile(null);
    setOpen(true);
  };

  const submit = async () => {
    const title = form.title.trim();
    if (!title) { toast.error("Add an episode title"); return; }
    if (!editId && !audioFile && !videoFile) { toast.error("Attach an audio or video file"); return; }
    setSaving(true);
    try {
      const audio_url = audioFile ? await uploadMediaFile(audioFile, userId, "audio") : null;
      const video_url = videoFile ? await uploadMediaFile(videoFile, userId, "video") : null;
      const duration = audioFile ? await readDuration(audioFile) : videoFile ? await readDuration(videoFile) : null;

      if (editId) {
        const patch: Record<string, unknown> = {
          title,
          description: form.description.trim() || null,
          cover_url: form.cover_url || null,
        };
        if (audio_url) { patch.audio_url = audio_url; patch.duration_seconds = duration; }
        if (video_url) { patch.video_url = video_url; if (!audio_url) patch.duration_seconds = duration; }
        const { error } = await supabase.from("podcast_episodes").update(patch as never).eq("id", editId);
        if (error) throw error;
        toast.success("Episode updated");
      } else {
        const nextNum = (episodes[0]?.episode_number ?? 0) + 1;
        const { error } = await supabase.from("podcast_episodes").insert({
          user_id: userId,
          title,
          description: form.description.trim() || null,
          cover_url: form.cover_url || null,
          audio_url, video_url,
          duration_seconds: duration,
          episode_number: nextNum,
          published_at: new Date().toISOString(),
        } as never);
        if (error) throw error;
        toast.success("Episode published");
      }
      reset();
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that episode");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this episode?")) return;
    const prev = episodes;
    setEpisodes((xs) => xs.filter((e) => e.id !== id));
    const { error } = await supabase.from("podcast_episodes").delete().eq("id", id);
    if (error) { setEpisodes(prev); toast.error(error.message); }
  };

  const videoEps = episodes.filter((e) => !!e.video_url);
  const audioEps = episodes.filter((e) => !e.video_url && !!e.audio_url);
  const showVideo = filter !== "audio" && videoEps.length > 0;
  const showAudio = filter !== "video" && audioEps.length > 0;

  const chip = (key: typeof filter, label: string, count: number) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        filter === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {label} {count > 0 && <span className="opacity-70">{count}</span>}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {chip("all", "All", episodes.length)}
          {chip("video", "Video", videoEps.length)}
          {chip("audio", "Audio", audioEps.length)}
        </div>
        {isOwner && (
          <button
            onClick={() => (open ? reset() : setOpen(true))}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {open ? "Close" : "+ Add Episode"}
          </button>
        )}
      </div>

      {isOwner && open && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <ImageUpload
              value={form.cover_url}
              onChange={(url) => setForm((f) => ({ ...f, cover_url: url }))}
              label="Episode artwork"
            />
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Episode title"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Show notes / description"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => audioRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
                >
                  <Mic className="h-4 w-4" /> <span className="truncate">{audioFile ? audioFile.name : "Upload audio"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => videoRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
                >
                  <VideoIcon className="h-4 w-4" /> <span className="truncate">{videoFile ? videoFile.name : "Upload video"}</span>
                </button>
                <input ref={audioRef} type="file" accept="audio/*,.mp3,.m4a,.wav" hidden onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
                <input ref={videoRef} type="file" accept="video/*,.mp4,.mov,.webm" hidden onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
              </div>
              <p className="text-xs text-muted-foreground">
                {editId ? "Leave files empty to keep the current media." : "Attach audio, video, or both. Video episodes appear in their own section."}
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={reset} className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground">Cancel</button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editId ? "Save changes" : "Publish episode"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : episodes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center text-sm text-muted-foreground">
          <Mic className="h-6 w-6" />
          No episodes yet.
          {isOwner && <span className="text-xs">Upload audio or video to publish your first episode.</span>}
        </div>
      ) : (
        <div className="space-y-8">
          {showVideo && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Video Episodes</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {videoEps.map((ep) => (
                  <article key={ep.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                    {playing === ep.id ? (
                      <SmartVideo src={ep.video_url!} controls autoPlay className="aspect-video w-full bg-white" />
                    ) : (
                      <button onClick={() => setPlaying(ep.id)} className="relative block aspect-video w-full bg-muted">
                        {ep.cover_url
                          ? <Img src={ep.cover_url} alt={ep.title} className="h-full w-full object-cover" />
                          : <div className="grid h-full w-full place-items-center"><VideoIcon className="h-6 w-6 text-muted-foreground" /></div>}
                        <span className="absolute inset-0 grid place-items-center bg-black/20">
                          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                            <Play className="h-5 w-5 translate-x-[1px] fill-current" />
                          </span>
                        </span>
                      </button>
                    )}
                    <EpisodeMeta ep={ep} isOwner={isOwner} onEdit={() => startEdit(ep)} onDelete={() => remove(ep.id)} />
                  </article>
                ))}
              </div>
            </section>
          )}

          {showAudio && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Audio Episodes</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {audioEps.map((ep) => (
                  <div key={ep.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {ep.cover_url
                          ? <Img src={ep.cover_url} alt={ep.title} className="h-full w-full object-cover" />
                          : <div className="grid h-full w-full place-items-center"><Mic className="h-5 w-5 text-muted-foreground" /></div>}
                        <div className="absolute inset-0 grid place-items-center bg-black/10">
                          <PlayButton id={ep.id} src={ep.audio_url!} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground">
                          {ep.episode_number != null && <>Ep. {ep.episode_number}</>}
                          {ep.duration_seconds ? ` · ${formatDuration(ep.duration_seconds)}` : ""}
                        </div>
                        <div className="truncate font-semibold">{ep.title}</div>
                        {ep.description && <p className="line-clamp-2 text-sm text-muted-foreground">{ep.description}</p>}
                      </div>
                      {isOwner && (
                        <div className="flex shrink-0 items-center gap-2">
                          <button onClick={() => startEdit(ep)} aria-label="Edit episode" className="text-muted-foreground hover:text-foreground">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(ep.id)} aria-label="Delete episode" className="text-muted-foreground hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!showVideo && !showAudio && (
            <div className="py-10 text-center text-sm text-muted-foreground">Nothing in this format yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

function EpisodeMeta({ ep, isOwner, onEdit, onDelete }: { ep: Episode; isOwner: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">
          {ep.episode_number != null && <>Ep. {ep.episode_number}</>}
          {ep.published_at ? ` · ${new Date(ep.published_at).toLocaleDateString()}` : ""}
          {ep.duration_seconds ? ` · ${formatDuration(ep.duration_seconds)}` : ""}
        </div>
        <div className="mt-0.5 truncate font-semibold">{ep.title}</div>
        {ep.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{ep.description}</p>}
        {ep.audio_url && (
          <div className="mt-2 flex items-center gap-2">
            <PlayButton id={`${ep.id}-audio`} src={ep.audio_url} size="sm" />
            <span className="text-xs text-muted-foreground">Listen to audio version</span>
          </div>
        )}
      </div>
      {isOwner && (
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={onEdit} aria-label="Edit episode" className="text-muted-foreground hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} aria-label="Delete episode" className="text-muted-foreground hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
