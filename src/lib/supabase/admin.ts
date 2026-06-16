import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceEnv } from "./env";
import type { Database } from "./types";

let adminClient: SupabaseClient<Database> | null | undefined;

export function getSupabaseAdminClient() {
  if (adminClient !== undefined) return adminClient;

  const env = getSupabaseServiceEnv();
  adminClient = env
    ? createClient<Database>(env.url, env.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  return adminClient;
}
