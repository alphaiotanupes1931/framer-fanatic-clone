import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import {
  MapPin, MessageCircle, UserPlus, UserCheck, Globe, ArrowLeft,
  Share2, Star, Trash2, Volume2, VolumeX, Grid3x3, Layers,
  Image as ImageIcon, Calendar, FileText, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatCategory } from "@/lib/format-category";
import { PostCard } from "@/components/shared/post-card";
import { EventCard } from "@/components/shared/event-card";
import { MessageAllButton } from "@/components/message-all-button";
import { FollowListDialog } from "@/components/follow-list-dialog";
import { tabsForArtist, tabsForProfile, isArtistProfile, bannerLabelForArtist, type ArtistTabKey } from "@/lib/artist-tabs";
import { PodcastEpisodesTab } from "@/components/artist/podcast-episodes-tab";
import {
  ArtistPostsGrid,
  ArtistGalleryTab,
  ArtistSeriesTab,
  ArtistBookCollaborateTab,
  ArtistCVTab,
  ArtistInviteTab,
  ArtistEventsGrouped,
  ArtistStudioTab,
  ArtistTalkTab,
} from "@/components/artist/artist-tab-sections";

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
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ followers: 0, following: 0, posts: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [working, setWorking] = useState(false);
  const [tab, setTab] = useState<ArtistTabKey>("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [followList, setFollowList] = useState<"followers" | "following" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [muted, setMuted] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Array<{ id: string; name: string }>>([]);
  const [showHoodPicker, setShowHoodPicker] = useState(false);

  const isOwner = !!me && !!profile && me.id === profile.id;

  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      const { data } = await supabase.from("neighborhoods").select("id, name").order("name").limit(200);
      if (data) setNeighborhoods(data as Array<{ id: string; name: string }>);
    })();
  }, [isOwner]);

  const updateNeighborhood = async (name: string) => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ neighborhood: name }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    setProfile({ ...profile, neighborhood: name });
    setShowHoodPicker(false);
    toast.success("Neighborhood updated");
  };

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
        setMuted(window.localStorage.getItem(`pb_mute_user_${publicProfile.id}`) === "1");
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
          const { data: adminCheck } = await supabase.rpc("has_role", { _user_id: me.id, _role: "admin" });
          setIsAdmin(!!adminCheck);
        }
        // Load their content
        setContentLoading(true);
        const [postsRes, storiesRes, eventsRes] = await Promise.all([
          supabase.from("posts").select("*").eq("user_id", publicProfile.id).order("created_at", { ascending: false }).limit(30),
          supabase.from("stories").select("*").eq("user_id", publicProfile.id).eq("status", "published").order("created_at", { ascending: false }).limit(30),
          supabase.from("events").select("*").eq("user_id", publicProfile.id).is("organization_id", null).order("starts_at", { ascending: false }).limit(30),
        ]);
        if (cancelled) return;
        const authorMeta = {
          author_name: publicProfile.display_name || publicProfile.username || "",
          author_avatar: publicProfile.avatar_url,
          author_username: publicProfile.username,
        };
        void storiesRes;
        setPosts((postsRes.data || []).map((p) => ({ ...p, ...authorMeta })));
        setEvents(eventsRes.data || []);
        setContentLoading(false);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [username, me]);

  const isSelf = useMemo(() => me && profile && me.id === profile.id, [me, profile]);
  const canManage = !!isSelf || isAdmin;
  const hashtags = useMemo(() => {
    if (!profile) return [] as string[];
    const fromBio = Array.from(new Set((profile.bio || "").match(/#[A-Za-z0-9_]+/g) || []));
    if (fromBio.length) return fromBio;
    const cat = formatCategory(profile.category, profile.role);
    const parts: string[] = [];
    if (cat) parts.push(`#${cat.toLowerCase().replace(/\s+/g, "")}`);
    if (profile.neighborhood) parts.push(`#${profile.neighborhood.toLowerCase().replace(/\s+/g, "")}`);
    if (profile.role) parts.push(`#${profile.role.toLowerCase()}`);
    return Array.from(new Set(parts));
  }, [profile]);

  const share = async () => {
    if (!profile) return;
    const url = `${window.location.origin}/u/${profile.username}`;
    try {
      if (navigator.share) await navigator.share({ title: profile.display_name || profile.username || "", url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* cancelled */ }
  };

  const toggleMute = () => {
    if (!profile) return;
    const next = !muted;
    setMuted(next);
    if (next) window.localStorage.setItem(`pb_mute_user_${profile.id}`, "1");
    else window.localStorage.removeItem(`pb_mute_user_${profile.id}`);
    toast.success(next ? "Page muted" : "Page unmuted");
  };

  const deletePage = async () => {
    if (!profile) return;
    if (!confirm("Delete this artist page? This removes their profile.")) return;
    const { error } = await supabase.rpc("admin_delete_profile", { _id: profile.id });
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/artists" });
  };

  const toggleFollow = async () => {
    if (!me || !profile) { navigate({ to: "/auth" }); return; }
    setWorking(true);
    try {
      if (isFollowing) {
        const { error } = await supabase.from("follows").delete().eq("follower_id", me.id).eq("following_id", profile.id);
        if (error) throw error;
        setIsFollowing(false);
        setStats((s) => ({ ...s, followers: Math.max(0, s.followers - 1) }));
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: me.id, following_id: profile.id });
        if (error) throw error;
        setIsFollowing(true);
        setStats((s) => ({ ...s, followers: s.followers + 1 }));
      }
      await queryClient.invalidateQueries({ queryKey: ["follows", me.id] });
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

  const categoryLabel = bannerLabelForArtist(profile.category, profile.role) || formatCategory(profile.category, profile.role);
  const isArtistView = isArtistProfile(profile.category, profile.role);
  const tabs = isArtistView ? tabsForArtist(profile.category, profile.role) : tabsForProfile(profile.category, profile.role);
  const canEdit = !!isSelf;

  return (
    <AppLayout title="" hero={false}>
      <button
        onClick={() => (window.history.length > 1 ? window.history.back() : navigate({ to: "/artists" }))}
        aria-label="Back"
        className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Banner with floating actions + category chip */}
      <div
        className="relative h-44 overflow-hidden rounded-2xl sm:h-60"
        style={
          profile.banner_url
            ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: "#e7e5e0" }
        }
      >
        {categoryLabel && (
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur ${
                isArtistView ? "bg-[#d4580a]" : "bg-emerald-600"
              }`}
            >
              {isArtistView ? "Artist Page" : (profile.category?.toLowerCase() === "visitor" ? "Visitor Page" : "Resident Page")}
            </span>
            <span className="inline-flex items-center rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {categoryLabel}
            </span>
          </div>
        )}
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button
            onClick={share}
            aria-label="Share"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-neutral-700 shadow-sm backdrop-blur hover:text-[#d4580a]"
          >
            <Share2 className="h-4 w-4" />
          </button>
          {!isSelf && (
            <button
              onClick={toggleFollow}
              disabled={working}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60 ${
                isFollowing ? "bg-white/95 text-neutral-700" : "bg-white/95 text-neutral-800 hover:text-[#d4580a]"
              }`}
            >
              {isFollowing ? <><UserCheck className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
            </button>
          )}
        </div>
      </div>

      {/* Avatar overlapping banner */}
      <div className="relative px-1 sm:px-2">
        <div className="relative -mt-8 inline-block">
          <div className="h-20 w-20 overflow-hidden rounded-xl border-4 border-white bg-neutral-200 shadow-sm">
            {profile.avatar_url && (
              <img src={profile.avatar_url} alt={profile.display_name || ""} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            )}
          </div>
        </div>
      </div>

      {/* Name + meta */}
      <div className="mt-3 px-1 sm:px-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold leading-tight text-neutral-900 sm:text-[26px]">
            {profile.display_name || profile.username}
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
            <Star className="h-3 w-3" /> Grant Founding
          </span>
        </div>
        {profile.bio && (
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-neutral-700">{profile.bio}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500">
          <button type="button" onClick={() => setFollowList("followers")} className="inline-flex items-center gap-1.5 hover:text-[#d4580a]">
            <UserPlus className="h-4 w-4" /> {stats.followers} followers
          </button>
          {(profile.neighborhood || isOwner) && (
            <>
              <span className="text-neutral-300">·</span>
              {isOwner ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowHoodPicker((v) => !v)}
                    className="inline-flex items-center gap-1.5 hover:text-[#d4580a]"
                  >
                    <MapPin className="h-4 w-4" />
                    {profile.neighborhood || "Add neighborhood"}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showHoodPicker && (
                    <div className="absolute top-7 left-0 z-30 max-h-64 w-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl">
                      {neighborhoods.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => updateNeighborhood(n.name)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 ${profile.neighborhood === n.name ? "font-semibold text-[#d4580a]" : "text-neutral-700"}`}
                        >
                          {n.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {profile.neighborhood}</span>
              )}
            </>
          )}
          {profile.website && (
            <>
              <span className="text-neutral-300">·</span>
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#d4580a]"
              >
                <Globe className="h-4 w-4" /> Website
              </a>
            </>
          )}
        </div>

        {hashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {hashtags.map((h) => (
              <span key={h} className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">{h}</span>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isSelf && (
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"
            >
              Edit Profile
            </Link>
          )}
          {!isSelf && (
            <button
              onClick={startMessage}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"
            >
              <MessageCircle className="h-4 w-4" /> Message
            </button>
          )}
          {!isSelf && (
            <MessageAllButton
              label="Message All"
              audienceLabel={`${profile.display_name || profile.username || "artist"}'s followers`}
              defaultGroupName={`${profile.display_name || profile.username || "Artist"} group chat`}
              loadCandidates={async () => {
                const { data: fol } = await supabase
                  .from("follows")
                  .select("follower_id")
                  .eq("following_id", profile.id);
                const ids = Array.from(new Set(((fol ?? []) as { follower_id: string }[]).map((r) => r.follower_id)));
                ids.push(profile.id);
                const unique = Array.from(new Set(ids));
                if (unique.length === 0) return [];
                const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: unique });
                const rows = (profs ?? []) as { id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood: string | null }[];
                return rows.map((p) => ({
                  id: p.id,
                  display_name: p.display_name,
                  username: p.username,
                  avatar_url: p.avatar_url,
                  subtitle: p.neighborhood || "Follower",
                }));
              }}
            />
          )}
          {canManage && (
            <button
              onClick={deletePage}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d4580a]/40 bg-white px-4 py-1.5 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"
            >
              <Trash2 className="h-4 w-4" /> Delete Page {isAdmin && !isSelf && <span className="text-[10px] opacity-60">(Admin)</span>}
            </button>
          )}
          {me && !isSelf && (
            <button
              onClick={toggleMute}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d4580a]/40 bg-white px-4 py-1.5 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"
            >
              {muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {muted ? "Unmute Page" : "Mute Page"}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-6 -mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200 pb-1">
          {tabs.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  active ? "bg-[#d4580a] text-white shadow-sm" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            );
          })}
        </div>

        <div className="py-6">
          {contentLoading && tab === "posts" ? (
            <div className="py-10 text-center text-sm text-neutral-500">Loading…</div>
          ) : tab === "posts" ? (
            isArtistView ? (
              posts.length === 0 ? (
                <EmptyTab icon={Grid3x3} label={`${profile.display_name || profile.username} hasn't posted yet.`} />
              ) : (
                <ArtistPostsGrid posts={posts} />
              )
            ) : (
              posts.length === 0 ? (
                <EmptyTab icon={Grid3x3} label={`${profile.display_name || profile.username} hasn't posted yet.`} />
              ) : (
                <div className="space-y-4">{posts.map((p) => <PostCard key={p.id} post={p} currentUserId={me?.id} />)}</div>
              )
            )
          ) : tab === "studio" ? (
            <ArtistStudioTab posts={posts} />
          ) : tab === "series" ? (
            <ArtistSeriesTab userId={profile.id} canEdit={canEdit} />
          ) : tab === "talk" ? (
            <ArtistTalkTab profile={profile} />
          ) : tab === "contact" ? (
            <ArtistBookCollaborateTab profile={profile} />
          ) : tab === "cv" ? (
            <ArtistCVTab userId={profile.id} profile={profile} canEdit={canEdit} />
          ) : tab === "invite" ? (
            <ArtistInviteTab profile={profile} />
          ) : tab === "events" ? (
            isArtistView ? (
              <ArtistEventsGrouped events={events as never} />
            ) : (
              events.length === 0 ? (
                <EmptyTab icon={Calendar} label="No events yet." />
              ) : (
                <div className="space-y-4">{events.map((e) => <EventCard key={e.id} event={e} />)}</div>
              )
            )
          ) : tab === "episodes" ? (
            <PodcastEpisodesTab userId={profile.id} isOwner={!!isSelf} />
          ) : tab === "gallery" ? (
            <ArtistGalleryTab userId={profile.id} canEdit={canEdit} />
          ) : (
            <EmptyTab icon={Layers} label="Nothing here yet." />
          )}
        </div>
      </div>

      {followList && (
        <FollowListDialog
          open
          onOpenChange={(open) => { if (!open) setFollowList(null); }}
          profileId={profile.id}
          mode={followList}
        />
      )}
    </AppLayout>
  );
}

function EmptyTab({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-sm text-neutral-500">
      <Icon className="h-6 w-6 text-neutral-400" />
      <div>{label}</div>
    </div>
  );
}