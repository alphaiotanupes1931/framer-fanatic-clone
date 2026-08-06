import { supabase } from "@/integrations/supabase/client";

/**
 * Batched like/save state for posts.
 *
 * Instead of every PostCard firing two point queries (N+1 across a feed),
 * requests made in the same tick are coalesced into a single `in(...)` query
 * per table. Results are cached in memory and shared across every view, so
 * like/save state stays consistent between the feed, split view and detail
 * pages, and re-renders paint instantly from cache.
 */

type State = { liked: boolean; saved: boolean };

const cache = new Map<string, State>();
const listeners = new Map<string, Set<() => void>>();
let ownerId: string | null = null;

let pending = new Set<string>();
let flushScheduled = false;

function emit(postId: string) {
  listeners.get(postId)?.forEach((fn) => fn());
}

function ensureOwner(userId: string) {
  if (ownerId !== userId) {
    ownerId = userId;
    cache.clear();
  }
}

async function flush() {
  flushScheduled = false;
  const ids = Array.from(pending);
  pending = new Set();
  const userId = ownerId;
  if (!userId || ids.length === 0) return;

  const [likeRes, saveRes] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", ids),
    supabase.from("post_saves").select("post_id").eq("user_id", userId).in("post_id", ids),
  ]);

  const liked = new Set((likeRes.data ?? []).map((r) => r.post_id));
  const saved = new Set((saveRes.data ?? []).map((r) => r.post_id));

  for (const id of ids) {
    const next = { liked: liked.has(id), saved: saved.has(id) };
    const prev = cache.get(id);
    if (!prev || prev.liked !== next.liked || prev.saved !== next.saved) {
      cache.set(id, next);
      emit(id);
    } else {
      cache.set(id, next);
    }
  }
}

/** Queue a post for state resolution; resolved in one batched query per tick. */
export function requestReactionState(userId: string, postId: string) {
  ensureOwner(userId);
  if (cache.has(postId)) return;
  pending.add(postId);
  if (!flushScheduled) {
    flushScheduled = true;
    // Small delay so a whole feed render lands in a single batch.
    setTimeout(() => void flush(), 16);
  }
}

export function getReactionState(postId: string): State | undefined {
  return cache.get(postId);
}

/** Optimistic local write, shared across every mounted view of this post. */
export function setReactionState(postId: string, patch: Partial<State>) {
  const prev = cache.get(postId) ?? { liked: false, saved: false };
  cache.set(postId, { ...prev, ...patch });
  emit(postId);
}

export function subscribeReaction(postId: string, fn: () => void) {
  let set = listeners.get(postId);
  if (!set) { set = new Set(); listeners.set(postId, set); }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(postId);
  };
}
