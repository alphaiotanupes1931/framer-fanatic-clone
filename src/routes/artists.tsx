import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { PublicShell, PreviewGrid, useAuthState } from "@/components/public-preview";

type Creator = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  neighborhood: string | null;
  bio: string | null;
  in_baltimore: boolean;
};

function FindCreatorPage() {
  const { loading: authLoading, signedIn } = useAuthState();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_creators", { q, lim: 48 });
      if (cancelled) return;
      setResults((data as Creator[] | null) ?? []);
      setLoading(false);
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const Card = ({ c }: { c: Creator }) => (
    <div className="rounded-2xl border border-border bg-card hover:border-foreground/20 transition-colors p-5 h-full">
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={c.avatar_url ?? undefined} />
          <AvatarFallback className="bg-muted text-foreground">
            {(c.display_name ?? c.username ?? "?").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-semibold truncate text-foreground">{c.display_name ?? c.username ?? "Unnamed creator"}</div>
          {c.username && <div className="text-xs text-muted-foreground truncate">@{c.username}</div>}
        </div>
      </div>
      {c.neighborhood && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" /> {c.neighborhood}
        </div>
      )}
      {c.bio && <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{c.bio}</p>}
    </div>
  );

  if (authLoading) return null;

  if (signedIn) {
    return (
      <AppLayout title="Find a Creator" subtitle="Search Baltimore artists, musicians, photographers, writers and makers.">
        <div className="mb-6 relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search creators"
            className="pl-11 h-12 rounded-full bg-neutral-50 border-neutral-200 text-[14px]"
          />
        </div>
        {loading ? (
          <div className="text-muted-foreground text-sm">Searching…</div>
        ) : results.length === 0 ? (
          <div className="text-muted-foreground text-sm">No creators found{q ? ` for "${q}"` : ""}.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((c) => (
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