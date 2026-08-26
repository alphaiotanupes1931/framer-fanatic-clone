import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "@/components/smart-image";

/** Long-form About for any person's public profile (read-only). */
export function PersonAboutTab({ profile }: { profile: any }) {
  const userId: string | undefined = profile?.id;
  const [longAbout, setLongAbout] = useState("");
  const [cv, setCv] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profile_sections")
        .select("id,kind,body,media_url,title")
        .eq("user_id", userId)
        .in("kind", ["about_long", "cv"]);
      if (cancelled) return;
      const a = (data ?? []).find((r: any) => r.kind === "about_long");
      const c = (data ?? []).find((r: any) => r.kind === "cv");
      setLongAbout((a?.body as string) ?? "");
      if (c?.media_url) setCv({ url: c.media_url as string, name: (c.title as string) || "CV" });
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const rows: Array<{ label: string; value: string | null }> = [
    { label: "Name", value: profile?.display_name || null },
    { label: "Username", value: profile?.username ? `@${profile.username}` : null },
    { label: "Neighborhood", value: profile?.neighborhood || null },
    { label: "Website", value: profile?.website || null },
  ].filter((r) => !!r.value);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">About</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {longAbout || profile?.bio || "Nothing here yet."}
        </p>
      </div>
      {rows.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Details</h3>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.label} className="flex gap-2 text-sm">
                <dt className="w-28 shrink-0 text-muted-foreground">{r.label}</dt>
                <dd className="min-w-0 break-words font-medium">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {cv && (
        <a href={cv.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
          <ExternalLink className="h-4 w-4" /> {cv.name}
        </a>
      )}
    </div>
  );
}

