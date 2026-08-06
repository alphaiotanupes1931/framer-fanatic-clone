import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Upload, Loader2, Play, Trash2, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { STORED_URL_TTL, compressImage } from "@/lib/image-compress";
import { SmartAudio, SmartVideo } from "@/components/shared/smart-img";

type Episode = {
  id: string;
  title: string;
  description: string | null;
  audio_url: string | null;
  video_url: string | null;
  episode_number: number | null;
  published_at: string | null;
};

const MAX_MB = 200;

export function PodcastEpisodesTab({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("podcast_episodes")
      .select("id,title,description,audio_url,video_url,episode_number,published_at")
      .eq("user_id", userId)
      .order("published_at", { ascending: false });
    setEpisodes((data ?? []) as Episode[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const uploadFile = async (file: File, kind: "audio" | "video"): Promise<string | null> => {
    file = await compressImage(file);
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`${kind} must be under ${MAX_MB}MB`);
      return null;
    }
    const ext = file.name.split(".").pop() || (kind === "audio" ? "mp3" : "mp4");
    const path = `${userId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("podcast-media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) { toast.error(error.message); return null; }
    const { data: signed } = await supabase.storage.from("podcast-media").createSignedUrl(path, STORED_URL_TTL);
    return signed?.signedUrl ?? null;
  };

  const submit = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!audioFile && !videoFile) { toast.error("Attach an audio or video file"); return; }
    setSaving(true);
    try {
      const audio_url = audioFile ? await uploadFile(audioFile, "audio") : null;
      const video_url = videoFile ? await uploadFile(videoFile, "video") : null;
      const nextNum = (episodes[0]?.episode_number ?? 0) + 1;
      const { error } = await supabase.from("podcast_episodes").insert({
        user_id: userId,
        title: title.trim(),
        description: desc.trim() || null,
        audio_url, video_url,
        episode_number: nextNum,
      });
      if (error) throw error;
      toast.success("Episode published");
      setTitle(""); setDesc(""); setAudioFile(null); setVideoFile(null); setShowForm(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this episode?")) return;
    const { error } = await supabase.from("podcast_episodes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setEpisodes((xs) => xs.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm((v) => !v)} variant="outline" className="rounded-full">
            <Upload className="mr-2 h-4 w-4" /> {showForm ? "Cancel" : "Upload Episode"}
          </Button>
        </div>
      )}

      {isOwner && showForm && (
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <Input placeholder="Episode title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => audioRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:border-[#d4580a]"
            >
              <Mic className="h-4 w-4" /> {audioFile ? audioFile.name : "Attach MP3 audio"}
            </button>
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:border-[#d4580a]"
            >
              <VideoIcon className="h-4 w-4" /> {videoFile ? videoFile.name : "Attach MP4 video"}
            </button>
            <input ref={audioRef} type="file" accept="audio/*,.mp3,.m4a,.wav" hidden onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
            <input ref={videoRef} type="file" accept="video/*,.mp4,.mov,.webm" hidden onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Publish
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-neutral-500">Loading…</div>
      ) : episodes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center text-sm text-neutral-500">
          <Mic className="h-6 w-6 text-neutral-400" />
          No episodes yet.
        </div>
      ) : (
        <div className="space-y-3">
          {episodes.map((ep) => (
            <div key={ep.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    {ep.episode_number != null && <span>#{ep.episode_number}</span>}
                    {ep.published_at && <span>{new Date(ep.published_at).toLocaleDateString()}</span>}
                  </div>
                  <div className="mt-0.5 font-semibold text-neutral-900">{ep.title}</div>
                  {ep.description && <p className="mt-1 text-sm text-neutral-600">{ep.description}</p>}
                </div>
                {isOwner && (
                  <button onClick={() => remove(ep.id)} className="text-neutral-400 hover:text-red-500" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {ep.video_url ? (
                <SmartVideo src={ep.video_url} controls className="mt-3 w-full rounded-lg bg-black" />
              ) : ep.audio_url ? (
                <SmartAudio src={ep.audio_url} controls className="mt-3 w-full">
                  <Play className="h-4 w-4" />
                </SmartAudio>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}