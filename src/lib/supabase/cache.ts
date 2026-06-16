import "server-only";

import type { Json } from "./types";
import { getSupabaseAdminClient } from "./admin";

type CacheTable = "manga_cache" | "chapter_cache";

export async function readCache<T>(table: CacheTable, cacheKey: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(table)
    .select("payload, expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return data.payload as T;
}

export async function writeCache(table: CacheTable, cacheKey: string, source: string, payload: Json, ttlSeconds: number) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabase.from(table).upsert({
    cache_key: cacheKey,
    source,
    payload,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
}
