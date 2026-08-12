import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { invalidateConnections } from "@/lib/connections";

/**
 * Small inline follow toggle so people can follow a creator straight from a
 * post, video or comment without opening their page first.
 */
export function FollowButton({
  userId,
  currentUserId,
  className = "",
  compact = false,
}: {
  userId: string;
  currentUserId?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!currentUserId || currentUserId === userId) { setFollowing(null); return; }
    (async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", currentUserId)
        .eq("following_id", userId)
        .maybeSingle();
      if (!cancelled) setFollowing(!!data);
    })();
    return () => { cancelled = true; };
  }, [userId, currentUserId]);

  if (!currentUserId || currentUserId === userId || following === null) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    const res = next
      ? await supabase.from("follows").insert({ follower_id: currentUserId, following_id: userId })
      : await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", userId);
    setBusy(false);
    if (res.error) { setFollowing(!next); toast.error(res.error.message); return; }
    invalidateConnections();
    toast.success(next ? "Following" : "Unfollowed");
  };

  const base = compact
    ? "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition"
    : "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`${base} ${
        following
          ? "border border-border bg-transparent text-muted-foreground hover:text-foreground"
          : "bg-[#d4580a] text-white hover:bg-orange-700"
      } ${className}`}
    >
      {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
