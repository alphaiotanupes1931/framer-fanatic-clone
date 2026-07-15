import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Button } from "@/components/ui/button";
import { Play, Search, Star, Plus, X, Upload } from "lucide-react";
import { EmptyState, CardGridSkeleton } from "@/components/shared/empty-state";

const VIDEO_CATEGORIES = ["All", "Music", "Visual Art", "Events", "Community", "Dance & Performance", "Food & Nightlife", "News"] as const;
import { toast } from "sonner";

export const Route = createFileRoute("/videos")({
  component: VideosPage,
  head: () => ({ meta: [{ title: "Videos - Planet Baltimore" }] }),
});

type Video = {
  id: string; user_id: string; title: string; description: string | null;
  video_url: string; thumbnail_url: string | null; featured: boolean; created_at: string;
  author?: { display_name: string | null; username: string | null };
};

function VideosPage() {
  const auth = useAuthState();
  if (auth.loading) return null;
  if (!auth.signedIn) return <AnonVideos />;
  return <VideosSignedIn />;
}

function AnonVideos() {
  const [list, setList] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("videos")
        .select("id, user_id, title, description, video_url, thumbnail_url, featured, created_at")
        .order("created_at", { ascending: false }).limit(24);
      setList((data || []) as Video[]); setLoading(false);
    })();
  }, []);
  return (
    <PublicShell title="Videos" subtitle="Watch what Baltimore creators are shipping right now." signedIn={false}>
      {loading ? <div className="text-paper/60 text-sm">Loading…</div> :
        <PreviewGrid
          items={list}
          unlockedCount={1}
          signedIn={false}
          thing="video"
          render={(v) => (
            <div className="rounded-2xl overflow-hidden border border-paper/10 bg-paper/5 h-full">
              <div className="aspect-video bg-paper/10 relative overflow-hidden">
                {(v as Video).thumbnail_url
                  ? <img src={(v as Video).thumbnail_url!} alt={(v as Video).title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  : <div className="w-full h-full flex items-center justify-center text-paper/30"><Play className="w-10 h-10" /></div>}
              </div>
              <div className="p-4">
                <div className="font-semibold line-clamp-2">{(v as Video).title}</div>
                {(v as Video).description && <p className="text-xs text-paper/60 mt-1 line-clamp-2">{(v as Video).description}</p>}
              </div>
            </div>
          )}
          emptyLabel="No videos yet."
        />
      }
    </PublicShell>
  );
}