/** Published stories written by this person. */
export function PersonWritingsTab({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let q = supabase
        .from("stories")
        .select("id,title,excerpt,cover_url,created_at,status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!isSelf) q = q.eq("status", "published");
      const { data } = await q;
      if (cancelled) return;
      setRows(data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, isSelf]);

  const publish = async (id: string) => {
    setPublishing(id);
    const { error } = await supabase.from("stories").update({ status: "published" }).eq("id", id);
    setPublishing(null);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "published" } : r)));
    toast.success("Story published");
  };

  const header = isSelf ? (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">{rows.length} {rows.length === 1 ? "story" : "stories"}</div>
      <Link to="/create-story" className="inline-flex items-center rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8480a]">Write a story</Link>
    </div>
  ) : null;

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading writings…</div>;
  if (rows.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        {header}
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No writings yet.
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
      {header}
      {rows.map((s) => (
        <Link key={s.id} to="/stories/$storyId" params={{ storyId: s.id }} className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-md">
          {s.cover_url && <SmartImage src={s.cover_url} alt={s.title} bucket="story-covers" className="h-24 w-40 shrink-0 object-cover sm:h-28 sm:w-56" />}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3 sm:p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {new Date(s.created_at).toLocaleDateString()}
            </div>
            <div className="line-clamp-1 font-bold leading-tight">{s.title}</div>
            {s.excerpt && <p className="line-clamp-2 text-sm text-muted-foreground">{s.excerpt}</p>}
          </div>
          {isSelf && s.status !== "published" && (
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

/** Saved posts. Public: anyone can browse what this person bookmarked. */
export function PersonSavedTab({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("public_saved_posts", { _user_id: userId, lim: 60 });
      if (cancelled) return;
      setRows((data as any[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading saved…</div>;
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-12 text-center">
        <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
        <div className="mt-3 text-sm text-muted-foreground">Nothing saved yet.</div>
        {isSelf && (
          <Link to="/saved" className="mt-4 inline-block rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8480a]">Open Saved</Link>
        )}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {rows.map((p) => {
        const media = (p.media_urls as string[] | null)?.[0] ?? null;
        return (
          <Link key={p.id} to="/posts/$postId" params={{ postId: p.id }} className="group block overflow-hidden rounded-xl border border-border bg-card">
            {media ? (
              <SmartImage src={media} alt={p.content ?? "Saved post"} bucket="post-media" className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                <span className="line-clamp-5">{p.content}</span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

/** Upcoming events this person is attending. Visible to everyone. */
export function PersonAttendingTab({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("public_attending_events", { _user_id: userId, lim: 60 });
      if (cancelled) return;
      setRows((data as any[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  const now = Date.now();
  const upcoming = rows
    .filter((r) => r.starts_at && new Date(r.starts_at).getTime() >= now)
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  if (upcoming.length === 0) return <div className="py-12 text-center text-muted-foreground">No upcoming events yet.</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {upcoming.map((r) => (
        <Link key={r.id} to="/events/$eventId" params={{ eventId: r.id }} className="block overflow-hidden rounded-2xl border border-border transition hover:shadow-md">
          {r.image_url && <SmartImage src={r.image_url} alt={r.title} bucket="event-images" className="h-40 w-full object-cover" />}
          <div className="space-y-1.5 p-4">
            <div className="text-xs text-muted-foreground">
              {new Date(r.starts_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div className="line-clamp-2 font-bold leading-tight">{r.title}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Groups and community associations this person has joined. */
export function PersonMembershipsTab({ userId, isSelf = false }: { userId: string; isSelf?: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: mems } = await supabase
        .from("organization_members")
        .select("organization_id, status, is_public")
        .eq("user_id", userId);
      const visible = (mems ?? []).filter((m: any) => (!m.status || m.status === "approved") && (isSelf || m.is_public !== false));
      const publicById = new Map(visible.map((m: any) => [m.organization_id, m.is_public !== false]));
      const ids = visible.map((m: any) => m.organization_id);
      if (ids.length === 0) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name, slug, type, subtype, avatar_url, is_public")
        .in("id", ids);
      if (cancelled) return;
      setRows((orgs ?? [])
        .filter((o: any) => o.is_public !== false)
        .map((o: any) => ({ ...o, membership_public: publicById.get(o.id) !== false })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, isSelf]);

  const toggleVisibility = async (orgId: string, next: boolean) => {
    setBusy(orgId);
    const { error } = await supabase
      .from("organization_members")
      .update({ is_public: next })
      .eq("organization_id", orgId)
      .eq("user_id", userId);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    setRows((prev) => prev.map((o) => (o.id === orgId ? { ...o, membership_public: next } : o)));
    toast.success(next ? "Membership is public" : "Membership is private");
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading memberships…</div>;
  if (rows.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No memberships yet.</div>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((o) => (
        <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
        <Link to="/o/$slug" params={{ slug: o.slug }} className="group flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
            {o.avatar_url && <SmartImage src={o.avatar_url} alt={o.name} className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{o.name}</div>
            <div className="truncate text-xs uppercase tracking-wider text-muted-foreground">
              {[o.type, o.subtype].filter(Boolean).join(" · ")}
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-[#d4580a]" />
        </Link>
        {isSelf && (
          <button
            type="button"
            disabled={busy === o.id}
            onClick={() => void toggleVisibility(o.id, !o.membership_public)}
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
              o.membership_public
                ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]"
                : "border-border text-muted-foreground hover:border-[#d4580a]"
            }`}
          >
            {o.membership_public ? "Public" : "Private"}
            <span className="font-normal opacity-70">· {o.membership_public ? "shown on your profile" : "only you can see it"}</span>
          </button>
        )}
        </div>
      ))}
    </div>
  );
}

/** Public organization / artist pages this person owns. */
export function PersonPagesTab({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let q = supabase
        .from("organizations")
        .select("id, name, slug, type, subtype, avatar_url, is_public")
        .eq("owner_id", userId)
        .not("type", "in", '("resident","visitor")');
      if (!isSelf) q = q.neq("is_public", false);
      const { data } = await q;
      if (cancelled) return;
      setOrgs(data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, isSelf]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading…</div>;
  if (orgs.length === 0) return <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">No pages yet.</div>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {orgs.map((o) => (
        <Link key={o.id} to="/o/$slug" params={{ slug: o.slug }} className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-[#d4580a] hover:shadow-sm">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
            {o.avatar_url && <SmartImage src={o.avatar_url} alt={o.name} className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{o.name}</div>
            <div className="truncate text-xs uppercase tracking-wider text-muted-foreground">
              {[o.type, o.subtype].filter(Boolean).join(" · ")}
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-[#d4580a]" />
        </Link>
      ))}
    </div>
  );
}
