import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SmartAvatarImage } from "@/components/shared/smart-img";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Author = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
type Comment = { id: string; user_id: string; content: string; created_at: string; author?: Author };

export function EventSocial({ eventId, hostId }: { eventId: string; hostId?: string | null }) {
  const [me, setMe] = useState<string | null>(null);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("event_comments")
      .select("id,user_id,content,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (data ?? []) as Comment[];
    const ids = [...new Set(rows.map((r) => r.user_id))];
    let byId = new Map<string, Author>();
    if (ids.length) {
      const { data: people } = await supabase.rpc("get_actors_minimal", { _ids: ids });
      byId = new Map(((people ?? []) as Author[]).map((p) => [p.id, p]));
    }
    setComments(rows.map((r) => ({ ...r, author: byId.get(r.user_id) })));
  }, [eventId]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id ?? null;
      setMe(uid);
      const { count } = await supabase.from("event_likes").select("event_id", { count: "exact", head: true }).eq("event_id", eventId);
      setLikes(count ?? 0);
      if (uid) {
        const { data: mine } = await supabase.from("event_likes").select("event_id").eq("event_id", eventId).eq("user_id", uid).maybeSingle();
        setLiked(!!mine);
      }
      await loadComments();
    })();
  }, [eventId, loadComments]);

  const toggleLike = async () => {
    if (!me) { toast.error("Sign in to like this event"); return; }
    const prev = liked;
    setLiked(!prev);
    setLikes((n) => n + (prev ? -1 : 1));
    const { error } = prev
      ? await supabase.from("event_likes").delete().eq("event_id", eventId).eq("user_id", me)
      : await supabase.from("event_likes").insert({ event_id: eventId, user_id: me });
    if (error) {
      setLiked(prev);
      setLikes((n) => n + (prev ? 1 : -1));
      toast.error("Couldn't update your like");
    }
  };

  const submit = async () => {
    const content = draft.trim();
    if (!content) return;
    if (!me) { toast.error("Sign in to comment"); return; }
    setSending(true);
    const { data, error } = await supabase
      .from("event_comments")
      .insert({ event_id: eventId, user_id: me, content })
      .select("id,user_id,content,created_at")
      .single();
    setSending(false);
    if (error || !data) { toast.error("Couldn't post your comment"); return; }
    setDraft("");
    const { data: people } = await supabase.rpc("get_actors_minimal", { _ids: [me] });
    const author = ((people ?? []) as Author[])[0];
    setComments((c) => [{ ...(data as Comment), author }, ...c]);
  };

  const remove = async (c: Comment) => {
    const prev = comments;
    setComments((list) => list.filter((x) => x.id !== c.id));
    const { error } = await supabase.from("event_comments").delete().eq("id", c.id);
    if (error) { setComments(prev); toast.error("Couldn't delete that comment"); }
  };

  return (
    <div className="border-t border-border pt-6">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${liked ? "border-transparent bg-[#d4580a]/10 text-[#d4580a]" : "border-border text-muted-foreground hover:text-foreground"}`}
          aria-label={liked ? "Unlike event" : "Like event"}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          {likes}
        </button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </div>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }}
          rows={1}
          placeholder={me ? "Add a comment" : "Sign in to comment"}
          className="max-h-32 flex-1 resize-none rounded-2xl border border-border bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <Button onClick={submit} disabled={sending || !draft.trim()} className="rounded-2xl text-white" style={{ backgroundColor: "#d4580a" }}>Post</Button>
      </div>

      <div className="mt-5 space-y-4">
        {comments.map((c) => {
          const canDelete = me && (c.user_id === me || hostId === me);
          const name = c.author?.display_name || c.author?.username || "Someone";
          return (
            <div key={c.id} className="group flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <SmartAvatarImage src={c.author?.avatar_url ?? undefined} />
                <AvatarFallback style={{ backgroundColor: "rgba(212,88,10,0.1)", color: "#d4580a" }}>{name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {c.author?.username ? (
                    <Link to="/u/$username" params={{ username: c.author.username }} className="text-sm font-semibold text-foreground hover:underline">{name}</Link>
                  ) : (
                    <span className="text-sm font-semibold text-foreground">{name}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{c.content}</p>
              </div>
              {canDelete && (
                <button onClick={() => void remove(c)} className="rounded-full p-1.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100" aria-label="Delete comment">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
        {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>}
      </div>
    </div>
  );
}
