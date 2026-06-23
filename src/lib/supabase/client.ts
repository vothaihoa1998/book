"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type SupabaseBrowserEnv = {
  url: string;
  key: string;
};

let browserClient: SupabaseClient<Database> | null = null;
let browserClientSignature = "";

export function getBrowserSupabaseClient(env?: SupabaseBrowserEnv | null) {
  const url = env?.url || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env?.key || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return browserClient;

  const signature = `${url}:${key}`;
  if (browserClient && browserClientSignature === signature) return browserClient;

  browserClient = createBrowserClient<Database>(url, key);
  browserClientSignature = signature;
  return browserClient;
}
