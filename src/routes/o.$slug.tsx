import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { useUserRole } from "@/hooks/use-user-role";
import { ORG_TYPE_LABEL } from "@/lib/categories";
import { Globe, Phone, Mail, MapPin, Clock, Plus, Trash2, ExternalLink, Share2, ArrowLeft, ShieldCheck, BadgeCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { MessageAllButton } from "@/components/message-all-button";

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

const TABS = ["About", "Events", "Opportunities", "Press", "Updates", "Comments"] as const;
type Tab = (typeof TABS)[number];

function OrgProfile() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [me, setMe] = useState<string | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [tab, setTab] = useState<Tab>("About");
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMe(data.session?.user.id ?? null));
  }, []);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("organizations").select("*").eq("slug", slug).maybeSingle();
      setOrg(data as Org | null);
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
    if (!org || !me) { setFollowing(false); return; }
    (async () => {
      const { data } = await supabase
        .from("organization_followers")
        .select("user_id")
        .eq("organization_id", org.id)
        .eq("user_id", me)
        .maybeSingle();
      setFollowing(!!data);
    })();
  }, [org, me]);

  if (!org) return <AppLayout title="" hero={false}><div className="py-20 text-center text-muted-foreground">Loading…</div></AppLayout>;

  const isOwner = !!me && me === org.owner_id;
  const canManage = isOwner || isAdmin;

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

  const toggleFollow = async () => {
    if (!me) { toast.error("Please sign in first"); return; }
    setFollowBusy(true);
    try {
      if (following) {
        const { error } = await supabase.from("organization_followers").delete()
          .eq("organization_id", org.id).eq("user_id", me);
        if (error) throw error;
        setFollowing(false);
        toast.success(`Unfollowed ${org.name}`);
      } else {
        const { error } = await supabase.from("organization_followers")
          .insert({ organization_id: org.id, user_id: me });
        if (error) throw error;
        setFollowing(true);
        toast.success(`Following ${org.name}`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setFollowBusy(false);
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
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-[#d4580a]"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {/* Banner with floating badges */}
        <div className="relative h-56 bg-gradient-to-br from-orange-300 to-orange-600"
          style={org.banner_url ? { backgroundImage: `url(${org.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-neutral-800 shadow-sm backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-neutral-700" /> Official {ORG_TYPE_LABEL[org.type]}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/95 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 sm:px-8">
          <div className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-secondary shadow-sm sm:h-28 sm:w-28">
              {org.avatar_url && <img src={org.avatar_url} alt={org.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:pt-1">
              <button onClick={share} aria-label="Share" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-white text-neutral-700 shadow-sm hover:border-[#d4580a] hover:text-[#d4580a]">
                <Share2 className="h-4 w-4" />
              </button>
              <button
                onClick={toggleFollow}
                disabled={followBusy}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60 ${following ? "border border-border bg-white text-neutral-700 hover:border-[#d4580a]" : "border border-border bg-white text-neutral-700 hover:border-[#d4580a] hover:text-[#d4580a]"}`}
              >
                {following ? "Following" : "Follow"}
              </button>
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
                onClick={toggleJoin}
                disabled={joining}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60 ${joined ? "border border-border bg-white text-neutral-700 hover:border-[#d4580a]" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}
              >
                <Users className="h-4 w-4" /> {joined ? "Joined" : "Join"}
              </button>
              {canManage && (
                <button onClick={async () => {
                  if (!confirm("Delete this organization?")) return;
                  const { error } = await supabase.from("organizations").delete().eq("id", org.id);
                  if (error) return toast.error(error.message);
                  toast.success("Deleted");
                  navigate({ to: "/dashboard" });
                }} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Name + bio */}
          <div className="mt-5">
            <h1 className="text-2xl font-bold leading-tight text-neutral-900 sm:text-[28px]">{org.name}</h1>
            {org.bio && (
              <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-neutral-600">{org.bio}</p>
            )}
          </div>

          {/* Inline meta row */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-500">
            {org.neighborhood && (
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {org.neighborhood}</span>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-[#d4580a]"><Globe className="h-4 w-4" /> Website</a>
            )}
            {org.email && (
              <a href={`mailto:${org.email}`} className="inline-flex items-center gap-1.5 hover:text-[#d4580a]"><Mail className="h-4 w-4" /> {org.email}</a>
            )}
            {org.phone && (
              <a href={`tel:${org.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#d4580a]"><Phone className="h-4 w-4" /> {org.phone}</a>
            )}
            {org.address && (
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {org.address}</span>
            )}
          </div>

          {/* Tabs: orange pill for active */}
          <div className="mt-6 -mx-1 flex gap-1 overflow-x-auto pb-1">
            {TABS.map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[#d4580a] text-white shadow-sm"
                      : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div className="py-6">
            {tab === "About" && <AboutTab org={org} canManage={canManage} onChange={setOrg} />}
            {tab === "Events" && <EventsTab orgId={org.id} canManage={canManage} />}
            {tab === "Opportunities" && <OrgPostList orgId={org.id} kind="opportunity" canManage={canManage} />}
            {tab === "Press" && <OrgPostList orgId={org.id} kind="press" canManage={canManage} />}
            {tab === "Updates" && <OrgPostList orgId={org.id} kind="update" canManage={canManage} />}
            {tab === "Comments" && <CommentsTab orgId={org.id} me={me} canManage={canManage} />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function AboutTab({ org, canManage, onChange }: { org: Org; canManage: boolean; onChange: (o: Org) => void }) {
  const [edit, setEdit] = useState(false);
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
    toast.success("Saved");
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => setEdit((v) => !v)} className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary">
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
  // Events are owned by users right now, not orgs. Show a placeholder linking to the events page.
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-card p-10 text-center text-muted-foreground">
      Event hosting per organization is coming soon. For now, owners can post events from the main Events page.
    </div>
  );
}

function OrgPostList({ orgId, kind, canManage }: { orgId: string; kind: "opportunity"|"press"|"update"; canManage: boolean }) {
  const [items, setItems] = useState<OrgPost[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", link_url: "", media_url: "" });

  const load = async () => {
    const { data } = await supabase.from("organization_posts").select("*").eq("org_id", orgId).eq("kind", kind).order("created_at", { ascending: false });
    setItems((data ?? []) as OrgPost[]);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId, kind]);

  const add = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const { error } = await supabase.from("organization_posts").insert({
      org_id: orgId, author_id: uid, kind, title: form.title.trim(),
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
            <Plus className="h-4 w-4" /> New {kind}
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
        <div className="py-12 text-center text-muted-foreground">No {kind} entries yet.</div>
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