import { BannerWatermark } from "@/components/shared/banner-watermark";
import { navigateExternal, openExternalWindow, closeExternalWindow } from "@/lib/external-nav";
import { emailMyCancellation } from "@/lib/tickets.functions";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "@/components/smart-image";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { ImageUpload } from "@/components/shared/image-upload";
import { FileUpload } from "@/components/shared/file-upload";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Camera, MapPin, Pencil, UserPlus, MessageCircle, BookOpen, CreditCard, ExternalLink, CheckCircle2, AlertCircle, ChevronDown, Link as LinkIcon, Mic2, Users, LayoutGrid, Rss, Bookmark, Calendar, CalendarCheck, Ticket, Shield, BarChart3, Mail, Palette, Layers, Image as ImageIcon, MessageSquare, FileText, Send, Pin, PinOff, Gift, ChevronLeft, ChevronRight, X as XIcon, Play, Lock as LockIcon, Globe as GlobeIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { MessageFollowersModal } from "@/components/message-followers-modal";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";
import { useServerFn } from "@tanstack/react-start";
import {
  ensureConnectAccount,
  createConnectOnboardingLink,
  refreshConnectStatus,
  reconcileMyTickets,
} from "@/lib/stripe.functions";
import { tabsForCategory, PROFILE_TAGS } from "@/lib/categories";
import { ProfileSectionTab } from "@/components/profile-sections";
import { FollowListDialog } from "@/components/follow-list-dialog";
import { PostCard } from "@/components/shared/post-card";
import { PostSplitView } from "@/components/shared/post-split-view";
import { sanitizeErrorMessage, siteUrl } from "@/lib/utils";
import { ArtistTalkTab } from "@/components/artist/artist-tab-sections";
import { ShareToUsersDialog } from "@/components/share-to-users-dialog";
import { InviteFriendsDialog } from "@/components/invite-friends-dialog";
import { ExternalShareDialog } from "@/components/external-share-dialog";
import { ReferralNetworkDialog } from "@/components/referral-network-dialog";
import { Img, SmartAvatarImage, SmartVideo } from "@/components/shared/smart-img";
import { STORED_URL_TTL, compressAvatar, compressImage } from "@/lib/image-compress";
import { ImageCropDialog } from "@/components/image-crop-dialog";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  // ?preview=public renders this same page the way other people see it.
  // ?tab=... deep-links a tab; Stripe returns here with ?purchase=success&session_id=...
  validateSearch: (search: Record<string, unknown>) => {
    const out: { preview?: "public"; tab?: string; purchase?: string; session_id?: string } = {};
    if (search.preview === "public") out.preview = "public";
    if (typeof search.tab === "string") out.tab = search.tab;
    if (typeof search.purchase === "string") out.purchase = search.purchase;
    if (typeof search.session_id === "string") out.session_id = search.session_id;
    return out;
  },

  head: () => ({
    meta: [
      { title: "My Profile | Planet Baltimore" },
      { name: "description", content: "Manage your Planet Baltimore resident profile, posts, events, saved items, and community activity." },
      { property: "og:title", content: "My Profile | Planet Baltimore" },
      { property: "og:description", content: "Manage your Planet Baltimore resident profile and community activity." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const FULL_PROFILE_TABS = ["Posts","About","My Stories","Saved","Attending","Organized","My Tickets","My Pages","Memberships","My Dashboard","Payouts"] as const;
/** Tabs other people can see when they visit your profile. */
// Public preview keeps every tab the owner has, minus purely private money tabs.
const PUBLIC_PROFILE_TABS = ["Posts","About","My Stories","Saved","Attending","Organized","My Pages","Memberships"] as const;
const TABS_ARTIST_BASE = FULL_PROFILE_TABS;
const TABS_RESIDENT_BASE = FULL_PROFILE_TABS;
function displayTabLabel(t: string, isPublicPreview: boolean) {
  return isPublicPreview ? t.replace(/^My /, "") : t;
}

import { sortPosts } from "@/lib/sort-posts";
import { PersonMembershipsTab } from "@/components/profile/person-tabs";
const TAB_ICONS: Record<string, typeof LayoutGrid> = {
  "Posts": LayoutGrid,
  "About": Rss,
  "My Stories": BookOpen,
  "Saved": Bookmark,
  "Attending": Calendar,
  "Organized": CalendarCheck,
  "My Tickets": Ticket,
  "My Pages": Shield,
  "Memberships": Users,
  "My Dashboard": BarChart3,
  "Payouts": CreditCard,
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
  const { preview, tab: tabParam, purchase, session_id: purchaseSessionId } = Route.useSearch();
  // Public preview: same profile, rendered without any owner-only controls.
  const publicPreview = preview === "public";
  const { isArtist: roleIsArtist, isResident, isAdmin } = useUserRole();
  const category = (profile as { category?: string | null } | null)?.category ?? null;
  const role = (profile as { role?: string | null } | null)?.role ?? null;
  // Creative interests such as Music do not turn a Resident page into an
  // Artist page. The user's explicit profile role decides the page type.
  const isArtist = roleIsArtist && !isResident && role?.toLowerCase() === "artist";
  const categoryTabs: Array<{ label: string; kind: string }> = [];
  void category; void isArtist;
  const TABS: readonly string[] = publicPreview ? PUBLIC_PROFILE_TABS : FULL_PROFILE_TABS;
  // Deep links (and the Stripe return URL) decide which tab opens first.
  const [tab, setTab] = useState<Tab>(() => {
    if (purchase === "success") return "My Tickets";
    if (tabParam && FULL_PROFILE_TABS.includes(tabParam as never)) return tabParam;
    return "Posts";
  });

  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0, referrals: 0 });
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [msgOpen, setMsgOpen] = useState(false);
  const [shareInAppOpen, setShareInAppOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareExternalOpen, setShareExternalOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [followList, setFollowList] = useState<"followers" | "following" | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Array<{ id: string; name: string }>>([]);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [followerPreview, setFollowerPreview] = useState<Array<{ id: string; display_name: string | null; username: string | null }>>([]);
  const [postViewerIdx, setPostViewerIdx] = useState<number | null>(null);

  useEffect(() => {
    if (postViewerIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPostViewerIdx(null);
      // Skip arrow navigation on small screens (touch users scroll vertically).
      if (typeof window !== "undefined" && window.innerWidth < 640) return;
      if (e.key === "ArrowLeft") setPostViewerIdx((i) => (i === null ? null : (i - 1 + myPosts.length) % myPosts.length));
      if (e.key === "ArrowRight") setPostViewerIdx((i) => (i === null ? null : (i + 1) % myPosts.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [postViewerIdx, myPosts.length]);

  useEffect(() => {
    if (!TABS.includes(tab)) setTab(TABS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArtist, publicPreview]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ count: posts }, { count: followers }, { count: following }, { count: referrals }] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("is_deleted", false),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profile.id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profile.id),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", profile.id),
      ]);
      setStats({ posts: posts || 0, followers: followers || 0, following: following || 0, referrals: referrals || 0 });
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const loadPosts = async () => {
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
    };
    void loadPosts();
    const onFocus = () => { if (document.visibilityState === "visible") void loadPosts(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("neighborhoods").select("id, name").order("name").limit(200);
      if (data) setNeighborhoods(data as Array<{ id: string; name: string }>);
    })();
  }, []);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: fs } = await supabase.from("follows").select("follower_id").eq("following_id", profile.id).limit(5);
      const ids = (fs || []).map((f: { follower_id: string }) => f.follower_id);
      if (!ids.length) { setFollowerPreview([]); return; }
      const { data: ps } = await (supabase as any).from("profiles_public").select("id, display_name, username, avatar_url").in("id", ids);
      setFollowerPreview((ps as Array<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }>) || []);
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

  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropKind, setCropKind] = useState<"avatar" | "banner">("avatar");
  const [cropOpen, setCropOpen] = useState(false);

  const pickForCrop = (f: File, kind: "avatar" | "banner") => {
    const looksLikeImage = f.type.startsWith("image/") || /\.(jpe?g|png|webp|heics?|heif|avif|bmp|tiff?|gif)$/i.test(f.name);
    if (!looksLikeImage) { toast.error("Please choose an image file."); return; }
    setCropKind(kind);
    setCropFile(f);
    setCropOpen(true);
  };

  const uploadBanner = async (file: File) => {
    file = await compressImage(file);
    if (!profile) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Image is too large (max 25MB)");
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
      .createSignedUrl(path, STORED_URL_TTL);
    if (signErr || !data) { setUploadingBanner(false); toast.error(signErr?.message || "Could not sign URL"); return; }
    const { error: updErr } = await supabase.from("profiles").update({ banner_url: data.signedUrl }).eq("id", profile.id);
    if (updErr) { setUploadingBanner(false); toast.error(updErr.message); return; }
    toast.success("Banner updated"); location.reload();
  };

  const uploadAvatar = async (file: File) => {
    file = await compressAvatar(file);
    if (!profile) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("Image is too large (max 25MB)"); return; }
    setUploadingAvatar(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type || "image/jpeg", cacheControl: "3600" });
    if (error) { setUploadingAvatar(false); toast.error(error.message); return; }
    const { data, error: signErr } = await supabase.storage.from("avatars").createSignedUrl(path, STORED_URL_TTL);
    if (signErr || !data) { setUploadingAvatar(false); toast.error(signErr?.message || "Could not sign URL"); return; }
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: data.signedUrl }).eq("id", profile.id);
    if (updErr) { setUploadingAvatar(false); toast.error(updErr.message); return; }
    toast.success("Avatar updated"); location.reload();
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
      {!profile && (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d4580a] border-t-transparent" />
            <p className="text-sm font-medium text-muted-foreground">Loading your profile…</p>
          </div>
        </div>
      )}
      {profile && (
      <>
      {publicPreview && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d4580a]/30 bg-[#d4580a]/10 px-4 py-3">
          <div className="text-sm font-semibold text-[#d4580a]">
            Public preview: this is how other people see your profile.
          </div>
          <Link
            to="/profile"
            className="rounded-full bg-[#d4580a] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#b3480a]"
          >
            Exit preview
          </Link>
        </div>
      )}
      <div className="rounded-2xl border border-border bg-card overflow-hidden sm:rounded-3xl">
        <div
          className="relative h-36 bg-gradient-to-br from-neutral-200 to-neutral-300 sm:h-56"
          style={profile?.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2 sm:left-4 sm:top-4">
            {isArtist ? (
              <span className="inline-flex items-center rounded-full bg-[#d4580a] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur sm:text-xs">
                Artist Page
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-black/70 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur sm:text-xs">
                {(category || "").toLowerCase() === "visitor" ? "Visitor" : "Resident"}
              </span>
            )}
          </div>
          {uploadingBanner && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-neutral-800 shadow">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d4580a] border-t-transparent" />
                Uploading banner...
              </div>
            </div>
          )}
          {!publicPreview && !profile?.banner_url && !uploadingBanner && <BannerWatermark />}

          {!publicPreview && (
          <>
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
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              pickForCrop(f, "banner");
              e.target.value = "";
            }}
          />
          </>
          )}
        </div>

        <div className="relative px-4 pb-6 sm:px-6">
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="relative h-20 w-20 sm:h-24 sm:w-24">
              <Avatar className="h-20 w-20 ring-4 ring-background sm:h-24 sm:w-24">
                {profile?.avatar_url && <SmartAvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="bg-[#d4580a]/10 text-2xl text-[#d4580a]">{initials}</AvatarFallback>
              </Avatar>
              {!publicPreview && (
              <>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="Change profile picture"
                className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#d4580a] text-white ring-2 ring-background hover:bg-[#b3480a] disabled:opacity-60"
              >
                {uploadingAvatar ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; pickForCrop(f, "avatar"); e.target.value = ""; }}
              />
              </>
              )}
            </div>
            {publicPreview ? (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="rounded-full bg-[#d4580a] px-4 py-2 text-xs font-semibold text-white">Follow</span>
                <span className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold">Message</span>
              </div>
            ) : (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Link to="/create-story" aria-label="Write a story" className="rounded-full bg-[#d4580a]/10 p-2 text-[#d4580a] hover:bg-[#d4580a]/20 sm:p-2.5"><BookOpen className="h-4 w-4" /></Link>
              <Link to="/create-post" aria-label="Create post" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#d4580a]/10 text-lg font-semibold leading-none text-[#d4580a] hover:bg-[#d4580a]/20 sm:h-9 sm:w-9">+</Link>
              <Link to="/edit-profile" aria-label="Edit profile" className="rounded-full bg-secondary p-2 hover:bg-secondary sm:p-2.5"><Pencil className="h-4 w-4" /></Link>
              <Link
                to="/profile"
                search={{ preview: "public" as const }}
                aria-label="Public view"
                title="See how others view your profile"
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-2 text-xs font-semibold hover:bg-secondary sm:py-2.5"
              >
                <ExternalLink className="h-4 w-4" /> Public View
              </Link>
              <button type="button" onClick={() => setMsgOpen(true)} aria-label="Message followers" className="rounded-full bg-secondary p-2 hover:bg-secondary sm:p-2.5"><MessageCircle className="h-4 w-4" /></button>
              <button type="button" onClick={() => setInviteOpen(true)} aria-label="Invite friends" className="rounded-full bg-secondary p-2 hover:bg-secondary sm:p-2.5"><UserPlus className="h-4 w-4" /></button>
              <button type="button" onClick={() => setReferralOpen(true)} aria-label="Referral network" className="relative rounded-full bg-[#d4580a]/10 p-2 text-[#d4580a] hover:bg-[#d4580a]/20 sm:p-2.5">
                <Gift className="h-4 w-4" />
                {stats.referrals > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#d4580a] px-1 text-[10px] font-bold text-white">
                    {stats.referrals}
                  </span>
                )}
              </button>
            </div>
            )}
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
            {profile?.email && !publicPreview && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span className="break-all">{profile.email}</span>
              </div>
            )}
            <div className="relative mt-1">
              {publicPreview ? (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{primaryHood || ""}</span>
                </div>
              ) : (
              <button
                onClick={() => setShowNeighborhoodPicker((v) => !v)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#d4580a] transition-colors"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>{primaryHood || "Add neighborhood"}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              )}
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
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs sm:flex sm:gap-8 sm:text-left sm:text-sm">
            <div><div className="text-base font-bold sm:text-lg">{stats.posts}</div><div className="text-muted-foreground">Posts</div></div>
            <button type="button" onClick={() => setFollowList("followers")} className="hover:text-[#d4580a]"><div className="text-base font-bold sm:text-lg">{stats.followers}</div><div className="text-muted-foreground">Followers</div></button>
            <button type="button" onClick={() => setFollowList("following")} className="hover:text-[#d4580a]"><div className="text-base font-bold sm:text-lg">{stats.following}</div><div className="text-muted-foreground">Following</div></button>
            <button type="button" onClick={() => setReferralOpen(true)} className="group relative rounded-lg px-2 py-1 transition hover:bg-[#d4580a]/10 hover:text-[#d4580a] sm:px-3">
              <div className="text-base font-bold sm:text-lg">{stats.referrals ?? 0}</div>
              <div className="text-muted-foreground group-hover:text-[#d4580a]">Referrals</div>
              <span className="absolute -right-1 -top-1 hidden h-2 w-2 rounded-full bg-[#d4580a] sm:block" />
            </button>
          </div>

          {profile && followList && (
            <FollowListDialog
              open
              onOpenChange={(open) => { if (!open) setFollowList(null); }}
              profileId={profile.id}
              mode={followList}
            />
          )}

          <div className="mt-3 pb-3 border-b border-border">
            {followerPreview.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {followerPreview.slice(0, 4).map((u) => (
                    <Link key={u.id} to="/u/$username" params={{ username: u.username || u.id }}>
                      <Img
                        src={(u as any).avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.display_name || u.username || "u")}`}
                        alt=""
                        className="h-6 w-6 rounded-full border-2 border-background object-cover"
                      />
                    </Link>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span>Followed by </span>
                  {followerPreview.slice(0, 2).map((u, i) => (
                    <span key={u.id}>
                      <Link to="/u/$username" params={{ username: u.username || u.id }} className="font-semibold text-foreground hover:text-[#d4580a] transition-colors">
                        {(u.display_name || u.username || "user").split(" ")[0]}
                      </Link>
                      {i < Math.min(followerPreview.length, 2) - 1 && <span>, </span>}
                    </span>
                  ))}
                  {stats.followers > 2 && (
                    <span> and <span className="font-semibold text-foreground">{stats.followers - 2} others</span></span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Not followed by anyone you know yet.</p>
            )}
          </div>

          <div className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map((t) => {
              const Icon = TAB_ICONS[t];
              return (
                <button key={t} onClick={() => setTab(t)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition ${tab===t ? "border-[#d4580a] text-[#d4580a]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {Icon && <Icon className="h-4 w-4" />}
                  {displayTabLabel(t, publicPreview)}
                </button>
              );
            })}
          </div>

          <div className="py-8">
            {tab === "My Tickets" ? (
              <MyTicketsTab />
            ) : tab === "My Pages" ? (
              <MyPagesTab profile={profile} isArtist={isArtist} />
            ) : tab === "Memberships" ? (
              profile ? <PersonMembershipsTab userId={profile.id} isSelf /> : null
            ) : tab === "My Stories" ? (
              profile ? <MyWritingsTab userId={profile.id} /> : null
            ) : tab === "Saved" ? (
              <SavedTab />
            ) : tab === "Attending" ? (
              <AttendingTab />
            ) : tab === "Organized" ? (
              profile ? <ArtistEventsTab userId={profile.id} /> : null
            ) : tab === "My Dashboard" ? (
              <MyDashboardTab isAdmin={isAdmin} isArtist={isArtist} />
            ) : tab === "Payouts" ? (
              <StripeTab />
            ) : (["Studio","Series","Gallery","Talk","CV/Bio"].includes(tab)) ? (
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
            ) : tab === "Contact" ? (
              <ArtistBookCollaborateTab profile={profile} />
            ) : tab === "Invite" ? (
              <ArtistInviteTab profile={profile} />
            ) : tab === "Events" ? (
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
            ) : tab === "About" ? (
              <AboutTab profile={profile} canEdit={!publicPreview} showEmail={!publicPreview} />
            ) : (
              (tab === "Posts") ? (
                myPosts.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    No posts yet. Share something with the community!
                  </div>
                ) : (
                  (
                    <div className="grid grid-cols-3 gap-2">
                      {myPosts.map((p, idx) => {
                        const media: string[] = (p.media_urls && p.media_urls.length)
                          ? p.media_urls
                          : [p.image_url, p.video_url].filter(Boolean);
                        const thumb = media[0] || null;
                        const isVideo = thumb ? /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(thumb) : false;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPostViewerIdx(idx)}
                            className="relative aspect-square overflow-hidden rounded-md bg-neutral-100 group"
                          >
                            {thumb ? (
                              isVideo ? (
                                <SmartVideo src={thumb} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                              ) : (
                                <Img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                              )
                            ) : (
                              <div
                                className="flex h-full w-full items-center justify-center p-3 text-center text-[11px] font-medium leading-tight text-foreground"
                                style={p.bg_color ? { background: p.bg_color, color: p.text_color || "#fff" } : undefined}
                              >
                                <span className="line-clamp-6">{p.content || "Post"}</span>
                              </div>
                            )}
                            {media.length > 1 && (
                              <div className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                1/{media.length}
                              </div>
                            )}
                            {isVideo && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="rounded-full bg-black/50 p-2 text-white">
                                  <Play className="h-5 w-5 fill-current" />
                                </div>
                              </div>
                            )}
                            {!publicPreview && (
                              <span
                                role="button"
                                tabIndex={0}
                                title={p.is_pinned ? "Unpin" : "Pin to top"}
                                onClick={(e) => { e.stopPropagation(); void handleTogglePin(p.id, !p.is_pinned); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); void handleTogglePin(p.id, !p.is_pinned); } }}
                                className="absolute left-1.5 top-1.5 rounded-full bg-white/90 p-1 text-foreground shadow hover:bg-white"
                              >
                                {p.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                              </span>
                            )}
                          </button>
                        );
                      })}
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
      </>
      )}
      <MessageFollowersModal open={msgOpen} onClose={() => setMsgOpen(false)} />
      <ShareToUsersDialog
        open={shareInAppOpen}
        onClose={() => setShareInAppOpen(false)}
        url={siteUrl(`/u/${profile?.username ?? ""}`)}
        title={profile?.display_name || profile?.username || "Profile"}
      />
      <ExternalShareDialog
        open={shareExternalOpen}
        onClose={() => setShareExternalOpen(false)}
        url={siteUrl(`/u/${profile?.username ?? ""}`)}
        title={`${profile?.display_name || profile?.username || "Profile"} on Planet Baltimore`}
      />
      <InviteFriendsDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        inviteUrl={siteUrl(`/u/${profile?.username ?? ""}`)}
      />
      <ReferralNetworkDialog
        open={referralOpen}
        onClose={() => setReferralOpen(false)}
        profile={profile}
      />
      {purchase === "success" && <PurchaseConfirmation sessionId={purchaseSessionId} />}

      {postViewerIdx !== null && myPosts[postViewerIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPostViewerIdx(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 sm:p-6"
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
          {myPosts.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPostViewerIdx((i) => (i === null ? null : (i - 1 + myPosts.length) % myPosts.length)); }}
                aria-label="Previous post"
                className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-4 sm:inline-flex"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPostViewerIdx((i) => (i === null ? null : (i + 1) % myPosts.length)); }}
                aria-label="Next post"
                className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-4 sm:inline-flex"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          {/* Desktop: single post with left/right arrow navigation */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="hidden w-full max-w-6xl overflow-hidden rounded-2xl bg-background shadow-2xl sm:block"
          >
            <div className="max-h-[92vh] overflow-y-auto">
              <PostSplitView
                postId={myPosts[postViewerIdx].id}
                meId={profile?.id}
                onDeleted={() => { handleDeleteMyPost(myPosts[postViewerIdx].id); setPostViewerIdx(null); }}
              />
            </div>
          </div>
          {/* Mobile: vertical scrollable feed of all posts, snapped */}
          <MobilePostFeed
            posts={myPosts}
            startIndex={postViewerIdx}
            meId={profile?.id}
            onIndexChange={setPostViewerIdx}
            onDeleted={(id) => { handleDeleteMyPost(id); }}
          />
          {myPosts.length > 1 && (
            <div className="absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white sm:block">
              {postViewerIdx + 1} / {myPosts.length}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function MobilePostFeed({
  posts,
  startIndex,
  meId,
  onIndexChange,
  onDeleted,
}: {
  posts: any[];
  startIndex: number;
  meId?: string | null;
  onIndexChange: (i: number) => void;
  onDeleted: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const didInitialScroll = useRef(false);

  useEffect(() => {
    if (didInitialScroll.current) return;
    const el = itemRefs.current[startIndex];
    if (el) {
      el.scrollIntoView({ block: "start" });
      didInitialScroll.current = true;
    }
  }, [startIndex]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const mid = scroller.scrollTop + scroller.clientHeight / 2;
        let bestIdx = 0;
        let bestDist = Infinity;
        itemRefs.current.forEach((el, i) => {
          if (!el) return;
          const c = el.offsetTop + el.offsetHeight / 2;
          const d = Math.abs(c - mid);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        });
        onIndexChange(bestIdx);
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [onIndexChange]);

  return (
    <div
      ref={scrollerRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-0 z-10 h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-contain bg-background sm:hidden"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {posts.map((p, i) => (
        <div
          key={p.id}
          ref={(el) => { itemRefs.current[i] = el; }}
          className="min-h-full snap-start border-b border-border"
        >
          <PostSplitView
            postId={p.id}
            meId={meId}
            onDeleted={() => onDeleted(p.id)}
          />
        </div>
      ))}
      <div className="pointer-events-none fixed bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
        {Math.min(startIndex + 1, posts.length)} / {posts.length}
      </div>
    </div>
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
          <ImageUpload value={form.media_url} onChange={(url) => setForm({ ...form, media_url: url })} label="Upload artwork photo" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm">Cancel</button>
            <button onClick={add} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Save</button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No artwork yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((it) => (
            <div key={it.id} className="group relative overflow-hidden rounded-lg bg-muted">
              {it.media_url && <Img src={it.media_url} alt={it.title ?? ""} className="w-full h-auto object-cover" loading="lazy" />}
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
          {s.media_url && <Img src={s.media_url} alt={s.title} className="w-full h-56 object-cover" />}
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
              <ImageUpload value={itemForm.media_url} onChange={(url) => setItemForm({ ...itemForm, media_url: url })} label="Upload piece photo" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kids.map((k) => (
              <div key={k.id} className="group relative overflow-hidden rounded-2xl border border-border">
                {k.media_url && <Img src={k.media_url} alt={k.title ?? ""} className="w-full h-64 object-cover" />}
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
          <ImageUpload value={seriesForm.media_url} onChange={(url) => setSeriesForm({ ...seriesForm, media_url: url })} label="Upload cover photo (optional)" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setAddingSeries(false)} className="rounded-full px-4 py-2 text-sm">Cancel</button>
            <button onClick={addSeries} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Create series</button>
          </div>
        </div>
      )}
      {series.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No series yet. Create one to group related pieces.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {series.map((s) => {
            const count = items.filter((i) => i.parent_id === s.id).length;
            return (
              <button key={s.id} onClick={() => setOpenId(s.id)}
                className="text-left rounded-2xl border border-border overflow-hidden hover:shadow-md transition">
                {s.media_url && <Img src={s.media_url} alt={s.title} className="w-full h-48 object-cover" />}
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
    ? siteUrl(`/u/${profile.username}`)
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
      {e.image_url && <SmartImage src={e.image_url} alt={e.title} bucket="event-images" className="w-full h-56 object-cover" />}
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

/**
 * Shown when Stripe sends the buyer back after a paid checkout. Stripe's own
 * redirect is silent, so without this the purchase looked like it vanished.
 * It confirms the order with Stripe (in case the webhook is slow or missed),
 * which also triggers the receipt email, then links straight to the ticket.
 */
function PurchaseConfirmation({ sessionId }: { sessionId?: string }) {
  const reconcile = useServerFn(reconcileMyTickets);
  const [open, setOpen] = useState(true);
  const [state, setState] = useState<"working" | "done" | "pending">("working");
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reconcile({ data: sessionId ? { sessionId } : {} });
      } catch { /* webhook may have already handled it */ }
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return;
      let q = supabase
        .from("tickets")
        .select("id, status")
        .eq("buyer_id", uid)
        .order("created_at", { ascending: false })
        .limit(1);
      if (sessionId) q = q.eq("stripe_checkout_session_id", sessionId);
      const { data } = await q;
      if (cancelled) return;
      const row = data?.[0];
      setTicketId(row?.id ?? null);
      setState(row?.status === "paid" ? "done" : "pending");
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-background p-6 text-center shadow-xl">
        {state === "working" ? (
          <>
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-[#d4580a]" />
            <h2 className="text-lg font-bold">Confirming your purchase…</h2>
            <p className="mt-1 text-sm text-muted-foreground">Hang tight, this only takes a second.</p>
          </>
        ) : state === "done" ? (
          <>
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-600" />
            <h2 className="text-lg font-bold">You're in! Ticket confirmed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your receipt and ticket PDF are on the way by email. You can also open your ticket right here.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              {ticketId && (
                <Link to="/tickets/$ticketId" params={{ ticketId }} className="rounded-full bg-[#d4580a] px-4 py-2.5 text-sm font-semibold text-white">
                  View my ticket
                </Link>
              )}
              <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold">
                Back to My Tickets
              </button>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="mx-auto mb-3 h-12 w-12 text-amber-500" />
            <h2 className="text-lg font-bold">Payment received, finishing up</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your bank confirmed the payment. The ticket will appear in My Tickets within a minute and we'll email your receipt.
            </p>
            <button onClick={() => setOpen(false)} className="mt-5 w-full rounded-full border border-border px-4 py-2.5 text-sm font-semibold">
              Close
            </button>
          </>
        )}
      </div>
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
  const reconcile = useServerFn(reconcileMyTickets);
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) { setLoading(false); return; }
      // Confirm any purchase Stripe already collected but the webhook missed,
      // which also triggers the receipt email.
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session_id") ?? undefined;
        const res = await reconcile({ data: sessionId ? { sessionId } : {} });
        if (res?.confirmed) toast.success("Purchase confirmed. Your receipt is on the way by email.");
      } catch { /* reconciliation is best-effort */ }
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
  // Several tickets for the same event are separate scannable passes.
  // Number them so a buyer can hand out "Ticket 2 of 3" without confusion.
  const totals = new Map<string, number>();
  for (const t of shown) totals.set(t.event_id, (totals.get(t.event_id) ?? 0) + 1);
  const seen = new Map<string, number>();
  const numbered = shown.map((t) => {
    const n = (seen.get(t.event_id) ?? 0) + 1;
    seen.set(t.event_id, n);
    const total = totals.get(t.event_id) ?? 1;
    return { t, seat: total > 1 ? `Ticket ${n} of ${total}` : null };
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {numbered.map(({ t, seat }) => (
            <TicketStub
              key={t.id}
              t={t}
              seat={seat}
              onCancelled={() => setTickets((prev) => prev.filter((x) => x.id !== t.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketStub({ t, seat, onCancelled }: { t: { id: string; buyer_total_cents: number; events: { title: string; starts_at: string; location: string | null; venue_name: string | null } | null }; seat?: string | null; onCancelled?: () => void }) {
  const when = t.events ? new Date(t.events.starts_at) : null;
  const [cancelling, setCancelling] = useState(false);
  const isFreeRsvp = (t.buyer_total_cents ?? 0) === 0;
  const upcoming = when ? when.getTime() >= Date.now() : false;

  const cancelRsvp = async () => {
    if (!window.confirm("Cancel this RSVP? Your spot will be released.")) return;
    setCancelling(true);
    const { error } = await supabase.rpc("cancel_my_rsvp", { _ticket_id: t.id });
    setCancelling(false);
    if (error) { toast.error(error.message || "Could not cancel this RSVP"); return; }
    void emailMyCancellation({ data: { ticketId: t.id } }).catch((err) => console.error("cancellation email failed", err));
    toast.success("RSVP cancelled");
    onCancelled?.();
  };

  return (
    <div className="space-y-2">
      <Link
        to="/tickets/$ticketId"
        params={{ ticketId: t.id }}
        className="group relative block overflow-hidden rounded-[26px] bg-neutral-950 text-white ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:ring-white/25"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#d4580a]/25 blur-3xl" />
        <div className="relative px-5 pb-4 pt-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/45">Planet Baltimore</span>
            {seat && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70 backdrop-blur">{seat}</span>
            )}
          </div>
          <h3 className="mt-2.5 line-clamp-2 text-[19px] font-semibold leading-snug tracking-tight">
            {t.events?.title ?? "Event"}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-white/70">
            <span className="rounded-full bg-white/[0.07] px-2.5 py-1">
              {when?.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
            <span className="rounded-full bg-white/[0.07] px-2.5 py-1">
              {when?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </span>
            <span className="max-w-full truncate rounded-full bg-white/[0.07] px-2.5 py-1">
              {t.events?.venue_name ?? t.events?.location ?? "TBA"}
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white" />
          <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white" />
          <div className="mx-5 border-t border-dashed border-white/15" />
        </div>

        <div className="relative flex items-center gap-3 px-5 py-4">
          <div className="rounded-xl bg-white p-1.5">
            <img
              alt="QR"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=0&data=${encodeURIComponent(t.id)}`}
              className="h-12 w-12"
            />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">Admit one</div>
            <div className="truncate font-mono text-[11px] uppercase tracking-widest text-white/70">#{t.id.slice(0, 8)}</div>
          </div>
          <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/70 transition group-hover:bg-white group-hover:text-neutral-900">
            View
          </span>
        </div>
      </Link>
      {isFreeRsvp && upcoming && (
        <button
          type="button"
          onClick={cancelRsvp}
          disabled={cancelling}
          className="w-full rounded-xl border border-neutral-200 py-2 text-xs font-semibold text-neutral-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
        >
          {cancelling ? "Cancelling…" : "Cancel RSVP"}
        </button>
      )}
    </div>
  );
}

function StripeTab() {
  const profile = useCurrentProfile();
  const ensureFn = useServerFn(ensureConnectAccount);
  const linkFn = useServerFn(createConnectOnboardingLink);
  const refreshFn = useServerFn(refreshConnectStatus);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; chargesEnabled: boolean; status?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.stripe_account_id) { setStatus({ connected: false, chargesEnabled: false }); return; }
    refreshFn().then((s) => setStatus(s)).catch(() => setStatus({
      connected: !!profile?.stripe_account_id,
      chargesEnabled: !!(profile as unknown as { stripe_charges_enabled?: boolean })?.stripe_charges_enabled,
    }));
  }, [profile?.id, profile?.stripe_account_id, refreshFn]);

  const onboard = async () => {
    const pre = openExternalWindow();
    setBusy(true);
    setErrorMsg(null);
    try {
      const account = await ensureFn();
      if (!account.ok) {
        setErrorMsg(account.message);
        toast.error(account.message);
        closeExternalWindow(pre);
        setBusy(false);
        return;
      }
      const { url } = await linkFn({ data: {
        returnUrl: `${window.location.origin}/settings?stripe=ok`,
        refreshUrl: `${window.location.origin}/settings?stripe=refresh`,
      }});
      navigateExternal(url, pre);
    } catch (e) {
      closeExternalWindow(pre);
      const msg = sanitizeErrorMessage(e, "Could not start onboarding");
      setErrorMsg(msg);
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Payouts</h2>
        <p className="text-sm text-muted-foreground">Set up your payout account so you can sell tickets and get paid directly to your bank. Planet Baltimore never holds your money.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 text-orange" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Your payout account</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {status?.chargesEnabled ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Connected & active
                </span>
              ) : status?.connected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <AlertCircle className="h-3.5 w-3.5" /> Onboarding incomplete
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  Not connected
                </span>
              )}
              <button onClick={onboard} disabled={busy}
                className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
                {busy ? "Opening secure form…" : status?.chargesEnabled ? "Update payout details" : "Set up payouts"} <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        {errorMsg ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <div className="font-semibold">We couldn't start payout setup</div>
            <div className="mt-1 whitespace-pre-wrap break-words">{errorMsg}</div>
            <div className="mt-2 text-xs">
              Email <a href="mailto:help@planetbaltimore.com" className="font-semibold underline">help@planetbaltimore.com</a> if this keeps happening and we'll get you set up.
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-foreground">
        <h4 className="mb-3 text-base font-semibold">How to set up payouts (3 minutes)</h4>
        <ol className="list-decimal space-y-3 pl-5 text-muted-foreground">
          <li><span className="font-semibold text-foreground">Tap "Set up payouts"</span> above. A secure form opens where you verify your identity.</li>
          <li><span className="font-semibold text-foreground">Enter your info.</span> You'll be asked for your legal name, date of birth, address, and the last 4 of your SSN. This is required by US law for anyone receiving money online. We never see this information.</li>
          <li><span className="font-semibold text-foreground">Add your bank account.</span> Choose the checking account where you want your money to land. Payouts arrive every 2 business days.</li>
          <li><span className="font-semibold text-foreground">Come back to Planet Baltimore.</span> You'll be sent back here automatically. The badge above turns green when you're ready to sell items on the platform.</li>
          <li><span className="font-semibold text-foreground">Create an event and set a price.</span> Enter the amount you want to net. We add the processing fee and the platform fee on top, so the buyer pays the total and you keep the full price you set. The total fee is the lowest in the industry.</li>
        </ol>
        <div className="mt-4 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
          Need help? Email <a href="mailto:help@planetbaltimore.com" className="font-semibold text-orange hover:underline">help@planetbaltimore.com</a> and we'll walk you through it over the phone.
        </div>
      </div>

      <Link to="/settings" hash="stripe" className="block rounded-2xl border border-border bg-card p-4 text-sm font-semibold text-foreground hover:bg-accent">
        Open full payout settings <ExternalLink className="ml-2 inline h-3.5 w-3.5 text-muted-foreground" />
      </Link>
    </div>
  );
}

