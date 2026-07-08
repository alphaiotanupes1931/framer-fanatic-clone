// Lightweight shared-credential gate for the /admin pages.
// NOTE: This is UI-level gating only. Database writes still require a real
// admin account because of row-level security policies.
const KEY = "pb_admin_gate";
export const ADMIN_USERNAME = "planetbaltimore";
export const ADMIN_PASSWORD = "admin123";

export function isAdminUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function unlockAdmin(username: string, password: string): boolean {
  if (username.trim().toLowerCase() !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) return false;
  try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  return true;
}
export function lockAdmin() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
