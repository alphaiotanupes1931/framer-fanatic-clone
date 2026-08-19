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

export function peekPendingGroup(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function clearPendingGroup() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
