import { useEffect, useState } from "react";
import {
  getReactionState, requestReactionState, setReactionState, subscribeReaction,
} from "@/lib/reaction-store";

/**
 * Shared, batched like/save state for a single post.
 * Paints instantly from cache when the state is already known.
 */
export function useReaction(postId: string, userId?: string) {
  const initial = getReactionState(postId);
  const [liked, setLikedLocal] = useState(initial?.liked ?? false);
  const [saved, setSavedLocal] = useState(initial?.saved ?? false);

  useEffect(() => {
    if (!userId) return;
    const sync = () => {
      const s = getReactionState(postId);
      if (!s) return;
      setLikedLocal(s.liked);
      setSavedLocal(s.saved);
    };
    const unsub = subscribeReaction(postId, sync);
    requestReactionState(userId, postId);
    sync();
    return unsub;
  }, [postId, userId]);

  return {
    liked,
    saved,
    setLiked: (v: boolean) => { setLikedLocal(v); setReactionState(postId, { liked: v }); },
    setSaved: (v: boolean) => { setSavedLocal(v); setReactionState(postId, { saved: v }); },
  };
}
