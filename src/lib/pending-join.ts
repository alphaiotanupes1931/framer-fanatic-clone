// A group / association / arts org invite should end with the guest actually
// inside that page, even when they have to sign up first. We stash the target
// slug and replay it after auth and onboarding finish.
const KEY = "pb_pending_group";
const REDIRECT_KEY = "pb_post_auth_redirect";

export const groupInvitePath = (slug: string) => `/o/${slug}?join=1`;

export function setPendingGroup(slug: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, slug);
    sessionStorage.setItem(REDIRECT_KEY, groupInvitePath(slug));
  } catch { /* storage blocked */ }
}

// Resume where a guest was headed before we made them sign up (ticket
// checkout, group invite, etc). With email confirmation on, the inbox link
// lands on the home page, so readers other than /auth need this too.
export function popPostAuthRedirect(consume = true): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(REDIRECT_KEY);
    if (consume) sessionStorage.removeItem(REDIRECT_KEY);
    if (v && v.startsWith("/") && !v.startsWith("//")) return v;
    return null;
  } catch {
    return null;
  }
}

export function peekPendingGroup(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function clearPendingGroup() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
