import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { useUserRole } from "@/hooks/use-user-role";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { OrgCreateDialog } from "@/components/org-create-dialog";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Plus, MapPin, Search, Users, ShieldCheck, CheckCircle2 } from "lucide-react";
import { EmptyState, ListSkeleton } from "@/components/shared/empty-state";
import { COMMUNITY_ASSOC_SUBTYPES } from "@/lib/categories";

type Org = {
  id: string; slug: string; name: string; bio: string | null;
  type: string; subtype: string | null; neighborhood: string | null;
  avatar_url: string | null; banner_url: string | null;
  tagline?: string | null; member_count?: number | null; verified?: boolean | null;
};

export function CommunityAssociationsPage() {
  const { isArtist, isAdmin } = useUserRole();
  const canCreate = true;
  const [q, setQ] = useState("");
  const [subtype, setSubtype] = useState<string>("All");
  const [open, setOpen] = useState(false);

  // One cached fetch of every association; search and type filters run locally
  // so switching filters or returning to this tab is instant.
  const { data, loading, refetch } = useCachedFetch<Org[]>("orgs:community_assoc", async () => {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("type", "community_assoc")
      .order("name", { ascending: true });
    return (data ?? []) as Org[];
  });
  const all = data ?? [];
  const needle = q.trim().toLowerCase();
  const items = all.filter((o) => {
    if (subtype !== "All" && (o.subtype ?? "").toLowerCase() !== subtype.toLowerCase()) return false;
    if (!needle) return true;
    return (
      o.name.toLowerCase().includes(needle) ||
      (o.bio ?? "").toLowerCase().includes(needle) ||
      (o.neighborhood ?? "").toLowerCase().includes(needle)
    );
  });

  return (
    <AppLayout title="Community Associations" subtitle="Official community governance hubs for Baltimore neighborhoods.">
      <div className="space-y-6">
        <HeroBanner
          title="Community Associations"
          subtitle="Official community governance hubs for Baltimore neighborhoods."
          cta={
            <div className="flex flex-wrap items-center gap-2">
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d4580a]/40 bg-white px-5 py-2.5 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"
                >
                  <Plus className="h-4 w-4" /> Create Community Association
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
              placeholder="Search associations or neighborhoods..."
              className="w-full rounded-2xl border border-neutral-200 bg-white py-3.5 pl-11 pr-4 text-sm placeholder:text-neutral-400 focus:border-orange-400 focus:outline-none"
            />
          </div>
          <select
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-sm font-medium text-neutral-700 focus:border-orange-400 focus:outline-none"
          >
            <option value="All">All types</option>
            {COMMUNITY_ASSOC_SUBTYPES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <ListSkeleton count={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No community associations found"
            description="Be the first to add a Baltimore community association."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((o) => (
              <Link
                key={o.id}
                to="/o/$slug"
                params={{ slug: o.slug }}
                className="group flex gap-4 rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-sm"
              >
                <div
                  className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100"
                  style={
                    o.avatar_url || o.banner_url
                      ? {
                          backgroundImage: `url(${o.avatar_url ?? o.banner_url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-[17px] font-bold text-neutral-900">{o.name}</div>
                    <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                      <ShieldCheck className="h-3 w-3" /> Official
                    </span>
                    {o.verified && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </div>
                  {o.tagline && (
                    <div className="mt-1 truncate text-sm font-semibold text-neutral-800">{o.tagline}</div>
                  )}
                  {o.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{o.bio}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
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
      <OrgCreateDialog type="community_assoc" open={open} onClose={() => { setOpen(false); refetch(); }} />
    </AppLayout>
  );
}