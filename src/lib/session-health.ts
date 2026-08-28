import { supabase } from "@/integrations/supabase/client";

/**
 * A session token stays in localStorage even after the account behind it is
 * deleted (or the refresh token is revoked). getSession() happily returns that
 * dead session from storage, which made the app bounce between /auth and the
 * signed-in routes forever. Validate against the server once, and purge every
 * trace of the session when it is no longer real.
 */
export async function purgeDeadSession() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* signing out of a dead session can itself fail; keep going */
  }
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("pb:") || key.startsWith("sb-")) window.localStorage.removeItem(key);
    }
    window.sessionStorage.removeItem("pb_post_auth_redirect");
  } catch {
    /* storage being unavailable is never fatal */
  }
}

/**
 * Returns the signed-in user id only when the session is still valid on the
 * server. Dead sessions are cleared so the app renders the signed-out state.
 */
export async function ensureLiveSession(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    await purgeDeadSession();
    return null;
  }
  return userData.user.id;
}
