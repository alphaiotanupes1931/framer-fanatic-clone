import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Heart, MessageCircle, Share2, Trash2, Send, Bookmark, Pencil } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/text-utils";

export const Route = createFileRoute("/posts/$postId")({
  component: PostDetail,
  head: () => ({ meta: [{ title: "Post - Planet Baltimore" }] }),
});

type Post = {
  id: string; user_id: string; content: string; image_url: string | null;
  video_url: string | null; music_url: string | null; post_type: string | null;
  bg_color: string | null; text_color: string | null; font_size: string | null;
  likes_count: number | null; comments_count: number | null;
  neighborhood: string | null; created_at: string;
};

type Author = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
type Comment = { id: string; user_id: string; body: string; created_at: string; author?: Author | null };

function PostDetail() {
  const { postId } = Route.useParams();
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: p } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
    setPost(p as Post | null);
    if (p) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: [p.user_id] });
      setAuthor(((profs || [])[0] as Author) || null);
      if (me) {
        const [{ data: l }, { data: s }] = await Promise.all([
          supabase.from("post_likes").select("post_id").eq("post_id", postId).eq("user_id", me.id).maybeSingle(),
          supabase.from("post_saves").select("post_id").eq("post_id", postId).eq("user_id", me.id).maybeSingle(),
        ]);
        setLiked(!!l); setSaved(!!s);
      }
      const { data: cs } = await supabase.from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
      const list = (cs || []) as Comment[];
      const ids = Array.from(new Set(list.map((c) => c.user_id)));
      if (ids.length) {
        const { data: cp } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
        const by = new Map(((cp || []) as Author[]).map((a) => [a.id, a]));
        list.forEach((c) => { c.author = by.get(c.user_id) || null; });
      }
      setComments(list);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [postId, me?.id]);

  const toggleLike = async () => {
    if (!me) { navigate({ to: "/auth" }); return; }
    if (!post) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setPost({ ...post, likes_count: (post.likes_count ?? 0) + (wasLiked ? -1 : 1) });
    const res = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", me.id)
      : await supabase.from("post_likes").insert({ post_id: post.id, user_id: me.id });
    if (res.error) { setLiked(wasLiked); toast.error(res.error.message); }
  };

  const toggleSave = async () => {
    if (!me) { navigate({ to: "/auth" }); return; }
    if (!post) return;
    const wasSaved = saved;
    setSaved(!wasSaved);
    const res = wasSaved
      ? await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", me.id)
      : await supabase.from("post_saves").insert({ post_id: post.id, user_id: me.id });
    if (res.error) { setSaved(wasSaved); toast.error(res.error.message); }
    else toast.success(wasSaved ? "Removed from saved" : "Saved");
  };

  const send = async () => {
    if (!me || !post || !text.trim()) return;
    const body = text.trim(); setText("");
    const { error } = await supabase.from("post_comments").insert({ post_id: post.id, user_id: me.id, body });
    if (error) { toast.error(error.message); setText(body); return; }
    await load();
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url, title: "Planet Baltimore" });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* cancelled */ }
  };

  const remove = async () => {
    if (!post || !me || post.user_id !== me.id) return;
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); navigate({ to: "/dashboard" });
  };

  if (loading) return <AppLayout title="" hero={false}><div className="text-muted-foreground text-sm">Loading post…</div></AppLayout>;
  if (!post) return (
    <AppLayout title="Post not found" hero={false}>
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
    </AppLayout>
  );

  const initials = (author?.display_name || author?.username || "U").slice(0, 2).toUpperCase();
  const isOwner = me && me.id === post.user_id;

  return (
    <AppLayout title="" hero={false}>
      <div className="mx-auto max-w-2xl">
        <button onClick={() => navigate({ to: "/dashboard" })} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <article className="overflow-hidden rounded-3xl border border-border bg-card">
          <header className="flex items-center gap-3 px-5 pt-5">
            {author ? (
              <Link to="/u/$username" params={{ username: author.username || author.id }} search={{ view: "resident" }} className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  {author.avatar_url && <AvatarImage src={author.avatar_url} alt="" />}
                  <AvatarFallback className="bg-[#d4580a]/10 text-[#d4580a]">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-foreground">{author.display_name || author.username || "Someone"}</div>
                  <div className="text-xs text-muted-foreground">{post.neighborhood || "Baltimore"} · {timeAgo(post.created_at)}</div>
                </div>
              </Link>
            ) : <div className="text-sm text-muted-foreground">Someone · {timeAgo(post.created_at)}</div>}
            {isOwner && (
              <div className="ml-auto flex items-center gap-2">
                <Link
                  to="/edit-post/$id"
                  params={{ id: post.id }}
                  aria-label="Edit post"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button onClick={remove} aria-label="Delete post" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </header>

          {post.content && (
            (post.post_type === "text" && post.bg_color) ? (
              <div className={`mx-5 my-4 rounded-2xl p-6 text-center font-medium whitespace-pre-wrap break-words ${
                  post.font_size === "sm" ? "text-base" :
                  post.font_size === "lg" ? "text-3xl" :
                  post.font_size === "xl" ? "text-5xl" :
                  "text-xl"
                }`}
                style={{ background: post.bg_color, color: post.text_color || "#fff" }}>
                {post.content}
              </div>
            ) : (
              <div className="px-5 py-4 whitespace-pre-wrap break-words text-[17px] leading-relaxed text-foreground">{post.content}</div>
            )
          )}

          {post.image_url && (
            <img src={post.image_url} alt="" className="w-full bg-black object-contain max-h-[85vh]" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          )}
          {post.video_url && (
            <video src={post.video_url} controls playsInline preload="metadata" className="w-full max-h-[85vh] bg-black" />
          )}
          {post.music_url && (
            <div className="px-5 py-3">
              <a href={post.music_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">🎵 Listen</a>
            </div>
          )}

          <footer className="flex items-center gap-5 border-t border-border px-5 py-3 text-sm text-muted-foreground">
            <button onClick={toggleLike} className={`inline-flex items-center gap-2 transition ${liked ? "text-[#d4580a]" : "hover:text-foreground"}`}>
              <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} /> {post.likes_count ?? 0}
            </button>
            <div className="inline-flex items-center gap-2"><MessageCircle className="h-5 w-5" /> {comments.length}</div>
            <button onClick={share} className="inline-flex items-center gap-2 hover:text-foreground"><Share2 className="h-5 w-5" /></button>
            <button onClick={toggleSave} className={`ml-auto inline-flex items-center gap-2 transition ${saved ? "text-[#d4580a]" : "hover:text-foreground"}`}>
              <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
            </button>
          </footer>

          <section className="border-t border-border px-5 py-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <MessageCircle className="h-4 w-4 text-[#d4580a]" /> Comments ({comments.length})
            </h2>
            {me ? (
              <div className="mt-3 flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Add a comment…" className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus:border-[#d4580a]" />
                <button onClick={send} disabled={!text.trim()} className="inline-flex items-center gap-1.5 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="mt-3 inline-block text-sm font-semibold text-[#d4580a] hover:underline">Sign in to comment</Link>
            )}
            <ul className="mt-5 space-y-4">
              {comments.map((c) => {
                const ci = (c.author?.display_name || c.author?.username || "U").slice(0, 2).toUpperCase();
                return (
                  <li key={c.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      {c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} alt="" />}
                      <AvatarFallback className="bg-[#d4580a]/10 text-xs text-[#d4580a]">{ci}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 rounded-2xl bg-secondary px-3 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-foreground">{c.author?.display_name || c.author?.username || "Anonymous"}</span>
                        <span className="text-muted-foreground">{timeAgo(c.created_at)}</span>
                      </div>
                      <div className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap">{c.body}</div>
                    </div>
                  </li>
                );
              })}
              {comments.length === 0 && <li className="text-sm text-muted-foreground">Be the first to comment.</li>}
            </ul>
          </section>
        </article>
      </div>
    </AppLayout>
  );
}