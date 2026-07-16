import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, MapPin, Pencil, Share2, UserPlus, MessageCircle, BookOpen, CreditCard, ExternalLink, CheckCircle2, AlertCircle, ChevronDown, Link as LinkIcon, Mic2, Users, LayoutGrid, Rss, Bookmark, Calendar, CalendarCheck, Ticket, Shield, BarChart3, Mail, Palette, Layers, Image as ImageIcon, MessageSquare, FileText, Send, Pin, PinOff, ArrowUp, ArrowDown } from "lucide-react";
import { MessageFollowersModal } from "@/components/message-followers-modal";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";
import { useServerFn } from "@tanstack/react-start";
import {
  ensureConnectAccount,
  createConnectOnboardingLink,
  refreshConnectStatus,
} from "@/lib/stripe.functions";
import { tabsForCategory, PROFILE_TAGS } from "@/lib/categories";
import { ProfileSectionTab } from "@/components/profile-sections";
import { FollowListDialog } from "@/components/follow-list-dialog";
import { PostCard } from "@/components/shared/post-card";
import { tabsForArtist } from "@/lib/artist-tabs";
import { ArtistTalkTab } from "@/components/artist/artist-tab-sections";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { InviteFriendsDialog } from "@/components/invite-friends-dialog";
import { ExternalShareDialog } from "@/components/external-share-dialog";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile - Planet Baltimore" }] }),
});

const TABS_ARTIST_BASE = ["Posts","Studio","Series","Gallery","Events","Talk","Contact","CV/Bio","Invite","Saved","My Tickets","My Dashboard","Stripe"] as const;
const TABS_RESIDENT_BASE = ["Posts","Feed","My Writings","Saved","Attending","Organized","My Tickets","My Pages","My Dashboard"] as const;
const TAB_ICONS: Record<string, typeof LayoutGrid> = {
  "Posts": LayoutGrid,
  "Feed": Rss,
  "My Writings": BookOpen,
  "Saved": Bookmark,
  "Attending": Calendar,
  "Organized": CalendarCheck,
  "My Tickets": Ticket,
  "My Pages": Shield,
  "My Dashboard": BarChart3,
  "Studio": Palette,
  "Series": Layers,
  "Gallery": ImageIcon,
  "Events": Calendar,
  "Talk": MessageSquare,
  "Contact": Mail,
  "CV/Bio": FileText,
  "Invite": Send,
};
type Tab = string;

