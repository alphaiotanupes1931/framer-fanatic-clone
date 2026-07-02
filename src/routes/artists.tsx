import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const CATEGORIES = ["All", "Visual Art", "Music", "Video", "Photography", "Performance", "Literary", "Fashion", "Podcaster"] as const;
type Category = (typeof CATEGORIES)[number];

function normalize(v?: string | null) {
  return (v ?? "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

function matchesCategory(c: Creator, cat: Category) {
  if (cat === "All") return true;
  const target = cat.toLowerCase();
  const hay = `${normalize(c.category)} ${normalize(c.role)} ${normalize(c.bio)}`;
  if (target === "visual art") return /visual|paint|mixed media|art(ist)?|illustrat/.test(hay);
  if (target === "podcaster") return /podcast/.test(hay);
  return hay.includes(target);
}

function FindCreatorPage() {
  const { loading: authLoading, signedIn } = useAuthState();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("All");
  const [sort, setSort] = useState<"newest" | "az">("newest");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      let query = supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, role, neighborhood, bio, in_baltimore, category, created_at")
        .eq("hidden_from_showcase", false)
        .not("display_name", "is", null)
        .limit(96);
      if (q) {
        const like = `%${q}%`;
        query = query.or(`display_name.ilike.${like},username.ilike.${like},neighborhood.ilike.${like},bio.ilike.${like}`);
      }
      query = sort === "newest"
        ? query.order("created_at", { ascending: false })
        : query.order("display_name", { ascending: true });
      const { data } = await query;
      if (cancelled) return;
      setResults(((data as (Creator & { created_at: string })[]) ?? []) as Creator[]);
      setLoading(false);
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, sort]);

  const filtered = results.filter((c) => matchesCategory(c, category));

  const Card = ({ c }: { c: Creator }) => {
    const name = c.display_name ?? c.username ?? "Unnamed creator";
    const cat = (c.category || c.role || "Artist").replace(/_/g, " ");
    return (
      <div className="group h-full overflow-hidden rounded-2xl bg-secondary/40 transition-all duration-200 hover:shadow-lg">
        <div className="relative aspect-square w-full overflow-hidden bg-secondary">
          {c.avatar_url ? (
            <img
              src={c.avatar_url}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted-foreground">
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
            action={
              <Link to="/profile">
                <Button className="rounded-full text-white shadow-sm" style={{ backgroundColor: "#d4580a" }}>
                  <Plus className="mr-1 h-4 w-4" /> Create Artist Page
                </Button>
              </Link>
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
            <Select value={sort} onValueChange={(v) => setSort(v as "newest" | "az")}>
              <SelectTrigger className="h-12 w-full rounded-full border-border bg-secondary/40 sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="az">A - Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="scrollbar-hide -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  category === c
                    ? "bg-[#d4580a] text-white shadow-sm"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
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
                <Link
                  key={c.id}
                  to="/u/$username"
                  params={{ username: c.username || c.id }}
                  className="text-left"
                >
                  <Card c={c} />
                </Link>
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