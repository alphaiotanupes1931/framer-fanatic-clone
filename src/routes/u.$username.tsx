import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, MessageCircle, UserPlus, UserCheck, Globe, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatCategory } from "@/lib/format-category";
import { PostCard } from "@/components/shared/post-card";
import { StoryCard } from "@/components/shared/story-card";
import { EventCard } from "@/components/shared/event-card";

type PublicProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  neighborhood: string | null;
  role: string | null;
  category: string | null;
  website: string | null;
};

export const Route = createFileRoute("/u/$username")({
  component: PublicProfilePage,
  head: () => ({ meta: [{ title: "Profile - Planet Baltimore" }] }),
});

function PublicProfilePage() {
  const { username } = Route.useParams();
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [working, setWorking] = useState(false);
  const [tab, setTab] = useState<"posts" | "stories" | "events">("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .rpc("public_profile_by_username", { _username: username });
      const publicProfile = data?.[0] as PublicProfile | undefined;
      if (cancelled) return;
      setProfile(publicProfile || null);
      if (publicProfile) {
        const [{ count: followers }, { count: following }, { count: posts }] = await Promise.all([
          supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", publicProfile.id),
          supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", publicProfile.id),
          supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", publicProfile.id),
        ]);
        setStats({ followers: followers || 0, following: following || 0, posts: posts || 0 });
        if (me && me.id !== publicProfile.id) {
          const { data: f } = await supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", me.id)
            .eq("following_id", publicProfile.id)
            .maybeSingle();
          setIsFollowing(!!f);
        }
        // Load their content
        setContentLoading(true);
        const [postsRes, storiesRes, eventsRes] = await Promise.all([
          supabase.from("posts").select("*").eq("user_id", publicProfile.id).order("created_at", { ascending: false }).limit(30),
          supabase.from("stories").select("*").eq("user_id", publicProfile.id).eq("status", "published").order("created_at", { ascending: false }).limit(30),
          supabase.from("events").select("*").eq("user_id", publicProfile.id).order("starts_at", { ascending: false }).limit(30),
        ]);
        if (cancelled) return;
        const authorMeta = {
          author_name: publicProfile.display_name || publicProfile.username || "",
          author_avatar: publicProfile.avatar_url,
          author_username: publicProfile.username,
        };
        setPosts((postsRes.data || []).map((p) => ({ ...p, ...authorMeta })));
        setStories((storiesRes.data || []).map((s) => ({ ...s, ...authorMeta })));
        setEvents(eventsRes.data || []);
        setContentLoading(false);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [username, me]);

  const isSelf = useMemo(() => me && profile && me.id === profile.id, [me, profile]);

  const toggleFollow = async () => {
    if (!me || !profile) { navigate({ to: "/auth" }); return; }
    setWorking(true);
    try {
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", me.id).eq("following_id", profile.id);
        setIsFollowing(false);
        setStats((s) => ({ ...s, followers: Math.max(0, s.followers - 1) }));
      } else {
        await supabase.from("follows").insert({ follower_id: me.id, following_id: profile.id });
        setIsFollowing(true);
        setStats((s) => ({ ...s, followers: s.followers + 1 }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update follow");
    } finally {
      setWorking(false);
    }
  };

  const startMessage = async () => {
    if (!me || !profile) { navigate({ to: "/auth" }); return; }
    const [a, b] = me.id < profile.id ? [me.id, profile.id] : [profile.id, me.id];
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", a).eq("user_b", b).maybeSingle();
    let conversationId = existing?.id;
    if (!existing) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ user_a: a, user_b: b })
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }
      conversationId = created?.id;
    }
    if (conversationId) window.localStorage.setItem("pb_open_conversation", conversationId);
    navigate({ to: "/messages" });
  };

  if (loading) {
    return <AppLayout title="" hero={false}><div className="text-muted-foreground text-sm">Loading profile…</div></AppLayout>;
  }
  if (!profile) {
    return (
      <AppLayout title="Profile not found" hero={false}>
        <Link to="/artists" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to creators
        </Link>
      </AppLayout>
    );
  }

  const initials = (profile.display_name || profile.username || "U").slice(0, 2).toUpperCase();

  return (
    <AppLayout title="" hero={false}>
      <Link to="/artists" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div
          className="relative h-44 sm:h-56 bg-gradient-to-br from-muted to-accent"
          style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        />
        <div className="px-5 md:px-8 pb-8">
          <div className="-mt-12 sm:-mt-16 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-card shadow-md">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
                <AvatarFallback className="bg-primary/10 text-primary text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="pb-2 min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                  {profile.display_name || profile.username}
                </h1>
                {profile.username && (
                  <div className="text-sm text-muted-foreground">@{profile.username}</div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {profile.neighborhood && (
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {profile.neighborhood}</span>
                  )}
                  {(() => {
                    const label = formatCategory(profile.category, profile.role);
                    return label ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5">{label}</span>
                    ) : null;
                  })()}
                  {profile.role && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 capitalize">{profile.role}</span>
                  )}
                </div>
              </div>
            </div>
            {!isSelf && (
              <div className="flex items-center gap-2 sm:pb-2">
                <button
                  onClick={toggleFollow}
                  disabled={working}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isFollowing
                      ? "border border-border bg-card text-foreground hover:bg-accent"
                      : "bg-orange text-white hover:brightness-110"
                  }`}
                >
                  {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
                </button>
                <button
                  onClick={startMessage}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  <MessageCircle className="w-4 h-4" /> Message
                </button>
              </div>
            )}
            {isSelf && (
              <Link
                to="/profile"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent sm:pb-2"
              >
                Edit your profile
              </Link>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-6 text-sm">
            <div><span className="font-semibold text-foreground">{stats.posts}</span> <span className="text-muted-foreground">posts</span></div>
            <div><span className="font-semibold text-foreground">{stats.followers}</span> <span className="text-muted-foreground">followers</span></div>
            <div><span className="font-semibold text-foreground">{stats.following}</span> <span className="text-muted-foreground">following</span></div>
          </div>

          {profile.bio && (
            <p className="mt-6 max-w-2xl whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
              {profile.bio}
            </p>
          )}

          {profile.website && (
            <a
              href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-orange hover:underline"
            >
              <Globe className="w-4 h-4" /> {profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>

      {/* Content tabs */}
      <div className="mt-6">
        <div className="mb-4 flex gap-6 border-b border-border">
          {(["posts", "stories", "events"] as const).map((t) => {
            const count = t === "posts" ? posts.length : t === "stories" ? stories.length : events.length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold capitalize transition ${
                  tab === t ? "border-[#d4580a] text-[#d4580a]" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t} {count > 0 && <span className="ml-1 text-xs">({count})</span>}
              </button>
            );
          })}
        </div>

        {contentLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : tab === "posts" ? (
          posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
              {profile.display_name || profile.username} hasn't posted yet.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((p) => <PostCard key={p.id} post={p} currentUserId={me?.id} />)}
            </div>
          )
        ) : tab === "stories" ? (
          stories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
              No stories yet.
            </div>
          ) : (
            <div className="space-y-4">
              {stories.map((s) => <StoryCard key={s.id} story={s} />)}
            </div>
          )
        ) : (
          events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
              No events yet.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}