function ProfilePage() {
  const profile = useCurrentProfile();
  const { isArtist: roleIsArtist, isResident, isAdmin } = useUserRole();
  const category = (profile as { category?: string | null } | null)?.category ?? null;
  const role = (profile as { role?: string | null } | null)?.role ?? null;
  const artistTabLabels = tabsForArtist(category, role).map((t) => t.label);
  // Treat as artist if role says so OR the profile's category maps to an artist tab set
  // that differs from the generic default (Posts/Gallery/Events/CV/Bio/Invite).
  const isArtist = roleIsArtist || artistTabLabels.some((l) => ["Studio","Series","Album","Singles","EPK","Episodes","Fashion Line","Lookbook","Drops"].includes(l));
  const categoryTabs = isArtist ? [] : tabsForCategory(category);
  const baseTabs = isArtist
    ? [...TABS_RESIDENT_BASE, "Events", "Stripe"]
    : TABS_RESIDENT_BASE;
  const TABS: readonly string[] = [...baseTabs, ...categoryTabs.map((t) => t.label)];
  const [tab, setTab] = useState<Tab>("Posts");
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [msgOpen, setMsgOpen] = useState(false);
  const [shareInAppOpen, setShareInAppOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareExternalOpen, setShareExternalOpen] = useState(false);
  const [followList, setFollowList] = useState<"followers" | "following" | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Array<{ id: string; name: string }>>([]);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [followerPreview, setFollowerPreview] = useState<Array<{ id: string; display_name: string | null; username: string | null }>>([]);

  useEffect(() => {
    if (!TABS.includes(tab)) setTab(TABS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArtist]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ count: posts }, { count: followers }, { count: following }] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_deleted", false),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id),
      ]);
      setStats({ posts: posts || 0, followers: followers || 0, following: following || 0 });
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", profile.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);
      const author = {
        author_name: profile.display_name || profile.username || "You",
        author_username: profile.username,
        author_avatar: profile.avatar_url,
      };
      const rows = (data || []).map((p: any) => ({ ...p, ...author }));
      setMyPosts(sortPosts(rows));
    })();
  }, [profile]);

  const handleDeleteMyPost = (id: string) => {
    setMyPosts((prev) => prev.filter((p) => p.id !== id));
    setStats((s) => ({ ...s, posts: Math.max(0, s.posts - 1) }));
  };

  const handleTogglePin = async (id: string, next: boolean) => {
    if (next) {
      const pinnedCount = myPosts.filter((p) => p.is_pinned).length;
      if (pinnedCount >= 3) {
        toast.error("You can only pin up to 3 posts. Unpin one first.");
        return;
      }
      const nextOrder = pinnedCount;
      setMyPosts((prev) => sortPosts(prev.map((p) => (p.id === id ? { ...p, is_pinned: true, pin_order: nextOrder } : p))));
      const { error } = await supabase.from("posts").update({ is_pinned: true, pin_order: nextOrder } as any).eq("id", id);
      if (error) {
        toast.error("Could not update pin");
        setMyPosts((prev) => sortPosts(prev.map((p) => (p.id === id ? { ...p, is_pinned: false, pin_order: null } : p))));
      } else {
        toast.success("Pinned to top");
      }
    } else {
      setMyPosts((prev) => sortPosts(prev.map((p) => (p.id === id ? { ...p, is_pinned: false, pin_order: null } : p))));
      const { error } = await supabase.from("posts").update({ is_pinned: false, pin_order: null } as any).eq("id", id);
      if (error) {
        toast.error("Could not update pin");
      } else {
        toast.success("Unpinned");
      }
    }
  };

  const handleReorderPin = async (id: string, direction: -1 | 1) => {
    const pinned = myPosts.filter((p) => p.is_pinned).sort((a, b) => (a.pin_order ?? 0) - (b.pin_order ?? 0));
    const idx = pinned.findIndex((p) => p.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= pinned.length) return;
    const a = pinned[idx];
    const b = pinned[swapIdx];
    const aOrder = a.pin_order ?? idx;
    const bOrder = b.pin_order ?? swapIdx;
    setMyPosts((prev) => sortPosts(prev.map((p) => {
      if (p.id === a.id) return { ...p, pin_order: bOrder };
      if (p.id === b.id) return { ...p, pin_order: aOrder };
      return p;
    })));
    await supabase.from("posts").update({ pin_order: bOrder } as any).eq("id", a.id);
    await supabase.from("posts").update({ pin_order: aOrder } as any).eq("id", b.id);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("neighborhoods").select("id, name").order("name").limit(200);
      if (data) setNeighborhoods(data as Array<{ id: string; name: string }>);
    })();
  }, []);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: fs } = await supabase.from("follows").select("follower_id").eq("following_id", profile.id).limit(3);
      const ids = (fs || []).map((f: { follower_id: string }) => f.follower_id);
      if (!ids.length) { setFollowerPreview([]); return; }
      const { data: ps } = await (supabase as any).from("profiles_public").select("id, display_name, username").in("id", ids);
      setFollowerPreview((ps as Array<{ id: string; display_name: string | null; username: string | null }>) || []);
    })();
  }, [profile]);

  const primaryHood = useMemo(() => {
    const names = (profile as unknown as { neighborhood_names?: string[] } | null)?.neighborhood_names;
    return names?.[0] || profile?.neighborhood || "";
  }, [profile]);

  const selectNeighborhood = async (n: { id: string; name: string }) => {
    if (!profile) return;
    await supabase.from("profiles").update({ neighborhood: n.name, neighborhood_names: [n.name] }).eq("id", profile.id);
    setShowNeighborhoodPicker(false);
    location.reload();
  };

  const uploadBanner = async (file: File) => {
    if (!profile) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image is too large (max 10MB)");
      return;
    }
    setUploadingBanner(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${profile.id}/banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg", cacheControl: "3600" });
    if (error) { setUploadingBanner(false); toast.error(error.message); return; }
    const { data, error: signErr } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (signErr || !data) { setUploadingBanner(false); toast.error(signErr?.message || "Could not sign URL"); return; }
    const { error: updErr } = await supabase.from("profiles").update({ banner_url: data.signedUrl }).eq("id", profile.id);
    if (updErr) { setUploadingBanner(false); toast.error(updErr.message); return; }
    toast.success("Banner updated"); location.reload();
  };

  const initials = (profile?.display_name || profile?.email || "U").slice(0, 2).toUpperCase();
  const currentTag = ((profile as { category?: string | null } | null)?.category as string | null) ||
    (isArtist ? "Artist" : isResident ? "Resident" : ((profile?.role || "resident").replace(/\b\w/g, (c) => c.toUpperCase())));

  const selectTag = async (tag: string) => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ category: tag }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    setShowTagPicker(false);
    toast.success("Tag updated");
    location.reload();
  };

  return (
    <AppLayout title="" hero={false}>
      <div className="rounded-2xl border border-border bg-card overflow-hidden sm:rounded-3xl">
        <div
          className="relative h-36 bg-gradient-to-br from-neutral-200 to-neutral-300 sm:h-56"
          style={profile?.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {uploadingBanner && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-neutral-800 shadow">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4580a] border-t-transparent" />
                Uploading banner...
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploadingBanner}
            className="absolute bottom-2 right-2 z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-black/80 disabled:opacity-60 sm:bottom-3 sm:right-3 sm:px-4 sm:py-2 sm:text-xs"
          >
            <Camera className="h-3.5 w-3.5" /> {uploadingBanner ? "Uploading..." : profile?.banner_url ? "Change banner" : "Add banner"}
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadBanner(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="relative px-4 pb-6 sm:px-6">
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-background sm:h-24 sm:w-24">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="bg-[#d4580a]/10 text-2xl text-[#d4580a]">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Link to="/create-story" aria-label="Write a story" className="rounded-full bg-[#d4580a]/10 p-2 text-[#d4580a] hover:bg-[#d4580a]/20 sm:p-2.5"><BookOpen className="h-4 w-4" /></Link>
              <Link to="/create-post" aria-label="Create post" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#d4580a]/10 text-lg font-semibold leading-none text-[#d4580a] hover:bg-[#d4580a]/20 sm:h-9 sm:w-9">+</Link>
              <Link to="/edit-profile" aria-label="Edit profile" className="rounded-full bg-secondary p-2 hover:bg-secondary sm:p-2.5"><Pencil className="h-4 w-4" /></Link>
              <button type="button" onClick={() => setMsgOpen(true)} aria-label="Message followers" className="rounded-full bg-secondary p-2 hover:bg-secondary sm:p-2.5"><MessageCircle className="h-4 w-4" /></button>
              <button type="button" onClick={() => setInviteOpen(true)} aria-label="Invite friends" className="rounded-full bg-secondary p-2 hover:bg-secondary sm:p-2.5"><UserPlus className="h-4 w-4" /></button>
              <button type="button" onClick={() => setShareExternalOpen(true)} aria-label="Share profile" className="rounded-full bg-secondary p-2 hover:bg-secondary sm:p-2.5"><Share2 className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 text-xl font-bold text-foreground">
              {profile?.display_name || profile?.username}
              {isAdmin && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ backgroundColor: "rgba(212,88,10,0.1)", color: "#d4580a", borderColor: "rgba(212,88,10,0.3)" }}
                  title="You are an admin"
                >
                  <Shield className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
            {profile?.website && (
              <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-sm hover:underline" style={{ color: "#d4580a" }}>
                <LinkIcon className="h-3.5 w-3.5" />{profile.website.replace(/https?:\/\//, "")}
              </a>
            )}
            {profile?.email && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span className="break-all">{profile.email}</span>
              </div>
            )}
            <div className="relative mt-1">
              <button
                onClick={() => setShowNeighborhoodPicker((v) => !v)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#d4580a] transition-colors"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{primaryHood || "Add neighborhood"}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showNeighborhoodPicker && (
                <div className="absolute top-7 left-0 z-30 bg-card border border-border rounded-xl shadow-xl w-56 max-h-60 overflow-y-auto">
                  {neighborhoods.map((n) => (
                    <button key={n.id} onClick={() => selectNeighborhood(n)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors ${primaryHood === n.name ? "font-medium" : "text-foreground"}`}
                      style={primaryHood === n.name ? { color: "#d4580a" } : undefined}
                    >{n.name}</button>
                  ))}
                </div>
              )}
            </div>
            {profile?.bio && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{profile.bio}</p>}
            <div className="mt-2">
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setShowTagPicker((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition hover:opacity-90"
                  style={{ backgroundColor: "rgba(212,88,10,0.1)", color: "#d4580a", borderColor: "rgba(212,88,10,0.2)" }}
                  aria-label="Change tag"
                >
                  {isArtist ? <Mic2 className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                  {currentTag}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showTagPicker && (
                  <div className="absolute top-8 left-0 z-30 w-48 max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
                    {PROFILE_TAGS.map((t) => (
                      <button
                        key={t}
                        onClick={() => selectTag(t)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-secondary ${currentTag === t ? "font-semibold" : "text-foreground"}`}
                        style={currentTag === t ? { color: "#d4580a" } : undefined}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs sm:flex sm:gap-8 sm:text-left sm:text-sm">
            <div><div className="text-base font-bold sm:text-lg">{stats.posts}</div><div className="text-muted-foreground">Posts</div></div>
            <button type="button" onClick={() => setFollowList("followers")} className="hover:text-[#d4580a]"><div className="text-base font-bold sm:text-lg">{stats.followers}</div><div className="text-muted-foreground">Followers</div></button>
            <button type="button" onClick={() => setFollowList("following")} className="hover:text-[#d4580a]"><div className="text-base font-bold sm:text-lg">{stats.following}</div><div className="text-muted-foreground">Following</div></button>
            <div><div className="text-base font-bold sm:text-lg">0</div><div className="text-muted-foreground">Referrals</div></div>
          </div>

          {profile && followList && (
            <FollowListDialog
              open
              onOpenChange={(open) => { if (!open) setFollowList(null); }}
              profileId={profile.id}
              mode={followList}
            />
          )}

          {followerPreview.length > 0 && (
            <div className="mt-3 pb-3 border-b border-border">
              <p className="text-xs text-muted-foreground">
                <span>Followed by </span>
                {followerPreview.map((u, i) => (
                  <span key={u.id}>
                    <Link to="/u/$username" params={{ username: u.username || u.id }} className="font-semibold text-foreground hover:text-[#d4580a] transition-colors">
                      {(u.display_name || u.username || "user").split(" ")[0]}
                    </Link>
                    {i < followerPreview.length - 1 && <span>, </span>}
                  </span>
                ))}
              </p>
            </div>
          )}

          <div className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map((t) => {
              const Icon = TAB_ICONS[t];
              return (
                <button key={t} onClick={() => setTab(t)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition ${tab===t ? "border-[#d4580a] text-[#d4580a]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {Icon && <Icon className="h-4 w-4" />}
                  {t}
                </button>
              );
            })}
          </div>

          <div className="py-8">
            {tab === "Stripe" && isArtist ? (
              <StripeTab />
            ) : tab === "My Tickets" ? (
              <MyTicketsTab />
            ) : (isArtist && ["Studio","Series","Gallery","Talk","CV/Bio"].includes(tab)) ? (
              profile ? (
                tab === "Gallery" ? (
                  <ArtistGalleryTab userId={profile.id} canEdit />
                ) : tab === "CV/Bio" ? (
                  <ArtistCVTab userId={profile.id} profile={profile} canEdit />
                ) : tab === "Series" ? (
                  <ArtistSeriesTab userId={profile.id} canEdit />
                ) : tab === "Talk" ? (
                  <ArtistTalkTab profile={profile} />
                ) : (
                  <ProfileSectionTab
                    userId={profile.id}
                    kind={tab.toLowerCase()}
                    label={tab}
                    canEdit={true}
                  />
                )
              ) : null
            ) : (isArtist && tab === "Contact") ? (
              <ArtistBookCollaborateTab profile={profile} />
            ) : (isArtist && tab === "Invite") ? (
              <ArtistInviteTab profile={profile} />
            ) : (isArtist && tab === "Events") ? (
              profile ? <ArtistEventsTab userId={profile.id} /> : null
            ) : categoryTabs.find((t) => t.label === tab) ? (
              profile ? (
                <ProfileSectionTab
                  userId={profile.id}
                  kind={categoryTabs.find((t) => t.label === tab)!.kind}
                  label={tab}
                  canEdit={true}
                />
              ) : null
            ) : (
              (tab === "Posts" || tab === "Feed") ? (
                myPosts.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No posts yet. Share something with the community!
                  </div>
                ) : (
                  (isArtist && tab === "Posts") ? (
                    <div className="grid grid-cols-3 gap-3">
                      {myPosts.map((p) => (
                        <div key={p.id} className="relative group">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleTogglePin(p.id, !p.is_pinned); }}
                            className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
                            title={p.is_pinned ? "Unpin" : "Pin to top"}
                          >
                            {p.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                          </button>
                          {p.is_pinned && (
                            <div className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow">Pinned</div>
                          )}
                          <Link
                            to="/posts/$postId"
                            params={{ postId: p.id }}
                            className="block"
                          >
                          {p.image_url ? (
                            <div className="overflow-hidden rounded-lg bg-neutral-100">
                              <img
                                src={p.image_url}
                                alt={p.content || "Artwork"}
                                className="h-auto w-full object-cover transition group-hover:opacity-95"
                              />
                            </div>
                          ) : (
                            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-[15px] whitespace-pre-wrap text-foreground">
                              {p.content}
                            </div>
                          )}
                          {p.image_url && p.content && (
                            <div className="mt-3 text-[15px] font-medium text-foreground line-clamp-2">
                              {p.content}
                            </div>
                          )}
                          {p.tag && (
                            <div className="mt-1 text-xs text-muted-foreground">#{p.tag}</div>
                          )}
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myPosts.map((p) => (
                        <div key={p.id} className="relative">
                          {p.is_pinned && (
                            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              <Pin className="h-3.5 w-3.5" /> Pinned post
                            </div>
                          )}
                          <PostCard post={p} currentUserId={profile?.id} onDelete={handleDeleteMyPost} />
                          <button
                            type="button"
                            onClick={() => handleTogglePin(p.id, !p.is_pinned)}
                            className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
                            title={p.is_pinned ? "Unpin" : "Pin to top"}
                          >
                            {p.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                )
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No {tab.toLowerCase()} yet. Share something with the community!
                </div>
              )
            )}
          </div>
        </div>
      </div>
      <MessageFollowersModal open={msgOpen} onClose={() => setMsgOpen(false)} />
      <ShareToUsersDialog
        open={shareInAppOpen}
        onClose={() => setShareInAppOpen(false)}
        url={`${typeof window !== "undefined" ? window.location.origin : ""}/u/${profile?.username ?? ""}`}
        title={profile?.display_name || profile?.username || "Profile"}
      />
      <ExternalShareDialog
        open={shareExternalOpen}
        onClose={() => setShareExternalOpen(false)}
        url={`${typeof window !== "undefined" ? window.location.origin : ""}/u/${profile?.username ?? ""}`}
        title={`${profile?.display_name || profile?.username || "Profile"} on Planet Baltimore`}
      />
      <InviteFriendsDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        inviteUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/u/${profile?.username ?? ""}`}
      />
    </AppLayout>
  );
}

function ArtistBookCollaborateTab({ profile }: { profile: any }) {
  const [intent, setIntent] = useState<string>("Collaborate");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const intents = [
    { key: "Collaborate", icon: "💬" },
    { key: "Commission", icon: "🏛️" },
    { key: "Book / Perform", icon: "🎵" },
    { key: "Photography", icon: "📷" },
    { key: "Other", icon: "💭" },
  ];
  const displayName = profile?.display_name || profile?.username || "this artist";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    if (!name.trim() || !email.trim() || !message.trim()) { toast.error("Fill in your name, email, and message."); return; }
    setSending(true);
    const { data: sess } = await supabase.auth.getSession();
    const { error } = await supabase.from("artist_inquiries").insert({
      artist_id: profile.id,
      sender_id: sess.session?.user.id ?? null,
      intent,
      sender_name: name.trim(),
      sender_email: email.trim(),
      message: message.trim(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Message sent");
    setName(""); setEmail(""); setMessage("");
  };
  return (
    <div className="rounded-2xl border border-border p-6 space-y-6">
      <div>
        <div className="text-xl font-bold">Book or Collaborate</div>
        <div className="text-sm text-muted-foreground mt-1">
          Reach out to {displayName} for commissions, collaborations, bookings, or any project inquiry.
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold tracking-wider text-muted-foreground mb-2">I WANT TO...</div>
        <div className="flex flex-wrap gap-2">
          {intents.map((i) => (
            <button key={i.key} type="button" onClick={() => setIntent(i.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                intent === i.key ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : "border-border hover:bg-muted"
              }`}>
              <span>{i.icon}</span> {i.key}
            </button>
          ))}
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Your name <span className="text-[#d4580a]">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold">Your email <span className="text-[#d4580a]">*</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold">Message <span className="text-[#d4580a]">*</span></label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
            placeholder={`Tell ${displayName} about your project, timeline, budget, or any details that would help them respond...`}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={sending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4580a] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
          <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Message"}
        </button>
        <p className="text-center text-xs text-muted-foreground">Your message goes directly to {displayName}. No spam, ever.</p>
      </form>
    </div>
  );
}

function ArtistGalleryTab({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", media_url: "" });
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("profile_sections").select("*")
      .eq("user_id", userId).eq("kind", "gallery")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [userId]);
  const add = async () => {
    if (!form.media_url.trim()) { toast.error("Add an image URL"); return; }
    const { error } = await supabase.from("profile_sections").insert({
      user_id: userId, kind: "gallery", title: form.title.trim() || null, media_url: form.media_url.trim(), order_index: items.length,
    });
    if (error) { toast.error(error.message); return; }
    setOpen(false); setForm({ title: "", media_url: "" }); void load();
  };
  const remove = async (id: string) => {
    await supabase.from("profile_sections").delete().eq("id", id);
    void load();
  };
  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">
            + Add artwork
          </button>
        </div>
      )}
      {open && (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title (optional)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })}
            placeholder="Image URL" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm">Cancel</button>
            <button onClick={add} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Save</button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No artwork yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((it) => (
            <div key={it.id} className="group relative overflow-hidden rounded-lg bg-muted">
              {it.media_url && <img src={it.media_url} alt={it.title ?? ""} className="w-full h-auto object-cover" loading="lazy" />}
              {it.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <div className="text-sm font-semibold text-white">{it.title}</div>
                </div>
              )}
              {canEdit && (
                <button onClick={() => remove(it.id)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 opacity-0 group-hover:opacity-100">
                  <span className="text-red-600 text-xs font-bold">✕</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArtistSeriesTab({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const [series, setSeries] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [addingSeries, setAddingSeries] = useState(false);
  const [seriesForm, setSeriesForm] = useState({ title: "", body: "", media_url: "" });
  const [itemForm, setItemForm] = useState({ title: "", media_url: "", body: "" });
  const [addingItem, setAddingItem] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("profile_sections").select("*")
      .eq("user_id", userId).eq("kind", "series")
      .order("created_at", { ascending: false });
    const all = data ?? [];
    setSeries(all.filter((r: any) => !r.parent_id));
    setItems(all.filter((r: any) => r.parent_id));
  };
  useEffect(() => { void load(); }, [userId]);

  const addSeries = async () => {
    if (!seriesForm.title.trim()) { toast.error("Series title required"); return; }
    const { error } = await supabase.from("profile_sections").insert({
      user_id: userId, kind: "series",
      title: seriesForm.title.trim(),
      body: seriesForm.body.trim() || null,
      media_url: seriesForm.media_url.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    setSeriesForm({ title: "", body: "", media_url: "" });
    setAddingSeries(false);
    void load();
  };
  const addItem = async (parentId: string) => {
    if (!itemForm.media_url.trim() && !itemForm.title.trim()) { toast.error("Add an image or title"); return; }
    const { error } = await supabase.from("profile_sections").insert({
      user_id: userId, kind: "series", parent_id: parentId,
      title: itemForm.title.trim() || null,
      media_url: itemForm.media_url.trim() || null,
      body: itemForm.body.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    setItemForm({ title: "", media_url: "", body: "" });
    setAddingItem(false);
    void load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this?")) return;
    await supabase.from("profile_sections").delete().eq("id", id);
    void load();
  };

  if (openId) {
    const s = series.find((r) => r.id === openId);
    const kids = items.filter((r) => r.parent_id === openId);
    if (!s) { setOpenId(null); return null; }
    return (
      <div className="space-y-4">
        <button onClick={() => setOpenId(null)} className="text-sm font-semibold text-[#d4580a]">← Back to Series</button>
        <div className="rounded-2xl border border-border overflow-hidden">
          {s.media_url && <img src={s.media_url} alt={s.title} className="w-full h-56 object-cover" />}
          <div className="p-5">
            <div className="text-2xl font-bold">{s.title}</div>
            {s.body && <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>}
          </div>
        </div>
        {canEdit && (
          addingItem ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
              <input value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                placeholder="Piece title" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <input value={itemForm.media_url} onChange={(e) => setItemForm({ ...itemForm, media_url: e.target.value })}
                placeholder="Image URL" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <textarea value={itemForm.body} onChange={(e) => setItemForm({ ...itemForm, body: e.target.value })}
                placeholder="Description (optional)" rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setAddingItem(false)} className="rounded-full px-4 py-2 text-sm">Cancel</button>
                <button onClick={() => addItem(s.id)} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Add to series</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingItem(true)} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">
              + Add piece to series
            </button>
          )
        )}
        {kids.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No pieces in this series yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {kids.map((k) => (
              <div key={k.id} className="group relative overflow-hidden rounded-2xl border border-border">
                {k.media_url && <img src={k.media_url} alt={k.title ?? ""} className="w-full h-64 object-cover" />}
                <div className="p-3">
                  {k.title && <div className="font-semibold">{k.title}</div>}
                  {k.body && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{k.body}</p>}
                </div>
                {canEdit && (
                  <button onClick={() => remove(k.id)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 opacity-0 group-hover:opacity-100">
                    <span className="text-red-600 text-xs font-bold">✕</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button onClick={() => setAddingSeries((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">
            + New series
          </button>
        </div>
      )}
      {addingSeries && (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
          <input value={seriesForm.title} onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })}
            placeholder="Series title (e.g. The Maroons: Rebellion)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={seriesForm.body} onChange={(e) => setSeriesForm({ ...seriesForm, body: e.target.value })}
            placeholder="Series description" rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={seriesForm.media_url} onChange={(e) => setSeriesForm({ ...seriesForm, media_url: e.target.value })}
            placeholder="Cover image URL (optional)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setAddingSeries(false)} className="rounded-full px-4 py-2 text-sm">Cancel</button>
            <button onClick={addSeries} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Create series</button>
          </div>
        </div>
      )}
      {series.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No series yet. Create one to group related pieces.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {series.map((s) => {
            const count = items.filter((i) => i.parent_id === s.id).length;
            return (
              <button key={s.id} onClick={() => setOpenId(s.id)}
                className="text-left rounded-2xl border border-border overflow-hidden hover:shadow-md transition">
                {s.media_url && <img src={s.media_url} alt={s.title} className="w-full h-48 object-cover" />}
                <div className="p-4">
                  <div className="font-bold">{s.title}</div>
                  {s.body && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.body}</p>}
                  <div className="mt-2 text-xs text-muted-foreground">{count} {count === 1 ? "piece" : "pieces"}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CV_SECTIONS: Array<{ kind: string; label: string; icon: string }> = [
  { kind: "cv_education", label: "Education", icon: "🎓" },
  { kind: "cv_solo", label: "Solo Exhibitions", icon: "🌐" },
  { kind: "cv_group", label: "Group Exhibitions", icon: "🌐" },
  { kind: "cv_awards", label: "Awards & Grants", icon: "🏆" },
  { kind: "cv_residencies", label: "Residencies", icon: "📖" },
  { kind: "cv_publications", label: "Publications", icon: "📚" },
  { kind: "cv_press", label: "Press", icon: "📰" },
];

function ArtistCVTab({ userId, profile, canEdit }: { userId: string; profile: any; canEdit: boolean }) {
  const [statement, setStatement] = useState<string>(profile?.bio || "");
  const [editStatement, setEditStatement] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("profile_sections").select("*").eq("user_id", userId)
      .in("kind", CV_SECTIONS.map((s) => s.kind))
      .order("year", { ascending: false, nullsFirst: false });
    setItems(data ?? []);
  };
  useEffect(() => { void load(); }, [userId]);
  useEffect(() => { setStatement(profile?.bio || ""); }, [profile?.bio]);
  const saveStatement = async () => {
    const { error } = await supabase.from("profiles").update({ bio: statement }).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    setEditStatement(false); toast.success("Statement saved");
  };
  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold">Curriculum Vitae</div>
      <div className="rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold tracking-wider text-muted-foreground">ARTIST STATEMENT</div>
          {canEdit && !editStatement && (
            <button onClick={() => setEditStatement(true)} className="text-xs font-semibold text-[#d4580a]">Edit</button>
          )}
        </div>
        {editStatement ? (
          <div className="space-y-2">
            <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={6}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setStatement(profile?.bio || ""); setEditStatement(false); }} className="rounded-full px-4 py-2 text-sm">Cancel</button>
              <button onClick={saveStatement} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Save</button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {statement || <span className="text-muted-foreground">No artist statement yet.</span>}
          </p>
        )}
      </div>
      {CV_SECTIONS.map((s) => (
        <CVSection key={s.kind} section={s} userId={userId} items={items.filter((i) => i.kind === s.kind)} canEdit={canEdit} onChange={load} />
      ))}
    </div>
  );
}

function CVSection({ section, userId, items, canEdit, onChange }: {
  section: { kind: string; label: string; icon: string };
  userId: string; items: any[]; canEdit: boolean; onChange: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ year: "", title: "", subtitle: "" });
  const add = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const { error } = await supabase.from("profile_sections").insert({
      user_id: userId, kind: section.kind,
      year: form.year.trim() || null, title: form.title.trim(), subtitle: form.subtitle.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    setForm({ year: "", title: "", subtitle: "" }); setAdding(false); onChange();
  };
  const remove = async (id: string) => {
    await supabase.from("profile_sections").delete().eq("id", id);
    onChange();
  };
  return (
    <div className="rounded-2xl border border-border">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span>{section.icon}</span>
          <span className="font-semibold">{section.label}</span>
          <span className="text-sm text-muted-foreground">({items.length})</span>
        </div>
        <span className="text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          {items.length === 0 && !adding && (
            <div className="text-sm text-muted-foreground text-center py-4">No entries yet.</div>
          )}
          {items.map((it) => (
            <div key={it.id} className="grid grid-cols-[70px_1fr_auto] gap-3 items-start">
              <div className="text-sm font-semibold text-muted-foreground">{it.year || ""}</div>
              <div>
                <div className="font-semibold">{it.title}</div>
                {it.subtitle && <div className="text-sm text-muted-foreground">{it.subtitle}</div>}
              </div>
              {canEdit && (
                <button onClick={() => remove(it.id)} className="text-xs text-red-600 hover:underline">Remove</button>
              )}
            </div>
          ))}
          {canEdit && (
            adding ? (
              <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Year"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Venue / Location (optional)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setAdding(false)} className="rounded-full px-3 py-1.5 text-sm">Cancel</button>
                  <button onClick={add} className="rounded-full bg-[#d4580a] px-3 py-1.5 text-sm font-semibold text-white">Add</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="text-sm font-semibold text-[#d4580a]">+ Add entry</button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ArtistInviteTab({ profile }: { profile: any }) {
  const url = typeof window !== "undefined" && profile?.username
    ? `${window.location.origin}/u/${profile.username}`
    : "";
  return (
    <div className="rounded-xl border border-border p-6 space-y-4">
      <div>
        <div className="text-lg font-semibold">Invite people to your page</div>
        <div className="text-sm text-muted-foreground">Share your public profile link.</div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input readOnly value={url} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button
          onClick={() => { if (url) { navigator.clipboard.writeText(url); toast.success("Link copied"); } }}
          className="rounded-lg bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Copy link</button>
      </div>
    </div>
  );
}

function ArtistEventsTab({ userId }: { userId: string }) {
  const [events, setEvents] = useState<Array<{ id: string; title: string; description: string | null; starts_at: string; location: string | null; image_url: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, description, starts_at, location, image_url")
        .eq("user_id", userId)
        .is("organization_id", null)
        .order("starts_at", { ascending: false })
        .limit(50);
      setEvents((data ?? []) as never);
      setLoading(false);
    })();
  }, [userId]);
  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading events…</div>;
  if (events.length === 0) return <div className="py-12 text-center text-muted-foreground">No events yet.</div>;
  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now);
  const renderCard = (e: typeof events[number]) => (
    <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }} className="block rounded-2xl border border-border overflow-hidden hover:shadow-md transition">
      {e.image_url && <img src={e.image_url} alt={e.title} className="w-full h-56 object-cover" />}
      <div className="p-4 space-y-2">
        <div className="text-xs text-muted-foreground">
          {new Date(e.starts_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          {" · "}
          {new Date(e.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </div>
        <div className="font-bold text-lg">{e.title}</div>
        {e.description && <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
        {e.location && <div className="text-xs text-muted-foreground">📍 {e.location}</div>}
      </div>
    </Link>
  );
  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <div>
          <div className="text-xs font-semibold tracking-wider text-muted-foreground mb-3">UPCOMING</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{upcoming.map(renderCard)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <div className="text-xs font-semibold tracking-wider text-muted-foreground mb-3">PAST</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{past.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}

function MyTicketsTab() {
  type TicketRow = {
    id: string; status: string; buyer_total_cents: number; event_id: string;
    events: { title: string; starts_at: string; location: string | null; venue_name: string | null } | null;
  };
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) { setLoading(false); return; }
      const { data } = await supabase
        .from("tickets")
        .select("id, status, buyer_total_cents, event_id, events(title, starts_at, location, venue_name)")
        .eq("buyer_id", uid)
        .eq("status", "paid")
        .order("created_at", { ascending: false });
      setTickets((data ?? []) as TicketRow[]);
      setLoading(false);
    })();
  }, []);
  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading tickets…</div>;
  if (tickets.length === 0) return <div className="py-12 text-center text-muted-foreground">You haven't bought any tickets yet.</div>;
  const now = Date.now();
  const shown = tickets.filter((t) => {
    const at = t.events ? new Date(t.events.starts_at).getTime() : 0;
    return view === "upcoming" ? at >= now : at < now;
  });
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full bg-neutral-100 p-1 text-sm">
        <button onClick={() => setView("upcoming")} className={`rounded-full px-4 py-1.5 font-semibold ${view === "upcoming" ? "bg-white shadow" : "text-neutral-500"}`}>Upcoming</button>
        <button onClick={() => setView("past")} className={`rounded-full px-4 py-1.5 font-semibold ${view === "past" ? "bg-white shadow" : "text-neutral-500"}`}>Past</button>
      </div>
      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-500">No {view} tickets</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {shown.map((t) => <TicketStub key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}

function TicketStub({ t }: { t: { id: string; buyer_total_cents: number; events: { title: string; starts_at: string; location: string | null; venue_name: string | null } | null } }) {
  const when = t.events ? new Date(t.events.starts_at) : null;
  return (
    <Link
      to="/tickets/$ticketId"
      params={{ ticketId: t.id }}
      className="group relative flex overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl"
    >
      <div className="flex-1 p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Planet Baltimore Ticket</div>
        <div className="mt-2 line-clamp-2 text-lg font-bold leading-tight">{t.events?.title ?? "Event"}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-white/40">Date</div>
            <div className="font-semibold">{when?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
          </div>
          <div>
            <div className="text-white/40">Time</div>
            <div className="font-semibold">{when?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
          </div>
          <div className="col-span-2">
            <div className="text-white/40">Venue</div>
            <div className="truncate font-semibold">{t.events?.venue_name ?? t.events?.location ?? "TBA"}</div>
          </div>
        </div>
        <div className="mt-3 text-[10px] font-mono uppercase text-white/50">#{t.id.slice(0, 8)}</div>
      </div>
      {/* Perforation */}
      <div className="relative flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 px-4 py-5">
        <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white" />
        <div className="rounded-lg bg-white p-1.5">
          <img alt="QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=0&data=${encodeURIComponent(t.id)}`} className="h-[70px] w-[70px]" />
        </div>
        <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/60">Admit One</div>
      </div>
    </Link>
  );
}

function StripeTab() {
  const profile = useCurrentProfile();
  const ensureFn = useServerFn(ensureConnectAccount);
  const linkFn = useServerFn(createConnectOnboardingLink);
  const refreshFn = useServerFn(refreshConnectStatus);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; chargesEnabled: boolean; status?: string } | null>(null);

  useEffect(() => {
    if (!profile?.stripe_account_id) { setStatus({ connected: false, chargesEnabled: false }); return; }
    refreshFn().then((s) => setStatus(s)).catch(() => setStatus({
      connected: !!profile?.stripe_account_id,
      chargesEnabled: !!(profile as unknown as { stripe_charges_enabled?: boolean })?.stripe_charges_enabled,
    }));
  }, [profile?.id, profile?.stripe_account_id, refreshFn]);

  const onboard = async () => {
    setBusy(true);
    try {
      await ensureFn();
      const { url } = await linkFn({ data: {
        returnUrl: `${window.location.origin}/profile?tab=Stripe&onboarded=1`,
        refreshUrl: `${window.location.origin}/profile?tab=Stripe&refresh=1`,
      }});
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start onboarding");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border p-6">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 text-[#d4580a]" />
          <div>
            <h3 className="text-base font-semibold">Payouts via Stripe</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your Stripe account to sell tickets on Planet Baltimore. We use Stripe Connect so payouts
              go directly to your bank - Planet Baltimore never holds your money.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          {status?.chargesEnabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected & active
            </span>
          ) : status?.connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" /> Onboarding incomplete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
              Not connected
            </span>
          )}
          <button
            onClick={onboard}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Opening Stripe…" : status?.chargesEnabled ? "Update Stripe account" : "Connect Stripe"} <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border p-6 text-sm leading-relaxed text-neutral-700">
        <h4 className="mb-3 text-base font-semibold text-foreground">How payments work</h4>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>Click "Connect Stripe"</strong> above. You'll be redirected to Stripe to enter your
            personal info, bank account, and tax details. This is required by US payment regulations.
          </li>
          <li>
            <strong>Set ticket prices on your events.</strong> Enter the amount <em>you</em> want to receive
            per ticket. We automatically add Stripe's processing fee (2.9% + $0.30) and Baltimore City's
            10% Admissions &amp; Amusement Tax on top - so the buyer pays the all-in total and you net your
            advertised price.
          </li>
          <li>
            <strong>Buyers pay through Stripe Checkout.</strong> Stripe deducts its fee, sends the Baltimore
            tax portion to Planet Baltimore (we file and remit it to the city), and pays the rest directly to
            your connected bank account.
          </li>
          <li>
            <strong>Payouts</strong> arrive on Stripe's standard schedule (typically 2 business days for new
            accounts). You can view all transactions inside your Stripe dashboard.
          </li>
        </ol>

        <h4 className="mt-6 mb-2 text-sm font-semibold text-foreground">Example: $20 ticket</h4>
        <ul className="space-y-1 text-sm">
          <li>You set price: <strong>$20.00</strong> (what you keep)</li>
          <li>Baltimore A&amp;A tax (10%): <strong>$2.00</strong> (routed to Planet Baltimore)</li>
          <li>Stripe fee (~2.9% + $0.30): <strong>~$0.98</strong></li>
          <li>Buyer pays: <strong>~$22.98</strong></li>
        </ul>
      </div>
    </div>
  );
}