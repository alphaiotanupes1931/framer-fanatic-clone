import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SmartAvatarImage } from "@/components/shared/smart-img";
import { FollowButton } from "@/components/shared/follow-button";
import { titleCase } from "@/lib/utils";

type Person = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; neighborhood: string | null };
type Suggestion = Person & { reason: string };

const HIDDEN = new Set(["terell", "bob", "reed"]);

/** Friends-of-friends first (ranked by mutual count), then popular members. */
async function loadSuggestions(userId: string): Promise<Suggestion[]> {
  const { data: mine } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  const following = new Set((mine ?? []).map((r: { following_id: string }) => r.following_id));
  const exclude = (id: string) => id === userId || following.has(id);
  const mutual = new Map<string, number>();
  if (following.size) {
    const { data } = await supabase.from("follows").select("following_id").in("follower_id", [...following].slice(0, 200)).limit(2000);
    for (const r of (data ?? []) as { following_id: string }[]) if (!exclude(r.following_id)) mutual.set(r.following_id, (mutual.get(r.following_id) ?? 0) + 1);
  }
  const popular = new Map<string, number>();
  const { data: recent } = await supabase.from("follows").select("following_id").order("created_at", { ascending: false }).limit(1000);
  for (const r of (recent ?? []) as { following_id: string }[]) if (!exclude(r.following_id)) popular.set(r.following_id, (popular.get(r.following_id) ?? 0) + 1);
  const ranked = [
    ...[...mutual.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, reason: `${n} mutual connection${n === 1 ? "" : "s"}` })),
    ...[...popular.entries()].sort((a, b) => b[1] - a[1]).filter(([id]) => !mutual.has(id)).map(([id]) => ({ id, reason: "Popular in Baltimore" })),
  ].slice(0, 20);
  if (!ranked.length) return [];
  const { data: profiles } = await supabase.rpc("public_profiles_by_ids", { _ids: ranked.map((r) => r.id) });
  const byId = new Map(((profiles ?? []) as Person[]).map((p) => [p.id, p]));
  return ranked
    .map((r) => { const p = byId.get(r.id); return p ? { ...p, reason: r.reason } : null; })
    .filter((p): p is Suggestion => !!p && !!(p.display_name || p.username) && !HIDDEN.has((p.username || "").toLowerCase()))
    .slice(0, 5);
}

export function PeopleToFollow({ userId }: { userId: string }) {
  const { data = [] } = useQuery({ queryKey: ["people-to-follow", userId], queryFn: () => loadSuggestions(userId), staleTime: 5 * 60000 });
  if (!data.length) return null;
  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <UserPlus className="h-4 w-4 text-slate-700" />
        <h3 className="text-base font-semibold tracking-tight text-slate-900">People to Follow</h3>
      </div>
      <div className="divide-y divide-slate-100 px-4">
        {data.map((p) => {
          const name = titleCase(p.display_name || p.username || "");
          return (
            <div key={p.id} className="flex items-center gap-3 py-3">
              <Link to="/$username" params={{ username: p.username || p.id }} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0 rounded-full">
                  <SmartAvatarImage src={p.avatar_url ?? undefined} className="rounded-full object-cover" />
                  <AvatarFallback className="rounded-full bg-slate-100 text-sm font-bold text-slate-600">{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{name}</p>
                  <p className="truncate text-xs text-slate-500">{p.reason}</p>
                </div>
              </Link>
              <FollowButton userId={p.id} currentUserId={userId} compact />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Mobile/tablet: horizontal swipe row of compact cards (hidden where the right sidebar shows). */
export function PeopleToFollowRow({ userId }: { userId: string }) {
  const { data = [] } = useQuery({ queryKey: ["people-to-follow", userId], queryFn: () => loadSuggestions(userId), staleTime: 5 * 60000 });
  if (!data.length) return null;
  return (
    <section className="xl:hidden">
      <div className="mb-2 flex items-center gap-2 px-1">
        <UserPlus className="h-4 w-4 text-slate-700" />
        <h3 className="text-sm font-semibold tracking-tight text-slate-900">People to Follow</h3>
      </div>
      <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {data.map((p) => {
          const name = titleCase(p.display_name || p.username || "");
          return (
            <div key={p.id} className="flex w-36 shrink-0 snap-start flex-col items-center rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
              <Link to="/$username" params={{ username: p.username || p.id }} className="flex w-full flex-col items-center">
                <Avatar className="h-14 w-14 rounded-full">
                  <SmartAvatarImage src={p.avatar_url ?? undefined} className="rounded-full object-cover" />
                  <AvatarFallback className="rounded-full bg-slate-100 text-base font-bold text-slate-600">{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="mt-2 w-full truncate text-sm font-bold text-slate-900">{name}</p>
                <p className="w-full truncate text-[11px] text-slate-500">{p.reason}</p>
              </Link>
              <div className="mt-2"><FollowButton userId={p.id} currentUserId={userId} compact /></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
