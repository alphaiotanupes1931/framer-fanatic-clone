import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { ImageUpload } from "@/components/shared/image-upload";
import { FileUpload } from "@/components/shared/file-upload";
import { useUserRole } from "@/hooks/use-user-role";
import {
  Globe, Phone, Mail, MapPin, Clock, Plus, Trash2, ExternalLink, Send,
  ArrowLeft, Users, Camera, Pencil, Bell, VolumeX, Volume2, Star,
  Megaphone, Calendar as CalendarIcon, MessageCircle, BarChart3, Image as ImageIcon,
  Folder, Briefcase, Trophy, FileText, UserPlus, MessageSquare, List,
  ChevronLeft, ChevronRight, Heart, DollarSign,
  Loader2, ImagePlus, Video as VideoIcon, Type as TypeIcon, X,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { tabsForArtist, type ArtistTab } from "@/lib/artist-tabs";
import { StoreTab } from "@/components/org/store-tab";
import { OrgStoriesTab } from "@/components/org/org-stories-tab";
import { MessageAllButton } from "@/components/message-all-button";
import { PriceItemsSection } from "@/components/org/price-items-section";
import { DuesTab } from "@/components/org/dues-tab";
import { PollsTab } from "@/components/org/polls-tab";
import { DocumentsTab } from "@/components/org/documents-tab";
import { BoardTab } from "@/components/org/board-tab";
import { ArtistsTab } from "@/components/org/artists-tab";
import { EventImage } from "@/components/event-image";
import { OpportunitiesTab } from "@/components/org/opportunities-tab";
import { TextDocTab } from "@/components/org/text-doc-tab";
import { CvBioTab } from "@/components/org/cv-bio-tab";
import { ContactTab } from "@/components/org/contact-tab";
import { GalleryTab } from "@/components/org/gallery-tab";
import { MusicTab } from "@/components/org/music-tab";
import { OrgVideosTab } from "@/components/org/org-videos-tab";
import { EpkTab } from "@/components/org/epk-tab";
import { PodcastEpisodesTab } from "@/components/artist/podcast-episodes-tab";
import { GuestsTab } from "@/components/org/guests-tab";
import { SponsorsTab } from "@/components/org/sponsors-tab";
import { VotingTab } from "@/components/org/voting-tab";
import { DiscussionTab } from "@/components/org/discussion-tab";
import { InviteFriendsDialog } from "@/components/invite-friends-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Img, SmartFileLink, SmartVideo } from "@/components/shared/smart-img";
import { ShareButtons } from "@/components/shared/share-buttons";
import { timeAgo } from "@/lib/text-utils";
import { STORED_URL_TTL, compressImage } from "@/lib/image-compress";
import { notifyGroupJoinRequest } from "@/lib/group-requests.functions";

export const Route = createFileRoute("/o/$slug")({
  component: OrgProfile,
  head: () => ({ meta: [{ title: "Organization - Planet Baltimore" }] }),
});

type Org = {
  id: string; owner_id: string; type: string; subtype: string | null;
  name: string; slug: string; bio: string | null; website: string | null;
  phone: string | null; email: string | null; address: string | null;
  neighborhood: string | null; avatar_url: string | null; banner_url: string | null;
  hours: Record<string, { open: string; close: string } | null> | null;
  bylaws?: string | null;
  rules?: string | null;
};

type OrgPost = {
  id: string; org_id: string; kind: "opportunity" | "press" | "update";
  title: string; body: string | null; link_url: string | null; media_url: string | null;
  video_url?: string | null; media_urls?: string[] | null;
  bg_color?: string | null; text_color?: string | null; font_size?: string | null;
  availability?: string | null;
  created_at: string;
};

const DEFAULT_TABS = ["About", "Events", "Opportunities", "Press", "Updates", "Comments"] as const;
const ASSOC_TABS = [
  "Posts", "Events", "Members", "Threads",
  "Polls", "Jobs", "Leaderboard", "Rules", "Invite",
] as const;
const COMMUNITY_ASSOC_TABS = [
  "Posts", "Events", "Polls", "Voting", "Minutes", "Members", "Board", "By Laws", "Invite", "Comments", "About", "Dues",
] as const;
const RESTAURANT_TABS = [
  "Posts", "Menu", "Stories", "Events", "Promotions", "Reviews", "About", "Comments", "Invite",
] as const;
const SERVICE_TABS = [
  "Posts", "Services", "Stories", "Events", "Promotions", "Reviews", "About", "Comments", "Invite",
] as const;
const ARTS_ORG_TABS = [
  "Posts", "Events", "Artists", "Exhibitions", "Support", "Opportunities", "Press", "Invite", "About", "Comments",
] as const;
// Resident / Visitor pages are lightweight personal pages.
const PERSON_PAGE_TABS = [
  "Posts", "Stories", "Events", "About", "Comments", "Invite",
] as const;
const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Posts: List, Announcements: Megaphone, Events: CalendarIcon, Calendar: CalendarIcon,
  Members: Users, Threads: MessageCircle, Polls: BarChart3, Gallery: ImageIcon,
  Resources: Folder, Jobs: Briefcase, Leaderboard: Trophy, Rules: FileText,
  Invite: UserPlus, Comments: MessageSquare, About: FileText, Requests: UserPlus,
  Opportunities: Briefcase, Press: Megaphone, Updates: Bell, Voting: BarChart3,
  Minutes: FileText, Board: Users, "By Laws": FileText,
  Menu: List, Feed: List, Stories: Camera, Promotions: Star, Reviews: Star, Services: Briefcase,
  Artists: Users, Support: Heart, Exhibition: ImageIcon, Exhibitions: ImageIcon, Dues: DollarSign,
};
type Tab = string;

