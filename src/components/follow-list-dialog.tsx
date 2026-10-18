import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { SmartAvatarImage } from "@/components/shared/smart-img";

type FollowPerson = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  neighborhood: string | null;
  allowDms: boolean | null;
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

  useEffect(() => {
    if (!open || !profileId) return;
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
      if (!ids.length) {
        setPeople([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      if (!cancelled) {
        setPeople(((data ?? []) as Omit<FollowPerson, "allowDms">[]).map((p) => ({ ...p, allowDms: dmById.get(p.id) ?? null })));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, profileId, mode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] w-[calc(100%_-_2rem)] max-w-md overflow-hidden rounded-xl p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle>{mode === "followers" ? "Followers" : mode === "following" ? "Following" : "Referrals"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto p-2">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading people...</p>
          ) : people.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {mode === "followers" ? "No followers yet." : mode === "following" ? "Not following anyone yet." : "No successful referrals yet."}
            </p>
          ) : people.map((person) => {
            const name = formatName(person.display_name || person.username || "User");
            return (
              <Link
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
                    {person.username ? `@${person.username}` : person.neighborhood || "Baltimore"}
                  </p>
                </div>
                {person.allowDms !== null && (
                  <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {person.allowDms ? "Posts & Messages" : "Posts Only"}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}