import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { chooseFollowMode } from "@/components/shared/follow-mode-dialog";
import { invalidateConnections } from "@/lib/connections";

/** Inline follow toggle for a page (business, artist, group...). */
export function PageFollowButton({ orgId, meId, ownerId, className = "" }: { orgId: string; meId?: string | null; ownerId?: string | null; className?: string }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!meId || meId === ownerId) { setFollowing(null); return; }
    (async () => {
      const [f, m] = await Promise.all([
        supabase.from("organization_followers").select("user_id").eq("organization_id", orgId).eq("user_id", meId).maybeSingle(),
        supabase.from("organization_members").select("user_id").eq("organization_id", orgId).eq("user_id", meId).maybeSingle(),
      ]);
      if (!cancelled) setFollowing(!!f.data || !!m.data);
    })();
    return () => { cancelled = true; };
  }, [orgId, meId, ownerId]);

  if (!meId || meId === ownerId || following === null) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !following;
    const mode = next ? await chooseFollowMode() : null;
    if (next && !mode) return;
    setBusy(true);
    setFollowing(next);
    const { error } = next
      ? await supabase.from("organization_followers").insert({ organization_id: orgId, user_id: meId, allow_dms: mode!.allowDms } as never)
      : await supabase.from("organization_followers").delete().eq("organization_id", orgId).eq("user_id", meId);
    setBusy(false);
    if (error && !/duplicate/i.test(error.message)) { setFollowing(!next); toast.error("Could not update follow"); return; }
    invalidateConnections();
    toast.success(next ? "Following" : "Unfollowed");
  };

  return (
    <Button type="button" onClick={toggle} disabled={busy} variant={following ? "brand" : "outline"} size="sm" className={`gap-1.5 ${className}`}>
      {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
