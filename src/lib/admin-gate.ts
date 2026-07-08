// Shared-credential gate for /admin pages. UI hint is stored in
// sessionStorage for instant checks, but the real trust boundary is an
// encrypted, httpOnly cookie set by the server functions in
// `admin-site.functions.ts`. Server functions re-verify the cookie
// before performing any privileged write.
import { unlockAdminSite, lockAdminSite, isAdminSiteUnlocked } from "./admin-site.functions";

const KEY = "pb_admin_gate";
const TOKEN_KEY = "pb_admin_gate_token";

function getStoredAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getAdminToken(): string | null {
  return getStoredAdminToken();
}

function clearLocalAdminGate() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export function isAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
}

export type AdminUnlockResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "not_configured" | "error" };

export async function unlockAdmin(username: string, password: string): Promise<AdminUnlockResult> {
  try {
    const { ok, adminToken, reason } = await unlockAdminSite({ data: { username, password } });
    if (!ok) return { ok: false, reason: reason ?? "invalid" };
    try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    if (adminToken) {
      try { sessionStorage.setItem(TOKEN_KEY, adminToken); } catch { /* ignore */ }
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function lockAdmin(): Promise<void> {
  clearLocalAdminGate();
  try { await lockAdminSite(); } catch { /* ignore */ }
}

// Verify the server cookie is still valid and sync the UI flag.
export async function refreshAdminUnlocked(): Promise<boolean> {
  try {
    const { unlocked } = await isAdminSiteUnlocked({ data: { adminToken: getStoredAdminToken() } });
    try {
      if (unlocked) sessionStorage.setItem(KEY, "1");
      else clearLocalAdminGate();
    } catch { /* ignore */ }
    return unlocked;
  } catch {
    return false;
  }
}
