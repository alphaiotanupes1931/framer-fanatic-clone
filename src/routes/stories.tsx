import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Clock, Plus, X, Send, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { stripHtml } from "@/lib/text-utils";

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

const STORY_FORMATS = [
  "All Formats","Novels","Short Stories","Poetry","Plays","Screenplays",
  "Memoirs","Novellas","Flash Fiction","Spoken Word","Journals / Diaries",
] as const;
const FORMATS = ["All","poetry","blog","essay","resource"];
const TABS = ["Discover","Trending","Featured"] as const;

function stripHtml(s: string | null | undefined) {
  if (!s) return "";
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Comment = {
  id: string; user_id: string; body: string; created_at: string;
  author?: { display_name: string | null; avatar_url: string | null };
};

function CommentsDialog({ story, onClose, onCountChange }: { story: Story; onClose: () => void; onCountChange: (n: number) => void }) {
  const me = useCurrentProfile();
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("story_comments")
      .select("*").eq("story_id", story.id).order("created_at", { ascending: true });
    const list = (data || []) as Comment[];
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((c) => { c.author = byId.get(c.user_id) as any; });
    }
    setItems(list); setLoading(false); onCountChange(list.length);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [story.id]);

  const send = async () => {
    if (!me || !text.trim()) return;
    setSending(true);
    const body = text.trim();
    setText("");
    const optimistic: Comment = { id: `temp-${Date.now()}`, story_id: story.id, user_id: me.id, body, created_at: new Date().toISOString(), author: { display_name: me.display_name, avatar_url: me.avatar_url } } as Comment;
    setItems((cur) => [...cur, optimistic]);
    onCountChange(items.length + 1);
    const { error } = await supabase.from("story_comments").insert({ story_id: story.id, user_id: me.id, body });
    setSending(false);
    if (error) { toast.error(error.message); setItems((cur) => cur.filter((c) => c.id !== optimistic.id)); setText(body); return; }
    load();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-background text-foreground shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Comments</div>
            <div className="truncate font-semibold">{story.title}</div>
          </div>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No comments yet. Be the first.</div>
          ) : items.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                {c.author?.avatar_url && <img src={c.author.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />}
                <AvatarFallback className="bg-orange-100 text-xs text-orange-700">{(c.author?.display_name || "U")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{c.author?.display_name || "Anonymous"}</div>
                <div className="text-sm text-muted-foreground">{c.body}</div>
              </div>
            </div>
          ))}
        </div>
        {me ? (
          <div className="flex gap-2 border-t p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Add a comment…"
              className="flex-1 rounded-full border bg-transparent px-4 py-2 text-sm"
            />
            <button onClick={send} disabled={sending || !text.trim()} className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="border-t p-3 text-center text-sm text-muted-foreground">Sign in to comment.</div>
        )}
      </div>
    </div>
  );
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
  const [storyFormat, setStoryFormat] = useState<(typeof STORY_FORMATS)[number]>("All Formats");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", excerpt: "", content: "", format: "blog", cover_url: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
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
    const res = liked
      ? await supabase.from("story_likes").delete().eq("story_id", s.id).eq("user_id", me.id)
      : await supabase.from("story_likes").insert({ story_id: s.id, user_id: me.id });
    if (res.error) {
      toast.error(res.error.message);
      await load();
    }
  };

  const submit = async () => {
    if (!me || !form.title.trim()) return;
    const read = Math.max(1, Math.round(form.content.split(/\s+/).length / 200));
    const { error } = await supabase.from("stories").insert({
      user_id: me.id, title: form.title.trim(), excerpt: form.excerpt.trim() || null,
      content: form.content.trim(), format: form.format, read_minutes: read,
      cover_url: form.cover_url || null,
    });
    if (error) { toast.error(error.message); return; }
    setOpen(false); setForm({ title: "", excerpt: "", content: "", format: "blog", cover_url: "" });
    toast.success("Story published"); load();
  };

  const pickCover = async (file: File) => {
    if (!me) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("story-covers").upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;
      const { data: signed, error: sErr } = await supabase.storage.from("story-covers").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed) throw sErr ?? new Error("Could not sign URL");
      setForm((f) => ({ ...f, cover_url: signed.signedUrl }));
      toast.success("Cover image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <HeroBanner
          title="Stories"
          subtitle="Discover stories from Baltimore's writing community."
          cta={
            <Button
              onClick={() => setOpen(true)}
              variant="outline"
              className="gap-2 rounded-lg"
              style={{ borderColor: "#d4580a", color: "#d4580a" }}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Write A Story</span>
            </Button>
          }
        />

        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">Browse by format</div>
          <div className="flex flex-wrap gap-2">
            {STORY_FORMATS.map((f) => (
              <button key={f} onClick={() => setStoryFormat(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${storyFormat===f ? "bg-orange-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 border-b border-neutral-200">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`border-b-2 pb-2.5 text-sm font-semibold ${tab===t ? "border-orange-600 text-orange-600" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>{t}</button>
          ))}
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${filter===f ? "bg-orange-600 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>{f}</button>
            ))}
          </div>
        </div>

        {stories.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">No stories yet. Write the first one!</div>}

        <div className="space-y-4">
          {stories.map((s) => (
            <article key={s.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    {s.author?.avatar_url && <img src={s.author.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />}
                    <AvatarFallback className="bg-orange-100 text-xs text-orange-700">{(s.author?.display_name || "U")[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{s.author?.display_name || "Anonymous"}</span>
                  <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-orange">{s.format}</span>
                </div>
                <Link to="/stories/$storyId" params={{ storyId: s.id }} className="group block">
                  <h3 className="font-serif text-lg font-bold transition-colors group-hover:text-[#d4580a] line-clamp-2 break-words">{s.title}</h3>
                  {stripHtml(s.excerpt) && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground break-words">{stripHtml(s.excerpt)}</p>}
                </Link>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
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
                <Link to="/stories/$storyId" params={{ storyId: s.id }} className="shrink-0">
                  <img src={s.cover_url} alt="" className="h-24 w-32 rounded-lg object-cover" loading="lazy" decoding="async" />
                </Link>
              )}
            </article>
          ))}
        </div>
      </div>

      {commentsFor && (
        <CommentsDialog story={commentsFor} onClose={() => setCommentsFor(null)} onCountChange={(n: number) => {
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
              <div className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-center gap-3">
                  {form.cover_url ? (
                    <img src={form.cover_url} alt="" className="h-16 w-16 rounded-md object-cover border" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-md bg-neutral-100 text-neutral-400"><ImagePlus className="h-5 w-5" /></div>
                  )}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                      {form.cover_url ? "Replace cover image" : "Upload cover image"}
                    </button>
                    {form.cover_url && (
                      <button type="button" onClick={() => setForm({ ...form, cover_url: "" })} className="ml-2 text-xs text-neutral-500 hover:text-neutral-800">Remove</button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickCover(f); e.target.value = ""; }}
                    />
                    <p className="mt-1 text-[11px] text-neutral-500">Optional. Shown on the story card and detail page.</p>
                  </div>
                </div>
              </div>
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