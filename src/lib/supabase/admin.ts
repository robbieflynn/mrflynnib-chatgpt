import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserConfig } from "@/lib/supabase/config";

export function createAdminClient() {
  const { url } = getSupabaseBrowserConfig();
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Supabase server access is not configured.");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
