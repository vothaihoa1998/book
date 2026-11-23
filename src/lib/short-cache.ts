/** Small process-local cache for checks repeated by all images in a chapter. */
export function createShortCache<T>(ttlMs: number, maxEntries = 500) {
  const values = new Map<string, { value: T; expiresAt: number }>();
  const pending = new Map<string, Promise<T>>();
  return async (key: string, load: () => Promise<T>): Promise<T> => {
    const cached = values.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const active = pending.get(key);
    if (active) return active;
    const request = Promise.resolve().then(load).then((value) => {
      values.delete(key);
      values.set(key, { value, expiresAt: Date.now() + ttlMs });
      while (values.size > maxEntries) values.delete(values.keys().next().value!);
      return value;
    });
    pending.set(key, request);
    try { return await request; }
    finally { if (pending.get(key) === request) pending.delete(key); }
  };
}
