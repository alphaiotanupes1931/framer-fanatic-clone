import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { prefetchImageUrls } from "@/components/smart-image";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/text-utils";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Button } from "@/components/ui/button";
import { Play, Search, Star, Plus, X, Upload, Bookmark, Send, Share2, Trash2 } from "lucide-react";
import { useVideoOrientation, orientationClass } from "@/hooks/use-video-orientation";
import { probeVideo } from "@/lib/video-orientation";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { externalShare } from "@/lib/share-preview";
import { EmptyState, CardGridSkeleton } from "@/components/shared/empty-state";
import { useUserRole } from "@/hooks/use-user-role";

const VIDEO_CATEGORIES = ["All", "Music", "Visual Art", "Events", "Community", "Dance & Performance", "Food & Nightlife", "News"] as const;
import { toast } from "sonner";
import { Img, SmartVideo } from "@/components/shared/smart-img";
import { STORED_URL_TTL, compressImage } from "@/lib/image-compress";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/videos/")({
  component: VideosPage,
  head: () => pageHead({ path: "/videos", title: "Baltimore Video Stories | Planet Baltimore", description: "Short films, performances and behind the scenes video from Baltimore creators." }),
});

type Video = {
  id: string; user_id: string; title: string; description: string | null;
  video_url: string; thumbnail_url: string | null; featured: boolean; created_at: string;
  category?: string | null;
  orientation?: string | null;
  aspect_ratio?: number | null;
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
                  ? <Img src={(v as Video).thumbnail_url!} alt={(v as Video).title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [cat, setCat] = useState<(typeof VIDEO_CATEGORIES)[number]>("All");
  const [shape, setShape] = useState<"all" | "landscape" | "portrait">("all");
  const UPLOAD_CATEGORIES = VIDEO_CATEGORIES.filter((c) => c !== "All");
  const [form, setForm] = useState({ title: "", description: "", video_url: "", category: "", orientation: "" as string, aspect_ratio: null as number | null });
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const { data: vidsData, loading: vidsLoading, refetch: load } = useCachedFetch<Video[]>("videos:list", async () => {
    const { data } = await supabase.from("videos").select("*").order("created_at", { ascending: false }).limit(50);
    const list = (data || []) as Video[];
    const ids = Array.from(new Set(list.map((v) => v.user_id)));
    if (ids.length) {
      const { data: profs } = await (supabase as any).from("profiles_public").select("id, display_name, username").in("id", ids);
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((v) => { v.author = byId.get(v.user_id) as any; });
    }
    // Warm poster frames so the grid paints without grey placeholders.
    prefetchImageUrls(list.map((v) => v.thumbnail_url));
    return list;
  });
  const vids: Video[] = vidsData ?? [];
  const loaded = !vidsLoading;

  const handleFileUpload = async (file: File) => {
    file = await compressImage(file);
    if (!me) { toast.error("Please sign in"); return; }
    if (!file.type.startsWith("video/")) { toast.error("Please choose a video file"); return; }
    const cap = 100 * 1024 * 1024;
    if (file.size > cap) { toast.error("Video must be under 100MB"); return; }
    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    const tId = toast.loading("Uploading video...");
    try {
      const dims = await probeVideo(file);
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("post-media").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage.from("post-media").createSignedUrl(path, STORED_URL_TTL);
      if (sErr || !signed?.signedUrl) throw sErr || new Error("Could not sign URL");
      setForm((f) => ({
        ...f,
        video_url: signed.signedUrl,
        orientation: dims?.orientation || "",
        aspect_ratio: dims ? Number((dims.width / dims.height).toFixed(4)) : null,
      }));
      toast.success("Video uploaded", { id: tId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed", { id: tId });
    } finally {
      setUploading(false);
    }
  };

  const filtered = vids
    .filter((v) =>
      v.title.toLowerCase().includes(query.toLowerCase()) &&
      (cat === "All" || (v.category || "") === cat)
    )
    .slice()
    .sort((a, b) =>
      sort === "oldest"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  // Only landscape videos can be featured; a portrait video that was featured
  // before this rule existed falls back into the portrait grid.
  const featured = filtered.filter((v) => v.featured && v.orientation !== "portrait");
  const rest = filtered.filter((v) => !(v.featured && v.orientation !== "portrait"));
  const portraitRest = rest.filter((v) => v.orientation === "portrait");
  const landscapeRest = rest.filter((v) => v.orientation !== "portrait");

  const submit = async () => {
    if (!me || !form.title.trim() || !form.video_url.trim()) return;
    if (!form.category) { toast.error("Please select a category"); return; }
    const { error } = await supabase.from("videos").insert({
      user_id: me.id, title: form.title.trim(), description: form.description.trim() || null,
      video_url: form.video_url.trim(), thumbnail_url: null, category: form.category,
      orientation: form.orientation || null, aspect_ratio: form.aspect_ratio,
    } as any);
    if (error) { toast.error(error.message); return; }
    setOpen(false); setForm({ title: "", description: "", video_url: "", category: "", orientation: "", aspect_ratio: null });
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
          <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 focus:border-orange-400 focus:outline-none">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
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
            <div className="grid gap-5 sm:grid-cols-2 lazy-grid">
              {featured.map((v) => <VideoCard key={v.id} v={v} onChanged={load} />)}
            </div>
          </section>
        )}

        <section>
          {!loaded ? (
            <>
              <h2 className="mb-3 text-sm font-bold">Landscape</h2>
              <CardGridSkeleton count={6} />
            </>
          ) : rest.length === 0 ? (
            <>
            <h2 className="mb-3 text-sm font-bold">All Videos</h2>
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
            </>
          ) : (
            <div className="space-y-8">
              {landscapeRest.length > 0 && (
                <div>
                  <h2 className="mb-3 text-sm font-bold">Landscape</h2>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lazy-grid">
                    {landscapeRest.map((v) => <VideoCard key={v.id} v={v} onChanged={load} />)}
                  </div>
                </div>
              )}
              {portraitRest.length > 0 && (
                <div>
                  <h2 className="mb-3 text-sm font-bold">Portrait</h2>
                  <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 lazy-grid">
                    {portraitRest.map((v) => <VideoCard key={v.id} v={v} onChanged={load} />)}
                  </div>
                </div>
              )}
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
              <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
                <option value="">Select a category…</option>
                {UPLOAD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-sm text-neutral-600 hover:border-orange-400 hover:bg-orange-50 ${uploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}>
                <Upload className="h-5 w-5 text-orange-600" />
                <span className="font-semibold">{uploading ? "Uploading..." : "Upload video file"}</span>
                <span className="text-xs text-neutral-500">MP4, MOV, WebM up to 100MB</span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              </label>
              {localPreview && (
                <SmartVideo
                  src={localPreview}
                  controls
                  className={`mx-auto rounded-lg border border-neutral-200 bg-black ${form.orientation === "portrait" ? "h-72 w-auto" : "w-full max-h-56"}`}
                />
              )}
              <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Description" rows={3} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              <button onClick={submit} disabled={uploading || !form.title.trim() || !form.video_url.trim() || !form.category} className="w-full rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function VideoCard({ v, onChanged }: { v: Video; onChanged?: () => void }) {
  const { isAdmin } = useUserRole();
  const [saved, setSaved] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/videos/${v.id}` : `/videos/${v.id}`;
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMeId(user.id);
      const { data } = await supabase.from("video_saves").select("video_id").eq("video_id", v.id).eq("user_id", user.id).maybeSingle();
      setSaved(!!data);
    })();
  }, [v.id]);
  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!meId) { toast.error("Sign in to save"); return; }
    const next = !saved; setSaved(next);
    const { error } = next
      ? await supabase.from("video_saves").insert({ video_id: v.id, user_id: meId })
      : await supabase.from("video_saves").delete().eq("video_id", v.id).eq("user_id", meId);
    if (error) { setSaved(!next); toast.error(error.message); return; }
    toast.success(next ? "Saved" : "Unsaved");
  };
  const url = v.video_url || "";
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  const ytThumb = yt ? `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` : null;
  const poster = v.thumbnail_url || ytThumb;
  const isDirect = !yt && !vimeo && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
  const orientation = useVideoOrientation({
    url: isDirect ? url : null,
    orientation: v.orientation,
    aspectRatio: v.aspect_ratio ?? null,
    probe: isDirect,
  });
  const canDelete = isAdmin || (!!meId && meId === v.user_id);
  const remove = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm("Delete this video? This cannot be undone.")) return;
    setDeleted(true);
    const { error } = await supabase.from("videos").delete().eq("id", v.id);
    if (error) { setDeleted(false); toast.error(error.message); return; }
    toast.success("Video deleted");
    onChanged?.();
  };
  if (deleted) return null;
  return (
    <>
    <Link to="/videos/$id" params={{ id: v.id }} className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white block">
      <div className={`relative ${orientationClass(orientation)} bg-neutral-900 overflow-hidden`}>
        {poster ? (
          <Img src={poster} alt={v.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : isDirect || url.startsWith("blob:") || url.startsWith("http") ? (
          <SmartVideo
            src={`${url}${url.includes("#") ? "" : "#t=0.5"}`}
            preload="metadata"
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {v.featured && <div className="absolute left-3 top-3 rounded-md bg-yellow-400 px-2 py-1 text-[10px] font-bold text-yellow-900">★ Featured</div>}
        {canDelete && (
          <button
            onClick={remove}
            aria-label="Delete video"
            title="Delete video"
            className="absolute left-3 bottom-3 z-10 rounded-full bg-white/90 p-2 text-red-600 shadow-md transition hover:bg-white"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        {isAdmin && orientation !== "portrait" && (
          <button
            onClick={async (e) => {
              e.preventDefault(); e.stopPropagation();
              const { error } = await supabase.from("videos").update({ featured: !v.featured } as any).eq("id", v.id);
              if (error) { toast.error(error.message); return; }
              toast.success(v.featured ? "Removed from featured" : "Marked as featured");
              onChanged?.();
            }}
            className={`absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold shadow-md transition ${v.featured ? "bg-white text-neutral-900 hover:bg-neutral-100" : "bg-yellow-400 text-yellow-900 hover:bg-yellow-300"}`}
          >
            <Star className={`h-3.5 w-3.5 ${v.featured ? "" : "fill-yellow-900"}`} />
            {v.featured ? "Unfeature" : "Feature"}
          </button>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-white/30 p-4 backdrop-blur group-hover:bg-white/50"><Play className="h-6 w-6 fill-white text-white" /></div>
        </div>
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShareOpen(true); }}
            aria-label="Share in app"
            title="Share with people you follow"
            className="rounded-full bg-white/90 p-2 text-neutral-800 shadow-md transition hover:bg-white"
          >
            <Send className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              externalShare(shareUrl, v.title, v.description || undefined);
            }}
            aria-label="Share outside the app"
            title="Share outside the app"
            className="rounded-full bg-white/90 p-2 text-neutral-800 shadow-md transition hover:bg-white"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={toggleSave}
            aria-label={saved ? "Unsave" : "Save"}
            title={saved ? "Unsave" : "Save"}
            className={`rounded-full p-2 shadow-md transition ${saved ? "bg-[#d4580a] text-white" : "bg-white/90 text-neutral-800 hover:bg-white"}`}
          >
            <Bookmark className={`h-4 w-4 ${saved ? "fill-white" : ""}`} />
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="text-sm font-semibold">{v.author?.display_name || v.author?.username || "Anonymous"}</div>
        <div className="text-xs text-neutral-500">{timeAgo(v.created_at)}</div>
        <p className="mt-2 line-clamp-2 text-sm text-neutral-700">{v.title}</p>
      </div>
    </Link>
    <ShareToUsersDialog
      open={shareOpen}
      onClose={() => setShareOpen(false)}
      url={shareUrl}
      title={v.title}
      preview={{ type: "video", id: v.id, url: shareUrl, title: v.title, excerpt: v.description, image: poster, author: v.author?.display_name || v.author?.username }}
    />
    </>
  );
}