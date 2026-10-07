import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrgFollowerIds } from "@/lib/org-followers";
import { titleCase } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SmartAvatarImage } from "@/components/shared/smart-img";

type Person = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood: string | null };

export function OrgFollowersList({ orgId }: { orgId: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setSearch("");
    (async () => {
      try {
        const ids = await getOrgFollowerIds(orgId);
        const batches = await Promise.all(Array.from({ length: Math.ceil(ids.length / 100) }, async (_, index) => {
          const { data, error } = await supabase.rpc("public_profiles_by_ids", { _ids: ids.slice(index * 100, index * 100 + 100) });
          if (error) throw error;
          return (data ?? []) as Person[];
        }));
        if (!cancelled) setPeople(batches.flat().sort((a, b) => (a.display_name || a.username || "").localeCompare(b.display_name || b.username || "")));
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orgId, attempt]);
  const term = search.trim().toLowerCase().replace(/^@/, "");
  const filtered = people.filter((p) => [p.display_name, p.username, p.neighborhood].some((value) => value?.toLowerCase().includes(term)));
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input aria-label="Search followers" placeholder="Search followers" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" type="search" />
      </div>
      {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading followers...</p>
        : failed ? <div className="py-10 text-center"><p className="mb-3 text-sm text-muted-foreground">Could not load followers.</p><Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>Try again</Button></div>
        : filtered.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{people.length ? "No followers match your search." : "No followers yet."}</p>
        : <div className="grid gap-3 sm:grid-cols-2">{filtered.map((p) => {
          const name = titleCase(p.display_name || p.username || "Follower");
          return <Link key={p.id} to="/$username" params={{ username: p.username || p.id }} className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background p-3 transition hover:bg-accent">
            <Avatar className="h-10 w-10 shrink-0"><SmartAvatarImage src={p.avatar_url ?? undefined} alt="" /><AvatarFallback>{name.charAt(0)}</AvatarFallback></Avatar>
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{name}</p>{p.username && <p className="truncate text-xs text-muted-foreground">@{p.username}</p>}{p.neighborhood && <p className="truncate text-xs text-muted-foreground">{p.neighborhood}</p>}</div>
          </Link>;
        })}</div>}
    </div>
  );
}