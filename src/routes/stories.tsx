import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Clock, Plus, X, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/stories")({
  component: StoriesPage,
  head: () => ({ meta: [{ title: "Stories - Planet Baltimore" }] }),
});

type Story = {
  id: string; user_id: string; title: string; excerpt: string | null;
  cover_url: string | null; format: string; read_minutes: number | null;
  likes_count: number; comments_count: number; created_at: string;
  author?: { display_name: string | null; avatar_url: string | null };
};

const FORMATS = ["All","poetry","blog","essay","resource"];
const TABS = ["Discover","Trending","Featured"] as const;

function stripHtml(s: string | null | undefined) {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function StoriesPage() {
  const auth = useAuthState();
  if (auth.loading) return null;
  if (!auth.signedIn) return <AnonStories />;
  return <StoriesSignedIn />;
}

function AnonStories() {
  const [list, setList] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("stories")
        .select("id, user_id, title, excerpt, cover_url, format, read_minutes, likes_count, comments_count, created_at")
        .order("created_at", { ascending: false }).limit(24);
      setList((data || []) as Story[]); setLoading(false);
    })();
  }, []);
  return (
    <PublicShell title="Stories" subtitle="Poetry, essays, blogs and resources from Baltimore's writing community." signedIn={false}>
      {loading ? <div className="text-paper/60 text-sm">Loading…</div> :
        <PreviewGrid
          items={list}
          unlockedCount={1}
          signedIn={false}
          thing="story"
          render={(s) => (
            <article className="rounded-2xl border border-paper/10 bg-paper/5 p-5 h-full">
              <div className="text-[10px] font-bold uppercase tracking-wider text-paper/60">{(s as Story).format}</div>
              <h3 className="font-display text-lg font-bold mt-1">{(s as Story).title}</h3>
              {stripHtml((s as Story).excerpt) && <p className="text-sm text-paper/70 mt-2 line-clamp-3">{stripHtml((s as Story).excerpt)}</p>}
              <div className="mt-3 flex items-center gap-3 text-xs text-paper/60">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {(s as Story).read_minutes || 1} min</span>
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {(s as Story).likes_count}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {(s as Story).comments_count}</span>
              </div>
            </article>
          )}
          emptyLabel="No stories yet."
        />
      }
    </PublicShell>
  );
}

function StoriesSignedIn() {
  const me = useCurrentProfile();
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState("All");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Discover");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", excerpt: "", content: "", format: "blog" });
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [commentsFor, setCommentsFor] = useState<Story | null>(null);

  const load = async () => {
    let q = supabase.from("stories").select("*").order("created_at", { ascending: false }).limit(50);
    if (filter !== "All") q = q.eq("format", filter);
    if (tab === "Featured") q = q.eq("featured", true);
    if (tab === "Trending") q = q.order("likes_count", { ascending: false });
    const { data } = await q;
    const list = (data || []) as Story[];
    const ids = Array.from(new Set(list.map((s) => s.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((s) => { s.author = byId.get(s.user_id) as any; });
    }
    setStories(list);
    if (me && list.length) {
      const { data: likes } = await supabase
        .from("story_likes").select("story_id")
        .eq("user_id", me.id)
        .in("story_id", list.map((s) => s.id));
      setLikedIds(new Set((likes || []).map((l: any) => l.story_id)));
    }
  };

  useEffect(() => { load(); }, [filter, tab, me?.id]);

  const toggleLike = async (s: Story) => {
    if (!me) { toast.error("Sign in to like"); return; }
    const liked = likedIds.has(s.id);
    // optimistic
    setLikedIds((prev) => {
      const n = new Set(prev);
      if (liked) n.delete(s.id); else n.add(s.id);
      return n;
    });
    setStories((prev) => prev.map((x) => x.id === s.id ? { ...x, likes_count: Math.max(0, (x.likes_count || 0) + (liked ? -1 : 1)) } : x));
    if (liked) {
      await supabase.from("story_likes").delete().eq("story_id", s.id).eq("user_id", me.id);
    } else {
      await supabase.from("story_likes").insert({ story_id: s.id, user_id: me.id });
    }
  };

  const submit = async () => {
    if (!me || !form.title.trim()) return;
    const read = Math.max(1, Math.round(form.content.split(/\s+/).length / 200));
    const { error } = await supabase.from("stories").insert({
      user_id: me.id, title: form.title.trim(), excerpt: form.excerpt.trim() || null,
      content: form.content.trim(), format: form.format, read_minutes: read,
    });
    if (error) { toast.error(error.message); return; }
    setOpen(false); setForm({ title: "", excerpt: "", content: "", format: "blog" });
    toast.success("Story published"); load();
  };

  return (
    <AppLayout title="Stories" subtitle="Discover stories from Baltimore's writing community.">
      <div className="space-y-6">
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-700">
          <Plus className="h-4 w-4" /> Write A Story
        </button>

        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">Browse by format</div>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${filter===f ? "bg-orange-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 border-b border-neutral-200">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`border-b-2 pb-2.5 text-sm font-semibold ${tab===t ? "border-orange-600 text-orange-600" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>{t}</button>
          ))}
        </div>

        {stories.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">No stories yet. Write the first one!</div>}

        <div className="space-y-4">
          {stories.map((s) => (
            <article key={s.id} className="flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    {s.author?.avatar_url && <img src={s.author.avatar_url} alt="" className="h-full w-full object-cover" />}
                    <AvatarFallback className="bg-orange-100 text-xs text-orange-700">{(s.author?.display_name || "U")[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{s.author?.display_name || "Anonymous"}</span>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-orange-700">{s.format}</span>
                </div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                {stripHtml(s.excerpt) && <p className="mt-1 line-clamp-3 text-sm text-neutral-600">{stripHtml(s.excerpt)}</p>}
                <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.read_minutes || 1} min</span>
                  <button
                    onClick={() => toggleLike(s)}
                    className={`inline-flex items-center gap-1 transition ${likedIds.has(s.id) ? "text-red-500" : "hover:text-neutral-800"}`}
                    aria-label={likedIds.has(s.id) ? "Unlike" : "Like"}
                  >
                    <Heart className={`h-3.5 w-3.5 ${likedIds.has(s.id) ? "fill-current" : ""}`} /> {s.likes_count}
                  </button>
                  <button
                    onClick={() => setCommentsFor(s)}
                    className="inline-flex items-center gap-1 hover:text-neutral-800"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> {s.comments_count}
                  </button>
                </div>
              </div>
              {s.cover_url && (
                <img src={s.cover_url} alt="" className="h-24 w-32 shrink-0 rounded-lg object-cover" />
              )}
            </article>
          ))}
        </div>
      </div>

      {commentsFor && (
        <CommentsDialog story={commentsFor} onClose={() => setCommentsFor(null)} onCountChange={(n) => {
          setStories((prev) => prev.map((x) => x.id === commentsFor.id ? { ...x, comments_count: n } : x));
        }} />
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Write A Story</h2>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Title" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              <select value={form.format} onChange={(e) => setForm({...form, format: e.target.value})} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                {["blog","poetry","essay","resource"].map((f) => <option key={f}>{f}</option>)}
              </select>
              <input value={form.excerpt} onChange={(e) => setForm({...form, excerpt: e.target.value})} placeholder="Excerpt (optional)" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              <textarea value={form.content} onChange={(e) => setForm({...form, content: e.target.value})} placeholder="Your story…" rows={10} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              <button onClick={submit} className="w-full rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">Publish</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}