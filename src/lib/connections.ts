import { supabase } from "@/integrations/supabase/client";

/**
 * Shared cache of the people you know (followers + following) with profiles.
 *
 * Every share sheet, message modal and invite dialog used to refetch the same
 * two follow queries plus a profile lookup each time it opened. This resolves
 * once per session, dedupes concurrent callers, and can be warmed ahead of the
 * first open so the sheet paints with people already in it.
 */

export type Person = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Snapshot = { followers: Person[]; following: Person[]; all: Person[] };

let ownerId: string | null = null;
let cached: Snapshot | null = null;
let inflight: Promise<Snapshot> | null = null;
let fetchedAt = 0;
const TTL = 5 * 60 * 1000;

const EMPTY: Snapshot = { followers: [], following: [], all: [] };

export function getConnectionsSnapshot(userId?: string | null): Snapshot | null {
  if (!userId || ownerId !== userId) return null;
  return cached;
}

export async function loadConnections(userId: string, opts?: { force?: boolean }): Promise<Snapshot> {
  if (ownerId !== userId) { ownerId = userId; cached = null; inflight = null; }
  const fresh = cached && Date.now() - fetchedAt < TTL;
  if (fresh && !opts?.force) return cached!;
  if (inflight && !opts?.force) return inflight;

  inflight = (async () => {
    const [flw, fwg] = await Promise.all([
      supabase.from("follows").select("follower_id").eq("following_id", userId),
      supabase.from("follows").select("following_id").eq("follower_id", userId),
    ]);
    const followerIds = (flw.data ?? []).map((r: { follower_id: string }) => r.follower_id);
    const followingIds = (fwg.data ?? []).map((r: { following_id: string }) => r.following_id);
    const ids = Array.from(new Set([...followerIds, ...followingIds])).filter((id) => id !== userId);
    if (ids.length === 0) {
      cached = EMPTY; fetchedAt = Date.now(); inflight = null;
      return cached;
    }
    const { data } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
    const people = (data as Person[]) ?? [];
    const byId = new Map(people.map((p) => [p.id, p]));
    const pick = (list: string[]) => list.map((id) => byId.get(id)).filter((p): p is Person => !!p);
    cached = {
      followers: pick(followerIds),
      following: pick(followingIds),
      all: people,
    };
    fetchedAt = Date.now();
    inflight = null;
    return cached;
  })();

  return inflight;
}

/** Fire-and-forget warm-up, safe to call on app boot or on share button hover. */
export function warmConnections(userId?: string | null) {
  if (!userId) return;
  void loadConnections(userId).catch(() => {});
}

export function invalidateConnections() {
  cached = null; fetchedAt = 0; inflight = null;
}
