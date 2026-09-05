import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SmartAvatarImage } from "@/components/shared/smart-img";
import { supabase } from "@/integrations/supabase/client";

type Person = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

/** Small stack of profile photos, like the "liked by" row on Instagram. */
export function Facepile({
  userIds,
  total,
  onClick,
  label,
}: {
  userIds: string[];
  total: number;
  onClick: () => void;
  label: string;
}) {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    let cancelled = false;
    const ids = userIds.slice(0, 3);
    if (!ids.length) { setPeople([]); return; }
    void supabase.rpc("public_profiles_by_ids", { _ids: ids }).then(({ data }) => {
      if (!cancelled) setPeople((data ?? []) as Person[]);
    });
    return () => { cancelled = true; };
  }, [userIds.join(",")]);

  if (!total) return null;

  // Instagram style: just the stack of faces, no number. The count only shows
  // while the profile photos have not loaded yet so the row never looks empty.
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 transition hover:text-foreground" title={`${label} (${total})`} aria-label={`${label} (${total})`}>
      {people.length > 0 ? (
        <span className="flex -space-x-2">
          {people.map((p) => (
            <Avatar key={p.id} className="h-5 w-5 border border-background">
              <SmartAvatarImage src={p.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-[9px]">
                {(p.display_name || p.username || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </span>
      ) : (
        <span className="text-xs">{total}</span>
      )}
    </button>
  );
}
