import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, Send, Palette, Ticket, MapPin, Users, BookOpen, Trophy } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Planet Baltimore - Your feed" }] }),
});

type Post = {
  id: string; user_id: string; content: string; image_url: string | null;
  likes_count: number | null; comments_count: number | null; neighborhood: string | null; created_at: string;
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
  const [myProfile, setMyProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

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
      if (!data.session) {
        navigate({ to: "/auth" });
      } else {
        setMe(data.session.user.id);
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (prof) setMyProfile(prof as typeof myProfile);
        await load();
      }
      setChecked(true);
    })();
  }, [navigate]);

  const createPost = async () => {
    if (!content.trim() || !me) return;
    const { error } = await supabase.from("posts").insert({ user_id: me, content: content.trim() });
    if (error) { toast.error(error.message); return; }
    setContent("");
    toast.success("Posted");
    load();
  };

  if (!checked) return null;

  return (
    <AppLayout
      title="Home"
      subtitle="What's moving in Baltimore right now."
    >
      <div className="mx-auto max-w-2xl">
        <DiscoverStrip />

        <div className="mb-4 inline-flex items-center gap-1 rounded-full border border-neutral-100 bg-neutral-50 p-1">
          {([["for-you","For you"],["following","Following"],["nearby","Nearby"]] as const).map(([k,l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition ${
                tab===k ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-white p-4 transition focus-within:border-neutral-300">
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
                className="w-full resize-none border-0 bg-transparent p-0 text-[15px] placeholder:text-neutral-400 focus:outline-none focus:ring-0"
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

        <div className="mt-6 divide-y divide-neutral-100">
          {loading && <div className="py-10 text-center text-sm text-neutral-400">Loading…</div>}
          {!loading && posts.length === 0 && (
            <div className="py-16 text-center text-sm text-neutral-400">
              No posts yet. Be the first to share something.
            </div>
          )}

          {posts.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
              className="group py-5"
            >
              <header className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {p.author?.avatar_url && <AvatarImage src={p.author.avatar_url} />}
                  <AvatarFallback className="bg-neutral-100 text-[11px] text-neutral-700">
                    {(p.author?.display_name || p.author?.username || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-neutral-900">
                    {p.author?.display_name || p.author?.username || "Anonymous"}
                  </div>
                  <div className="text-[11.5px] text-neutral-400">
                    {p.author?.neighborhood || "Baltimore"} · {new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              </header>
              <div className="mt-3 pl-12 text-[15px] leading-relaxed text-neutral-800">{p.content}</div>
              {p.image_url && (
                <div className="mt-3 overflow-hidden rounded-xl pl-12">
                  <img src={p.image_url} alt="" className="w-full" loading="lazy" />
                </div>
              )}
              <footer className="mt-3 flex items-center gap-6 pl-12 text-[12.5px] text-neutral-400">
                <button className="flex items-center gap-1.5 transition hover:text-neutral-900">
                  <Heart className="h-4 w-4" strokeWidth={1.75} /> {p.likes_count ?? 0}
                </button>
                <button className="flex items-center gap-1.5 transition hover:text-neutral-900">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> {p.comments_count ?? 0}
                </button>
                <button className="transition hover:text-neutral-900">
                  <Share2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button className="ml-auto transition hover:text-neutral-900">
                  <Bookmark className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </footer>
            </motion.article>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}