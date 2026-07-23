import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { useUserRole } from "@/hooks/use-user-role";
import { OrgCreateDialog } from "@/components/org-create-dialog";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Plus, MapPin, Search, Users, ShieldCheck, Building2 } from "lucide-react";
import { EmptyState, ListSkeleton } from "@/components/shared/empty-state";
import { GROUP_SUBTYPES } from "@/lib/categories";

function prettyLabel(v: string) {
  return v
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

type Org = {
  id: string; slug: string; name: string; bio: string | null;
  type: string; subtype: string | null; neighborhood: string | null;
  avatar_url: string | null; banner_url: string | null;
  member_count?: number | null;
  created_at?: string;
};

const CATEGORIES = ["All", ...GROUP_SUBTYPES] as const;

export function GroupsPage() {
  const { isArtist, isAdmin } = useUserRole();
  const canCreate = true;
  const [items, setItems] = useState<Org[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"newest" | "members">("newest");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");

  const load = async () => {
    setLoading(true);
    let qb = supabase.from("organizations").select("*").eq("type", "group");
    if (sort === "members") qb = qb.order("member_count", { ascending: false, nullsFirst: false });
    else qb = qb.order("created_at", { ascending: false });
    const { data } = await qb;
    const rows = (data ?? []) as Org[];
    // Prioritize items that have images (avatar or banner) so cards with visuals show first.
    rows.sort((a, b) => {
      const aHas = a.avatar_url || a.banner_url ? 1 : 0;
      const bHas = b.avatar_url || b.banner_url ? 1 : 0;
      return bHas - aHas;
    });
    setItems(rows);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sort]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((o) => {
      if (cat !== "All" && (o.subtype ?? "").toLowerCase() !== cat.toLowerCase()) return false;
      if (!needle) return true;
      return (
        o.name.toLowerCase().includes(needle) ||
        (o.bio ?? "").toLowerCase().includes(needle) ||
        (o.neighborhood ?? "").toLowerCase().includes(needle)
      );
    });
  }, [items, q, cat]);

  return (
    <AppLayout title="Groups / Communities" subtitle="Find your people and build something together in Baltimore.">
      <div className="space-y-6">
        <HeroBanner
          title="Groups / Communities"
          subtitle="Find your people and build something together in Baltimore."
          cta={
            <div className="flex flex-wrap items-center gap-2">
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d4580a]/40 bg-white px-5 py-2.5 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"
                >
                  <Plus className="h-4 w-4" /> Create Group/Community
                </button>
              )}
            </div>
          }
        />

        <Link
          to="/community-associations"
          className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 transition hover:border-orange-300 hover:bg-white"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-neutral-200">
            <Building2 className="h-5 w-5 text-neutral-500" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-neutral-900">Neighborhood Associations</div>
            <div className="text-sm text-neutral-500">Official governance hubs for your neighborhood</div>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search communities..."
              className="w-full rounded-2xl border border-neutral-200 bg-white py-3.5 pl-11 pr-4 text-sm placeholder:text-neutral-400 focus:border-orange-400 focus:outline-none"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "newest" | "members")}
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-sm font-medium text-neutral-700 focus:border-orange-400 focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="members">Most Members</option>
          </select>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition ${
                cat === c
                  ? "bg-[#d4580a] text-white"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:border-orange-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <ListSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No communities found"
            description="Try a different filter, or start a new group."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((o) => (
              <Link
                key={o.id}
                to="/o/$slug"
                params={{ slug: o.slug }}
                className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:border-orange-300 hover:shadow-md"
              >
                <div
                  className="relative h-32 w-full bg-gradient-to-br from-neutral-200 to-neutral-100"
                  style={
                    o.banner_url
                      ? { backgroundImage: `url(${o.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                >
                  <div
                    className="absolute -bottom-6 left-4 h-16 w-16 overflow-hidden rounded-xl bg-neutral-100 ring-4 ring-white"
                    style={
                      o.avatar_url
                        ? { backgroundImage: `url(${o.avatar_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : undefined
                    }
                  />
                </div>
                <div className="px-4 pb-4 pt-8">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="truncate text-[17px] font-bold text-neutral-900">{o.name}</div>
                    <ShieldCheck className="h-4 w-4 shrink-0 text-orange-500" />
                  </div>
                  {o.subtype && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                        {prettyLabel(o.subtype)}
                      </span>
                    </div>
                  )}
                  {o.bio && (
                    <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{o.bio}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                    {typeof o.member_count === "number" && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {o.member_count} members
                      </span>
                    )}
                    {o.neighborhood && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {o.neighborhood}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <OrgCreateDialog type="group" open={open} onClose={() => { setOpen(false); void load(); }} />
    </AppLayout>
  );
}