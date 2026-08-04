// Server-only. Admin panel access runs with the service role, so there is no
// shared-secret header shortcut anywhere in the request path.
export function createAdminSupabase() {
  // Lazy require keeps the service-role module out of any client graph.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  throw new Error("createAdminSupabase() is async now; use getAdminSupabase()");
}

export async function getAdminSupabase() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}