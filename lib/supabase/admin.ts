import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  console.log("[KEYCHECK]", key ? JSON.parse(atob(key.split(".")[1] ?? "e30")).role ?? "no-role" : "MISSING");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
