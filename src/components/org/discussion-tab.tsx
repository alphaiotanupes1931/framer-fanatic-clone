import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Heart, MessageCircle, Send, Trash2, ImagePlus, Loader2, X, EyeOff, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Img, SmartVideo, SmartAvatarImage } from "@/components/shared/smart-img";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FollowButton } from "@/components/shared/follow-button";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { externalShare } from "@/lib/share-preview";
import { timeAgo } from "@/lib/text-utils";
import { STORED_URL_TTL, compressImage } from "@/lib/image-compress";
import { ReportButton } from "@/components/shared/report-button";
import { MentionText } from "@/components/shared/mention-text";
import { MentionField } from "@/components/shared/mention-input";

const isVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);

type Author = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

type Row = {
  id: string;
  org_id: string;
  user_id: string;
  body: string;
  created_at: string;
  media_urls: string[];
  is_muted: boolean;
  parent_id: string | null;
  author?: Author | null;
  likes: number;
  liked: boolean;
};

/**
 * Shared discussion surface used by the Comments, Threads, Reviews and Talk
 * tabs. Members post text plus photos or video, like and reply, and page
 * moderators can hide or delete anything.
 */
export function DiscussionTab({
  orgId,
  me,
  canManage,
  placeholder = "Share something with this page…",
}: {
  orgId: string;
  me: string | null;
  canManage: boolean;
  placeholder?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("organization_comments")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    const list = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      ...(r as unknown as Row),
      media_urls: Array.isArray(r.media_urls) ? (r.media_urls as string[]) : [],
      is_muted: !!r.is_muted,
      parent_id: (r.parent_id as string | null) ?? null,
      likes: 0,
      liked: false,
    })) as Row[];

    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      const by = new Map(((profs ?? []) as Author[]).map((p) => [p.id, p]));
      list.forEach((c) => { c.author = by.get(c.user_id) ?? null; });
    }
    if (list.length) {
      const { data: likes } = await supabase
        .from("organization_comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", list.map((c) => c.id));
      const counts = new Map<string, number>();
      const mine = new Set<string>();
      for (const l of (likes ?? []) as { comment_id: string; user_id: string }[]) {
        counts.set(l.comment_id, (counts.get(l.comment_id) ?? 0) + 1);
        if (me && l.user_id === me) mine.add(l.comment_id);
      }
      list.forEach((c) => { c.likes = counts.get(c.id) ?? 0; c.liked = mine.has(c.id); });
    }
    setRows(list);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId, me]);

  const upload = async (file: File) => {
    const f = await compressImage(file);
    const video = f.type.startsWith("video/");
    const cap = video ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (f.size > cap) { toast.error(`${video ? "Video" : "Image"} must be under ${cap / 1024 / 1024}MB`); return; }
    if (!me) { toast.error("Sign in first"); return; }
    setUploading(true);
    const tId = toast.loading("Uploading…");
    try {
      const ext = (f.name.split(".").pop() || (video ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${me}/talk-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("post-media").upload(path, f, { contentType: f.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("post-media").createSignedUrl(path, STORED_URL_TTL);
      if (sErr || !signed?.signedUrl) throw sErr || new Error("Could not sign URL");
      setMedia((prev) => [...prev, signed.signedUrl]);
      toast.success("Uploaded", { id: tId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed", { id: tId });
    } finally {
      setUploading(false);
    }
  };

  const post = async (text: string, parentId: string | null) => {
    if (!me) { toast.error("Sign in to post"); return; }
    const clean = text.trim();
    if (!clean && (parentId || media.length === 0)) return;
    const { error } = await supabase.from("organization_comments").insert({
      org_id: orgId,
      user_id: me,
      body: clean,
      media_urls: parentId ? [] : media,
      parent_id: parentId,
    } as never);
    if (error) { toast.error(error.message); return; }
    if (parentId) { setReplyText(""); setReplyTo(null); } else { setBody(""); setMedia([]); }
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const prev = rows;
    setRows((cur) => cur.filter((c) => c.id !== id && c.parent_id !== id));
    const { error } = await supabase.from("organization_comments").delete().eq("id", id);
    if (error) { toast.error(error.message); setRows(prev); }
  };

  const toggleMute = async (row: Row) => {
    const next = !row.is_muted;
    setRows((cur) => cur.map((c) => (c.id === row.id ? { ...c, is_muted: next } : c)));
    const { error } = await supabase.from("organization_comments").update({ is_muted: next } as never).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      setRows((cur) => cur.map((c) => (c.id === row.id ? { ...c, is_muted: !next } : c)));
      return;
    }
    toast.success(next ? "Hidden from members" : "Visible again");
  };

  const toggleLike = async (row: Row) => {
    if (!me) { toast.error("Sign in to like"); return; }
    const next = !row.liked;
    setRows((cur) => cur.map((c) => (c.id === row.id ? { ...c, liked: next, likes: c.likes + (next ? 1 : -1) } : c)));
    const res = next
      ? await supabase.from("organization_comment_likes").insert({ comment_id: row.id, user_id: me })
      : await supabase.from("organization_comment_likes").delete().eq("comment_id", row.id).eq("user_id", me);
    if (res.error) {
      setRows((cur) => cur.map((c) => (c.id === row.id ? { ...c, liked: !next, likes: c.likes + (next ? -1 : 1) } : c)));
    }
  };

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const top = rows.filter((r) => !r.parent_id);
  const repliesFor = (id: string) => rows.filter((r) => r.parent_id === id).slice().reverse();

  return (
    <div className="space-y-5">
      {me ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <MentionField
            multiline
            value={body}
            onChange={setBody}
            rows={3}
            placeholder={placeholder}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-[#d4580a] focus:outline-none"
          />
          {media.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {media.map((u, i) => (
                <div key={u} className="relative overflow-hidden rounded-lg border border-border bg-muted">
                  {isVideoUrl(u)
                    ? <SmartVideo src={u} className="h-24 w-full object-cover" />
                    : <Img src={u} alt="" className="h-24 w-full object-cover" />}
                  <button
                    type="button"
                    onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                for (const f of files) await upload(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              Photo or video
            </button>
            <button
              onClick={() => void post(body, null)}
              disabled={uploading || (!body.trim() && media.length === 0)}
              className="ml-auto rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Sign in to join the conversation.
        </div>
      )}

      {top.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">Nothing here yet. Start the conversation.</div>
      ) : (
        <div className="space-y-3">
          {top.map((c) => {
            const hidden = c.is_muted && !canManage && c.user_id !== me;
            if (hidden) return null;
            const name = c.author?.display_name || c.author?.username || "Someone";
            const replies = repliesFor(c.id);
            return (
              <article key={c.id} className={`rounded-2xl border border-border bg-card p-3 ${c.is_muted ? "opacity-60" : ""}`}>
                <header className="flex items-center gap-3">
                  <Link to="/u/$username" params={{ username: c.author?.username || c.user_id }} className="shrink-0">
                    <Avatar className="h-9 w-9">
                      {c.author?.avatar_url && <SmartAvatarImage src={c.author.avatar_url} />}
                      <AvatarFallback className="bg-muted text-xs">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to="/u/$username" params={{ username: c.author?.username || c.user_id }} className="block truncate text-sm font-semibold text-foreground hover:text-[#d4580a]">
                      {name}
                    </Link>
                    <div className="text-[11px] text-muted-foreground">
                      {timeAgo(c.created_at)}{c.is_muted ? " · hidden" : ""}
                    </div>
                  </div>
                  <FollowButton userId={c.user_id} currentUserId={me} compact />
                  {canManage && (
                    <button
                      onClick={() => void toggleMute(c)}
                      title={c.is_muted ? "Unhide" : "Hide from members"}
                      className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      {c.is_muted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  )}
                  {c.user_id !== me && <ReportButton contentType="org_post" contentId={c.id} />}
                  {(canManage || c.user_id === me) && (
                    <button onClick={() => void remove(c.id)} title="Delete" className="rounded-full p-1.5 text-muted-foreground hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </header>

                {c.body && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground"><MentionText text={c.body} /></p>}
                {c.media_urls.length > 0 && (
                  <div className={`mt-2 grid gap-2 ${c.media_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {c.media_urls.map((u) => (
                      isVideoUrl(u)
                        ? <SmartVideo key={u} src={u} controls playsInline className="max-h-[60vh] w-full rounded-xl bg-white" />
                        : <Img key={u} src={u} alt="" loading="lazy" className="max-h-[60vh] w-full rounded-xl object-cover" />
                    ))}
                  </div>
                )}

                <footer className="mt-3 flex items-center gap-5 text-sm text-muted-foreground">
                  <button onClick={() => void toggleLike(c)} className={`flex items-center gap-1.5 transition ${c.liked ? "text-[#d4580a]" : "hover:text-foreground"}`}>
                    <Heart className={`h-4 w-4 ${c.liked ? "fill-current" : ""}`} /> {c.likes}
                  </button>
                  <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="flex items-center gap-1.5 transition hover:text-foreground">
                    <MessageCircle className="h-4 w-4" /> {replies.length}
                  </button>
                  <button onClick={() => setShareUrl(pageUrl)} className="flex items-center gap-1.5 transition hover:text-foreground" title="Share in app">
                    <Send className="h-4 w-4 -rotate-45" />
                  </button>
                  <button
                    onClick={() => void externalShare(pageUrl, name, c.body?.slice(0, 120) || undefined)}
                    className="ml-auto text-xs font-semibold transition hover:text-foreground"
                  >
                    Share outside
                  </button>
                </footer>

                {replies.length > 0 && (
                  <div className="mt-3 space-y-2 border-l-2 border-border pl-3">
                    {replies.map((r) => {
                      const rn = r.author?.display_name || r.author?.username || "Someone";
                      return (
                        <div key={r.id} className="flex items-start gap-2">
                          <Avatar className="h-7 w-7 shrink-0">
                            {r.author?.avatar_url && <SmartAvatarImage src={r.author.avatar_url} />}
                            <AvatarFallback className="bg-muted text-[10px]">{rn.slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 rounded-xl bg-muted/50 px-3 py-2">
                            <div className="text-xs font-semibold text-foreground">{rn}</div>
                            <div className="whitespace-pre-wrap break-words text-sm text-foreground"><MentionText text={r.body} /></div>
                          </div>
                          {(canManage || r.user_id === me) && (
                            <button onClick={() => void remove(r.id)} className="rounded-full p-1 text-muted-foreground hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {replyTo === c.id && me && (
                  <div className="mt-3 flex gap-2">
                    <MentionField
                      value={replyText}
                      onChange={setReplyText}
                      onKeyDown={(e) => { if (e.key === "Enter") void post(replyText, c.id); }}
                      placeholder="Write a reply…"
                      className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm focus:border-[#d4580a] focus:outline-none"
                    />
                    <button onClick={() => void post(replyText, c.id)} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">
                      Reply
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ShareToUsersDialog
        open={!!shareUrl}
        onClose={() => setShareUrl(null)}
        url={shareUrl ?? ""}
        title="Shared from Planet Baltimore"
      />
    </div>
  );
}
