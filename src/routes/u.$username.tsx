import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import {
  MapPin, MessageCircle, UserPlus, UserCheck, Globe, ArrowLeft,
  Send, Star, Trash2, Grid3x3,
  Calendar, ChevronDown, ChevronLeft, ChevronRight, X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatCategory } from "@/lib/format-category";
import { sortPosts } from "@/lib/sort-posts";
import { PROFILE_TAGS } from "@/lib/categories";
import { FollowListDialog } from "@/components/follow-list-dialog";
import { ShareButtons } from "@/components/shared/share-buttons";
import { bannerLabelForArtist } from "@/lib/artist-tabs";
import {
  PersonAboutTab,
  PersonWritingsTab,
  PersonSavedTab,
  PersonAttendingTab,
  PersonPagesTab,
  PersonMembershipsTab,
} from "@/components/profile/person-tabs";
import {
  ArtistEventsGrouped,
} from "@/components/artist/artist-tab-sections";
import { Img, SmartVideo } from "@/components/shared/smart-img";
import { PostSplitView } from "@/components/shared/post-split-view";
import { setMyProfileKind } from "@/lib/profile-kind";
import { Grid2x2, Info, BookOpen, Bookmark, CalendarCheck, LayoutGrid, Users2 } from "lucide-react";

// A person has one canonical public profile with the same tabs everywhere.
type PersonTabKey = "posts" | "about" | "writings" | "saved" | "attending" | "organized" | "pages" | "memberships";
const PERSON_TABS: Array<{ key: PersonTabKey; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { key: "posts", label: "Posts", Icon: Grid2x2 },
  { key: "about", label: "About", Icon: Info },
  { key: "writings", label: "Stories", Icon: BookOpen },
  { key: "saved", label: "Saved", Icon: Bookmark },
  { key: "attending", label: "Attending", Icon: CalendarCheck },
  { key: "organized", label: "Organized", Icon: Calendar },
  { key: "pages", label: "Pages", Icon: LayoutGrid },
  { key: "memberships", label: "Memberships", Icon: Users2 },
];

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
  head: () => ({
    meta: [
      { title: "Community Profile | Planet Baltimore" },
      { name: "description", content: "View this community member's public profile, posts, events, and activity on Planet Baltimore." },
      { property: "og:title", content: "Community Profile | Planet Baltimore" },
      { property: "og:description", content: "View this community member's public profile and activity on Planet Baltimore." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
  const [tab, setTab] = useState<PersonTabKey>("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [postViewerIdx, setPostViewerIdx] = useState<number | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [followList, setFollowList] = useState<"followers" | "following" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [founderSaving, setFounderSaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Array<{ id: string; name: string }>>([]);
  const [showHoodPicker, setShowHoodPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

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

  const updatePageType = async (tag: string) => {
    if (!profile) return;
    const nextRole = tag === "Resident" ? "resident" : tag === "Visitor" ? "visitor" : "artist";
    const { error } = await supabase
      .from("profiles")
      .update({ category: tag, role: nextRole })
      .eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    if (nextRole === "artist") {
      await supabase.from("user_roles").upsert(
        { user_id: profile.id, role: "artist" },
        { onConflict: "user_id,role" },
      );
    } else {
      await supabase.from("user_roles").delete().eq("user_id", profile.id).eq("role", "artist");
    }
    setShowTypePicker(false);
    toast.success("Page type updated");
    location.reload();
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
          supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", publicProfile.id).eq("is_deleted", false),
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
          supabase.from("posts").select("*").eq("user_id", publicProfile.id).eq("is_deleted", false).order("created_at", { ascending: false }).limit(50),
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
        const orderedPosts = sortPosts((postsRes.data || []) as any[]);
        setPosts(orderedPosts.map((p: any) => ({ ...p, ...authorMeta })));
        setEvents(eventsRes.data || []);
        setContentLoading(false);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [username, me]);

  const isSelf = useMemo(() => me && profile && me.id === profile.id, [me, profile]);

  // Founding Member flag is admin-only: the RPC returns false for everyone else.
  useEffect(() => {
    if (!profile || !isAdmin) { setIsFounder(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("is_founder_visible", { _user_id: profile.id });
      if (!cancelled) setIsFounder(!!data);
    })();
    return () => { cancelled = true; };
  }, [profile, isAdmin]);

  const toggleFounder = async () => {
    if (!profile) return;
    setFounderSaving(true);
    const next = !isFounder;
    const { error } = await supabase.rpc("admin_set_founder", { _user_id: profile.id, _is_founder: next });
    setFounderSaving(false);
    if (error) { toast.error(error.message); return; }
    setIsFounder(next);
    toast.success(next ? "Founding Member badge granted" : "Founding Member badge removed");
  };
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

  const deletePage = async () => {
    if (!profile) return;
    // Owners never delete their account here. Removing your own artist page just
    // switches your profile type back to Resident, keeping posts, followers and login.
    if (isSelf && !isAdmin) {
      if (!confirm("Remove your artist page? Your account, posts and followers stay. Your profile switches back to a Resident profile.")) return;
      try {
        await setMyProfileKind("resident");
      } catch (e) {
        return toast.error((e as Error).message || "Could not remove artist page");
      }
      toast.success("Artist page removed. Your profile is now a Resident profile.");
      navigate({ to: "/profile" });
      return;
    }
    if (!confirm("Permanently delete this entire profile and all of its content? This cannot be undone.")) return;
    const { error } = await supabase.rpc("admin_delete_profile", { _id: profile.id });
    if (error) return toast.error(error.message);
    toast.success("Profile deleted");
    navigate({ to: "/artists" });
  };

  const toggleFollow = async () => {
    if (!me || !profile) { navigate({ to: "/auth" }); return; }
    // Optimistic: the button flips instantly and the request runs behind it.
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setStats((s) => ({ ...s, followers: Math.max(0, s.followers + (wasFollowing ? -1 : 1)) }));
    const { error } = wasFollowing
      ? await supabase.from("follows").delete().eq("follower_id", me.id).eq("following_id", profile.id)
      : await supabase.from("follows").insert({ follower_id: me.id, following_id: profile.id });
    if (error) {
      setIsFollowing(wasFollowing);
      setStats((s) => ({ ...s, followers: Math.max(0, s.followers + (wasFollowing ? 1 : -1)) }));
      toast.error(error.message || "Could not update follow");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["follows", me.id] });
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
  // A person has one canonical public profile. Standalone artist and
  // organization pages live at /o/$slug and are never selected by URL search.
  const isArtistView = false;
  const tabs = PERSON_TABS;
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

      {/* Canonical person profile, matching the signed-in profile layout. */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card sm:rounded-3xl">
      <div
        className="relative h-36 overflow-hidden bg-neutral-200 sm:h-56"
        style={
          profile.banner_url
            ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: "#e7e5e0" }
        }
      >
        {categoryLabel && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-black/70 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur sm:text-xs">
            {categoryLabel}
          </span>
        )}
      </div>

      <div className="px-4 pb-6 sm:px-6">
      {/* Avatar uses the same placement as the account owner's profile. */}
      <div className="relative mt-4">
        <div className="relative inline-block">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-neutral-200 ring-4 ring-background sm:h-24 sm:w-24">
            {profile.avatar_url && (
              <Img src={profile.avatar_url} alt={profile.display_name || ""} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            )}
          </div>
        </div>
      </div>

      {/* Name + meta */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold leading-tight text-neutral-900 sm:text-[26px]">
            {profile.display_name || profile.username}
          </h1>
          {isAdmin && isFounder && (
            <span title="Visible to admins only" className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              <Star className="h-3 w-3" /> Founding Member
            </span>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={toggleFounder}
              disabled={founderSaving}
              className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-60"
            >
              <Star className="h-3 w-3" /> {isFounder ? "Remove Founding" : "Grant Founding"}
            </button>
          )}
        </div>
        {/* Category + actions moved below the name */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ShareButtons
            path={`/u/${profile.username}`}
            title={profile.display_name || profile.username || ""}
            size="sm"
            buttonClassName="grid h-9 w-9 place-items-center rounded-full border border-neutral-200 bg-white text-neutral-700 hover:text-[#d4580a]"
            preview={{
              type: "profile",
              id: profile.username || "",
              url: `/u/${profile.username}`,
              title: profile.display_name || profile.username || "",
              excerpt: profile.bio || null,
              image: profile.avatar_url || null,
            }}
          />
          {!isSelf && (
            <button
              onClick={toggleFollow}
              className={`inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                isFollowing ? "bg-white text-neutral-700" : "bg-white text-neutral-800 hover:text-[#d4580a]"
              }`}
            >
              {isFollowing ? <><UserCheck className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
            </button>
          )}
        </div>
        {profile.bio && (
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-neutral-700">{profile.bio}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500">
          {(profile.neighborhood || isOwner) && (
            <>
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

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs sm:flex sm:gap-10 sm:text-left sm:text-sm">
          <div>
            <div className="text-base font-bold text-neutral-900 sm:text-lg">{stats.posts}</div>
            <div className="text-neutral-500">Posts</div>
          </div>
          <button type="button" onClick={() => setFollowList("followers")} className="hover:text-[#d4580a]">
            <div className="text-base font-bold text-neutral-900 sm:text-lg">{stats.followers}</div>
            <div className="text-neutral-500">Followers</div>
          </button>
          <button type="button" onClick={() => setFollowList("following")} className="hover:text-[#d4580a]">
            <div className="text-base font-bold text-neutral-900 sm:text-lg">{stats.following}</div>
            <div className="text-neutral-500">Following</div>
          </button>
        </div>

        {hashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {hashtags.map((h) => (
              <span key={h} className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">{h}</span>
            ))}
          </div>
        )}

        {isOwner && isArtistView && (
          <div className="mt-4 relative inline-block">
            <button
              type="button"
              onClick={() => setShowTypePicker((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
              style={{ backgroundColor: "rgba(212,88,10,0.1)", color: "#d4580a", borderColor: "rgba(212,88,10,0.2)" }}
            >
              {profile.category || "Artist"} <ChevronDown className="h-3 w-3" />
            </button>
            {showTypePicker && (
              <div className="absolute left-0 top-9 z-30 max-h-72 w-48 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl">
                {PROFILE_TAGS.map((t) => (
                  <button
                    key={t}
                    onClick={() => updatePageType(t)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 ${profile.category === t ? "font-semibold text-[#d4580a]" : "text-neutral-700"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
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
          {/* Message All / Delete Page / Mute Page belong to org + artist pages,
              not to an individual person's profile, so they are not rendered here. */}
          {isSelf && (
            <button
              onClick={deletePage}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d4580a]/40 bg-white px-4 py-1.5 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"
            >
              <Trash2 className="h-4 w-4" />
              Remove Artist Page
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-6 -mx-1 flex gap-1 overflow-x-auto border-b border-neutral-200">
          {tabs.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "border-[#d4580a] text-[#d4580a]" : "border-transparent text-neutral-500 hover:text-neutral-800"
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
            posts.length === 0 ? (
              <EmptyTab icon={Grid3x3} label={`${profile.display_name || profile.username} hasn't posted yet.`} />
            ) : (
              <CanonicalPostsGrid posts={posts} onOpen={(i) => setPostViewerIdx(i)} />
            )
          ) : tab === "about" ? (
            <PersonAboutTab profile={profile} />
          ) : tab === "writings" ? (
            <PersonWritingsTab userId={profile.id} isSelf={!!isSelf} />
          ) : tab === "saved" ? (
            <PersonSavedTab userId={profile.id} isSelf={!!isSelf} />
          ) : tab === "attending" ? (
            <PersonAttendingTab userId={profile.id} isSelf={!!isSelf} />
          ) : tab === "organized" ? (
            events.length === 0 ? (
              <EmptyTab icon={Calendar} label="No events yet." />
            ) : (
              <ArtistEventsGrouped events={events as never} />
            )
          ) : tab === "memberships" ? (
            <PersonMembershipsTab userId={profile.id} isSelf={!!isSelf} />
          ) : (
            <PersonPagesTab userId={profile.id} isSelf={!!isSelf} />
          )}
        </div>
      </div>
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

      {postViewerIdx !== null && posts[postViewerIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPostViewerIdx(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-6"
          style={{ overscrollBehavior: "contain" }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPostViewerIdx(null); }}
            aria-label="Close"
            className="absolute right-3 top-3 z-20 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
          >
            <XIcon className="h-5 w-5" />
          </button>
          {posts.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPostViewerIdx((i) => (i === null ? null : (i - 1 + posts.length) % posts.length)); }}
                aria-label="Previous post"
                className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-4"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPostViewerIdx((i) => (i === null ? null : (i + 1) % posts.length)); }}
                aria-label="Next post"
                className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-4"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl overflow-hidden rounded-2xl bg-background shadow-2xl"
          >
            <div className="max-h-[92vh] overflow-y-auto">
              <PostSplitView
                key={posts[postViewerIdx].id}
                postId={posts[postViewerIdx].id}
                meId={me?.id}
                onDeleted={() => {
                  const id = posts[postViewerIdx!].id;
                  setPosts((prev) => prev.filter((p) => p.id !== id));
                  setPostViewerIdx(null);
                }}
              />
            </div>
          </div>
          {posts.length > 1 && (
            <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
              {postViewerIdx + 1} / {posts.length}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function CanonicalPostsGrid({ posts, onOpen }: { posts: any[]; onOpen: (index: number) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {posts.map((post, index) => {
        const media = Array.isArray(post.media_urls) && post.media_urls.length
          ? post.media_urls
          : [post.image_url, post.video_url].filter(Boolean);
        const thumbnail = media[0] as string | undefined;
        const isVideo = !!thumbnail && /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(thumbnail);

        return (
          <button
            key={post.id}
            type="button"
            onClick={() => onOpen(index)}
            className="group relative aspect-square overflow-hidden rounded-md bg-neutral-100 text-left"
          >
            {thumbnail ? (
              isVideo ? (
                <SmartVideo src={thumbnail} className="h-full w-full object-cover" muted playsInline preload="metadata" />
              ) : (
                <Img src={thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" loading="lazy" />
              )
            ) : (
              <div
                className="flex h-full w-full items-center justify-center p-3 text-center text-[11px] font-medium leading-tight text-foreground"
                style={post.bg_color ? { background: post.bg_color, color: post.text_color || "#fff" } : undefined}
              >
                <span className="line-clamp-6">{post.content || "Post"}</span>
              </div>
            )}
            {media.length > 1 && (
              <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                1/{media.length}
              </span>
            )}
            {isVideo && (
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white">
                  <span className="ml-0.5 text-xs">▶</span>
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
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