import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";

type Creator = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  neighborhood: string | null;
  bio: string | null;
  in_baltimore: boolean;
  category?: string | null;
};

const CATEGORIES = [
  "All",
  "Visual Art",
  "Music",
  "DJ",
  "Video",
  "Photography",
  "Performance",
  "Literary",
  "Mixed Media",
  "Fashion",
  "Podcaster",
] as const;
type Category = (typeof CATEGORIES)[number];

function normalize(v?: string | null) {
  return (v ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

function matchesCategory(c: Creator, cat: Category) {
  if (cat === "All") return true;
  // Only actual artists — never residents/visitors.
  const roleN = normalize(c.role);
  if (roleN === "resident" || roleN === "visitor") return false;
  const catN = normalize(c.category);
  if (catN === "resident" || catN === "visitor") return false;
  const target = cat.toLowerCase();
  // Prefer exact category match (case-insensitive) — the dropdown writes
  // the same label the filter uses.
  if (catN === target) return true;
  // Domain aliases so legacy values still land in the right bucket.
  if (target === "visual art") return /visual art|painter|sculpt|illustrat|muralist/.test(catN);
  if (target === "music") return /music|musician|producer/.test(catN);
  if (target === "dj") return catN === "dj";
  if (target === "video") return /video|videograph|film/.test(catN);
  if (target === "photography") return /photo/.test(catN);
  if (target === "performance") return /performance|dancer/.test(catN);
  if (target === "literary") return /literary|poet|writer/.test(catN);
  if (target === "mixed media") return /mixed media/.test(catN);
  if (target === "fashion") return /fashion/.test(catN);
  if (target === "podcaster") return /podcast/.test(catN);
  return false;
}

function FindCreatorPage() {
  const { loading: authLoading, signedIn } = useAuthState();
  const { isAdmin } = useUserRole();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("All");
  const [sort, setSort] = useState<"newest" | "followed" | "active">("newest");

  async function handleAdminDelete(c: Creator) {
    const name = c.display_name || c.username || "this profile";
    if (!window.confirm(`Delete ${name}? This permanently removes their account.`)) return;
    const { error } = await supabase.rpc("admin_delete_profile", { _id: c.id });
    if (error) { toast.error(error.message); return; }
    setResults((prev) => prev.filter((x) => x.id !== c.id));
    toast.success("Profile deleted");
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("public_artists", {
        lim: 96,
        search: q || undefined,
        sort_by: sort,
      });
      if (cancelled) return;
      setResults(((data as (Creator & { created_at: string })[]) ?? []) as Creator[]);
      setLoading(false);
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, sort]);

  const filtered = results
    .filter((c) => matchesCategory(c, category))
    .sort((a, b) => Number(!!b.avatar_url) - Number(!!a.avatar_url));

  const Card = ({ c }: { c: Creator }) => {
    const name = c.display_name ?? c.username ?? "Unnamed creator";
    const rawCat = (c.category || c.role || "Artist").replace(/_/g, " ");
    const cat = /^attendee$/i.test(rawCat) ? "Resident" : rawCat;
    const [imgError, setImgError] = useState(false);
    return (
      <div className="group h-full overflow-hidden rounded-2xl bg-secondary/40 transition-all duration-200 hover:shadow-lg">
        <div className="relative aspect-square w-full overflow-hidden bg-secondary">
          {c.avatar_url && !imgError ? (
            <img
              src={c.avatar_url}
              alt={name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#d4580a]/20 to-[#d4580a]/5 text-4xl font-bold text-[#d4580a]">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="truncate text-base font-semibold text-foreground">{name}</div>
          <div className="mt-1 truncate text-sm capitalize text-muted-foreground">{cat}</div>
          {c.neighborhood && (
            <div className="mt-0.5 truncate text-sm text-muted-foreground">{c.neighborhood}</div>
          )}
        </div>
      </div>
    );
  };

  if (authLoading) return null;

  if (signedIn) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <HeroBanner
            title="Artists"
            subtitle="Discover Baltimore's creative voices, visual art, music, photography & more."
            cta={
              <div className="flex flex-wrap items-center gap-2">
                <Link to="/profile">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-[#d4580a]/40 bg-white px-4 py-2 text-sm font-semibold text-[#d4580a] hover:bg-[#d4580a]/[0.06]"
                  >
                    <Plus className="h-4 w-4" /> Create Artist Page
                  </button>
                </Link>
              </div>
            }
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search artists..."
                className="h-12 rounded-full border-border bg-secondary/40 pl-11 text-sm"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as "newest" | "followed" | "active")}>
              <SelectTrigger className="h-12 w-full rounded-full border-border bg-secondary/40 sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="followed">Most Followed</SelectItem>
                <SelectItem value="active">Most Active</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="scrollbar-hide -mx-3 flex flex-wrap gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition ${
                  category === c
                    ? "bg-[#d4580a] text-white"
                    : "border border-neutral-200 bg-white text-neutral-600 hover:border-orange-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Searching…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No artists found{q ? ` for "${q}"` : ""}.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <div key={c.id} className="relative">
                  <Link
                    to="/u/$username"
                    params={{ username: c.username || c.id }}
                    className="block text-left"
                  >
                    <Card c={c} />
                  </Link>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAdminDelete(c); }}
                      className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-red-700"
                      aria-label="Admin delete profile"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <PublicShell title="Find a Creator" subtitle="Search Baltimore artists, musicians, photographers, writers and makers." signedIn={signedIn}>
      <div className="mb-6 relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/60" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, username, neighborhood…"
          className="pl-11 h-12 rounded-full bg-paper/5 border-paper/20 text-paper placeholder:text-paper/50"
        />
      </div>
      {loading ? (
        <div className="text-paper/60 text-sm">Searching…</div>
      ) : (
        <PreviewGrid
          items={results}
          unlockedCount={1}
          signedIn={signedIn}
          thing="creator"
          render={(c) => <Card c={c as Creator} />}
          emptyLabel={`No creators found${q ? ` for "${q}"` : ""}.`}
        />
      )}
    </PublicShell>
  );
}

export const Route = createFileRoute("/artists")({
  component: FindCreatorPage,
  head: () => ({
    meta: [
      { title: "Find a Creator - Planet Baltimore" },
      { name: "description", content: "Search Baltimore artists, musicians, writers and makers on Planet Baltimore." },
    ],
  }),
});