import { stripHtml } from "@/lib/text-utils";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { HeroBanner } from "@/components/shared/hero-banner";
import { EmptyState, ListSkeleton } from "@/components/shared/empty-state";
import { Img } from "@/components/shared/smart-img";
import { Plus, MapPin, Search, Users, ShieldCheck } from "lucide-react";
import { pageHead } from "@/lib/seo";
import { OrgLink } from "@/components/org/org-link";

type Org = {
  id: string; slug: string; name: string; bio: string | null;
  type: string; subtype: string | null; neighborhood: string | null;
  avatar_url: string | null; banner_url: string | null;
  tagline?: string | null; member_count?: number | null;
};

const TABS = [
  { key: "all", label: "All" },
  { key: "community_assoc", label: "Community Associations" },
  { key: "group", label: "Groups" },
] as const;

function CommunitiesPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");

  const { data, loading } = useCachedFetch<Org[]>("orgs:communities_hub", async () => {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .in("type", ["community_assoc", "group"])
      .order("name", { ascending: true });
    return (data ?? []) as Org[];
  });

  const all = useMemo(() => data ?? [], [data]);
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((o) => {
      if (tab !== "all" && o.type !== tab) return false;
      if (!needle) return true;
      return (
        o.name.toLowerCase().includes(needle) ||
        (o.bio ?? "").toLowerCase().includes(needle) ||
        (o.neighborhood ?? "").toLowerCase().includes(needle)
      );
    });
  }, [all, q, tab]);

  return (
    <AppLayout title="Communities" subtitle="Community associations and groups across Baltimore.">
      <div className="space-y-6">
        <HeroBanner
          title="Communities"
          subtitle="Browse Baltimore's community associations and groups, then jump into the one that fits you."
          cta={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/create-community-association"
                className="inline-flex items-center gap-2 rounded-full border border-[#d4580a]/40 bg-white px-5 py-2.5 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"
              >
                <Plus className="h-4 w-4" /> Create Association
              </Link>
              <Link
                to="/create-community"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-muted"
              >
                <Plus className="h-4 w-4" /> Create Group
              </Link>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                  active
                    ? "bg-[#d4580a] text-white"
                    : "border border-border bg-background text-foreground hover:border-orange-300"
                }`}
              >

                {t.label}
              </button>
            );
          })}
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search communities or neighborhoods..."
              className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm placeholder:text-neutral-400 focus:border-orange-400 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <ListSkeleton count={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No communities found"
            description="Try another search, or start a new association or group."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((o) => (
              <OrgLink
                key={o.id}
                type={o.type}
                slug={o.slug}
                className="group flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-sm"
              >
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                  {(o.avatar_url || o.banner_url) && (
                    <Img
                      src={(o.avatar_url ?? o.banner_url) as string}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-[17px] font-bold text-neutral-900">{o.name}</div>
                    <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                      {o.type === "community_assoc" ? (<><ShieldCheck className="h-3 w-3" /> Community Association</>) : (<><Users className="h-3 w-3" /> Group</>)}
                    </span>
                  </div>
                  {o.tagline && <div className="mt-1 truncate text-sm font-semibold text-neutral-800">{o.tagline}</div>}
                  {o.bio && <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{stripHtml(o.bio)}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                    {typeof o.member_count === "number" && (
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {o.member_count} members</span>
                    )}
                    {o.neighborhood && (
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {o.neighborhood}</span>
                    )}
                  </div>
                </div>
              </OrgLink>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export const Route = createFileRoute("/communities")({
  component: CommunitiesPage,
  head: () =>
    pageHead({
      path: "/communities",
      title: "Baltimore Communities | Planet Baltimore",
      description: "Browse Baltimore community associations and groups, and find the community that fits you.",
    }),
});
