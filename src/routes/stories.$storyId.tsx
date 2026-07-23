import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { useUserRole } from "@/hooks/use-user-role";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Heart, MessageCircle, Clock, Share2, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "isomorphic-dompurify";

export const Route = createFileRoute("/stories/$storyId")({
  component: StoryDetail,
  head: () => ({ meta: [{ title: "Story - Planet Baltimore" }] }),
});

type Story = {
  id: string; user_id: string; title: string; excerpt: string | null; content: string | null;
  cover_url: string | null; format: string; read_minutes: number | null;
  likes_count: number; comments_count: number; created_at: string;
};

type Author = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

type Comment = { id: string; user_id: string; body: string; created_at: string; author?: Author | null };

function StoryDetail() {
  const { storyId } = Route.useParams();
  const me = useCurrentProfile();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.from("stories").select("*").eq("id", storyId).maybeSingle();
      setStory(s as Story | null);
      if (s) {
        const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: [s.user_id] });
        setAuthor(((profs || [])[0] as Author) || null);
        if (me) {
          const { data: l } = await supabase.from("story_likes").select("story_id").eq("story_id", storyId).eq("user_id", me.id).maybeSingle();
          setLiked(!!l);
        }
        const { data: cs } = await supabase.from("story_comments").select("*").eq("story_id", storyId).order("created_at", { ascending: true });
        const list = (cs || []) as Comment[];
        const ids = Array.from(new Set(list.map((c) => c.user_id)));
        if (ids.length) {
          const { data: cp } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
          const by = new Map(((cp || []) as Author[]).map((p) => [p.id, p]));
          list.forEach((c) => { c.author = by.get(c.user_id) || null; });
        }
        setComments(list);
      }
      setLoading(false);
    })();
  }, [storyId, me]);

  const toggleLike = async () => {
    if (!me) { navigate({ to: "/auth" }); return; }
    if (!story) return;
    if (liked) {
      await supabase.from("story_likes").delete().eq("story_id", story.id).eq("user_id", me.id);
      setLiked(false); setStory({ ...story, likes_count: Math.max(0, story.likes_count - 1) });
    } else {
      await supabase.from("story_likes").insert({ story_id: story.id, user_id: me.id });
      setLiked(true); setStory({ ...story, likes_count: story.likes_count + 1 });
    }
  };

  const send = async () => {
    if (!me || !story || !text.trim()) return;
    const body = text.trim(); setText("");
    const { error } = await supabase.from("story_comments").insert({ story_id: story.id, user_id: me.id, body });
    if (error) { toast.error(error.message); setText(body); return; }
    const { data: cs } = await supabase.from("story_comments").select("*").eq("story_id", story.id).order("created_at", { ascending: true });
    const list = (cs || []) as Comment[];
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: cp } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      const by = new Map(((cp || []) as Author[]).map((p) => [p.id, p]));
      list.forEach((c) => { c.author = by.get(c.user_id) || null; });
    }
    setComments(list);
    setStory({ ...story, comments_count: list.length });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: story?.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* cancelled */ }
  };

  const remove = async () => {
    if (!story || !me || (story.user_id !== me.id && !isAdmin)) return;
    if (!confirm("Delete this story?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); navigate({ to: "/stories" });
  };

  if (loading) return <AppLayout title="" hero={false}><div className="text-muted-foreground text-sm">Loading story…</div></AppLayout>;
  if (!story) return (
    <AppLayout title="Story not found" hero={false}>
      <Link to="/stories" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to stories
      </Link>
    </AppLayout>
  );

  const initials = (author?.display_name || author?.username || "U").slice(0, 2).toUpperCase();
  const isOwner = me && me.id === story.user_id;
  const canDelete = isOwner || isAdmin;
  const excerptText = story.excerpt ? story.excerpt.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "";

  const dateLabel = new Date(story.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <AppLayout title="" hero={false}>
      <Link to="/stories" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <article className="mx-auto max-w-3xl">
        {story.cover_url && (
          <div className="overflow-hidden rounded-2xl bg-muted">
            <img src={story.cover_url} alt={story.title} className="block w-full object-cover" loading="lazy" decoding="async" />
          </div>
        )}

        <div className="mt-6 flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl break-words">{story.title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            {isOwner && (
              <Link
                to="/edit-story/$id"
                params={{ id: story.id }}
                aria-label="Edit story"
                className="rounded-full border border-border bg-card p-2 text-foreground hover:bg-accent"
              >
                <Pencil className="h-4 w-4" />
              </Link>
            )}
            {canDelete && (
              <button onClick={remove} aria-label="Delete story" className="rounded-full border border-border bg-card p-2 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {excerptText && <p className="mt-2 text-lg text-muted-foreground break-words">{excerptText}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {story.read_minutes && (
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {story.read_minutes} min read</span>
          )}
          <span className="text-muted-foreground/50">·</span>
          <span>{dateLabel}</span>
        </div>

        {author && (
          <Link to="/u/$username" params={{ username: author.username || author.id }} className="mt-5 flex items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
            <Avatar className="h-11 w-11">
              {author.avatar_url && <AvatarImage src={author.avatar_url} alt="" />}
              <AvatarFallback className="bg-[#d4580a]/10 text-[#d4580a]">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-foreground">{author.display_name || author.username}</div>
              <div className="text-xs text-muted-foreground">Published {dateLabel}</div>
            </div>
          </Link>
        )}

        <div className="mt-6">
          <span className="inline-block rounded-lg bg-secondary px-3 py-1 text-xs font-semibold text-foreground">{story.format}</span>
        </div>

        <div>
          {story.content && (
            /^\s*<[a-z]/i.test(story.content) ? (
              <div
                className="prose prose-neutral mt-6 max-w-none text-[17px] leading-relaxed text-foreground/90"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story.content) }}
              />
            ) : (
              <div className="prose prose-neutral mt-6 max-w-none whitespace-pre-wrap text-[17px] leading-relaxed text-foreground/90">
                {story.content}
              </div>
            )
          )}

          <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
            <button onClick={toggleLike} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${liked ? "bg-[#d4580a] text-white" : "text-foreground hover:bg-accent"}`}>
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {story.likes_count}
            </button>
            <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-accent">
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>

          <section className="mt-10">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <MessageCircle className="h-5 w-5 text-[#d4580a]" /> Comments ({story.comments_count})
            </h2>

            {me ? (
              <div className="mt-4 flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Add a comment…" className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus:border-[#d4580a]" />
                <button onClick={send} disabled={!text.trim()} className="inline-flex items-center gap-1.5 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="mt-4 inline-block text-sm font-semibold text-[#d4580a] hover:underline">Sign in to comment</Link>
            )}

            <ul className="mt-6 space-y-4">
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
                        <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap">{c.body}</div>
                    </div>
                  </li>
                );
              })}
              {comments.length === 0 && <li className="text-sm text-muted-foreground">Be the first to comment.</li>}
            </ul>
          </section>
        </div>
      </article>
    </AppLayout>
  );
}