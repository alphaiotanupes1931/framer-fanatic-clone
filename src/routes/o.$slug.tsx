import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { useUserRole } from "@/hooks/use-user-role";
import {
  Globe, Phone, Mail, MapPin, Clock, Plus, Trash2, ExternalLink, Share2,
  ArrowLeft, Users, Camera, Pencil, Bell, VolumeX, Volume2, Star,
  Megaphone, Calendar as CalendarIcon, MessageCircle, BarChart3, Image as ImageIcon,
  Folder, Briefcase, Trophy, FileText, UserPlus, MessageSquare, List,
  ChevronLeft, ChevronRight, Heart,
} from "lucide-react";
import { toast } from "sonner";
import { MessageAllButton } from "@/components/message-all-button";
import { PriceItemsSection } from "@/components/org/price-items-section";

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
};

type OrgPost = {
  id: string; org_id: string; kind: "opportunity" | "press" | "update";
  title: string; body: string | null; link_url: string | null; media_url: string | null; created_at: string;
};

type Comment = { id: string; user_id: string; body: string; created_at: string; profiles?: { display_name: string | null; avatar_url: string | null } | null };

const DEFAULT_TABS = ["About", "Events", "Opportunities", "Press", "Updates", "Comments"] as const;
const ASSOC_TABS = [
  "Posts", "Announcements", "Events", "Calendar", "Members", "Threads",
  "Polls", "Gallery", "Resources", "Jobs", "Leaderboard", "Rules", "Invite", "Comments",
] as const;
const COMMUNITY_ASSOC_TABS = [
  "Posts", "Events", "Polls", "Voting", "Minutes", "Members", "Board", "By Laws", "Invite", "Comments", "About",
] as const;
const RESTAURANT_TABS = [
  "Menu", "Feed", "Stories", "Events", "Promotions", "Reviews", "About", "Comments", "Invite",
] as const;
const SERVICE_TABS = [
  "Services", "Feed", "Stories", "Events", "Promotions", "Reviews", "About", "Comments", "Invite",
] as const;
const ARTS_ORG_TABS = [
  "Posts", "Events", "Artists", "Support", "Opportunities", "Press", "Updates", "Invite", "About", "Comments",
] as const;
const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Posts: List, Announcements: Megaphone, Events: CalendarIcon, Calendar: CalendarIcon,
  Members: Users, Threads: MessageCircle, Polls: BarChart3, Gallery: ImageIcon,
  Resources: Folder, Jobs: Briefcase, Leaderboard: Trophy, Rules: FileText,
  Invite: UserPlus, Comments: MessageSquare, About: FileText,
  Opportunities: Briefcase, Press: Megaphone, Updates: Bell, Voting: BarChart3,
  Minutes: FileText, Board: Users, "By Laws": FileText,
  Menu: List, Feed: List, Stories: Camera, Promotions: Star, Reviews: Star, Services: Briefcase,
  Artists: Users, Support: Heart,
};
type Tab = string;

