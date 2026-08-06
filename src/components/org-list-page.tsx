import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { useUserRole } from "@/hooks/use-user-role";
import { ORG_TYPE_LABEL, subtypesFor } from "@/lib/categories";
import { OrgCreateDialog } from "@/components/org-create-dialog";
import { Plus, MapPin, Search, Building2, List } from "lucide-react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { HeroBanner } from "@/components/shared/hero-banner";
import { BaltimoreMap } from "@/components/baltimore-map";
import { EmptyState, CardGridSkeleton } from "@/components/shared/empty-state";
import { Img } from "@/components/shared/smart-img";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { prefetchImageUrls } from "@/components/smart-image";

function prettyLabel(v: string) {
  return v
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

type Org = {
  id: string; slug: string; name: string; bio: string | null;
  type: string; subtype: string | null; neighborhood: string | null;
  avatar_url: string | null; banner_url: string | null;
};

export function OrgListPage({
  type,
  title,
  subtitle,
  showMap = true,
  showSort = false,
  showFeatured = false,
}: {
  type: "arts_org" | "business" | "community_assoc" | "group";
  title: string;
  subtitle: string;
  showMap?: boolean;
  showSort?: boolean;
  showFeatured?: boolean;
}) {
  const { isArtist, isAdmin } = useUserRole();
  const canCreate = true;
  const subs = subtypesFor(type);
  const [q, setQ] = useState("");
  const [sub, setSub] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<"newest" | "followed">("newest");
  const [view, setView] = useState<"list" | "map">("list");

  // One fetch per org type, cached across visits. Search, subtype and sort all
  // filter that list in memory so typing and tab switching are instant.
  const { data: all, loading, setData, refetch } = useCachedFetch<Org[]>(`orglist:${type}`, async () => {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("type", type)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Org[];
    prefetchImageUrls(list.slice(0, 12).flatMap((o) => [o.avatar_url, o.banner_url]));
    return list;
  });

  const items = useMemo(() => {
    let list = all ?? [];
    if (sub) list = list.filter((o) => o.subtype === sub);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(needle) ||
          (o.bio ?? "").toLowerCase().includes(needle) ||
          (o.neighborhood ?? "").toLowerCase().includes(needle),
      );
    }
    // Prioritize orgs that have a picture (avatar or banner) so they surface first
    return [...list].sort((a, b) => {
      const ap = (a.avatar_url ? 2 : 0) + (a.banner_url ? 1 : 0);
      const bp = (b.avatar_url ? 2 : 0) + (b.banner_url ? 1 : 0);
      return bp - ap;
    });
  }, [all, sub, q, sort]);

  const handleDelete = async (e: React.MouseEvent, o: Org) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${o.name}"? This can be restored from Admin Trash.`)) return;
    const { error } = await supabase.rpc("admin_delete_organization", { _id: o.id });
    if (error) { toast.error(error.message); return; }
    setData((prev) => (prev ?? []).filter((x) => x.id !== o.id));
    toast.success("Deleted");
  };

  return (
    <AppLayout title={title} subtitle={subtitle}>
      <div className="space-y-6">
        <HeroBanner
          title={title}
          subtitle={subtitle}
          cta={
            <div className="flex flex-wrap items-center gap-2">
              {showMap && (
                <button
                  type="button"
                  onClick={() => setView((v) => (v === "map" ? "list" : "map"))}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d4580a]/40 bg-white px-4 py-2 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"
                >
                  {view === "map" ? <><List className="h-4 w-4" /> List</> : <><MapPin className="h-4 w-4" /> Map</>}
                </button>
              )}
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d4580a]/40 bg-white px-4 py-2 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"
                >
                  <Plus className="h-4 w-4" /> Create {ORG_TYPE_LABEL[type]} Page
                </button>
              )}
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full rounded-full border border-neutral-200 bg-neutral-100/70 py-3 pl-11 pr-4 text-sm placeholder:text-neutral-400 focus:border-orange-400 focus:bg-white focus:outline-none"
            />
          </div>
          {showSort && (
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "newest" | "followed")}
              className="rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 focus:border-orange-400 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="followed">Most Followed</option>
            </select>
          )}
        </div>

        {subs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSub("")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                sub === ""
                  ? "bg-[#d4580a] text-white"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:border-orange-300"
              }`}
            >
              All
            </button>
            {subs.map((s) => (
              <button
                key={s}
                onClick={() => setSub(s)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  sub === s
                    ? "bg-[#d4580a] text-white"
                    : "border border-neutral-200 bg-white text-neutral-600 hover:border-orange-300"
                }`}
              >
                {prettyLabel(s)}
              </button>
            ))}
          </div>
        )}

        {view === "map" && (
          <div className="overflow-hidden rounded-2xl border border-neutral-200">
            <BaltimoreMap />
          </div>
        )}

        {showFeatured && !loading && items.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold text-neutral-900">Featured</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.slice(0, 3).map((o) => (
                <Link key={`f-${o.id}`} to="/o/$slug" params={{ slug: o.slug }}
                  className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:border-orange-300 hover:shadow-sm">
                  <div className="relative h-40 bg-neutral-100"
                    style={o.banner_url ? { backgroundImage: `url(${o.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                    <div className="absolute -bottom-6 left-4 h-14 w-14 overflow-hidden rounded-xl border-4 border-white bg-neutral-200 shadow-sm">
                      {o.avatar_url && <Img src={o.avatar_url} alt={o.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />}
                    </div>
                  </div>
                  <div className="px-4 pb-4 pt-8">
                    <div className="truncate text-base font-bold text-neutral-900">{o.name}</div>
                    {o.subtype && <div className="mt-1 text-sm text-neutral-600">{prettyLabel(o.subtype)}</div>}
                    {o.bio && <p className="mt-2 line-clamp-3 text-sm text-neutral-600">{o.bio}</p>}
                    {o.neighborhood && (
                      <div className="mt-3 inline-flex items-center gap-1 text-sm text-neutral-500">
                        <MapPin className="h-3.5 w-3.5" /> {o.neighborhood}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <h2 className="mt-8 mb-3 text-lg font-bold text-neutral-900">All Organizations</h2>
          </section>
        )}

        {loading ? (
          <CardGridSkeleton count={6} aspect="aspect-[16/10]" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={`No ${title.toLowerCase()} found`}
            description={`Be the first to add a Baltimore ${ORG_TYPE_LABEL[type].toLowerCase()}.`}
            action={canCreate ? (
              <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8480a]">
                <Plus className="h-4 w-4" /> Create page
              </button>
            ) : undefined}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((o) => (
              <Link key={o.id} to="/o/$slug" params={{ slug: o.slug }}
                className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:border-orange-300 hover:shadow-sm">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, o)}
                    aria-label="Delete organization"
                    className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-sm ring-1 ring-black/10 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <div className="relative h-40 bg-neutral-100"
                  style={o.banner_url ? { backgroundImage: `url(${o.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                  <div className="absolute -bottom-6 left-4 h-14 w-14 overflow-hidden rounded-xl border-4 border-white bg-neutral-200 shadow-sm">
                    {o.avatar_url && <Img src={o.avatar_url} alt={o.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />}
                  </div>
                </div>
                <div className="px-4 pb-4 pt-8">
                  <div className="flex items-center gap-1.5">
                    <div className="truncate text-base font-bold text-neutral-900">{o.name}</div>
                    <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-neutral-300" aria-hidden />
                  </div>
                  {o.subtype && <div className="mt-1 text-sm text-neutral-600">{prettyLabel(o.subtype)}</div>}
                  {o.neighborhood && (
                    <div className="mt-3 inline-flex items-center gap-1 text-sm text-neutral-500">
                      <MapPin className="h-3.5 w-3.5" /> {o.neighborhood}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <OrgCreateDialog type={type} open={open} onClose={() => { setOpen(false); refetch(); }} />
    </AppLayout>
  );
}