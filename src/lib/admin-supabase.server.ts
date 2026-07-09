import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const FALLBACK_URL = "https://hafzcspqisskwcivdynb.supabase.co";
const FALLBACK_KEY = "sb_publishable_WPK9ifUEWUnMOysUYbaEYQ_CTED8D-C";
const ADMIN_HEADER_SECRET = "pb-admin-header-9k2mZ7xQ4vNcR3sT";

export function createAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_KEY;
  return createClient<Database>(url, key, {
    global: { headers: { "x-admin-secret": ADMIN_HEADER_SECRET, apikey: key } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}