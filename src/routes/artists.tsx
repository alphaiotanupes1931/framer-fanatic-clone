import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import pbLogo from "@/assets/pb-logo.png";

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
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [previewing, setPreviewing] = useState<Creator | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

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

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-paper/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={pbLogo} alt="Planet Baltimore" className="w-8 h-8 invert" />
            <span className="font-display text-lg font-extrabold tracking-tight uppercase">Planet Baltimore</span>
          </Link>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Link to="/dashboard" className="rounded-full bg-paper text-ink px-4 py-2 text-sm font-medium">Dashboard</Link>
            ) : (
              <>
                <Link to="/auth" className="rounded-full border border-paper/40 px-4 py-2 text-sm">Log in</Link>
                <Link to="/auth" className="rounded-full bg-paper text-ink px-4 py-2 text-sm font-medium">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-14 pb-8">
        <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight">Find a Creator</h1>
        <p className="mt-3 text-paper/70 max-w-2xl">Search Baltimore artists, musicians, photographers, writers, and makers on Planet Baltimore.</p>
        <div className="mt-6 relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-paper/60" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, username, neighborhood…"
            className="pl-11 h-12 rounded-full bg-paper/5 border-paper/20 text-paper placeholder:text-paper/50 focus-visible:ring-paper/40"
          />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        {loading ? (
          <div className="text-paper/60 text-sm">Searching…</div>
        ) : results.length === 0 ? (
          <div className="text-paper/60 text-sm">No creators found{q ? ` for "${q}"` : ""}.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => setPreviewing(c)}
                className="text-left rounded-2xl border border-paper/10 bg-paper/5 hover:bg-paper/10 transition-colors p-5"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={c.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-paper/10 text-paper">
                      {(c.display_name ?? c.username ?? "?").slice(0,1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.display_name ?? c.username ?? "Unnamed creator"}</div>
                    {c.username && <div className="text-xs text-paper/60 truncate">@{c.username}</div>}
                  </div>
                </div>
                {c.neighborhood && (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-paper/70">
                    <MapPin className="w-3 h-3" /> {c.neighborhood}
                  </div>
                )}
                {c.bio && <p className="mt-3 text-sm text-paper/70 line-clamp-3">{c.bio}</p>}
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="bg-ink text-paper border-paper/20">
          {previewing && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={previewing.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-paper/10 text-paper">
                      {(previewing.display_name ?? previewing.username ?? "?").slice(0,1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-paper">{previewing.display_name ?? previewing.username}</DialogTitle>
                    <DialogDescription className="text-paper/70">
                      {previewing.username ? `@${previewing.username}` : "Baltimore creator"}
                      {previewing.neighborhood ? ` · ${previewing.neighborhood}` : ""}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              {previewing.bio && <p className="text-sm text-paper/80 mt-2">{previewing.bio}</p>}
              <div className="mt-4 rounded-xl border border-paper/15 bg-paper/5 p-4 flex items-start gap-3">
                <Lock className="w-4 h-4 mt-0.5 text-paper/70" />
                <div className="text-sm text-paper/80">
                  Sign up to view {previewing.display_name?.split(" ")[0] ?? "this creator"}'s full profile, posts, and message them directly.
                </div>
              </div>
              <DialogFooter className="mt-2">
                {signedIn ? (
                  <Link to="/dashboard" className="rounded-full bg-paper text-ink px-5 py-2 text-sm font-medium">Open dashboard</Link>
                ) : (
                  <>
                    <Link to="/auth" className="rounded-full border border-paper/30 px-5 py-2 text-sm">Log in</Link>
                    <Link to="/auth" className="rounded-full bg-paper text-ink px-5 py-2 text-sm font-medium">Sign up to view</Link>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/artists")({
  component: FindCreatorPage,
  head: () => ({
    meta: [
      { title: "Find a Creator — Planet Baltimore" },
      { name: "description", content: "Search Baltimore artists, musicians, writers and makers on Planet Baltimore." },
    ],
  }),
});