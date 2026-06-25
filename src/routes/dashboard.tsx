import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, Send, Palette, Ticket, MapPin, Users, BookOpen, Trophy, Search, X } from "lucide-react";
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
  author?: { display_name: string | null; avatar_url: string | null; username: string | null; neighborhood: string | null };
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
        await load();
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
    load();
  };

  if (!checked) return null;

  return (
    <AppLayout
      title="Home"
      subtitle="What's moving in Baltimore right now."
    >
      <div className="mx-auto max-w-2xl">
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
            You're signed in as an <strong>Attendee</strong> - you can view posts and buy event tickets.
            To post, head to your <Link to="/profile" className="text-orange font-semibold hover:underline">profile</Link> and become an Artist.
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

        <div className="mt-6 divide-y divide-border">
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
              className="group py-5"
            >
              <header className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {p.author?.avatar_url && <AvatarImage src={p.author.avatar_url} />}
                  <AvatarFallback className="bg-muted text-[11px] text-muted-foreground">
                    {(p.author?.display_name || p.author?.username || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-foreground">
                    {p.author?.display_name || p.author?.username || "Anonymous"}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {p.author?.neighborhood || "Baltimore"} · {new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </div>
              </header>
              <div className="mt-3 pl-0 sm:pl-12 text-[15px] leading-relaxed text-foreground">{p.content}</div>
              {p.image_url && (
                <div className="mt-3 overflow-hidden rounded-xl sm:pl-12">
                  <img src={p.image_url} alt="" className="w-full" loading="lazy" />
                </div>
              )}
              <footer className="mt-3 flex items-center gap-6 pl-0 sm:pl-12 text-[12.5px] text-muted-foreground">
                <button
                  onClick={async () => {
                    setPosts((cur) => cur.map((x) => x.id === p.id ? { ...x, likes_count: (x.likes_count ?? 0) + 1 } : x));
                    await supabase.from("posts").update({ likes_count: (p.likes_count ?? 0) + 1 }).eq("id", p.id);
                  }}
                  className="flex items-center gap-1.5 transition hover:text-foreground"
                >
                  <Heart className="h-4 w-4" strokeWidth={1.75} /> {p.likes_count ?? 0}
                </button>
                <button
                  onClick={() => toast.info("Comments coming soon")}
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
                  onClick={() => toast.success("Saved to bookmarks")}
                  className="ml-auto transition hover:text-foreground"
                >
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
              to="/profile"
              onMouseDown={(e) => e.preventDefault()}
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
    { to: "/artists", icon: Palette, label: "Artists", from: "#fb923c", to: "#ea580c" },
    { to: "/events", icon: Ticket, label: "Events", from: "#34d399", to: "#059669" },
    { to: "/neighborhoods", icon: MapPin, label: "Neighborhoods", from: "#818cf8", to: "#4338ca" },
    { to: "/groups", icon: Users, label: "Groups", from: "#fb7185", to: "#e11d48" },
    { to: "/stories", icon: BookOpen, label: "Stories", from: "#fbbf24", to: "#b45309" },
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
            className="group flex flex-col items-center gap-2 py-1"
          >
            <span
              className="relative inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl text-white transition-transform duration-200 group-hover:-translate-y-0.5 group-active:translate-y-0"
              style={{
                backgroundImage: `linear-gradient(160deg, ${it.from}, ${it.to})`,
                boxShadow: `0 6px 14px -4px ${it.to}80, 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,0,0,0.18)`,
              }}
            >
              <it.icon className="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" strokeWidth={2} />
            </span>
            <span className="text-[11px] font-medium text-foreground text-center leading-tight">{it.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
