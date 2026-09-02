import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { useAuthState } from "@/components/public-preview";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";
import {
  Activity as ActivityIcon, Copy, Download, FileText, PenLine, Ticket, Video,
  Users, MessageCircle, UserPlus, ShoppingBag, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/activity")({
  component: ActivityFeedPage,
  head: () =>
    pageHead({
      path: "/activity",
      title: "Activity Feed | Planet Baltimore",
      description: "Everything happening on Planet Baltimore: posts, stories, events, videos, new members and more, filtered by day, week, month or a custom date range.",
    }),
});

type Kind = "post" | "story" | "event" | "video" | "page" | "comment" | "member" | "listing";

type Item = {
  id: string;
  kind: Kind;
  actorId: string | null;
  actorName: string;
  action: string;
  detail: string;
  at: string;
  to?: string;
};

const KIND_META: Record<Kind, { label: string; icon: typeof FileText; color: string }> = {
  post: { label: "Post", icon: FileText, color: "bg-orange-100 text-orange-700" },
  story: { label: "Story", icon: PenLine, color: "bg-amber-100 text-amber-700" },
  event: { label: "Event", icon: Ticket, color: "bg-emerald-100 text-emerald-700" },
  video: { label: "Video", icon: Video, color: "bg-sky-100 text-sky-700" },
  page: { label: "Page", icon: Users, color: "bg-violet-100 text-violet-700" },
  comment: { label: "Comment", icon: MessageCircle, color: "bg-blue-100 text-blue-700" },
  member: { label: "New member", icon: UserPlus, color: "bg-rose-100 text-rose-700" },
  listing: { label: "Listing", icon: ShoppingBag, color: "bg-teal-100 text-teal-700" },
};

type RangeKey = "today" | "week" | "month" | "custom";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function rangeFor(key: RangeKey, fromStr: string, toStr: string): { from: Date; to: Date } {
  const now = new Date();
  if (key === "custom") {
    const from = fromStr ? new Date(`${fromStr}T00:00:00`) : new Date(now.getTime() - 30 * 864e5);
    const to = toStr ? new Date(`${toStr}T23:59:59`) : now;
    return { from, to };
  }
  if (key === "today") return { from: startOfToday(), to: now };
  const days = key === "week" ? 7 : 30;
  return { from: new Date(now.getTime() - days * 864e5), to: now };
}

