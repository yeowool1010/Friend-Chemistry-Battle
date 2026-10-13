import { createClient } from "@supabase/supabase-js";
import { readServerEnv } from "@/lib/serverEnv";

export function createSupabaseServerClient() {
  const url = readServerEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = readServerEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error("Supabase 주소 또는 비밀 키가 없습니다.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
