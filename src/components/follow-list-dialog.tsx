import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { SmartAvatarImage } from "@/components/shared/smart-img";
import { getFollowedPages, PAGE_TYPE_LABEL } from "@/lib/followed-pages";
import { orgPath } from "@/lib/org-paths";

type FollowPerson = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  neighborhood: string | null;
  allowDms: boolean | null;
  pageType?: string;
  href?: string;
};

const formatName = (value: string) => value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export function FollowListDialog({
  open,
  onOpenChange,
  profileId,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  mode: "followers" | "following" | "referrals";
}) {
  const [people, setPeople] = useState<FollowPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || !profileId) return;
    setQuery("");
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (mode === "referrals") {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url, neighborhood")
          .eq("referred_by", profileId)
          .order("created_at", { ascending: false });
        if (!cancelled) {
          setPeople(error ? [] : ((data ?? []) as FollowPerson[]).map((p) => ({ ...p, allowDms: null })));
          setLoading(false);
        }
        return;
      }
      const result = mode === "followers"
        ? await supabase.from("follows").select("follower_id, allow_dms").eq("following_id", profileId)
        : await supabase.from("follows").select("following_id, allow_dms").eq("follower_id", profileId);
      const { data: rows, error } = result;
      if (cancelled) return;
      if (error) {
        setPeople([]);
        setLoading(false);
        return;
      }
      const dmById = new Map<string, boolean>();
      const ids = Array.from(new Set((rows ?? []).map((row) => {
        const id = "follower_id" in row ? row.follower_id : row.following_id;
        dmById.set(id, (row as { allow_dms?: boolean | null }).allow_dms !== false);
        return id;
      })));
      const pages: FollowPerson[] = mode === "following"
        ? (await getFollowedPages(profileId)).map((o) => ({ id: o.id, display_name: o.name, username: null, avatar_url: o.avatar_url, neighborhood: null, allowDms: o.allowDms, pageType: o.type, href: orgPath(o.type, o.slug) }))
        : [];
      if (cancelled) return;
      if (!ids.length) {
        setPeople(pages);
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      if (!cancelled) {
        setPeople(((data ?? []) as Omit<FollowPerson, "allowDms">[]).map((p) => ({ ...p, allowDms: dmById.get(p.id) ?? null })).concat(pages));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, profileId, mode]);

  const term = query.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!term) return people;
    return people.filter((person) =>
      `${person.display_name ?? ""} ${person.username ?? ""} ${person.neighborhood ?? ""} ${person.pageType ? PAGE_TYPE_LABEL[person.pageType] : ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [people, term]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] w-[calc(100%_-_2rem)] max-w-md overflow-hidden rounded-xl p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle>{mode === "followers" ? "Followers" : mode === "following" ? "Following" : "Referrals"}</DialogTitle>
        </DialogHeader>
        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className="h-10 pl-9 pr-9 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[58vh] overflow-y-auto p-2">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading people...</p>
          ) : people.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {mode === "followers" ? "No followers yet." : mode === "following" ? "Not following anyone yet." : "No successful referrals yet."}
            </p>
          ) : shown.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No one matches that search.</p>
          ) : shown.map((person) => {
            const name = person.pageType ? (person.display_name || "Page") : formatName(person.display_name || person.username || "User");
            const body = (
              <>
                key={person.id}
                to="/$username"
                params={{ username: person.username || person.id }}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-hover"
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <SmartAvatarImage src={person.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.pageType ? PAGE_TYPE_LABEL[person.pageType] : person.username ? `@${person.username}` : person.neighborhood || "Baltimore"}
                  </p>
                </div>
                {person.allowDms !== null && (
                  <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {person.allowDms ? "Posts & Messages" : "Posts Only"}
                  </span>
                )}
              </>
            );
            const cls = "flex items-center gap-3 rounded-lg px-3 py-3";
            return person.href ? (
              <a key={person.id} href={person.href} onClick={() => onOpenChange(false)} className={cls}>{body}</a>
            ) : (
              <Link key={person.id} to="/$username" params={{ username: person.username || person.id }} onClick={() => onOpenChange(false)} className={cls}>{body}</Link>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