function OrgProfile() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [me, setMe] = useState<string | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [tab, setTab] = useState<Tab>("Posts");
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [memberStatus, setMemberStatus] = useState<"none" | "pending" | "approved">("none");
  const [pendingCount, setPendingCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [editAbout, setEditAbout] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<null | "avatar_url" | "banner_url">(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMe(data.session?.user.id ?? null));
  }, []);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("organizations").select("*").eq("slug", slug).maybeSingle();
      setOrg(data as Org | null);
      const o = data as Org | null;
      const sub = (o?.subtype ?? "").toLowerCase();
      const isBiz = o?.type !== "community_assoc" && o?.type !== "group" && o?.type !== "arts_org" && o?.type !== "artist";
      const foodLike = /restaurant|cafe|coffee|bakery|bar|food|eat|diner|deli|pizz|grill|kitchen|brunch/.test(sub);
      if (isBiz && foodLike) setTab("Menu");
      else if (isBiz) setTab("Services");
    })();
  }, [slug]);
  useEffect(() => {
    if (!org || !me) { setJoined(false); setMemberStatus("none"); return; }
    (async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("user_id, status")
        .eq("organization_id", org.id)
        .eq("user_id", me)
        .maybeSingle();
      const row = data as { status?: string | null } | null;
      setJoined(!!row);
      setMemberStatus(!row ? "none" : row.status === "pending" ? "pending" : "approved");
    })();
  }, [org, me]);
  useEffect(() => {
    if (!org || org.type !== "group") return;
    (async () => {
      const { count } = await supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .eq("status", "pending");
      setPendingCount(count ?? 0);
    })();
  }, [org]);
  useEffect(() => {
    if (!org) return;
    (async () => {
      const { count } = await supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .eq("status", "approved");
      setMemberCount(count ?? 0);
    })();
  }, [org, joined]);
  useEffect(() => {
    if (!org) return;
    setMuted(localStorage.getItem(`pb_muted_org_${org.id}`) === "1");
    // Deep links like /o/slug?tab=Polls open straight on that tab so shared
    // polls and votes land where people expect.
    const wanted = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tab")
      : null;
    setTab(wanted || "Posts");
  }, [org]);
  if (!org) return <AppLayout title="" hero={false}><div className="py-20 text-center text-muted-foreground">Loading…</div></AppLayout>;

  const isOwner = !!me && me === org.owner_id;
  const canManage = isOwner || isAdmin;
  const isAssoc = org.type === "community_assoc";
  const isGroup = org.type === "group";
  const isArtist = org.type === "artist";
  const isArtsOrg = org.type === "arts_org" || isArtist;
  const isPersonPage = org.type === "resident" || org.type === "visitor";
  const isBusiness = !isAssoc && !isGroup && !isArtsOrg && !isPersonPage;
  const subLower = (org.subtype ?? "").toLowerCase();
  const isRestaurant = isBusiness && /restaurant|cafe|coffee|bakery|bar|food|eat|diner|deli|pizz|grill|kitchen|brunch/.test(subLower);
  const isService = isBusiness && !isRestaurant;
  // Artist pages are standalone: their tab set comes from the artist category
  // and every tab reads only this page's own content.
  const artistTabs: ArtistTab[] = isArtist ? tabsForArtist(org.subtype, "artist") : [];
  const artistIcons: Record<string, React.ComponentType<{ className?: string }>> = {};
  for (const t of artistTabs) artistIcons[t.label] = t.Icon;
  const TABS: readonly string[] = isPersonPage
    ? PERSON_PAGE_TABS
    : isArtist
    ? artistTabs.map((t) => t.label)
    : isArtsOrg
    ? // The Artists roster is always visible; it shows an empty state until
      // the org adds someone.
      ARTS_ORG_TABS
    : isRestaurant
    ? RESTAURANT_TABS
    : isService
    ? SERVICE_TABS
    : isAssoc
    ? COMMUNITY_ASSOC_TABS
    : ASSOC_TABS;
  const VISIBLE_TABS: readonly string[] =
    isGroup && canManage ? ["Requests", ...TABS] : TABS;

  const handleFileUpload = async (field: "avatar_url" | "banner_url", file: File) => {
    file = await compressImage(file);
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }
    setUploading(field);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Sign in first");
      const path = `${uid}/org-${org.id}-${field}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from("avatars").createSignedUrl(path, STORED_URL_TTL);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("Could not sign URL");
      const url = signed.signedUrl;
      const patch = { [field]: url } as Partial<Org>;
      const { error } = await supabase.from("organizations").update(patch).eq("id", org.id);
      if (error) throw error;
      setOrg({ ...org, [field]: url });
      toast.success("Updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (next) localStorage.setItem(`pb_muted_org_${org.id}`, "1");
    else localStorage.removeItem(`pb_muted_org_${org.id}`);
    toast.success(next ? "Muted" : "Unmuted");
  };

  const toggleJoin = async () => {
    if (!me) { toast.error("Please sign in first"); return; }
    setJoining(true);
    try {
      if (joined) {
        const { error } = await supabase.from("organization_members").delete()
          .eq("organization_id", org.id).eq("user_id", me);
        if (error) throw error;
        setJoined(false);
        setMemberStatus("none");
        toast.success(memberStatus === "pending" ? "Request cancelled" : `Left ${org.name}`);
      } else {
        const pending = isGroup;
        const { error } = await supabase.from("organization_members")
          .insert({ organization_id: org.id, user_id: me, status: pending ? "pending" : "approved" });
        if (error) throw error;
        setJoined(true);
        setMemberStatus(pending ? "pending" : "approved");
        if (pending) {
          void notifyGroupJoinRequest({ data: { organizationId: org.id } }).catch(() => {});
        }
        toast.success(pending
          ? "Request sent. The group creator will review it."
          : `${isAssoc ? "Joined" : "Following"} ${org.name}`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setJoining(false);
    }
  };

  return (
    <AppLayout title="" hero={false}>
      <button
        onClick={() => (window.history.length > 1 ? window.history.back() : navigate({ to: "/dashboard" }))}
        aria-label="Back"
        className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Hidden file inputs for uploads */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload("avatar_url", f); e.target.value = ""; }}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload("banner_url", f); e.target.value = ""; }}
      />

      {/* Banner with floating actions */}
      <div
        className="relative h-44 overflow-hidden rounded-2xl sm:h-60"
        style={
          org.banner_url
            ? { backgroundImage: `url(${org.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: "#d40a0a" }
        }
      >
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploading === "banner_url"}
              className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/80"
            >
              <Camera className="h-3.5 w-3.5" /> {uploading === "banner_url" ? "Uploading…" : "Edit banner"}
            </button>
          )}
        </div>
      </div>

      {/* Avatar overlapping banner + inline action buttons */}
      <div className="relative flex items-end justify-between gap-3 px-1 sm:px-2">
        <div className="relative -mt-8 inline-block shrink-0">
          <div className="h-20 w-20 overflow-hidden rounded-xl border-4 border-white bg-neutral-200 shadow-sm">
            {org.avatar_url && (
              <Img src={org.avatar_url} alt={org.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            )}
          </div>
          {canManage && (
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploading === "avatar_url"}
              aria-label="Edit avatar"
              className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white hover:bg-black/85"
            >
              <Camera className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 pb-1">
          {canManage && (
            <button
              onClick={() => { setTab("About"); setEditAbout(true); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"
            >
              <Pencil className="h-4 w-4" /> Edit Profile
            </button>
          )}
          {(!isGroup || canManage) && (
          <MessageAllButton
            label="Message All"
            audienceLabel={`${org.name} members`}
            defaultGroupName={`${org.name} group chat`}
            loadCandidates={async () => {
              const { data: mem } = await supabase
                .from("organization_members")
                .select("user_id,status")
                .eq("organization_id", org.id)
                .or("status.eq.approved,status.is.null");
              const { data: fol } = await supabase
                .from("organization_followers")
                .select("user_id")
                .eq("organization_id", org.id);
              const ids = [
                ...((mem ?? []) as { user_id: string }[]).map((r) => r.user_id),
                ...((fol ?? []) as { user_id: string }[]).map((r) => r.user_id),
              ];
              if (org.owner_id) ids.push(org.owner_id);
              const unique = Array.from(new Set(ids));
              if (unique.length === 0) return [];
              const { data: profs } = await supabase
                .rpc("public_profiles_by_ids", { _ids: unique });
              const rows = (profs ?? []) as { id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood: string | null }[];
              return rows.map((p) => ({
                id: p.id,
                display_name: p.display_name,
                username: p.username,
                avatar_url: p.avatar_url,
                subtitle: p.neighborhood || "Member",
              }));
            }}
          />
          )}
          <ShareButtons
            path={`/o/${org.slug}`}
            title={org.name}
            size="sm"
            buttonClassName="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white p-2 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"
            preview={{
              type: "organization",
              id: org.slug,
              url: `/o/${org.slug}`,
              title: org.name,
              excerpt: org.bio || null,
              image: org.banner_url || org.avatar_url || null,
            }}
          />
          {isGroup && isOwner ? (
            <span
              className="inline-flex select-none items-center gap-1.5 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-orange-700"
              title="You are the creator of this group"
            >
              <Users className="h-4 w-4" /> Creator
            </span>
          ) : (
            <button
              onClick={toggleJoin}
              disabled={joining}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-60 ${joined ? "border border-neutral-200 bg-neutral-100 text-neutral-700" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}
            >
              <Users className="h-4 w-4" />{" "}
              {isGroup
                ? memberStatus === "approved" ? "Joined" : memberStatus === "pending" ? "Request pending" : "Request to join"
                : isAssoc ? (joined ? "Joined" : "Join") : (joined ? "Following" : "Follow")}
            </button>
          )}
        </div>
      </div>

      {/* Name + tagline + description + meta */}
      <div className="mt-3 px-1 sm:px-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold leading-tight text-neutral-900 sm:text-[26px]">{org.name}</h1>
          {isAssoc && (
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
              <Star className="h-3 w-3" /> Grant Founding
            </span>
          )}
        </div>
        {org.subtype && (
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
              {org.subtype
                .replace(/[_-]+/g, " ")
                .split(" ")
                .filter(Boolean)
                .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
                .join(" ")}
            </span>
          </div>
        )}
        {org.bio && (
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-neutral-700">{org.bio}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500">
          <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {memberCount} {memberCount === 1 ? "member" : "members"}</span>
          {org.website && (
            <>
              <span className="text-neutral-300">·</span>
              <a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-[#d4580a]"><Globe className="h-4 w-4" /> Website</a>
            </>
          )}
          {org.neighborhood && (
            <>
              <span className="text-neutral-300">·</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {org.neighborhood}</span>
            </>
          )}
          {org.email && (
            <>
              <span className="text-neutral-300">·</span>
              <a href={`mailto:${org.email}`} className="inline-flex items-center gap-1.5 hover:text-[#d4580a]"><Mail className="h-4 w-4" /> {org.email}</a>
            </>
          )}
          {org.phone && (
            <>
              <span className="text-neutral-300">·</span>
              <a href={`tel:${org.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#d4580a]"><Phone className="h-4 w-4" /> {org.phone}</a>
            </>
          )}
        </div>

        {/* Secondary admin actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              onClick={async () => {
                if (!confirm("Delete this page?")) return;
                const { error } = await supabase.from("organizations").delete().eq("id", org.id);
                if (error) return toast.error(error.message);
                toast.success("Deleted");
                navigate({ to: "/dashboard" });
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d4580a]/40 bg-white px-4 py-1.5 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"
            >
              <Trash2 className="h-4 w-4" /> Delete Page {canManage && <span className="text-[10px] opacity-60">(Admin)</span>}
            </button>
          )}
          {me && (!isGroup || canManage) && (
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
          {VISIBLE_TABS.map((t) => {
            const active = tab === t;
            const Icon = artistIcons[t] ?? TAB_ICONS[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#d4580a] text-white shadow-sm"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {t}
                {t === "Requests" && pendingCount > 0 && (
                  <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white text-[#d4580a]" : "bg-[#d4580a] text-white"}`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="py-8">
          {isGroup && canManage && tab === "Requests" && (
            <GroupRequests orgId={org.id} onApproved={() => setMemberCount((c) => c + 1)} onCountChange={setPendingCount} />
          )}
          {isGroup && !canManage && memberStatus !== "approved" ? (
            <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-neutral-400" />
              <h2 className="mt-3 text-lg font-bold text-neutral-900">This group is members only</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {memberStatus === "pending"
                  ? "Your request is waiting for the group creator to approve it."
                  : "Request to join and the group creator will review your request."}
              </p>
              <button
                onClick={toggleJoin}
                disabled={joining}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {memberStatus === "pending" ? "Cancel request" : "Request to join"}
              </button>
            </div>
          ) : (
          <>
          {tab === "About" && (isArtsOrg
            ? <ArtsOrgAboutTab org={org} canManage={canManage} onChange={setOrg} />
            : <AboutTab org={org} canManage={canManage} onChange={setOrg} initialEdit={editAbout} onEditClose={() => setEditAbout(false)} />
          )}
          {tab === "Events" && <EventsTab orgId={org.id} canManage={canManage} />}
          {(tab === "Exhibitions" || tab === "Exhibition") && <ExhibitionsTab orgId={org.id} canManage={canManage} />}
          {tab === "Opportunities" && <OpportunitiesTab orgId={org.id} canManage={canManage} />}
          {tab === "Press" && <PressTab org={org} canManage={canManage} />}
          {tab === "Updates" && <OrgPostList orgId={org.id} kind="update" canManage={canManage} />}
          {tab === "Posts" && <OrgPostList orgId={org.id} kind={null} canManage={canManage} />}
          {tab === "Artists" && <ArtistsTab orgId={org.id} canManage={canManage} />}
          {tab === "Support" && <SupportTab org={org} canManage={canManage} />}
          {tab === "Menu" && (
            <div className="space-y-10">
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-neutral-900"><Star className="h-5 w-5 text-[#d4580a]" /> Today's Specials</h3>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 py-10 text-center text-sm text-neutral-500">No specials posted today.</div>
              </section>
              <section>
                <PriceItemsSection orgId={org.id} subtype={org.subtype} canManage={canManage} title="Menu" />
              </section>
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-neutral-900"><Megaphone className="h-5 w-5 text-[#d4580a]" /> Posts & Updates</h3>
                <OrgPostList orgId={org.id} kind={null} canManage={canManage} />
              </section>
            </div>
          )}
          {tab === "Feed" && <OrgPostList orgId={org.id} kind={null} canManage={canManage} />}
          {tab === "Services" && (
            <div className="space-y-10">
              <section>
                <PriceItemsSection orgId={org.id} subtype={org.subtype} canManage={canManage} title="Services & Pricing" />
              </section>
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-neutral-900"><Megaphone className="h-5 w-5 text-[#d4580a]" /> Posts & Updates</h3>
                <OrgPostList orgId={org.id} kind={null} canManage={canManage} />
              </section>
            </div>
          )}
          {tab === "Calendar" && <CalendarTab orgId={org.id} />}
          {tab === "Members" && <MembersTab orgId={org.id} />}
          {tab === "Leaderboard" && <MembersTab orgId={org.id} />}
          {tab === "Invite" && <InviteTab orgName={org.name} />}
          {tab === "Polls" && <PollsTab orgId={org.id} canManage={canManage} me={me} />}
          {tab === "Voting" && <VotingTab orgId={org.id} canManage={canManage} me={me} />}
          {(tab === "Minutes" || tab === "Resources") && (
            <DocumentsTab orgId={org.id} canManage={canManage} me={me} label="Document" />
          )}
          {tab === "By Laws" && (
            <DocumentsTab
              orgId={org.id} canManage={canManage} me={me}
              label="By Laws"
              docType="By Laws"
              emptyTitle="No bylaws uploaded yet."
              emptyHint="Upload your bylaws or governing documents as a PDF."
            />
          )}
          {tab === "Rules" && (
            <TextDocTab
              orgId={org.id} canManage={canManage} field="rules"
              title="Community Rules"
              emptyTitle="No rules posted yet."
              emptyHint="Click Edit to add community guidelines."
              initialValue={org.rules ?? null}
            />
          )}
          {tab === "Gallery" && <GalleryTab orgId={org.id} canManage={canManage} />}
          {(tab === "Announcements" || tab === "Promotions") && (
            <OrgPostList orgId={org.id} kind="update" canManage={canManage} />
          )}
          {tab === "Jobs" && <OpportunitiesTab orgId={org.id} canManage={canManage} />}
          {tab === "Stories" && <OrgStoriesTab orgId={org.id} canManage={canManage} />}
          {(tab === "Threads" || tab === "Reviews") && <DiscussionTab orgId={org.id} me={me} canManage={canManage} placeholder={tab === "Reviews" ? "Leave a review…" : "Start a thread…"} />}
          {tab === "Board" && <BoardTab orgId={org.id} canManage={canManage} />}
          {tab === "Comments" && <DiscussionTab orgId={org.id} me={me} canManage={canManage} placeholder="Leave a comment…" />}
          {tab === "Dues" && <DuesTab orgId={org.id} ownerId={org.owner_id} canManage={canManage} me={me} />}
          {isArtist && <ArtistTabContent tab={tab} org={org} canManage={canManage} me={me} />}
          </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function GroupRequests({ orgId, onApproved, onCountChange }: { orgId: string; onApproved: () => void; onCountChange?: (n: number) => void }) {
  const [rows, setRows] = useState<{ user_id: string; display_name: string | null; username: string | null; avatar_url: string | null }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("status", "pending");
    const ids = ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
    onCountChange?.(ids.length);
    if (!ids.length) { setRows([]); return; }
    const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
    setRows(((profs ?? []) as { id: string; display_name: string | null; username: string | null; avatar_url: string | null }[])
      .map((p) => ({ user_id: p.id, display_name: p.display_name, username: p.username, avatar_url: p.avatar_url })));
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const act = async (userId: string, approve: boolean) => {
    setBusy(userId);
    const q = approve
      ? supabase.from("organization_members").update({ status: "approved" }).eq("organization_id", orgId).eq("user_id", userId)
      : supabase.from("organization_members").delete().eq("organization_id", orgId).eq("user_id", userId);
    const { error } = await q;
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => {
      const next = prev.filter((r) => r.user_id !== userId);
      onCountChange?.(next.length);
      return next;
    });
    if (approve) onApproved();
    toast.success(approve ? "Member approved" : "Request declined");
  };

  if (!rows.length) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-10 text-center">
        <UserPlus className="mx-auto h-8 w-8 text-neutral-400" />
        <h3 className="mt-3 text-base font-bold text-neutral-900">No pending requests</h3>
        <p className="mt-1 text-sm text-neutral-500">When someone asks to join, approve or decline them here.</p>
      </div>
    );
  }
  return (
    <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 text-sm font-bold text-neutral-900">Join requests ({rows.length})</div>
      <ul className="divide-y divide-neutral-100">
        {rows.map((r) => (
          <li key={r.user_id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0 text-sm">
              <div className="truncate font-medium text-neutral-900">{r.display_name || r.username || "Someone"}</div>
              {r.username && <div className="truncate text-xs text-neutral-500">@{r.username}</div>}
            </div>
            <div className="flex shrink-0 gap-2">
              <button disabled={busy === r.user_id} onClick={() => act(r.user_id, true)} className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-60">Approve</button>
              <button disabled={busy === r.user_id} onClick={() => act(r.user_id, false)} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60">Decline</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AboutTab({ org, canManage, onChange, initialEdit, onEditClose }: { org: Org; canManage: boolean; onChange: (o: Org) => void; initialEdit?: boolean; onEditClose?: () => void }) {
  return AboutTabImpl({ org, canManage, onChange, initialEdit, onEditClose });
}

// Tabs unique to artist pages. Anything already rendered by the shared tab
// switcher above is skipped here so it never renders twice.
const SHARED_TABS = new Set([
  "About", "Posts", "Events", "Exhibitions", "Exhibition", "Opportunities", "Press",
  "Updates", "Artists", "Support", "Menu", "Feed", "Services", "Calendar", "Members",
  "Leaderboard", "Invite", "Polls", "Voting", "Minutes", "Resources", "By Laws", "Rules",
  "Gallery", "Announcements", "Promotions", "Jobs", "Stories", "Threads", "Reviews",
  "Board", "Comments", "Dues",
]);

function ArtistTabContent({ tab, org, canManage, me }: { tab: string; org: Org; canManage: boolean; me: string | null }) {
  if (SHARED_TABS.has(tab)) return null;
  if (tab === "Talk") return <DiscussionTab orgId={org.id} me={me} canManage={canManage} placeholder="Say something to this artist…" />;
  if (tab === "CV/Bio" || tab === "Bio/CV")
    return <CvBioTab orgId={org.id} cv={(org as unknown as { cv?: unknown }).cv} canManage={canManage} category={org.subtype} />;
  if (tab === "Contact")
    return (
      <ContactTab
        ownerId={org.owner_id}
        name={org.name}
        email={org.email}
        phone={org.phone}
        website={org.website}
        address={org.address}
      />
    );
  if (tab === "Saved")
    return (
      <div className="py-14 text-center text-sm text-muted-foreground">
        Saved items live on your personal profile.{" "}
        <Link to="/saved" className="font-semibold text-primary hover:underline">Open saved</Link>
      </div>
    );
  if (tab === "Portfolio" || tab === "Fashion Line" || tab === "Lookbook" || tab === "Collections")
    return <GalleryTab orgId={org.id} canManage={canManage} />;
  if (tab === "Album" || tab === "Albums" || tab === "Music" || tab === "Discography")
    return <MusicTab orgId={org.id} canManage={canManage} mode="album" />;
  if (tab === "Singles" || tab === "Tracks" || tab === "Beats" || tab === "Mixes" || tab === "Sets")
    return <MusicTab orgId={org.id} canManage={canManage} mode="single" label={tab} />;
  if (
    tab === "Videos" || tab === "Reel" || tab === "Reels" || tab === "Films" || tab === "Work" ||
    tab === "Watch" || tab === "Clips" || tab === "Filmography" || tab === "Screenings" ||
    tab === "Repertoire"
  )
    return <OrgVideosTab orgId={org.id} canManage={canManage} title={tab} />;
  if (tab === "EPK")
    return (
      <EpkTab
        orgId={org.id}
        canManage={canManage}
        me={me}
        name={org.name}
        bio={org.bio}
        email={org.email}
        phone={org.phone}
        website={org.website}
        address={org.address}
      />
    );
  if (tab === "Shop" || tab === "Print Shop" || tab === "Drops")
    return <StoreTab orgId={org.id} canManage={canManage} title={tab} />;
  if (tab === "Episodes" || tab === "Listen" || tab === "Bonus")
    return <PodcastEpisodesTab userId={org.owner_id} isOwner={canManage} />;
  if (tab === "Guests")
    return <GuestsTab orgId={org.id} ownerId={org.owner_id} canManage={canManage} />;
  if (tab === "Sponsors" || tab === "Media Kit" || tab === "Partners")
    return (
      <SponsorsTab
        orgId={org.id}
        ownerId={org.owner_id}
        canManage={canManage}
        label={/podcast/i.test(org.subtype ?? "") ? "Podcast" : "Page"}
      />
    );
  if (tab === "Writing" || tab === "Books" || tab === "Poems" || tab === "Publications" || tab === "Essays")
    return <OrgStoriesTab orgId={org.id} canManage={canManage} title={tab} />;
  const kind = tab.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return <OrgPostList orgId={org.id} kind={kind} canManage={canManage} />;
}

function InviteTab({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <button
        onClick={() => setOpen(true)}
        title={`Invite friends to ${orgName}`}
        className="w-full rounded-2xl bg-neutral-500 px-6 py-4 text-center text-base font-semibold text-white transition hover:bg-neutral-600"
      >
        Invite Friends to Join
      </button>
      <InviteFriendsDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function AboutTabImpl({ org, canManage, onChange, initialEdit, onEditClose }: { org: Org; canManage: boolean; onChange: (o: Org) => void; initialEdit?: boolean; onEditClose?: () => void }) {
  const [edit, setEdit] = useState(!!initialEdit);
  useEffect(() => { if (initialEdit) setEdit(true); }, [initialEdit]);
  const [form, setForm] = useState({
    name: org.name ?? "", bio: org.bio ?? "", website: org.website ?? "", phone: org.phone ?? "",
    email: org.email ?? "", address: org.address ?? "", neighborhood: org.neighborhood ?? "",
  });
  const days = ["mon","tue","wed","thu","fri","sat","sun"] as const;
  const dayLabels: Record<string,string> = { mon:"Mon",tue:"Tue",wed:"Wed",thu:"Thu",fri:"Fri",sat:"Sat",sun:"Sun" };
  const [hours, setHours] = useState<Record<string, { open: string; close: string } | null>>(() => {
    const out: Record<string, { open: string; close: string } | null> = {};
    for (const d of days) out[d] = org.hours?.[d] ?? null;
    return out;
  });

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const { error } = await supabase.from("organizations").update({
      name: form.name.trim(), bio: form.bio || null, website: form.website || null, phone: form.phone || null,
      email: form.email || null, address: form.address || null, neighborhood: form.neighborhood || null,
      hours,
    }).eq("id", org.id);
    if (error) return toast.error(error.message);
    onChange({ ...org, ...form, name: form.name.trim(), hours });
    setEdit(false);
    onEditClose?.();
    toast.success("Saved");
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => { setEdit((v) => { const n = !v; if (!n) onEditClose?.(); return n; }); }} className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary">
            {edit ? "Cancel" : "Edit details"}
          </button>
        </div>
      )}
      {edit ? (
        <div className="space-y-3 rounded-2xl border border-border bg-neutral-50 p-4 text-sm">
          <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Name" className="w-full rounded-lg border border-border px-3 py-2 font-semibold" />
          <textarea value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} placeholder="About" rows={4} className="w-full rounded-lg border border-border px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.website} onChange={(e) => setForm({...form, website: e.target.value})} placeholder="Website" className="rounded-lg border border-border px-3 py-2" />
            <input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="Phone" className="rounded-lg border border-border px-3 py-2" />
          </div>
          <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="Email" className="w-full rounded-lg border border-border px-3 py-2" />
          <input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} placeholder="Address" className="w-full rounded-lg border border-border px-3 py-2" />
          <input value={form.neighborhood} onChange={(e) => setForm({...form, neighborhood: e.target.value})} placeholder="Neighborhood" className="w-full rounded-lg border border-border px-3 py-2" />
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hours (optional)</div>
            <div className="space-y-1.5">
              {days.map((d) => {
                const h = hours[d];
                return (
                  <div key={d} className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 w-24 text-xs">
                      <input type="checkbox" checked={!!h} onChange={(e) => setHours({...hours, [d]: e.target.checked ? { open: "09:00", close: "17:00" } : null })} />
                      {dayLabels[d]}
                    </label>
                    {h && (
                      <>
                        <input type="time" value={h.open} onChange={(e) => setHours({...hours, [d]: { ...h, open: e.target.value }})} className="rounded border border-border px-2 py-1 text-xs" />
                        <span className="text-xs">–</span>
                        <input type="time" value={h.close} onChange={(e) => setHours({...hours, [d]: { ...h, close: e.target.value }})} className="rounded border border-border px-2 py-1 text-xs" />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={save} className="w-full rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Save</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <h3 className="mb-2 text-sm font-semibold">About</h3>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{org.bio || "No description yet."}</p>
          </div>
          {org.hours && days.some((d) => org.hours?.[d]) && (
            <div className="rounded-2xl border border-border p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Clock className="h-4 w-4" /> Hours</h3>
              <ul className="space-y-1 text-sm">
                {days.map((d) => (
                  <li key={d} className="flex justify-between text-neutral-700">
                    <span className="font-medium">{dayLabels[d]}</span>
                    <span>{org.hours?.[d] ? `${org.hours[d]!.open} – ${org.hours[d]!.close}` : "Closed"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventsTab({ orgId: _orgId, canManage: _canManage }: { orgId: string; canManage: boolean }) {
  type OrgEvent = { id: string; title: string; starts_at: string; venue_name: string | null; image_url: string | null; video_url: string | null };
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title,starts_at,venue_name,image_url,video_url")
        .eq("organization_id", _orgId)
        .eq("is_exhibition", false)
        .order("starts_at", { ascending: false })
        .limit(50);
      const rows = (data ?? []) as OrgEvent[];
      const seen = new Set<string>();
      setEvents(rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))));
      setLoading(false);
    })();
  }, [_orgId]);

  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`/events/new?org=${encodeURIComponent(_orgId)}`}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-card px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-[#d4580a] hover:text-[#d4580a]"
        >
          <Plus className="h-4 w-4" /> Create Event
        </a>
        <a
          href="/organizer-studio"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-card px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          <CalendarIcon className="h-4 w-4" /> Organizer Studio
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </a>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-neutral-500">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-card py-12 text-center text-sm text-neutral-500">
          No events yet. Click Create Event above to add the first one.
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-neutral-900">Upcoming</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.map((e) => <OrgEventCard key={e.id} e={e} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-neutral-500">Past</h3>
              <div className="grid gap-4 sm:grid-cols-2 opacity-70">
                {past.map((e) => <OrgEventCard key={e.id} e={e} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function OrgEventCard({ e }: { e: { id: string; title: string; starts_at: string; venue_name: string | null; image_url: string | null; video_url?: string | null } }) {
  return <OrgEventCardInternal e={e} />;
}

function ExhibitionsTab({ orgId, canManage: _canManage }: { orgId: string; canManage: boolean }) {
  type OrgEvent = { id: string; title: string; starts_at: string; venue_name: string | null; image_url: string | null; video_url: string | null };
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title,starts_at,venue_name,image_url,video_url")
        .eq("organization_id", orgId)
        .eq("is_exhibition", true)
        .order("starts_at", { ascending: false })
        .limit(50);
      const rows = (data ?? []) as OrgEvent[];
      const seen = new Set<string>();
      setEvents(rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))));
      setLoading(false);
    })();
  }, [orgId]);

  const now = Date.now();
  const current = events.filter((e) => new Date(e.starts_at).getTime() >= now).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`/events/new?org=${encodeURIComponent(orgId)}&kind=exhibition`}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-card px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-[#d4580a] hover:text-[#d4580a]"
        >
          <Plus className="h-4 w-4" /> Create Event
        </a>
        <a
          href="/organizer-studio"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-card px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          <CalendarIcon className="h-4 w-4" /> Organizer Studio
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </a>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-neutral-500">Loading exhibitions…</div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-card py-12 text-center text-sm text-neutral-500">
          No exhibitions yet. Click Create Event to add the first one.
        </div>
      ) : (
        <div className="space-y-8">
          {current.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-neutral-900">Current &amp; Upcoming</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {current.map((e) => <OrgEventCardInternal key={e.id} e={e} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-neutral-500">Past</h3>
              <div className="grid gap-4 sm:grid-cols-2 opacity-70">
                {past.map((e) => <OrgEventCardInternal key={e.id} e={e} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function OrgEventCardInternal({ e }: { e: { id: string; title: string; starts_at: string; venue_name: string | null; image_url: string | null; video_url?: string | null } }) {
  return (
    <a href={`/events/${e.id}`} className="block overflow-hidden rounded-2xl border border-neutral-200 bg-card transition hover:shadow-md">
      {e.image_url ? (
        <EventImage src={e.image_url} alt={e.title} className="h-40 w-full object-cover" />
      ) : e.video_url ? (
        <SmartVideo
          src={e.video_url}
          className="h-40 w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : null}
      <div className="space-y-1 p-4">
        <div className="text-xs font-medium text-[#d4580a]">
          {new Date(e.starts_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          {" · "}
          {new Date(e.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </div>
        <div className="font-semibold text-neutral-900 line-clamp-2">{e.title}</div>
        {e.venue_name && <div className="text-xs text-neutral-500">{e.venue_name}</div>}
      </div>
    </a>
  );
}

function CalendarTab({ orgId: _orgId }: { orgId: string }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [events, setEvents] = useState<Array<{ id: string; title: string; starts_at: string }>>([]);

  useEffect(() => {
    (async () => {
      const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1).toISOString();
      const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1).toISOString();
      const { data } = await supabase
        .from("events")
        .select("id,title,starts_at")
        .eq("organization_id", _orgId)
        .gte("starts_at", from)
        .lt("starts_at", to)
        .order("starts_at", { ascending: true });
      setEvents((data ?? []) as typeof events);
    })();
  }, [cursor]);

  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const firstDow = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(cursor.getFullYear(), cursor.getMonth(), 0).getDate();
  const cells: Array<{ day: number; inMonth: boolean; date: Date }> = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, inMonth: false, date: new Date(cursor.getFullYear(), cursor.getMonth() - 1, prevMonthDays - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, date: new Date(cursor.getFullYear(), cursor.getMonth(), d) });
  }
  while (cells.length % 7 !== 0) {
    const d = cells.length - firstDow - daysInMonth + 1;
    cells.push({ day: d, inMonth: false, date: new Date(cursor.getFullYear(), cursor.getMonth() + 1, d) });
  }
  const today = new Date();
  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const eventsByDay = new Map<string, typeof events>();
  for (const e of events) {
    const key = new Date(e.starts_at).toDateString();
    const arr = eventsByDay.get(key) ?? [];
    arr.push(e);
    eventsByDay.set(key, arr);
  }
  const dowLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const upcoming = events.filter((e) => new Date(e.starts_at) >= today).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-full p-2 hover:bg-neutral-100"><ChevronLeft className="h-5 w-5" /></button>
        <div className="text-lg font-semibold">{monthLabel}</div>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-full p-2 hover:bg-neutral-100"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-600">
          {dowLabels.map((d) => (<div key={d} className="px-3 py-2">{d}</div>))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((c, i) => {
            const dayEvents = eventsByDay.get(c.date.toDateString()) ?? [];
            return (
              <div key={i} className={`min-h-[80px] border-b border-r border-neutral-100 p-2 text-sm ${c.inMonth ? "text-neutral-900" : "bg-neutral-50 text-neutral-400"}`}>
                <div className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday(c.date) ? "border border-neutral-900" : ""}`}>{c.day}</div>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <div key={e.id} className="truncate rounded bg-[#d4580a]/10 px-1 py-0.5 text-[10px] font-medium text-[#d4580a]">{e.title}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <CalendarIcon className="h-4 w-4" /> Upcoming Events
        </div>
        {upcoming.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500">No upcoming events.</div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 text-sm">
                <div className="font-medium text-neutral-900">{e.title}</div>
                <div className="text-xs text-neutral-500">{new Date(e.starts_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MembersTab({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<Array<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data: mem } = await supabase.from("organization_members").select("user_id").eq("organization_id", orgId);
      const ids = Array.from(new Set(((mem ?? []) as { user_id: string }[]).map((r) => r.user_id)));
      if (ids.length === 0) { setRows([]); setLoading(false); return; }
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      setRows((profs ?? []) as typeof rows);
      setLoading(false);
    })();
  }, [orgId]);
  if (loading) return <div className="py-10 text-center text-sm text-neutral-500">Loading…</div>;
  if (rows.length === 0) return <div className="py-14 text-center text-sm text-neutral-500">No members yet.</div>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-200">
            {p.avatar_url && <Img src={p.avatar_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-neutral-900">{p.display_name || p.username || "Member"}</div>
            {p.neighborhood && <div className="truncate text-xs text-neutral-500">{p.neighborhood}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SupportTab({ org, canManage }: { org: Org; canManage: boolean }) {
  return <SupportTabImpl org={org} canManage={canManage} />;
}

function ArtsOrgAboutTab({ org, canManage, onChange }: { org: Org; canManage: boolean; onChange: (o: Org) => void }) {
  const parsed = parseArtsBio(org.bio ?? "");
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    name: org.name ?? "",
    mission: parsed.mission,
    description: parsed.description,
    programming: parsed.programming.join(", "),
    address: org.address ?? "",
    email: org.email ?? "",
    phone: org.phone ?? "",
    website: org.website ?? "",
    neighborhood: org.neighborhood ?? "",
  });

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    const tags = form.programming.split(",").map((t) => t.trim()).filter(Boolean);
    const bio = composeArtsBio(form.mission, form.description, tags);
    const { error } = await supabase.from("organizations").update({
      name: form.name.trim(),
      bio: bio || null,
      address: form.address || null,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      neighborhood: form.neighborhood || null,
    }).eq("id", org.id);
    if (error) return toast.error(error.message);
    onChange({ ...org, name: form.name.trim(), bio, address: form.address || null, email: form.email || null, phone: form.phone || null, website: form.website || null, neighborhood: form.neighborhood || null });
    setEdit(false);
    toast.success("Saved");
  };

  if (edit) {
    return (
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Name</div>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Mission</div>
          <textarea value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} rows={3} className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Description</div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="rounded-lg border border-neutral-200 px-3 py-2" />
          <input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} placeholder="Neighborhood" className="rounded-lg border border-neutral-200 px-3 py-2" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Contact email" className="rounded-lg border border-neutral-200 px-3 py-2" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded-lg border border-neutral-200 px-3 py-2" />
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website (https://...)" className="rounded-lg border border-neutral-200 px-3 py-2 sm:col-span-2" />
        </div>
        <input value={form.programming} onChange={(e) => setForm({ ...form, programming: e.target.value })} placeholder="Programming tags (comma separated)" className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
        <div className="flex justify-end gap-2">
          <button onClick={() => setEdit(false)} className="rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-semibold text-neutral-700">Cancel</button>
          <button onClick={save} className="rounded-full bg-[#d4580a] px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-700">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => setEdit(true)} className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]">
            Edit About
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-500">Mission</div>
        <p className="text-sm leading-relaxed text-neutral-800">
          {parsed.mission || "No mission statement yet."}
        </p>
      </div>

      {parsed.description && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{parsed.description}</p>
        </div>
      )}

      <div className="space-y-2 px-1 text-sm text-neutral-700">
        {(org.address || org.neighborhood) && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-neutral-500" />
            <span>{[org.address, org.neighborhood].filter(Boolean).join(" — ")}</span>
          </div>
        )}
        {org.email && (
          <a href={`mailto:${org.email}`} className="flex items-center gap-2 hover:text-[#d4580a]">
            <Mail className="h-4 w-4 text-neutral-500" />
            <span>{org.email}</span>
          </a>
        )}
      </div>

      {parsed.programming.length > 0 && (
        <div>
          <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-neutral-500">Programming</div>
          <div className="flex flex-wrap gap-2">
            {parsed.programming.map((p) => (
              <span key={p} className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-800">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseArtsBio(bio: string): { mission: string; description: string; programming: string[] } {
  let mission = "";
  let programming: string[] = [];
  let rest = bio;
  const missionMatch = rest.match(/(?:^|\n)MISSION:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/);
  if (missionMatch) { mission = missionMatch[1].trim(); rest = rest.replace(missionMatch[0], "").trim(); }
  const progMatch = rest.match(/(?:^|\n)PROGRAMMING:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/);
  if (progMatch) {
    programming = progMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
    rest = rest.replace(progMatch[0], "").trim();
  }
  if (!mission) {
    const parts = rest.split(/\n\n+/);
    mission = parts[0]?.trim() ?? "";
    rest = parts.slice(1).join("\n\n").trim();
  }
  return { mission, description: rest, programming };
}

function composeArtsBio(mission: string, description: string, programming: string[]): string {
  const parts: string[] = [];
  if (mission.trim()) parts.push(`MISSION: ${mission.trim()}`);
  if (description.trim()) parts.push(description.trim());
  if (programming.length) parts.push(`PROGRAMMING: ${programming.join(", ")}`);
  return parts.join("\n\n");
}

type SupportTier = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  interval: string;
  image_url: string | null;
  join_url: string | null;
  sort_order: number;
};

function fmtTierPrice(cents: number | null, interval: string) {
  if (cents == null) return "Any amount";
  const amt = `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
  if (interval === "yearly") return `${amt}/yr`;
  if (interval === "monthly") return `${amt}/mo`;
  return amt;
}

function SupportTabImpl({ org, canManage }: { org: Org; canManage: boolean }) {
  const [tiers, setTiers] = useState<SupportTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SupportTier | null>(null);
  const [adding, setAdding] = useState(false);
  const [donateInterval, setDonateInterval] = useState<"one_time" | "yearly">("one_time");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organization_support_tiers")
      .select("*")
      .eq("organization_id", org.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setTiers((data ?? []) as SupportTier[]);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [org.id]);

  const remove = async (id: string) => {
    if (!confirm("Delete this tier?")) return;
    const { error } = await supabase.from("organization_support_tiers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTiers((xs) => xs.filter((x) => x.id !== id));
  };

  const donateHref = `/o/${org.slug}/donate${donateInterval === "yearly" ? "?interval=yearly" : ""}`;

  return (
    <div className="space-y-5">
      {/* Donate hero */}
      <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-orange-50 to-white p-5">
        <div className="flex items-center gap-2 text-lg font-bold text-neutral-900">
          <Heart className="h-5 w-5 text-[#d4580a]" /> Support {org.name}
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          Your contribution helps sustain programming, artists, and community impact.
        </p>
        <div className="mt-4 inline-flex rounded-full bg-neutral-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setDonateInterval("one_time")}
            className={`rounded-full px-3 py-1.5 ${donateInterval === "one_time" ? "bg-white text-neutral-900 shadow" : "text-neutral-500"}`}
          >One-time</button>
          <button
            onClick={() => setDonateInterval("yearly")}
            className={`rounded-full px-3 py-1.5 ${donateInterval === "yearly" ? "bg-white text-neutral-900 shadow" : "text-neutral-500"}`}
          >Yearly</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={donateHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#d4580a] px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            <Heart className="h-4 w-4" />
            Donate {donateInterval === "yearly" ? "yearly" : "one-time"}
          </a>
          {org.email && (
            <a href={`mailto:${org.email}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]">
              <Mail className="h-4 w-4" /> Contact
            </a>
          )}
        </div>
      </div>

      {/* Tiers */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-neutral-900">Membership & Sponsorship Tiers</h3>
        {canManage && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#d4580a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
          >
            <Plus className="h-3.5 w-3.5" /> Add tier
          </button>
        )}
      </div>

      {adding && (
        <TierForm
          orgId={org.id}
          onCancel={() => setAdding(false)}
          onSaved={(t) => { setTiers((xs) => [...xs, t]); setAdding(false); }}
        />
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-500">Loading…</div>
      ) : tiers.length === 0 && !adding ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-500">
          {canManage ? "No tiers yet. Add your first one above." : "No tiers listed yet."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tiers.map((t) => editing?.id === t.id ? (
            <TierForm
              key={t.id}
              orgId={org.id}
              initial={t}
              onCancel={() => setEditing(null)}
              onSaved={(saved) => { setTiers((xs) => xs.map((x) => x.id === saved.id ? saved : x)); setEditing(null); }}
            />
          ) : (
            <div key={t.id} className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              {t.image_url && (
                <Img src={t.image_url} alt={t.name} className="aspect-[16/9] w-full object-cover" loading="lazy" />
              )}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-base font-bold text-neutral-900">{t.name}</div>
                  <div className="whitespace-nowrap text-sm font-bold text-[#d4580a]">{fmtTierPrice(t.price_cents, t.interval)}</div>
                </div>
                {t.description && (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-600">{t.description}</p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href={t.join_url || donateHref}
                    target={(t.join_url || "").startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#d4580a] px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700"
                  >
                    <Heart className="h-3.5 w-3.5" />
                    {t.interval === "yearly" ? "Join yearly" : t.interval === "monthly" ? "Join monthly" : "Donate"}
                  </a>
                  {canManage && (
                    <>
                      <button onClick={() => setEditing(t)} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(t.id)} className="rounded-full p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TierForm({ orgId, initial, onCancel, onSaved }: {
  orgId: string;
  initial?: SupportTier;
  onCancel: () => void;
  onSaved: (t: SupportTier) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceStr, setPriceStr] = useState(initial?.price_cents != null ? String(initial.price_cents / 100) : "");
  const [interval, setInterval] = useState<string>(initial?.interval ?? "one_time");
  const [joinUrl, setJoinUrl] = useState(initial?.join_url ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    file = await compressImage(file);
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `support-tiers/${orgId}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  };

  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const priceCents = priceStr.trim() ? Math.round(parseFloat(priceStr) * 100) : null;
    const payload = {
      organization_id: orgId,
      name: name.trim(),
      description: description.trim() || null,
      price_cents: Number.isFinite(priceCents as number) ? priceCents : null,
      interval,
      join_url: joinUrl.trim() || null,
      image_url: imageUrl || null,
    };
    if (initial) {
      const { data, error } = await supabase.from("organization_support_tiers").update(payload).eq("id", initial.id).select("*").single();
      setSaving(false);
      if (error) return toast.error(error.message);
      onSaved(data as SupportTier);
    } else {
      const { data, error } = await supabase.from("organization_support_tiers").insert(payload).select("*").single();
      setSaving(false);
      if (error) return toast.error(error.message);
      onSaved(data as SupportTier);
    }
  };

  const input = "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-[#d4580a] focus:outline-none";

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      {/* Image uploader */}
      <div>
        {imageUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-neutral-200">
            <Img src={imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
            <button onClick={() => setImageUrl("")} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-red-600 shadow"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-[16/9] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-white text-sm text-neutral-500 hover:border-[#d4580a] hover:text-[#d4580a]"
          >
            <Camera className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload tier image"}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
      </div>

      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tier name (e.g. Gold Sponsor)" className={input} />
      <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
        <input value={priceStr} onChange={(e) => setPriceStr(e.target.value)} placeholder="Price in USD (leave blank for any amount)" className={input} />
        <select value={interval} onChange={(e) => setInterval(e.target.value)} className={input}>
          <option value="one_time">One-time</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        placeholder="Describe the perks. What does the supporter get?"
        className={input}
      />
      <input value={joinUrl} onChange={(e) => setJoinUrl(e.target.value)} placeholder="Join / Donate URL (optional)" className={input} />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm font-semibold text-neutral-700">Cancel</button>
        <button onClick={save} disabled={saving} className="rounded-full bg-[#d4580a] px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

function OrgPostList({ orgId, kind, canManage }: { orgId: string; kind: string | null; canManage: boolean }) {
  return <OrgPostListImpl orgId={orgId} kind={kind} canManage={canManage} />;
}

function PressTab({ org, canManage }: { org: Org; canManage: boolean }) {
  const [items, setItems] = useState<OrgPost[]>([]);
  const [releases, setReleases] = useState<OrgPost[]>([]);
  const [addOpen, setAddOpen] = useState<null | "image" | "release">(null);
  const [form, setForm] = useState({ title: "", body: "", link_url: "", media_url: "" });

  const load = async () => {
    const { data } = await supabase
      .from("organization_posts")
      .select("*")
      .eq("org_id", org.id)
      .eq("kind", "press")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as OrgPost[];
    setItems(rows.filter((r) => !!r.media_url));
    setReleases(rows.filter((r) => !r.media_url));
  };
  useEffect(() => { load(); }, [org.id]);

  const submit = async () => {
    if (!form.title.trim() && !form.body.trim() && !form.media_url.trim()) {
      toast.error("Add a title or content"); return;
    }
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) { toast.error("Sign in required"); return; }
    const payload = {
      org_id: org.id, kind: "press" as const, author_id: uid,
      title: form.title || "Untitled",
      body: form.body || null,
      link_url: form.link_url || null,
      media_url: addOpen === "image" ? (form.media_url || null) : null,
    };
    const { error } = await supabase.from("organization_posts").insert(payload);
    if (error) return toast.error(error.message);
    setAddOpen(null);
    setForm({ title: "", body: "", link_url: "", media_url: "" });
    load();
    toast.success("Added");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("organization_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const Section = ({ title, children, onAdd }: { title: string; children: React.ReactNode; onAdd?: () => void }) => (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-bold text-neutral-900">{title}</div>
        {canManage && onAdd && (
          <button onClick={onAdd} className="inline-flex items-center gap-1 rounded-full bg-[#d4580a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      <Section title="Press Contact">
        {org.email || org.phone ? (
          <div className="space-y-1.5 text-sm text-neutral-700">
            {org.email && (
              <a href={`mailto:${org.email}`} className="inline-flex items-center gap-2 hover:text-[#d4580a]">
                <Mail className="h-4 w-4" /> {org.email}
              </a>
            )}
            {org.phone && (
              <div className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> {org.phone}</div>
            )}
          </div>
        ) : (
          <div className="text-sm text-neutral-500">No press contact info added yet.</div>
        )}
      </Section>

      <Section title="Logo">
        {org.avatar_url ? (
          <div className="flex items-center gap-4">
            <Img src={org.avatar_url} alt={`${org.name} logo`} className="h-24 w-24 rounded-xl border border-neutral-200 object-cover" />
            <a href={org.avatar_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]">
              <ExternalLink className="h-3.5 w-3.5" /> Download
            </a>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">No logo uploaded yet.</div>
        )}
      </Section>

      <Section title="Press Images" onAdd={() => setAddOpen("image")}>
        {items.length === 0 ? (
          <div className="text-sm text-neutral-500">No press images yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((it) => (
              <div key={it.id} className="group relative overflow-hidden rounded-xl border border-neutral-200">
                <Img src={it.media_url!} alt={it.title} className="aspect-square w-full object-cover" loading="lazy" />
                <div className="p-2 text-xs font-medium text-neutral-700">{it.title}</div>
                {canManage && (
                  <button onClick={() => remove(it.id)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-[#d4580a] shadow opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Press Releases" onAdd={() => setAddOpen("release")}>
        {releases.length === 0 ? (
          <div className="text-sm text-neutral-500">No press releases yet.</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {releases.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-semibold text-neutral-900">{r.title}</div>
                  {r.body && <div className="mt-0.5 text-sm text-neutral-600 line-clamp-2">{r.body}</div>}
                  <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
                    <span>{timeAgo(r.created_at)}</span>
                    {r.link_url && (
                      <SmartFileLink href={r.link_url} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-1 font-semibold text-[#d4580a] hover:underline">
                        <ExternalLink className="h-3 w-3" /> Download / Open
                      </SmartFileLink>
                    )}
                  </div>
                </div>
                {canManage && (
                  <button onClick={() => remove(r.id)} className="text-[#d4580a] hover:opacity-80">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {addOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setAddOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 text-lg font-bold text-neutral-900">
              Add {addOpen === "image" ? "Press Image" : "Press Release"}
            </div>
            <div className="space-y-2">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              {addOpen === "image" ? (
                <ImageUpload value={form.media_url} onChange={(url) => setForm({ ...form, media_url: url })} label="Upload press image" />
              ) : (
                <>
                  <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Summary" rows={4} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                  <FileUpload
                    value={form.link_url}
                    onChange={(url) => setForm({ ...form, link_url: url })}
                    label="Attach PDF, DOC, CSV, or other file (optional)"
                  />
                </>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAddOpen(null)} className="rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-semibold text-neutral-700">Cancel</button>
              <button onClick={submit} className="rounded-full bg-[#d4580a] px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-700">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrgPostListImpl({ orgId, kind, canManage }: { orgId: string; kind: string | null; canManage: boolean }) {
  const [items, setItems] = useState<OrgPost[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<OrgPost | null>(null);
  const [mediaIdx, setMediaIdx] = useState(0);
  useEffect(() => { setMediaIdx(0); }, [active?.id]);
  type Mode = "text" | "photo" | "video";
  const [mode, setMode] = useState<Mode>("text");
  const [form, setForm] = useState({ title: "", body: "" });
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [bg, setBg] = useState<{ bg: string; fg: string }>({ bg: "", fg: "#0F172A" });
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg" | "xl">("md");
  const isDrops = kind === "drops";
  const [availability, setAvailability] = useState<"available_now" | "pre_order">("available_now");
  const [editId, setEditId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const BG_COLORS = [
    { name: "None",      bg: "",        fg: "#0F172A" },
    { name: "Baltimore", bg: "#d4580a", fg: "#FFFFFF" },
    { name: "Deep Blue", bg: "#0F172A", fg: "#FCFCFA" },
    { name: "Sky",       bg: "#0EA5E9", fg: "#FFFFFF" },
    { name: "Rose",      bg: "#EC4899", fg: "#FFFFFF" },
    { name: "Forest",    bg: "#16A34A", fg: "#FFFFFF" },
    { name: "Sunset",    bg: "#F59E0B", fg: "#0F172A" },
    { name: "Violet",    bg: "#7C3AED", fg: "#FFFFFF" },
    { name: "Cream",     bg: "#FDF6E3", fg: "#0F172A" },
  ];
  const FONT_SIZE_CLASS: Record<string, string> = { sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-2xl" };

  const resetForm = () => {
    setForm({ title: "", body: "" });
    setMediaUrls([]);
    setBg({ bg: "", fg: "#0F172A" });
    setFontSize("md");
    setMode("text");
    setAvailability("available_now");
    setEditId(null);
  };

  const startEdit = (p: OrgPost) => {
    const media = (p.media_urls && p.media_urls.length ? p.media_urls : [p.video_url, p.media_url].filter(Boolean) as string[]);
    setEditId(p.id);
    setForm({ title: p.title ?? "", body: p.body ?? "" });
    setMediaUrls(media);
    setBg({ bg: p.bg_color ?? "", fg: p.text_color ?? "#0F172A" });
    setFontSize((p.font_size as "sm" | "md" | "lg" | "xl") || "md");
    setAvailability(p.availability === "pre_order" ? "pre_order" : "available_now");
    setMode(media.length ? (/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(media[0]!) ? "video" : "photo") : "text");
    setActive(null);
    setOpen(true);
  };

  const uploadFile = async (file: File) => {
    file = await compressImage(file);
    const isVideo = file.type.startsWith("video/");
    const cap = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > cap) { toast.error(`${isVideo ? "Video" : "Image"} must be under ${cap / 1024 / 1024}MB`); return; }
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { toast.error("Sign in first"); return; }
    setUploading(true);
    const tId = toast.loading(`Uploading ${isVideo ? "video" : "image"}...`);
    try {
      const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${uid}/org-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("post-media").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("post-media").createSignedUrl(path, STORED_URL_TTL);
      if (sErr || !signed?.signedUrl) throw sErr || new Error("Could not sign URL");
      setMediaUrls((prev) => [...prev, signed.signedUrl]);
      toast.success("Uploaded", { id: tId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed", { id: tId });
    } finally {
      setUploading(false);
    }
  };

  const load = async () => {
    let q = supabase.from("organization_posts").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    if (kind) q = q.eq("kind", kind);
    const { data } = await q;
    setItems(((data ?? []) as unknown[]).map((r) => {
      const row = r as Record<string, unknown>;
      return { ...(row as object), media_urls: Array.isArray(row.media_urls) ? (row.media_urls as string[]) : [] } as OrgPost;
    }));
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId, kind]);

  const add = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const firstImage = mediaUrls.find((u) => !/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u)) || null;
    const firstVideo = mediaUrls.find((u) =>  /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u)) || null;
    const payload: Record<string, unknown> = {
      org_id: orgId, author_id: uid, kind: kind ?? "update", title: form.title.trim(),
      body: form.body.trim() || null,
      media_url: firstImage,
      video_url: firstVideo,
      media_urls: mediaUrls,
      bg_color: mode === "text" && bg.bg ? bg.bg : null,
      text_color: mode === "text" && bg.bg ? bg.fg : null,
      font_size: fontSize,
    };
    if (isDrops) payload.availability = availability;
    let error;
    if (editId) {
      delete payload.org_id; delete payload.author_id; delete payload.kind;
      ({ error } = await supabase.from("organization_posts").update(payload as never).eq("id", editId));
    } else {
      ({ error } = await supabase.from("organization_posts").insert(payload as never));
    }
    if (error) return toast.error(error.message);
    setOpen(false); resetForm();
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("organization_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
            <Plus className="h-4 w-4" /> {open ? "Close" : `New ${kind ?? "post"}`}
          </button>
        </div>
      )}
      {open && canManage && (
        <div className="space-y-4 rounded-2xl border border-border bg-neutral-50 p-4">
          {/* Mode tabs */}
          <div className="flex flex-wrap gap-2">
            {([
              { id: "text",  label: "Text",  Icon: TypeIcon },
              { id: "photo", label: "Photo", Icon: ImagePlus },
              { id: "video", label: "Video", Icon: VideoIcon },
            ] as { id: Mode; label: string; Icon: typeof TypeIcon }[]).map(({ id, label, Icon }) => {
              const active = mode === id;
              return (
                <button key={id} type="button" onClick={() => setMode(id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? "border-[#d4580a] bg-[#d4580a] text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-orange-300"}`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              );
            })}
          </div>

          <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Title" className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />

          {isDrops && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Availability</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  { id: "available_now", label: "Available now" },
                  { id: "pre_order", label: "Pre-order" },
                ] as const).map((o) => (
                  <button key={o.id} type="button" onClick={() => setAvailability(o.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${availability === o.id ? "border-[#d4580a] bg-[#d4580a] text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-orange-300"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "text" ? (
            <div className="space-y-3">
              <div className="rounded-2xl p-6 min-h-[160px] flex items-center justify-center transition"
                style={{ background: bg.bg || "#F5F5F4", color: bg.fg }}>
                <textarea value={form.body} onChange={(e) => setForm({...form, body: e.target.value})} rows={4}
                  placeholder="Share your thoughts..."
                  style={{ color: bg.fg }}
                  className={`w-full resize-none border-0 bg-transparent text-center font-medium placeholder:opacity-60 focus:outline-none ${FONT_SIZE_CLASS[fontSize]}`} />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Background</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BG_COLORS.map((c) => {
                    const active = c.bg === bg.bg;
                    return (
                      <button key={c.name} type="button" onClick={() => setBg(c)} title={c.name}
                        className={`h-8 w-8 rounded-full border-2 transition ${active ? "border-[#d4580a] scale-110" : "border-neutral-200"}`}
                        style={{ background: c.bg || "linear-gradient(135deg, #fff 50%, #eee 50%)" }} />
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Font size</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["sm","md","lg","xl"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setFontSize(s)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${fontSize === s ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : "border-neutral-200 text-neutral-600 hover:border-orange-300"}`}>
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <textarea value={form.body} onChange={(e) => setForm({...form, body: e.target.value})} placeholder="Caption (optional)" rows={3} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" />
          )}

          {(mode === "photo" || mode === "video") && (
            <div className="space-y-2">
              <input ref={fileRef} type="file" multiple
                accept={mode === "video" ? "video/*,image/*" : "image/*,video/*"}
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  for (const f of files) await uploadFile(f);
                  if (fileRef.current) fileRef.current.value = "";
                }} />
              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaUrls.map((u, i) => {
                    const isVideo = /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);
                    return (
                      <div key={u} className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                        {isVideo ? <SmartVideo src={u} className="h-24 w-full object-cover" /> : <Img src={u} alt="" className="h-24 w-full object-cover" />}
                        <button type="button" onClick={() => setMediaUrls((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100" aria-label="Remove">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-3 text-sm font-medium text-neutral-600 hover:border-orange-300 hover:text-[#d4580a] disabled:opacity-60">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === "video" ? <VideoIcon className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />)}
                {uploading ? "Uploading…" : mediaUrls.length ? "Add more" : mode === "video" ? "Upload video (up to 50MB)" : "Upload image or video"}
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setOpen(false); resetForm(); }} className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">Cancel</button>
            <button onClick={add} disabled={uploading} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{editId ? "Save changes" : "Post"}</button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No {kind ?? "post"} entries yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((p) => {
            const media = (p.media_urls && p.media_urls.length ? p.media_urls : [p.video_url, p.media_url].filter(Boolean) as string[]);
            const first = media[0];
            const isVideo = !!first && /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(first);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActive(p)}
                className="group relative aspect-square overflow-hidden rounded-md bg-neutral-100"
              >
                {first ? (
                  isVideo
                    ? <SmartVideo src={first} muted playsInline preload="metadata" className="h-full w-full bg-white object-cover" />
                    : <Img src={first} alt={p.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center p-3 text-center text-[12px] font-medium leading-tight"
                    style={p.bg_color ? { background: p.bg_color, color: p.text_color || "#fff" } : undefined}
                  >
                    <span className="line-clamp-6">{p.body || p.title}</span>
                  </div>
                )}
                {media.length > 1 && (
                  <div className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">1/{media.length}</div>
                )}
                {p.availability && (
                  <div className={`absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${p.availability === "pre_order" ? "bg-neutral-900/80" : "bg-emerald-600/90"}`}>
                    {p.availability === "pre_order" ? "Pre-order" : "Available now"}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
      {active && (
        <Dialog open onOpenChange={(o) => { if (!o) setActive(null); }}>
          <DialogContent className="w-[96vw] max-w-6xl p-0 overflow-hidden sm:w-[92vw]">
            {(() => {
              const p = active;
              const media = (p.media_urls && p.media_urls.length ? p.media_urls : [p.video_url, p.media_url].filter(Boolean) as string[]);
              const sizeClass = FONT_SIZE_CLASS[p.font_size || "md"];
              const idx = items.findIndex((it) => it.id === p.id);
              const goPrev = () => { if (idx > 0) setActive(items[idx - 1]); };
              const goNext = () => { if (idx > -1 && idx < items.length - 1) setActive(items[idx + 1]); };
              return (
                <div className="relative grid md:grid-cols-[minmax(0,1.6fr)_minmax(320px,420px)]">
                  {idx > 0 && (
                    <button
                      type="button" onClick={goPrev} aria-label="Previous post"
                      className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/75"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  {idx > -1 && idx < items.length - 1 && (
                    <button
                      type="button" onClick={goNext} aria-label="Next post"
                      className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/75"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                  {media.length > 0 && (() => {
                    const cur = media[Math.min(mediaIdx, media.length - 1)]!;
                    return (
                      <div className="relative flex items-center justify-center bg-white">
                        {/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(cur)
                          ? <SmartVideo src={cur} controls playsInline className="max-h-[88vh] w-full bg-white" />
                          : <Img src={cur} alt={p.title} className="max-h-[88vh] w-full object-contain" />}
                        {media.length > 1 && (
                          <>
                            <button type="button" aria-label="Previous media" disabled={mediaIdx === 0}
                              onClick={() => setMediaIdx((i) => Math.max(0, i - 1))}
                              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/85 p-2 text-neutral-900 disabled:opacity-30">
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button type="button" aria-label="Next media" disabled={mediaIdx >= media.length - 1}
                              onClick={() => setMediaIdx((i) => Math.min(media.length - 1, i + 1))}
                              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/85 p-2 text-neutral-900 disabled:opacity-30">
                              <ChevronRight className="h-4 w-4" />
                            </button>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                              {Math.min(mediaIdx, media.length - 1) + 1} / {media.length}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                  <div className="min-w-0 space-y-2 p-5">
                    <div className="text-base font-semibold">{p.title}</div>
                    {p.availability && (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${p.availability === "pre_order" ? "bg-neutral-900" : "bg-emerald-600"}`}>
                        {p.availability === "pre_order" ? "Pre-order" : "Available now"}
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground">{timeAgo(p.created_at)}</div>
                    {p.body && (
                      p.bg_color && media.length === 0 ? (
                        <div className={`rounded-xl p-4 text-center font-medium whitespace-pre-wrap ${sizeClass}`}
                          style={{ background: p.bg_color, color: p.text_color || "#fff" }}>{p.body}</div>
                      ) : (
                        <p className={`whitespace-pre-wrap break-words text-neutral-700 ${sizeClass}`}>{p.body}</p>
                      )
                    )}
                    {p.link_url && (
                      <SmartFileLink href={p.link_url} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-1 text-xs font-semibold text-[#d4580a] hover:underline">
                        Download attachment
                      </SmartFileLink>
                    )}
                    {canManage && (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => startEdit(p)} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button onClick={() => { void remove(p.id); setActive(null); }} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