function OrgProfile() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [me, setMe] = useState<string | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [tab, setTab] = useState<Tab>("Feed");
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
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
      const isBiz = o?.type !== "community_assoc" && o?.type !== "group";
      const foodLike = /restaurant|cafe|coffee|bakery|bar|food|eat|diner|deli|pizz|grill|kitchen|brunch/.test(sub);
      if (isBiz && foodLike) setTab("Menu");
      else if (isBiz) setTab("Services");
    })();
  }, [slug]);
  useEffect(() => {
    if (!org || !me) { setJoined(false); return; }
    (async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", org.id)
        .eq("user_id", me)
        .maybeSingle();
      setJoined(!!data);
    })();
  }, [org, me]);
  useEffect(() => {
    if (!org) return;
    (async () => {
      const { count } = await supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", org.id);
      setMemberCount(count ?? 0);
    })();
  }, [org, joined]);
  useEffect(() => {
    if (!org) return;
    setMuted(localStorage.getItem(`pb_muted_org_${org.id}`) === "1");
    setTab("Posts");
  }, [org]);

  if (!org) return <AppLayout title="" hero={false}><div className="py-20 text-center text-muted-foreground">Loading…</div></AppLayout>;

  const isOwner = !!me && me === org.owner_id;
  const canManage = isOwner || isAdmin;
  const isAssoc = org.type === "community_assoc";
  const isGroup = org.type === "group";
  const isArtsOrg = org.type === "arts_org";
  const isBusiness = !isAssoc && !isGroup && !isArtsOrg;
  const subLower = (org.subtype ?? "").toLowerCase();
  const isRestaurant = isBusiness && /restaurant|cafe|coffee|bakery|bar|food|eat|diner|deli|pizz|grill|kitchen|brunch/.test(subLower);
  const isService = isBusiness && !isRestaurant;
  const TABS: readonly string[] = isArtsOrg
    ? ARTS_ORG_TABS
    : isRestaurant
    ? RESTAURANT_TABS
    : isService
    ? SERVICE_TABS
    : isAssoc
    ? COMMUNITY_ASSOC_TABS
    : ASSOC_TABS;

  const handleFileUpload = async (field: "avatar_url" | "banner_url", file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }
    setUploading(field);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `orgs/${org.id}/${field}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
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
        toast.success(`Left ${org.name}`);
      } else {
        const { error } = await supabase.from("organization_members")
          .insert({ organization_id: org.id, user_id: me });
        if (error) throw error;
        setJoined(true);
        toast.success(`Joined ${org.name}`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setJoining(false);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/o/${org.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: org.name, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* cancelled */ }
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
              <img src={org.avatar_url} alt={org.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
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
          <MessageAllButton
            label="Message All"
            audienceLabel={`${org.name} members`}
            defaultGroupName={`${org.name} group chat`}
            loadCandidates={async () => {
              const { data: mem } = await supabase
                .from("organization_members")
                .select("user_id")
                .eq("organization_id", org.id);
              const ids = Array.from(new Set(((mem ?? []) as { user_id: string }[]).map((r) => r.user_id)));
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
          <button
            onClick={share}
            aria-label="Share"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white p-2 text-sm font-semibold text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={toggleJoin}
            disabled={joining}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-60 ${joined ? "border border-neutral-200 bg-neutral-100 text-neutral-700" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}
          >
            <Users className="h-4 w-4" /> {joined ? "Joined" : "Join"}
          </button>
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
          {me && (
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
          {TABS.map((t) => {
            const active = tab === t;
            const Icon = TAB_ICONS[t];
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
              </button>
            );
          })}
        </div>

        <div className="py-8">
          {tab === "About" && (isArtsOrg
            ? <ArtsOrgAboutTab org={org} canManage={canManage} onChange={setOrg} />
            : <AboutTab org={org} canManage={canManage} onChange={setOrg} initialEdit={editAbout} onEditClose={() => setEditAbout(false)} />
          )}
          {tab === "Events" && <EventsTab orgId={org.id} canManage={canManage} />}
          {tab === "Opportunities" && <OrgPostList orgId={org.id} kind="opportunity" canManage={canManage} />}
          {tab === "Press" && <PressTab org={org} canManage={canManage} />}
          {tab === "Updates" && <OrgPostList orgId={org.id} kind="update" canManage={canManage} />}
          {tab === "Posts" && <OrgPostList orgId={org.id} kind={null} canManage={canManage} />}
          {tab === "Artists" && <MembersTab orgId={org.id} />}
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
          {(["Announcements","Threads","Polls","Gallery","Resources","Jobs","Leaderboard","Rules","Invite","Voting","Minutes","Board","By Laws","Stories","Promotions","Reviews"]).includes(tab) && (
            <div className="py-14 text-center text-sm text-neutral-500">{tab} is empty.</div>
          )}
          {tab === "Comments" && <CommentsTab orgId={org.id} me={me} canManage={canManage} />}
        </div>
      </div>
    </AppLayout>
  );
}

function AboutTab({ org, canManage, onChange, initialEdit, onEditClose }: { org: Org; canManage: boolean; onChange: (o: Org) => void; initialEdit?: boolean; onEditClose?: () => void }) {
  const [edit, setEdit] = useState(!!initialEdit);
  useEffect(() => { if (initialEdit) setEdit(true); }, [initialEdit]);
  const [form, setForm] = useState({
    bio: org.bio ?? "", website: org.website ?? "", phone: org.phone ?? "",
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
    const { error } = await supabase.from("organizations").update({
      bio: form.bio || null, website: form.website || null, phone: form.phone || null,
      email: form.email || null, address: form.address || null, neighborhood: form.neighborhood || null,
      hours,
    }).eq("id", org.id);
    if (error) return toast.error(error.message);
    onChange({ ...org, ...form, hours });
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
  type OrgEvent = { id: string; title: string; starts_at: string; venue_name: string | null; image_url: string | null };
  const [events, setEvents] = useState<OrgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id,title,starts_at,venue_name,image_url")
        .eq("organization_id", _orgId)
        .order("starts_at", { ascending: false })
        .limit(50);
      setEvents((data ?? []) as OrgEvent[]);
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
          <CalendarIcon className="h-4 w-4" /> Manage Tickets in Studio
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

function OrgEventCard({ e }: { e: { id: string; title: string; starts_at: string; venue_name: string | null; image_url: string | null } }) {
  return (
    <a href={`/events/${e.id}`} className="block overflow-hidden rounded-2xl border border-neutral-200 bg-card transition hover:shadow-md">
      {e.image_url && <img src={e.image_url} alt={e.title} className="h-40 w-full object-cover" />}
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
            {p.avatar_url && <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />}
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
    mission: parsed.mission,
    description: parsed.description,
    programming: parsed.programming.join(", "),
    address: org.address ?? "",
    email: org.email ?? "",
    neighborhood: org.neighborhood ?? "",
  });

  const save = async () => {
    const tags = form.programming.split(",").map((t) => t.trim()).filter(Boolean);
    const bio = composeArtsBio(form.mission, form.description, tags);
    const { error } = await supabase.from("organizations").update({
      bio: bio || null,
      address: form.address || null,
      email: form.email || null,
      neighborhood: form.neighborhood || null,
    }).eq("id", org.id);
    if (error) return toast.error(error.message);
    onChange({ ...org, bio, address: form.address || null, email: form.email || null, neighborhood: form.neighborhood || null });
    setEdit(false);
    toast.success("Saved");
  };

  if (edit) {
    return (
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Mission</div>
          <textarea value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} rows={3} className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">Description</div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address / area" className="rounded-lg border border-neutral-200 px-3 py-2" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Contact email" className="rounded-lg border border-neutral-200 px-3 py-2" />
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

  const donateHref = org.website
    ? org.website
    : org.email
      ? `mailto:${org.email}?subject=${encodeURIComponent(`Donation to ${org.name}`)}`
      : null;

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
          {donateHref ? (
            <a
              href={donateHref}
              target={donateHref.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#d4580a] px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <Heart className="h-4 w-4" />
              Donate {donateInterval === "yearly" ? "yearly" : "one-time"}
            </a>
          ) : (
            <div className="text-xs text-neutral-500">Donation link not set yet.</div>
          )}
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
                <img src={t.image_url} alt={t.name} className="aspect-[16/9] w-full object-cover" loading="lazy" />
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
                    href={t.join_url || donateHref || "#"}
                    target={(t.join_url || donateHref || "").startsWith("http") ? "_blank" : undefined}
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
            <img src={imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
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

function OrgPostList({ orgId, kind, canManage }: { orgId: string; kind: "opportunity"|"press"|"update"|null; canManage: boolean }) {
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
            <img src={org.avatar_url} alt={`${org.name} logo`} className="h-24 w-24 rounded-xl border border-neutral-200 object-cover" />
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
                <img src={it.media_url!} alt={it.title} className="aspect-square w-full object-cover" loading="lazy" />
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
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    {r.link_url && (
                      <a href={r.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#d4580a] hover:underline">
                        <ExternalLink className="h-3 w-3" /> Read
                      </a>
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
                <input value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} placeholder="Image URL" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              ) : (
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Summary" rows={4} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              )}
              <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="Link URL (optional)" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
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

function OrgPostListImpl({ orgId, kind, canManage }: { orgId: string; kind: "opportunity"|"press"|"update"|null; canManage: boolean }) {
  const [items, setItems] = useState<OrgPost[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", link_url: "", media_url: "" });

  const load = async () => {
    let q = supabase.from("organization_posts").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    if (kind) q = q.eq("kind", kind);
    const { data } = await q;
    setItems((data ?? []) as OrgPost[]);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId, kind]);

  const add = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const { error } = await supabase.from("organization_posts").insert({
      org_id: orgId, author_id: uid, kind: kind ?? "update", title: form.title.trim(),
      body: form.body.trim() || null, link_url: form.link_url.trim() || null, media_url: form.media_url.trim() || null,
    });
    if (error) return toast.error(error.message);
    setOpen(false); setForm({ title: "", body: "", link_url: "", media_url: "" });
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("organization_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
            <Plus className="h-4 w-4" /> New {kind ?? "post"}
          </button>
        </div>
      )}
      {open && canManage && (
        <div className="space-y-2 rounded-2xl border border-border bg-neutral-50 p-4">
          <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Title" className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <textarea value={form.body} onChange={(e) => setForm({...form, body: e.target.value})} placeholder="Details" rows={3} className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <input value={form.link_url} onChange={(e) => setForm({...form, link_url: e.target.value})} placeholder="Link (optional)" className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <input value={form.media_url} onChange={(e) => setForm({...form, media_url: e.target.value})} placeholder="Image URL (optional)" className="w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <button onClick={add} className="w-full rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Post</button>
        </div>
      )}
      {items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No {kind ?? "post"} entries yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card">
              {p.media_url && <img src={p.media_url} alt={p.title} className="h-48 w-full object-cover" loading="lazy" decoding="async" />}
              <div className="p-4">
                <div className="font-semibold">{p.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                {p.body && <p className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">{p.body}</p>}
                {p.link_url && (
                  <a href={p.link_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#d4580a] hover:underline">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {canManage && (
                <button onClick={() => remove(p.id)} className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5 opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentsTab({ orgId, me, canManage }: { orgId: string; me: string | null; canManage: boolean }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");

  const load = async () => {
    const { data } = await supabase.from("organization_comments").select("*").eq("org_id", orgId).order("created_at", { ascending: false });
    const list = (data ?? []) as Comment[];
    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await (supabase as any).from("profiles_public").select("id, display_name, avatar_url").in("id", ids);
      const by = new Map(((profs ?? []) as Array<{ id: string; display_name: string | null; avatar_url: string | null }>).map((p) => [p.id, p]));
      list.forEach((c) => { c.profiles = by.get(c.user_id) ?? null; });
    }
    setComments(list);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const post = async () => {
    if (!me) return toast.error("Sign in to comment");
    if (!body.trim()) return;
    const { error } = await supabase.from("organization_comments").insert({ org_id: orgId, user_id: me, body: body.trim() });
    if (error) return toast.error(error.message);
    setBody(""); void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("organization_comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-4">
      {me ? (
        <div className="flex gap-2">
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Leave a comment…"
            className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm focus:border-orange-400 focus:outline-none" />
          <button onClick={post} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">Post</button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-neutral-50 p-3 text-sm text-muted-foreground">Sign in to leave a comment.</div>
      )}
      {comments.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">No comments yet.</div>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-secondary">
                {c.profiles?.avatar_url && <img src={c.profiles.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{c.profiles?.display_name ?? "User"}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
              </div>
              {(canManage || c.user_id === me) && (
                <button onClick={() => remove(c.id)} className="rounded-full p-1.5 text-neutral-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}