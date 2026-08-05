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
  mode: "followers" | "following";
}) {
  const [people, setPeople] = useState<FollowPerson[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !profileId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = mode === "followers"
        ? await supabase.from("follows").select("follower_id").eq("following_id", profileId)
        : await supabase.from("follows").select("following_id").eq("follower_id", profileId);
      const { data: rows, error } = result;
      if (cancelled) return;
      if (error) {
        setPeople([]);
        setLoading(false);
        return;
      }
      const ids = Array.from(new Set((rows ?? []).map((row) => (
        "follower_id" in row ? row.follower_id : row.following_id
      ))));
      if (!ids.length) {
        setPeople([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      if (!cancelled) {
        setPeople((data ?? []) as FollowPerson[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, profileId, mode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] w-[calc(100%_-_2rem)] max-w-md overflow-hidden rounded-xl p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle>{mode === "followers" ? "Followers" : "Following"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto p-2">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading people...</p>
          ) : people.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {mode === "followers" ? "No followers yet." : "Not following anyone yet."}
            </p>
          ) : people.map((person) => {
            const name = formatName(person.display_name || person.username || "User");
            return (
              <Link
                key={person.id}
                to="/u/$username"
                params={{ username: person.username || person.id }}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-secondary"
              >
                <Avatar className="h-11 w-11">
                  <SmartAvatarImage src={person.avatar_url ?? undefined} alt="" />
                  <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.username ? `@${person.username}` : person.neighborhood || "Baltimore"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}