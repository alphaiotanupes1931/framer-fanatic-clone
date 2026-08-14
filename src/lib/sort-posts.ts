/** Canonical post ordering used everywhere posts are listed for a person or page:
 *  pinned posts first (by pin_order), then newest first. */
export function sortPosts<T extends { is_pinned?: boolean | null; pin_order?: number | null; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ap = a.is_pinned ? 1 : 0;
    const bp = b.is_pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (a.is_pinned && b.is_pinned) return (a.pin_order ?? 0) - (b.pin_order ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
