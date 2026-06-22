import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Planet Baltimore — Your feed" }] }),
});

type Post = {
  id: string; user_id: string; content: string; image_url: string | null;
  likes_count: number; comments_count: number; neighborhood: string | null; created_at: string;
  author?: { display_name: string | null; avatar_url: string | null; username: string | null; neighborhood: string | null };
};

function Dashboard() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<"for-you" | "following" | "nearby">("for-you");
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: ps } = await supabase.from("posts")
      .select("id, user_id, content, image_url, likes_count, comments_count, neighborhood, created_at")
      .order("created_at", { ascending: false }).limit(50);
    const list = (ps || []) as Post[];
    const ids = Array.from(new Set(list.map((p) => p.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("id, display_name, avatar_url, username, neighborhood").in("id", ids);
      const byId = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((p) => { p.author = byId.get(p.user_id) as any; });
    }
    setPosts(list);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setMe(data.session?.user.id || null);
      await load();
    })();
  }, []);

  const createPost = async () => {
    if (!content.trim() || !me) return;
    const { error } = await supabase.from("posts").insert({ user_id: me, content: content.trim() });
    if (error) { toast.error(error.message); return; }
    setContent("");
    toast.success("Posted");
    load();
  };

  return (
    <AppLayout
      title="Planet Baltimore"
      subtitle="Your city. Your community. Your feed."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {([["for-you","For You"],["following","Following"],["nearby","Nearby"]] as const).map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${tab===k ? "bg-orange-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-100"}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with Baltimore..."
            className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-sm focus:border-orange-400 focus:outline-none" rows={3} />
          <div className="mt-2 flex justify-end">
            <button onClick={createPost} disabled={!content.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-orange-700">
              <Send className="h-4 w-4" /> Post
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-dashed border-orange-300 bg-orange-50/60 px-5 py-4 text-sm">
          <span className="flex items-center gap-2 text-orange-700">
            <MapPin className="h-4 w-4" /> Add your neighborhood to see local content
          </span>
          <Link to="/settings" className="font-semibold text-orange-700 hover:underline">Set up →</Link>
        </div>

        {loading && <div className="text-center text-sm text-neutral-500">Loading feed…</div>}
        {!loading && posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
            No posts yet. Be the first to share something with Baltimore.
          </div>
        )}

        {posts.map((p) => (
          <article key={p.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <header className="flex items-center gap-3 px-5 pt-5">
              <Avatar className="h-10 w-10">
                {p.author?.avatar_url && <AvatarImage src={p.author.avatar_url} />}
                <AvatarFallback className="bg-orange-100 text-orange-700">
                  {(p.author?.display_name || p.author?.username || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{p.author?.display_name || p.author?.username || "Anonymous"}</div>
                <div className="text-xs text-neutral-500">
                  {p.author?.neighborhood || "Baltimore"} · {new Date(p.created_at).toLocaleDateString()}
                </div>
              </div>
            </header>
            <div className="px-5 py-4 text-[15px] leading-relaxed text-neutral-800">{p.content}</div>
            <footer className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-neutral-500">
              <div className="flex items-center gap-5 text-sm">
                <button className="flex items-center gap-1.5 hover:text-orange-600"><Heart className="h-4 w-4" /> {p.likes_count}</button>
                <button className="flex items-center gap-1.5 hover:text-orange-600"><MessageCircle className="h-4 w-4" /> {p.comments_count}</button>
                <button className="hover:text-orange-600"><Share2 className="h-4 w-4" /></button>
              </div>
              <button className="hover:text-orange-600"><Bookmark className="h-4 w-4" /></button>
            </footer>
          </article>
        ))}
      </div>
    </AppLayout>
  );
}