import { useEffect, useRef, useState } from "react";
import { Disc3, Loader2, Music2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Img } from "@/components/shared/smart-img";
import { PlayButton, usePlayer } from "@/components/org/audio-player";
import { ImageUpload } from "@/components/shared/image-upload";
import { formatDuration, readDuration, uploadMediaFile } from "@/components/org/media-upload";

type Track = {
  id: string;
  release_id: string | null;
  title: string;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number | null;
  track_number: number;
};

type Release = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  release_date: string | null;
};

const emptyRelease = { title: "", kind: "album", release_date: "", description: "", cover_url: "" };

export function MusicTab({
  orgId,
  canManage = false,
  mode = "album",
  label,
}: {
  orgId: string;
  canManage?: boolean;
  mode?: "album" | "single";
  label?: string;
}) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyRelease);
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const singular = label ?? (mode === "album" ? "Release" : "Single");

  const load = async () => {
    setLoading(true);
    const [{ data: rel }, { data: trk }] = await Promise.all([
      supabase.from("organization_releases").select("id,kind,title,description,cover_url,release_date")
        .eq("org_id", orgId).order("release_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase.from("organization_tracks").select("id,release_id,title,audio_url,cover_url,duration_seconds,track_number")
        .eq("org_id", orgId).order("track_number", { ascending: true }).order("created_at", { ascending: true }),
    ]);
    setReleases((rel ?? []) as Release[]);
    setTracks((trk ?? []) as Track[]);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const reset = () => { setForm(emptyRelease); setFiles([]); setOpen(false); };

  const saveRelease = async () => {
    if (!form.title.trim()) { toast.error("Add a title"); return; }
    if (!files.length) { toast.error("Upload at least one audio file"); return; }
    setBusy(true);
    try {
      // Upload the audio first so a failed upload never leaves an empty release behind.
      const uploaded: Array<{ title: string; url: string; duration: number | null }> = [];
      for (const f of files) {
        const url = await uploadMediaFile(f, orgId, "audio");
        uploaded.push({ title: f.name.replace(/\.[a-z0-9]+$/i, ""), url, duration: await readDuration(f) });
      }
      const { data: rel, error } = await supabase.from("organization_releases").insert({
        org_id: orgId,
        kind: form.kind,
        title: form.title.trim(),
        description: form.description.trim() || null,
        cover_url: form.cover_url.trim() || null,
        release_date: form.release_date || null,
      }).select("id").single();
      if (error) throw error;
      let n = 1;
      const { error: tErr } = await supabase.from("organization_tracks").insert(
        uploaded.map((u) => ({
          org_id: orgId,
          release_id: rel!.id,
          title: u.title,
          audio_url: u.url,
          cover_url: form.cover_url.trim() || null,
          duration_seconds: u.duration,
          track_number: n++,
        })),
      );
      if (tErr) throw tErr;
      toast.success(`${singular} published`);
      reset();
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  };

  /** Adds tracks to a release that already exists. */
  const addTracks = async (releaseId: string, list: File[]) => {
    if (!list.length) return;
    setBusy(true);
    try {
      let n = tracks.filter((t) => t.release_id === releaseId).length + 1;
      const rows = [];
      for (const f of list) {
        const url = await uploadMediaFile(f, orgId, "audio");
        rows.push({
          org_id: orgId,
          release_id: releaseId,
          title: f.name.replace(/\.[a-z0-9]+$/i, ""),
          audio_url: url,
          duration_seconds: await readDuration(f),
          track_number: n++,
        });
      }
      const { error } = await supabase.from("organization_tracks").insert(rows);
      if (error) throw error;
      toast.success(rows.length === 1 ? "Track added" : `${rows.length} tracks added`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload those tracks");
    } finally { setBusy(false); }
  };

  const saveSingle = async () => {
    if (!form.title.trim()) { toast.error("Add a track title"); return; }
    if (!files[0]) { toast.error("Upload the audio file"); return; }
    setBusy(true);
    try {
      const url = await uploadMediaFile(files[0], orgId, "audio");
      const duration = await readDuration(files[0]);
      const { error } = await supabase.from("organization_tracks").insert({
        org_id: orgId,
        release_id: null,
        title: form.title.trim(),
        audio_url: url,
        cover_url: form.cover_url.trim() || null,
        duration_seconds: duration,
        track_number: tracks.filter((t) => !t.release_id).length + 1,
      });
      if (error) throw error;
      toast.success("Track published");
      reset();
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  };

  const removeRelease = async (id: string) => {
    if (!confirm("Delete this release and its tracks?")) return;
    const { error } = await supabase.from("organization_releases").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setReleases((r) => r.filter((x) => x.id !== id));
    setTracks((t) => t.filter((x) => x.release_id !== id));
  };

  const removeTrack = async (id: string) => {
    if (!confirm("Delete this track?")) return;
    const { error } = await supabase.from("organization_tracks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setTracks((t) => t.filter((x) => x.id !== id));
  };

  if (loading) return <div className="py-14 text-center text-sm text-muted-foreground">Loading music…</div>;

  const singles = tracks.filter((t) => !t.release_id);

  return (
    <div className="space-y-6">
      <input
        ref={addRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.aiff,.flac"
        multiple
        hidden
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (addingTo) void addTracks(addingTo, picked);
        }}
      />
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => (open ? reset() : setOpen(true))}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {open ? "Close" : mode === "album" ? "+ Add Release" : "+ Add Track"}
          </button>
        </div>
      )}

      {canManage && open && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <ImageUpload
              value={form.cover_url}
              onChange={(url) => setForm((f) => ({ ...f, cover_url: url }))}
              label="Cover art"
            />
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={mode === "album" ? "Album / EP title" : "Track title"}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              {mode === "album" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="album">Album</option>
                    <option value="ep">EP</option>
                  </select>
                  <input
                    type="date"
                    value={form.release_date}
                    onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              )}
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Notes about this release (optional)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.aiff,.flac"
                multiple={mode === "album"}
                hidden
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-3 py-5 text-sm text-muted-foreground hover:bg-muted"
              >
                <Upload className="h-4 w-4" />
                {files.length
                  ? `${files.length} audio file${files.length === 1 ? "" : "s"} selected`
                  : mode === "album" ? "Upload audio files to build the tracklist" : "Upload the audio file"}
              </button>
              {!!files.length && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {files.map((f) => <li key={f.name} className="truncate">• {f.name}</li>)}
                </ul>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={reset} className="rounded-full px-4 py-2 text-sm">Cancel</button>
                <button
                  onClick={mode === "album" ? saveRelease : saveSingle}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "album" ? (
        releases.length === 0 ? (
          <Empty icon={<Disc3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />} text="No releases yet." hint={canManage ? "Add an album or EP and upload the tracks." : undefined} />
        ) : (
          <div className="space-y-6">
            {releases.map((r) => {
              const list = tracks.filter((t) => t.release_id === r.id);
              return (
                <div key={r.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="flex flex-col gap-4 p-5 sm:flex-row">
                    <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {r.cover_url
                        ? <Img src={r.cover_url} alt={r.title} className="h-full w-full object-cover" />
                        : <div className="grid h-full w-full place-items-center"><Disc3 className="h-8 w-8 text-muted-foreground" /></div>}
                      {list[0] && (
                        <div className="absolute inset-0 grid place-items-center bg-black/10">
                          <PlayButton id={list[0].id} src={list[0].audio_url} size="lg" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            {r.kind === "ep" ? "EP" : "Album"}
                            {r.release_date ? ` · ${new Date(r.release_date).getFullYear()}` : ""}
                          </div>
                          <h3 className="mt-1 truncate text-xl font-semibold">{r.title}</h3>
                          {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                        </div>
                        {canManage && (
                          <button onClick={() => removeRelease(r.id)} aria-label="Delete release" className="text-muted-foreground hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="mt-4 space-y-3">
                        {list.length === 0 && <p className="text-sm text-muted-foreground">No tracks on this release yet.</p>}
                        {list.map((t) => (
                          <TrackRow key={t.id} track={t} canManage={canManage} onDelete={() => removeTrack(t.id)} />
                        ))}
                        {canManage && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => { setAddingTo(r.id); addRef.current?.click(); }}
                            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
                          >
                            {busy && addingTo === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            Add tracks
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : singles.length === 0 ? (
        <Empty icon={<Music2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />} text="No tracks uploaded yet." hint={canManage ? "Upload a track to publish it here." : undefined} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {singles.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {t.cover_url
                    ? <Img src={t.cover_url} alt={t.title} className="h-full w-full object-cover" />
                    : <div className="grid h-full w-full place-items-center"><Music2 className="h-5 w-5 text-muted-foreground" /></div>}
                  <div className="absolute inset-0 grid place-items-center bg-black/10">
                    <PlayButton id={t.id} src={t.audio_url} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{formatDuration(t.duration_seconds)}</div>
                </div>
                {canManage && (
                  <button onClick={() => removeTrack(t.id)} aria-label="Delete track" className="text-muted-foreground hover:text-red-600">
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

function TrackRow({ track, canManage, onDelete }: { track: Track; canManage: boolean; onDelete: () => void }) {
  const player = usePlayer();
  const active = player.id === track.id && player.status === "playing";
  return (
    <div className={`rounded-xl border p-3 ${active ? "border-primary bg-primary/5" : "border-border bg-background"}`}>
      <div className="flex items-center gap-3">
        <PlayButton id={track.id} src={track.audio_url} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{track.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{formatDuration(track.duration_seconds)}</span>
        {canManage && (
          <button onClick={onDelete} aria-label="Delete track" className="text-muted-foreground hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Empty({ icon, text, hint }: { icon: React.ReactNode; text: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center">
      {icon}
      <p className="text-sm text-muted-foreground">{text}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
