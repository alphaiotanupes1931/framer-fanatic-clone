import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Server-only. Admin panel access runs with the service role, so there is no
// shared-secret header shortcut anywhere in the request path.
export function createAdminSupabase() {
  return supabaseAdmin;
}