function VideosSignedIn() {
  const me = useCurrentProfile();
  const [vids, setVids] = useState<Video[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<"newest" | "popular">("newest");
  const [cat, setCat] = useState<(typeof VIDEO_CATEGORIES)[number]>("All");
  const [form, setForm] = useState({ title: "", description: "", video_url: "" });
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("videos").select("*").order("created_at", { ascending: false }).limit(50);
    const list = (data || []) as Video[];
    const ids = Array.from(new Set(list.map((v) => v.user_id)));
    if (ids.length) {
      const { data: profs } = await (supabase as any).from("profiles_public").select("id, display_name, username").in("id", ids);
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((v) => { v.author = byId.get(v.user_id) as any; });
    }
    setVids(list);
    setLoaded(true);
  };
  useEffect(() => { load(); }, []);

  const handleFileUpload = async (file: File) => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!file.type.startsWith("video/")) { toast.error("Please choose a video file"); return; }
    const cap = 100 * 1024 * 1024;
    if (file.size > cap) { toast.error("Video must be under 100MB"); return; }
    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    const tId = toast.loading("Uploading video...");
    try {
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("post-media").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage.from("post-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed?.signedUrl) throw sErr || new Error("Could not sign URL");
      setForm((f) => ({ ...f, video_url: signed.signedUrl }));
      toast.success("Video uploaded", { id: tId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed", { id: tId });
    } finally {
      setUploading(false);
    }
  };

  const filtered = vids.filter((v) => v.title.toLowerCase().includes(query.toLowerCase()));
  const featured = filtered.filter((v) => v.featured);
  const rest = filtered.filter((v) => !v.featured);

  const submit = async () => {
    if (!me || !form.title.trim() || !form.video_url.trim()) return;
    const { error } = await supabase.from("videos").insert({
      user_id: me.id, title: form.title.trim(), description: form.description.trim() || null,
      video_url: form.video_url.trim(), thumbnail_url: null,
    });
    if (error) { toast.error(error.message); return; }
    setOpen(false); setForm({ title: "", description: "", video_url: "" });
    setLocalPreview(null);
    toast.success("Video added"); load();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <HeroBanner
          title="Videos"
          subtitle="Watch videos shared across Planet Baltimore."
          cta={
            <Button onClick={() => setOpen(true)} variant="outline" className="gap-2 rounded-lg" style={{ borderColor: "#d4580a", color: "#d4580a" }}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Video</span>
            </Button>
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search videos…"
              className="w-full rounded-full border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-orange-400 focus:outline-none" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "popular")}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 focus:border-orange-400 focus:outline-none">
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {VIDEO_CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${cat===c ? "bg-orange-600 text-white" : "border border-neutral-200 bg-white text-neutral-600 hover:border-orange-300"}`}>{c}</button>
          ))}
        </div>

        {featured.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> Featured Videos</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {featured.map((v) => <VideoCard key={v.id} v={v} />)}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-bold">All Videos</h2>
          {!loaded ? (
            <CardGridSkeleton count={6} />
          ) : rest.length === 0 ? (
            <EmptyState
              icon={Play}
              title="No videos yet"
              description="Add the first video from Baltimore creators."
              action={
                <button onClick={() => setOpen(true)} className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                  Add Video
                </button>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((v) => <VideoCard key={v.id} v={v} />)}
            </div>
          )}
        </section>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add Video</h2>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Title" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-sm text-neutral-600 hover:border-orange-400 hover:bg-orange-50 ${uploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}>
                <Upload className="h-5 w-5 text-orange-600" />
                <span className="font-semibold">{uploading ? "Uploading..." : "Upload video file"}</span>
                <span className="text-xs text-neutral-500">MP4, MOV, WebM up to 100MB</span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              </label>
              {localPreview && (
                <video src={localPreview} controls className="w-full rounded-lg border border-neutral-200 max-h-56 bg-black" />
              )}
              <div className="relative flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-400">
                <span className="h-px flex-1 bg-neutral-200" /> or paste a URL <span className="h-px flex-1 bg-neutral-200" />
              </div>
              <input value={form.video_url} onChange={(e) => setForm({...form, video_url: e.target.value})} placeholder="Video URL (YouTube, Vimeo, mp4)" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Description" rows={3} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              <button onClick={submit} disabled={uploading || !form.title.trim() || !form.video_url.trim()} className="w-full rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function VideoCard({ v }: { v: Video }) {
  return (
    <a href={v.video_url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="relative aspect-video bg-gradient-to-br from-orange-300 to-orange-600" style={v.thumbnail_url ? { backgroundImage: `url(${v.thumbnail_url})`, backgroundSize: "cover" } : undefined}>
        {v.featured && <div className="absolute left-3 top-3 rounded-md bg-yellow-400 px-2 py-1 text-[10px] font-bold text-yellow-900">★ Featured</div>}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-white/30 p-4 backdrop-blur group-hover:bg-white/50"><Play className="h-6 w-6 fill-white text-white" /></div>
        </div>
      </div>
      <div className="p-4">
        <div className="text-sm font-semibold">{v.author?.display_name || v.author?.username || "Anonymous"}</div>
        <div className="text-xs text-neutral-500">{new Date(v.created_at).toLocaleDateString()}</div>
        <p className="mt-2 line-clamp-2 text-sm text-neutral-700">{v.title}</p>
      </div>
    </a>
  );
}