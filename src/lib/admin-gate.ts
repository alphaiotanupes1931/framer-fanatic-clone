// Shared-credential gate for /admin pages. UI hint is stored in
// sessionStorage for instant checks, but the real trust boundary is an
// encrypted, httpOnly cookie set by the server functions in
// `admin-site.functions.ts`. Server functions re-verify the cookie
// before performing any privileged write.
import { unlockAdminSite, lockAdminSite, isAdminSiteUnlocked } from "./admin-site.functions";

const KEY = "pb_admin_gate";

export function isAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
}

export async function unlockAdmin(username: string, password: string): Promise<boolean> {
  try {
    const { ok } = await unlockAdminSite({ data: { username, password } });
    if (!ok) return false;
    try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    return true;
  } catch {
    return false;
  }
}

export async function lockAdmin(): Promise<void> {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  try { await lockAdminSite(); } catch { /* ignore */ }
}

// Verify the server cookie is still valid and sync the UI flag.
export async function refreshAdminUnlocked(): Promise<boolean> {
  try {
    const { unlocked } = await isAdminSiteUnlocked();
    try {
      if (unlocked) sessionStorage.setItem(KEY, "1");
      else sessionStorage.removeItem(KEY);
    } catch { /* ignore */ }
    return unlocked;
  } catch {
    return false;
  }
}