function trim(s: string | null | undefined, n = 120) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function fmt(at: string) {
  return new Date(at).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function ActivityFeedPage() {
  const auth = useAuthState();
  const [rangeKey, setRangeKey] = useState<RangeKey>("week");
  const [fromStr, setFromStr] = useState("");
  const [toStr, setToStr] = useState("");
  const [kinds, setKinds] = useState<Kind[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);

  const { from, to } = useMemo(() => rangeFor(rangeKey, fromStr, toStr), [rangeKey, fromStr, toStr]);

  useEffect(() => {
    if (!auth.signedIn) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const fromIso = from.toISOString();
      const toIso = to.toISOString();
      const win = <T,>(q: any) => q.gte("created_at", fromIso).lte("created_at", toIso).order("created_at", { ascending: false }).limit(300) as Promise<{ data: T[] | null }>;

      const [posts, stories, events, videos, orgs, comments, members, listings] = await Promise.all([
        win<any>(supabase.from("posts").select("id, user_id, content, post_type, created_at, is_deleted")),
        win<any>(supabase.from("stories").select("id, user_id, title, excerpt, created_at")),
        win<any>(supabase.from("events").select("id, user_id, title, venue_name, starts_at, created_at")),
        win<any>(supabase.from("videos").select("id, user_id, title, created_at")),
        win<any>(supabase.from("organizations").select("id, owner_id, name, type, slug, created_at")),
        win<any>(supabase.from("post_comments").select("id, user_id, post_id, body, created_at")),
        win<any>((supabase as any).from("profiles_public").select("id, display_name, username, created_at")),
        win<any>(supabase.from("marketplace_listings").select("id, seller_id, title, created_at")),
      ]);

      const raw: Item[] = [];
      for (const p of posts.data || []) {
        if (p.is_deleted) continue;
        raw.push({ id: `post-${p.id}`, kind: "post", actorId: p.user_id, actorName: "", action: "posted", detail: trim(p.content) || `a ${p.post_type || "post"}`, at: p.created_at, to: `/posts/${p.id}` });
      }
      for (const s of stories.data || [])
        raw.push({ id: `story-${s.id}`, kind: "story", actorId: s.user_id, actorName: "", action: "published a story", detail: trim(s.title) || trim(s.excerpt), at: s.created_at });
      for (const e of events.data || [])
        raw.push({ id: `event-${e.id}`, kind: "event", actorId: e.user_id, actorName: "", action: "created an event", detail: `${trim(e.title)}${e.venue_name ? ` at ${e.venue_name}` : ""}${e.starts_at ? ` (${new Date(e.starts_at).toLocaleDateString()})` : ""}`, at: e.created_at, to: `/events/${e.id}` });
      for (const v of videos.data || [])
        raw.push({ id: `video-${v.id}`, kind: "video", actorId: v.user_id, actorName: "", action: "uploaded a video", detail: trim(v.title), at: v.created_at });
      for (const o of orgs.data || [])
        raw.push({ id: `org-${o.id}`, kind: "page", actorId: o.owner_id, actorName: "", action: `created a ${o.type || "page"} page`, detail: trim(o.name), at: o.created_at, to: `/o/${o.slug}` });
      for (const c of comments.data || [])
        raw.push({ id: `comment-${c.id}`, kind: "comment", actorId: c.user_id, actorName: "", action: "commented", detail: trim(c.body), at: c.created_at, to: `/posts/${c.post_id}` });
      for (const m of members.data || [])
        raw.push({ id: `member-${m.id}`, kind: "member", actorId: m.id, actorName: m.display_name || m.username || "Someone", action: "joined Planet Baltimore", detail: "", at: m.created_at });
      for (const l of listings.data || [])
        raw.push({ id: `listing-${l.id}`, kind: "listing", actorId: l.seller_id, actorName: "", action: "listed an item", detail: trim(l.title), at: l.created_at });

      const ids = Array.from(new Set(raw.map((r) => r.actorId).filter(Boolean))) as string[];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await (supabase as any).rpc("public_profiles_by_ids", { _ids: ids });
        for (const p of (profs || []) as any[]) names.set(p.id, p.display_name || p.username || "Someone");
      }
      const resolved = raw
        .map((r) => ({ ...r, actorName: r.actorName || (r.actorId ? names.get(r.actorId) || "Someone" : "Someone") }))
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      if (!cancelled) {
        setItems(resolved);
        setLoading(false);
      }
    };
    load().catch((e) => {
      console.error("activity feed load failed", e);
      if (!cancelled) {
        setLoading(false);
        toast.error("Could not load the activity feed. Try again in a moment.");
      }
    });
    return () => { cancelled = true; };
  }, [auth.signedIn, from, to]);

  const visible = kinds.length ? items.filter((i) => kinds.includes(i.kind)) : items;

  const rangeLabel = `${from.toLocaleDateString()} to ${to.toLocaleDateString()}`;

  const asText = () =>
    [
      `Planet Baltimore activity feed`,
      rangeLabel,
      `${visible.length} entries`,
      "",
      ...visible.map((i) => `${fmt(i.at)} - ${i.actorName} ${i.action}${i.detail ? `: ${i.detail}` : ""}`),
    ].join("\n");

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(asText());
      toast.success(`Copied ${visible.length} entries to your clipboard.`);
    } catch {
      toast.error("Your browser blocked the copy. Select the text and copy manually.");
    }
  };

  const downloadPdf = async () => {
    if (!visible.length) { toast.error("There is nothing in this feed to download yet."); return; }
    setBuilding(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      const W = 595, H = 842, M = 48, size = 10, lh = 14;
      let page = doc.addPage([W, H]);
      let y = H - M;
      const write = (text: string, f = font, s = size, color = rgb(0.15, 0.15, 0.15)) => {
        const max = W - M * 2;
        const words = text.split(" ");
        let line = "";
        const flush = () => {
          if (!line) return;
          if (y < M) { page = doc.addPage([W, H]); y = H - M; }
          page.drawText(line, { x: M, y, size: s, font: f, color });
          y -= lh;
          line = "";
        };
        for (const w of words) {
          const next = line ? `${line} ${w}` : w;
          if (f.widthOfTextAtSize(next, s) > max) flush();
          line = line ? `${line} ${w}` : w;
        }
        flush();
      };
      write("Planet Baltimore activity feed", bold, 16);
      y -= 4;
      write(`${rangeLabel}  |  ${visible.length} entries`, font, 10, rgb(0.4, 0.4, 0.4));
      y -= 8;
      for (const i of visible) {
        write(`${fmt(i.at)} - ${i.actorName} ${i.action}`, bold, 10);
        if (i.detail) write(i.detail, font, 10, rgb(0.35, 0.35, 0.35));
        y -= 6;
      }
      const bytes = await doc.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `planet-baltimore-activity-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your activity PDF is downloading.");
    } catch (e) {
      console.error("activity pdf failed", e);
      toast.error("Could not build the PDF. Please try again.");
    } finally {
      setBuilding(false);
    }
  };

  if (auth.loading) return null;
  if (!auth.signedIn) {
    if (typeof window !== "undefined") {
      try { sessionStorage.setItem("pb_post_auth_redirect", "/activity"); } catch { /* ignore */ }
      window.location.replace("/auth");
    }
    return null;
  }

  const rangeButtons: { key: RangeKey; label: string }[] = [
    { key: "today", label: "Daily" },
    { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" },
    { key: "custom", label: "Custom dates" },
  ];

  return (
    <AppLayout>
      <HeroBanner title="Activity" subtitle="Everything happening on Planet Baltimore, as it happens." />
      <div className="h-6" />

      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            {rangeButtons.map((r) => (
              <Button
                key={r.key}
                size="sm"
                variant={rangeKey === r.key ? "default" : "outline"}
                className={rangeKey === r.key ? "bg-orange-600 hover:bg-orange-700" : ""}
                onClick={() => setRangeKey(r.key)}
              >
                {r.label}
              </Button>
            ))}
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copyAll}><Copy className="mr-2 h-4 w-4" /> Copy feed</Button>
              <Button size="sm" variant="outline" onClick={downloadPdf} disabled={building}>
                {building ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Download PDF
              </Button>
            </div>
          </div>

          {rangeKey === "custom" && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
              <label className="flex items-center gap-2">From <Input type="date" value={fromStr} onChange={(e) => setFromStr(e.target.value)} className="h-9 w-auto" /></label>
              <label className="flex items-center gap-2">To <Input type="date" value={toStr} onChange={(e) => setToStr(e.target.value)} className="h-9 w-auto" /></label>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(KIND_META) as Kind[]).map((k) => {
              const on = kinds.includes(k);
              return (
                <button
                  key={k}
                  onClick={() => setKinds((prev) => (on ? prev.filter((x) => x !== k) : [...prev, k]))}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${on ? "border-orange-500 bg-orange-50 text-orange-700" : "border-neutral-200 text-neutral-600 hover:border-orange-300"}`}
                >
                  {KIND_META[k].label}
                </button>
              );
            })}
            {kinds.length > 0 && (
              <button onClick={() => setKinds([])} className="rounded-full px-3 py-1 text-xs font-semibold text-neutral-500 underline">Clear</button>
            )}
          </div>

          <p className="mt-3 text-xs text-neutral-500">{rangeLabel} · {visible.length} entries</p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-neutral-500">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading activity…
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
            <ActivityIcon className="mx-auto mb-2 h-6 w-6" />
            No activity in this range yet.
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="select-text space-y-2">
            {visible.map((i) => {
              const meta = KIND_META[i.kind];
              const Icon = meta.icon;
              const body = (
                <>
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-neutral-800">
                      <b className="font-bold">{i.actorName}</b> {i.action}
                      {i.detail ? <span className="text-neutral-600">: {i.detail}</span> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-neutral-400">{fmt(i.at)} · {meta.label}</span>
                  </span>
                </>
              );
              const cls = "flex items-start gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition hover:border-orange-300";
              return i.to ? (
                <a key={i.id} href={i.to} className={cls}>{body}</a>
              ) : (
                <div key={i.id} className={cls}>{body}</div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
