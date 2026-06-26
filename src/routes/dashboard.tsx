import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, Send, Palette, Ticket, MapPin, Users, BookOpen, Trophy, Search, X, Pencil, Trash2, Check, BadgeCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { useUserRole } from "@/hooks/use-user-role";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Planet Baltimore - Your feed" }] }),
});

type Post = {
  id: string; user_id: string; content: string; image_url: string | null;
  likes_count: number | null; comments_count: number | null; neighborhood: string | null; created_at: string;
  author?: { display_name: string | null; avatar_url: string | null; username: string | null; neighborhood: string | null; is_founder?: boolean };
};

type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: { display_name: string | null; avatar_url: string | null; username: string | null };
};

function Dashboard() {
  const navigate = useNavigate();
  const { isArtist, loading: roleLoading } = useUserRole();
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<"for-you" | "following" | "nearby">("for-you");
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const load = async (currentUserId?: string) => {
    setLoading(true);
    const { data: ps } = await supabase.from("posts")
      .select("id, user_id, content, image_url, likes_count, comments_count, neighborhood, created_at")
      .order("created_at", { ascending: false }).limit(50);
    const list = (ps || []) as Post[];
    const ids = Array.from(new Set(list.map((p) => p.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((p) => { p.author = byId.get(p.user_id) as any; });
    }
    setPosts(list);
    if (currentUserId && list.length) {
      const { data: likes } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", list.map((p) => p.id));
      setLikedPostIds(new Set((likes || []).map((l) => l.post_id)));
      const { data: saves } = await supabase
        .from("post_saves")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", list.map((p) => p.id));
      setSavedPostIds(new Set((saves || []).map((s) => s.post_id)));
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth" });
      } else {
        setMe(data.session.user.id);
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, banned")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (prof && (prof as { banned?: boolean }).banned) {
          await supabase.auth.signOut();
          toast.error("Your account has been suspended.");
          navigate({ to: "/auth" });
          return;
        }
        if (prof) setMyProfile(prof as typeof myProfile);
        await load(data.session.user.id);
      }
      setChecked(true);
    })();
  }, [navigate]);

  const createPost = async () => {
    if (!content.trim() || !me) return;
    if (!isArtist) {
      toast.error("Only Artists can post. Become an Artist in your profile to share posts.");
      return;
    }
    const { error } = await supabase.from("posts").insert({ user_id: me, content: content.trim() });
    if (error) { toast.error(error.message); return; }
    setContent("");
    toast.success("Posted");
    load(me);
  };

  const togglePostLike = async (post: Post) => {
    if (!me) return;
    const liked = likedPostIds.has(post.id);
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(post.id); else next.add(post.id);
      return next;
    });
    setPosts((cur) => cur.map((x) => x.id === post.id ? {
      ...x,
      likes_count: Math.max(0, (x.likes_count ?? 0) + (liked ? -1 : 1)),
    } : x));
    const res = liked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", me)
      : await supabase.from("post_likes").insert({ post_id: post.id, user_id: me });
    if (res.error) {
      toast.error(res.error.message);
      await load(me);
    }
  };

  const startEdit = (p: Post) => {
    setEditingId(p.id);
    setEditingText(p.content);
  };

  const saveEdit = async (p: Post) => {
    const next = editingText.trim();
    if (!next || !me) return;
    const prev = p.content;
    setPosts((cur) => cur.map((x) => x.id === p.id ? { ...x, content: next } : x));
    setEditingId(null);
    const { error } = await supabase.from("posts").update({ content: next }).eq("id", p.id).eq("user_id", me);
    if (error) {
      toast.error(error.message);
      setPosts((cur) => cur.map((x) => x.id === p.id ? { ...x, content: prev } : x));
    } else {
      toast.success("Post updated");
    }
  };

  const deletePost = async (p: Post) => {
    if (!me) return;
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const prev = posts;
    setPosts((cur) => cur.filter((x) => x.id !== p.id));
    const { error } = await supabase.from("posts").delete().eq("id", p.id).eq("user_id", me);
    if (error) {
      toast.error(error.message);
      setPosts(prev);
    } else {
      toast.success("Post deleted");
    }
  };

  const toggleSave = async (post: Post) => {
    if (!me) return;
    const saved = savedPostIds.has(post.id);
    setSavedPostIds((prev) => {
      const next = new Set(prev);
      if (saved) next.delete(post.id); else next.add(post.id);
      return next;
    });
    const res = saved
      ? await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", me)
      : await supabase.from("post_saves").insert({ post_id: post.id, user_id: me });
    if (res.error) {
      toast.error(res.error.message);
      setSavedPostIds((prev) => {
        const next = new Set(prev);
        if (saved) next.add(post.id); else next.delete(post.id);
        return next;
      });
    } else {
      toast.success(saved ? "Removed from saved" : "Saved");
    }
  };

  if (!checked) return null;

  return (
    <AppLayout
      title="Home"
      subtitle="What's moving in Baltimore right now."
    >
      <div className="mx-auto max-w-2xl">
        {myProfile?.display_name && (
          <div className="mb-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {myProfile.display_name.split(" ")[0]}.
            </h2>
          </div>
        )}
        <CreatorSearch />
        <DiscoverStrip />

        <div className="mb-4 flex w-full items-center gap-1 rounded-full border border-border bg-muted p-1 sm:inline-flex sm:w-auto">
          {([["for-you","For you"],["following","Following"],["nearby","Nearby"]] as const).map(([k,l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-full px-4 py-1.5 text-[12.5px] font-medium transition sm:flex-none ${
                tab===k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {!roleLoading && !isArtist ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted p-4 text-center text-[13px] text-muted-foreground">
            You're signed in as an <strong>Attendee</strong>. You can view posts and buy event tickets.
            To post, head to your <Link to="/profile" className="text-orange font-semibold hover:underline">Profile</Link> and become an Artist.
          </div>
        ) : (
        <div className="rounded-2xl border border-border bg-card p-4 transition focus-within:border-ring">
          <div className="flex gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              {myProfile?.avatar_url && <AvatarImage src={myProfile.avatar_url} />}
              <AvatarFallback className="bg-neutral-900 text-[11px] text-white">
                {(myProfile?.display_name || "U").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share something with Baltimore…"
                className="w-full resize-none border-0 bg-transparent p-0 text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                rows={2}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={createPost}
                  disabled={!content.trim()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-orange px-4 py-1.5 text-[13px] font-medium text-white transition disabled:opacity-40 hover:brightness-110"
                >
                  <Send className="h-3.5 w-3.5" /> Post
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        <div className="mt-6">
          {loading && <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && posts.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No posts yet. Be the first to share something.
            </div>
          )}

          {posts.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
              className={`group my-4 rounded-2xl border p-5 transition-shadow hover:shadow-sm ${
                p.author?.is_founder
                  ? "border-orange/40 bg-gradient-to-br from-orange/10 via-card to-card shadow-[0_0_0_1px_rgba(255,140,50,0.15)]"
                  : "border-border bg-card"
              }`}
            >
              {p.author?.is_founder && (
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-orange/15 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-orange">
                  <Sparkles className="h-3 w-3" strokeWidth={2} /> Founder message
                </div>
              )}
              <header className="flex items-center gap-3">
                <Avatar className={`h-10 w-10 ${p.author?.is_founder ? "ring-2 ring-orange/60 ring-offset-2 ring-offset-card" : ""}`}>
                  {p.author?.avatar_url && <AvatarImage src={p.author.avatar_url} />}
                  <AvatarFallback className="bg-muted text-[11px] text-muted-foreground">
                    {(p.author?.display_name || p.author?.username || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-foreground">
                    <span className="truncate">{p.author?.display_name || p.author?.username || "Anonymous"}</span>
                    {p.author?.is_founder && (
                      <span title="Founder" className="inline-flex items-center gap-1 rounded-full bg-orange px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-white">
                        <BadgeCheck className="h-3 w-3" strokeWidth={2.5} /> Founder
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {p.author?.neighborhood || "Baltimore"} · {new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
                {me === p.user_id && (
                  <div className="ml-auto flex items-center gap-1">
                    {editingId === p.id ? (
                      <>
                        <button
                          onClick={() => saveEdit(p)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Save edit"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditingText(""); }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Cancel edit"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(p)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Edit post"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deletePost(p)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-red-500"
                          aria-label="Delete post"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </header>
              {editingId === p.id ? (
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  rows={3}
                  className="mt-3 ml-0 sm:ml-12 w-[calc(100%-0px)] sm:w-[calc(100%-3rem)] resize-none rounded-xl border border-border bg-muted p-3 text-[15px] leading-relaxed text-foreground outline-none focus:border-orange"
                />
              ) : (
                <div className="mt-3 pl-0 sm:pl-12 text-[15px] leading-relaxed text-foreground">{p.content}</div>
              )}
              {p.image_url && (
                <div className="mt-3 overflow-hidden rounded-xl sm:pl-12">
                  <img src={p.image_url} alt="" className="w-full" loading="lazy" />
                </div>
              )}
              <footer className="mt-3 flex items-center gap-6 pl-0 sm:pl-12 text-[12.5px] text-muted-foreground">
                <button
                  onClick={() => togglePostLike(p)}
                  className={`flex items-center gap-1.5 transition ${likedPostIds.has(p.id) ? "text-red-500" : "hover:text-foreground"}`}
                  aria-label={likedPostIds.has(p.id) ? "Unlike" : "Like"}
                >
                  <Heart className={`h-4 w-4 ${likedPostIds.has(p.id) ? "fill-current" : ""}`} strokeWidth={1.75} /> {p.likes_count ?? 0}
                </button>
                <button
                  onClick={() => setCommentsFor(p)}
                  className="flex items-center gap-1.5 transition hover:text-foreground"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> {p.comments_count ?? 0}
                </button>
                <button
                  onClick={async () => {
                    const url = `${window.location.origin}/dashboard#post-${p.id}`;
                    try {
                      if (navigator.share) await navigator.share({ url, title: "Planet Baltimore" });
                      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
                    } catch { /* cancelled */ }
                  }}
                  className="transition hover:text-foreground"
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => toggleSave(p)}
                  aria-label={savedPostIds.has(p.id) ? "Unsave" : "Save"}
                  className={`ml-auto transition ${savedPostIds.has(p.id) ? "text-orange" : "hover:text-foreground"}`}
                >
                  <Bookmark className={`h-4 w-4 ${savedPostIds.has(p.id) ? "fill-current" : ""}`} strokeWidth={1.75} />
                </button>
              </footer>
            </motion.article>
          ))}
        </div>
      </div>
      {commentsFor && me && (
        <PostCommentsDialog
          post={commentsFor}
          me={me}
          onClose={() => setCommentsFor(null)}
          onCountChange={(count) => {
            setPosts((cur) => cur.map((p) => p.id === commentsFor.id ? { ...p, comments_count: count } : p));
          }}
        />
      )}
    </AppLayout>
  );
}

function PostCommentsDialog({ post, me, onClose, onCountChange }: { post: Post; me: string; onClose: () => void; onCountChange: (count: number) => void }) {
  const [items, setItems] = useState<PostComment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("post_comments")
      .select("id, post_id, user_id, body, created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list = (data || []) as PostComment[];
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((c) => { c.author = byId.get(c.user_id) as any; });
    }
    setItems(list);
    onCountChange(list.length);
    setLoading(false);
  };

  useEffect(() => { void loadComments(); }, [post.id]);

  const sendComment = async () => {
    if (!text.trim() || sending) return;
    const body = text.trim();
    setText("");
    setSending(true);
    const temp: PostComment = { id: `temp-${Date.now()}`, post_id: post.id, user_id: me, body, created_at: new Date().toISOString() };
    setItems((cur) => [...cur, temp]);
    onCountChange(items.length + 1);
    const { error } = await supabase.from("post_comments").insert({ post_id: post.id, user_id: me, body });
    setSending(false);
    if (error) {
      toast.error(error.message);
      setItems((cur) => cur.filter((c) => c.id !== temp.id));
      setText(body);
      return;
    }
    await loadComments();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card text-card-foreground shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Comments</div>
            <div className="truncate text-sm font-semibold text-foreground">{post.author?.display_name || post.author?.username || "Post"}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close comments">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-border px-4 py-3 text-sm text-foreground/90">
          {post.content}
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading comments…</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No comments yet. Be the first.</div>
          ) : items.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                {c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} />}
                <AvatarFallback className="bg-muted text-[11px] text-muted-foreground">
                  {(c.author?.display_name || c.author?.username || "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-2xl bg-muted px-3 py-2">
                <div className="text-xs font-semibold text-foreground">{c.author?.display_name || c.author?.username || "You"}</div>
                <div className="whitespace-pre-wrap break-words text-sm text-foreground/90">{c.body}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendComment(); } }}
              placeholder="Add a comment"
              className="h-10 flex-1 rounded-full border border-border bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-orange"
            />
            <button onClick={sendComment} disabled={!text.trim() || sending} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange text-white transition hover:brightness-110 disabled:opacity-40" aria-label="Send comment">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscoverStrip() {
  return _DiscoverStripImpl();
}

type CreatorRow = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood: string | null };

function CreatorSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CreatorRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_creators", { q, lim: 8 });
      if (cancelled) return;
      setResults((data as CreatorRow[] | null) ?? []);
      setLoading(false);
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div className="relative mb-5">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="Search creators on Planet Baltimore"
        className="h-11 w-full rounded-full border border-border bg-muted pl-11 pr-10 text-[14px] outline-none transition focus:border-orange focus:bg-background"
      />
      {q && (
        <button
          onClick={() => { setQ(""); setResults([]); }}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          {loading && <div className="px-4 py-3 text-[13px] text-muted-foreground">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-[13px] text-muted-foreground">No creators found.</div>
          )}
          {!loading && results.map((c) => (
            <Link
              key={c.id}
              to="/u/$username"
              params={{ username: c.username || c.id }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-accent"
            >
              <Avatar className="h-8 w-8">
                {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                <AvatarFallback className="bg-muted text-[11px] text-muted-foreground">
                  {(c.display_name || c.username || "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-foreground">
                  {c.display_name || c.username || "Unnamed"}
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {c.neighborhood || "Baltimore"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function _DiscoverStripImpl() {
  const items = [
    { to: "/artists", icon: Palette, label: "Artists", tint: "#f97316" },
    { to: "/events", icon: Ticket, label: "Events", tint: "#10b981" },
    { to: "/neighborhoods", icon: MapPin, label: "Neighborhoods", tint: "#6366f1" },
    { to: "/groups", icon: Users, label: "Groups", tint: "#f43f5e" },
    { to: "/stories", icon: BookOpen, label: "Stories", tint: "#f59e0b" },
  ] as const;
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Discover Baltimore</h2>
      </div>
      <div className="grid grid-cols-5 gap-3 sm:gap-5">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="group flex flex-col items-center gap-2.5 py-1"
          >
            <span
              className="relative inline-flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl transition-all duration-300 group-hover:-translate-y-0.5"
              style={{
                backgroundColor: `color-mix(in oklab, ${it.tint} 12%, transparent)`,
                color: it.tint,
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${it.tint} 22%, transparent), 0 1px 0 rgba(255,255,255,0.6), 0 8px 20px -12px ${it.tint}`,
              }}
            >
              <it.icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.75} />
            </span>
            <span className="text-[11px] font-medium tracking-tight text-foreground text-center leading-tight">{it.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

type LeaderRow = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; category: string | null; role: string | null; score: number };

function _TopCreatorsLeaderboard() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("top_creators", { lim: 20 });
      setRows(((data as LeaderRow[] | null) ?? []));
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  if (!rows.length) return null;

  const visible = expanded ? rows : rows.slice(0, 5);

  const medal = (i: number) => {
    if (i === 0) return "bg-amber-400 text-amber-950";
    if (i === 1) return "bg-zinc-300 text-zinc-800";
    if (i === 2) return "bg-orange-400 text-orange-950";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange/15 text-orange">
            <Trophy className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          <div>
            <div className="text-[13px] font-semibold text-foreground">Top 20 Creators</div>
            <div className="text-[11px] text-muted-foreground">Ranked by engagement on Planet Baltimore</div>
          </div>
        </div>
        {rows.length > 5 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-border px-3 py-1 text-[11.5px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {expanded ? "Show less" : `See all ${rows.length}`}
          </button>
        )}
      </div>
      <ol className="divide-y divide-border">
        {visible.map((c, i) => (
          <li key={c.id}>
            <Link
              to="/u/$username"
              params={{ username: c.username || c.id }}
              className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-accent"
            >
              <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${medal(i)}`}>
                {i + 1}
              </span>
              <Avatar className="h-9 w-9">
                {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                <AvatarFallback className="bg-muted text-[11px] text-muted-foreground">
                  {(c.display_name || c.username || "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-foreground">
                  {c.display_name || c.username || "Unnamed"}
                </div>
                <div className="truncate text-[11.5px] capitalize text-muted-foreground">
                  {(c.category || "Artist").replace(/_/g, " ")}
                </div>
              </div>
              <div className="shrink-0 text-[11.5px] font-semibold tabular-nums text-muted-foreground">
                {c.score}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