function MyPagesTab({ profile, isArtist }: { profile: any; isArtist: boolean }) {
  const [orgs, setOrgs] = useState<any[]>([]);
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, slug, type, subtype, avatar_url, is_public")
        .eq("owner_id", profile.id);
      setOrgs(data ?? []);
    })();
  }, [profile?.id]);

  const toggleVisibility = async (orgId: string, next: boolean) => {
    setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, is_public: next } : o)));
    const { error } = await supabase.from("organizations").update({ is_public: next }).eq("id", orgId);
    if (error) {
      setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, is_public: !next } : o)));
      toast.error(sanitizeErrorMessage(error.message));
      return;
    }
    toast.success(next ? "Page is now public" : "Page is now private");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Organizations & Community Pages ({orgs.length})
        </h3>
        {orgs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
            You don't own any organization pages yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {orgs.map((o) => (
              <div
                key={o.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 hover:border-[#d4580a] hover:shadow-sm"
              >
                <a href={`/o/${o.slug}`} className="group flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <SmartAvatarImage src={o.avatar_url ?? undefined} />
                    <AvatarFallback>{o.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-neutral-900">{o.name}</div>
                    <div className="truncate text-xs uppercase tracking-wider text-neutral-500">
                      {[o.type, o.subtype].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-neutral-400 group-hover:text-[#d4580a]" />
                </a>
                <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    {o.is_public === false ? <LockIcon className="h-3.5 w-3.5" /> : <GlobeIcon className="h-3.5 w-3.5" />}
                    <span>{o.is_public === false ? "Private (only you can see it)" : "Public"}</span>
                  </div>
                  <Switch
                    checked={o.is_public !== false}
                    onCheckedChange={(v: boolean) => void toggleVisibility(o.id, v)}
                    aria-label="Toggle page visibility"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MyWritingsTab({ userId }: { userId: string }) {
  const [publishing, setPublishing] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ id: string; title: string; excerpt: string | null; cover_url: string | null; created_at: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("stories")
        .select("id,title,excerpt,cover_url,created_at,status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      setRows((data ?? []) as never);
      setLoading(false);
    };
    void load();
    const onFocus = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [userId]);
  const publish = async (id: string) => {
    setPublishing(id);
    const { error } = await supabase.from("stories").update({ status: "published" }).eq("id", id);
    setPublishing(null);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "published" } : r)));
    toast.success("Story published");
  };

  const header = (
    <div className="mx-auto mb-4 flex w-full max-w-6xl items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">{rows.length} {rows.length === 1 ? "story" : "stories"}</div>
      <Link to="/create-story" className="inline-flex items-center rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8480a]">Write a story</Link>
    </div>
  );

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading writings…</div>;
  if (rows.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        {header}
        <div className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
          <div className="text-sm text-muted-foreground">You haven't written any stories yet.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 max-w-6xl mx-auto w-full">
      {header}
      {rows.map((s) => (
        <Link key={s.id} to="/stories/$storyId" params={{ storyId: s.id }} className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-md">
          {s.cover_url && (
            <SmartImage src={s.cover_url} alt={s.title} bucket="story-covers" className="h-24 w-40 shrink-0 object-cover sm:h-28 sm:w-56" />
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3 sm:p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.status === "published" ? "Published" : "Draft"} · {new Date(s.created_at).toLocaleDateString()}</div>
            <div className="font-bold leading-tight line-clamp-1">{s.title}</div>
            {s.excerpt && <p className="text-sm text-muted-foreground line-clamp-2">{s.excerpt}</p>}
          </div>
          {s.status !== "published" && (
            <div className="flex items-center pr-3 sm:pr-4">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); void publish(s.id); }}
                disabled={publishing === s.id}
                className="rounded-full bg-[#d4580a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#b8480a] disabled:opacity-60"
              >
                {publishing === s.id ? "Publishing…" : "Publish"}
              </button>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

function SavedTab() {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
      <Bookmark className="mx-auto h-8 w-8 text-neutral-400" />
      <div className="mt-3 text-sm text-muted-foreground">All of your saved posts, stories and events live here.</div>
      <Link to="/saved" className="mt-4 inline-block rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8480a]">Open Saved</Link>
    </div>
  );
}

function AttendingTab() {
  type Row = { id: string; event_id: string; events: { title: string; starts_at: string; location: string | null; venue_name: string | null; image_url: string | null } | null };
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) { setLoading(false); return; }
      const { data } = await supabase
        .from("tickets")
        .select("id,event_id,events(title,starts_at,location,venue_name,image_url)")
        .eq("buyer_id", uid)
        .eq("status", "paid");
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);
  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  const now = Date.now();
  const upcoming = rows.filter((r) => r.events && new Date(r.events.starts_at).getTime() >= now)
    .sort((a, b) => +new Date(a.events!.starts_at) - +new Date(b.events!.starts_at));
  if (upcoming.length === 0) return <div className="py-12 text-center text-muted-foreground">You aren't attending any upcoming events yet.</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {upcoming.map((r) => (
        <Link key={r.id} to="/events/$eventId" params={{ eventId: r.event_id }} className="block rounded-2xl border border-border overflow-hidden hover:shadow-md transition">
          {r.events?.image_url && <SmartImage src={r.events.image_url} alt={r.events.title} bucket="event-images" className="w-full h-40 object-cover" />}
          <div className="p-4 space-y-1.5">
            <div className="text-xs text-muted-foreground">
              {new Date(r.events!.starts_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {new Date(r.events!.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </div>
            <div className="font-bold leading-tight line-clamp-2">{r.events?.title}</div>
            {(r.events?.venue_name || r.events?.location) && <div className="text-xs text-muted-foreground">📍 {r.events?.venue_name ?? r.events?.location}</div>}
          </div>
        </Link>
      ))}
    </div>
  );
}

function MyDashboardTab({ isAdmin, isArtist }: { isAdmin: boolean; isArtist: boolean }) {
  const links: Array<{ to: string; label: string; desc: string }> = [
    { to: "/organizer-studio", label: "Organizer Studio", desc: "Manage events, tickets and payouts." },
    { to: "/promoter-dashboard", label: "Promoter Dashboard", desc: "Track ticket sales and event performance." },
    { to: "/saved", label: "Saved", desc: "Everything you've bookmarked." },
  ];
  if (isAdmin) links.unshift({ to: "/admin/trash", label: "Admin Trash", desc: "Restore or purge deleted content." });
  void isArtist;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {links.map((l) => (
        <Link
          key={l.label}
          to={l.to}
          className="group flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 hover:border-[#d4580a] hover:shadow-sm"
        >
          <div className="min-w-0">
            <div className="font-semibold text-neutral-900">{l.label}</div>
            <div className="truncate text-xs text-muted-foreground">{l.desc}</div>
          </div>
          <ExternalLink className="h-4 w-4 text-neutral-400 group-hover:text-[#d4580a]" />
        </Link>
      ))}
    </div>
  );
}
function AboutTab({ profile, canEdit, showEmail }: { profile: any; canEdit: boolean; showEmail: boolean }) {
  const userId: string | undefined = profile?.id;
  const [longAbout, setLongAbout] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aboutRowId, setAboutRowId] = useState<string | null>(null);
  const [cv, setCv] = useState<{ id: string; url: string; name: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("profile_sections")
        .select("id,kind,body,media_url,title")
        .eq("user_id", userId)
        .in("kind", ["about_long", "cv"]);
      const a = (data ?? []).find((r: any) => r.kind === "about_long");
      const c = (data ?? []).find((r: any) => r.kind === "cv");
      if (a) { setAboutRowId(a.id as string); setLongAbout((a.body as string) ?? ""); setDraft((a.body as string) ?? ""); }
      if (c?.media_url) setCv({ id: c.id as string, url: c.media_url as string, name: (c.title as string) || "CV" });
      setLoaded(true);
    })();
  }, [userId]);

  const saveAbout = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      if (aboutRowId) {
        const { error } = await supabase.from("profile_sections").update({ body: draft }).eq("id", aboutRowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("profile_sections")
          .insert({ user_id: userId, kind: "about_long", body: draft, order_index: 0 })
          .select("id")
          .single();
        if (error) throw error;
        setAboutRowId(data.id as string);
      }
      setLongAbout(draft);
      setEditing(false);
      toast.success("About saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const saveCv = async (url: string, name?: string) => {
    if (!userId) return;
    if (!url) {
      if (cv) await supabase.from("profile_sections").delete().eq("id", cv.id);
      setCv(null);
      return;
    }
    if (cv) {
      const { error } = await supabase.from("profile_sections").update({ media_url: url, title: name ?? "CV" }).eq("id", cv.id);
      if (error) { toast.error(error.message); return; }
      setCv({ ...cv, url, name: name ?? "CV" });
    } else {
      const { data, error } = await supabase
        .from("profile_sections")
        .insert({ user_id: userId, kind: "cv", media_url: url, title: name ?? "CV", order_index: 0 })
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }
      setCv({ id: data.id as string, url, name: name ?? "CV" });
    }
    toast.success("CV saved");
  };

  const rows: Array<{ label: string; value: string | null }> = [
    { label: "Name", value: profile?.display_name || null },
    { label: "Username", value: profile?.username ? `@${profile.username}` : null },
    { label: "Neighborhood", value: profile?.neighborhood || null },
    { label: "City", value: profile?.city || null },
    { label: "Email", value: showEmail ? profile?.email || null : null },
    { label: "Website", value: profile?.website || null },
  ].filter((r) => !!r.value);
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">About</h3>
          {canEdit && loaded && !editing && (
            <button onClick={() => { setDraft(longAbout); setEditing(true); }} className="text-xs font-semibold text-[#d4580a] hover:underline">
              {longAbout ? "Edit" : "Add about"}
            </button>
          )}
        </div>
        {editing ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={12}
              placeholder="Write your full story here. This can be much longer than your short bio."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#d4580a] focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="rounded-full px-4 py-2 text-sm">Cancel</button>
              <button onClick={saveAbout} disabled={saving} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
            {longAbout || (canEdit ? "Nothing here yet. Add a longer about section." : "No about yet.")}
          </p>
        )}
      </div>

      {(canEdit || cv) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">CV / Resume</h3>
          {canEdit ? (
            <FileUpload value={cv?.url ?? ""} fileName={cv?.name} onChange={(url, name) => void saveCv(url, name)} label="Upload your CV (PDF, DOC, etc.)" />
          ) : (
            <a href={cv!.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#d4580a] hover:underline">
              {cv!.name || "View CV"}
            </a>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Details</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label}>
                <dt className="text-xs text-muted-foreground">{r.label}</dt>
                <dd className="break-all text-sm font-medium text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
