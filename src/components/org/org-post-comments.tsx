import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SmartAvatarImage } from "@/components/shared/smart-img";
import { MentionField } from "@/components/shared/mention-input";
import { MentionText } from "@/components/shared/mention-text";
import { Trash2, Send } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type Author = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

/**
 * Comments under a single post on a page (group, artist, business, arts org).
 * Anyone who can see the page can comment; authors and page owners can delete.
 */
export function OrgPostComments({ orgId, postId }: { orgId: string; postId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [me, setMe] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      if (!cancelled) setMe(sess.user?.id ?? null);
      const { data } = await supabase
        .from("organization_comments")
        .select("id, user_id, body, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      const list = (data ?? []) as Row[];
      setRows(list);
      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      if (ids.length) {
        const { data: people } = await supabase.rpc("get_actors_minimal", { _ids: ids });
        if (!cancelled && people) {
          const map: Record<string, Author> = {};
          for (const p of people as Author[]) map[p.id] = p;
          setAuthors(map);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [postId]);

  const send = async () => {
    const text = body.trim();
    if (!text || !me) { if (!me) toast.error("Sign in to comment"); return; }
    setSending(true);
    const { data, error } = await supabase
      .from("organization_comments")
      .insert({ org_id: orgId, post_id: postId, user_id: me, body: text })
      .select("id, user_id, body, created_at")
      .single();
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setRows((r) => [...r, data as Row]);
    setBody("");
  };

  const remove = async (id: string) => {
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const { error } = await supabase.from("organization_comments").delete().eq("id", id);
    if (error) { setRows(prev); toast.error(error.message); }
  };

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Comments{rows.length ? ` (${rows.length})` : ""}
      </div>
      <div className="max-h-60 space-y-3 overflow-y-auto pr-1">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No comments yet. Be the first.</p>}
        {rows.map((c) => {
          const a = authors[c.user_id];
          return (
            <div key={c.id} className="flex gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                {a?.avatar_url && <SmartAvatarImage src={a.avatar_url} alt="" />}
                <AvatarFallback className="text-[10px]">{(a?.display_name || a?.username || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {a?.username
                    ? <Link to="/u/$username" params={{ username: a.username }} className="text-sm font-semibold text-foreground hover:underline">{a.display_name || a.username}</Link>
                    : <span className="text-sm font-semibold text-foreground">Member</span>}
                  <span className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                  {me === c.user_id && (
                    <button type="button" onClick={() => void remove(c.id)} aria-label="Delete comment" className="ml-auto text-muted-foreground hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <MentionText text={c.body} className="block whitespace-pre-wrap break-words text-sm text-foreground" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-end gap-2">
        <MentionField
          multiline
          rows={2}
          value={body}
          onChange={setBody}
          maxLength={1000}
          placeholder="Write a comment... use @ to mention"
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[#d4580a]"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !body.trim()}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#d4580a" }}
        >
          <Send className="h-3.5 w-3.5" /> Post
        </button>
      </div>
    </div>
  );
}
