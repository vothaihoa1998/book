import { createHash, randomUUID } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import type { Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { parseRetryAfter } from "./upstream-policy";

export { parseRetryAfter } from "./upstream-policy";

type UpstreamSource = "mangadex" | "otruyen" | "firecrawl";

type MemoryEntry = {
  expiresAt: number;
  value: unknown;
};

const memoryCache = new Map<string, MemoryEntry>();
const inFlight = new Map<string, Promise<unknown>>();
const localRateWindows = new Map<string, number[]>();
const localCooldowns = new Map<string, number>();
const localFailures = new Map<string, number>();
const limiters = new Map<string, Ratelimit>();
let redisClient: Redis | null | undefined;

function positiveInt(name: string, fallback: number, max: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.min(max, Math.floor(value)) : fallback;
}

const policy = {
  apiPerSecond: () => positiveInt("MANGADEX_API_RPS", 4, 20),
  atHomePerMinute: () => positiveInt("MANGADEX_ATHOME_LIMIT", 30, 600),
  randomPerMinute: () => positiveInt("MANGADEX_RANDOM_LIMIT", 45, 600),
  userApiPerMinute: () => positiveInt("MANGADEX_USER_API_LIMIT", 60, 600),
  userSearchPerMinute: () => positiveInt("MANGADEX_USER_SEARCH_LIMIT", 20, 600),
  queueMax: () => positiveInt("MANGADEX_QUEUE_MAX", 64, 256),
  queueWaitMs: () => positiveInt("MANGADEX_QUEUE_WAIT_MS", 5_000, 30_000),
};

export type MangaDexPriority = 0 | 1 | 2 | 3 | 4;

type QueueEntry = {
  priority: MangaDexPriority;
  identity: string;
  startedAt: number;
  load: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

const queue: QueueEntry[] = [];
let activeQueueRuns = 0;
const queueFairness = new Map<string, number>();
const metrics = {
  cacheHits: 0,
  cacheMisses: 0,
  dedupHits: 0,
  upstreamRequests: 0,
  rateLimitRejections: 0,
  responses429: 0,
  responses403: 0,
  queueWaitMs: 0,
  queueSamples: 0,
  latencyMs: 0,
  latencySamples: 0,
};
let breakerOpen = false;
const activeUserHashes = new Set<string>();

function drainQueue() {
  while (activeQueueRuns < positiveInt("MANGADEX_QUEUE_CONCURRENCY", 8, 32) && queue.length) {
    queue.sort((a, b) => a.priority - b.priority || (queueFairness.get(a.identity) ?? 0) - (queueFairness.get(b.identity) ?? 0));
    const entry = queue.shift();
    if (!entry) return;
    clearTimeout(entry.timer);
    activeQueueRuns++;
    queueFairness.set(entry.identity, (queueFairness.get(entry.identity) ?? 0) + 1);
    const waited = Date.now() - entry.startedAt;
    metrics.queueWaitMs += waited;
    metrics.queueSamples++;
    Promise.resolve(entry.load()).then(entry.resolve, entry.reject).finally(() => {
      activeQueueRuns--;
      drainQueue();
    });
  }
}

export function enqueueMangaDexRequest<T>(priority: MangaDexPriority, identity: string, load: () => Promise<T>) {
  if (priority === 4) {
    const budget = positiveInt("MANGADEX_QUEUE_PREFETCH_BUDGET", 8, 64);
    if (queue.length + activeQueueRuns >= budget) {
      throw new UpstreamRateLimitError(1);
    }
  }
  if (queue.length + activeQueueRuns >= policy.queueMax()) {
    throw new UpstreamRateLimitError(1);
  }
  return new Promise<T>((resolve, reject) => {
    const entry: QueueEntry = {
      priority,
      identity,
      startedAt: Date.now(),
      load,
      resolve: (value) => resolve(value as T),
      reject,
      timer: setTimeout(() => {
        const index = queue.indexOf(entry);
        if (index >= 0) queue.splice(index, 1);
        reject(new UpstreamCooldownError(Math.ceil(policy.queueWaitMs() / 1000)));
      }, policy.queueWaitMs()),
    };
    queue.push(entry);
    drainQueue();
  });
}

export class UpstreamRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Upstream request rate limit reached.");
    this.name = "UpstreamRateLimitError";
  }
}

export class UpstreamCooldownError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Upstream is in a shared cooldown.");
    this.name = "UpstreamCooldownError";
  }
}

export class UpstreamBlockedError extends Error {
  constructor() {
    super("Upstream access is paused after an HTTP 403; manual review is required.");
    this.name = "UpstreamBlockedError";
  }
}

export function getRedisClient() {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url && !token) {
    redisClient = null;
    return redisClient;
  }
  if (!url || !token) {
    throw new Error("Both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured.");
  }

  const parsed = new URL(url);
  const localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHttp) {
    throw new Error("Upstash Redis REST must use HTTPS.");
  }

  redisClient = new Redis({ url: parsed.href, token, enableTelemetry: false });
  return redisClient;
}

function requireRedis() {
  const redis = getRedisClient();
  if (!redis && process.env.NODE_ENV === "production") {
    throw new Error("Upstash Redis must be configured in production for centralized rate limiting and request deduplication.");
  }
  return redis;
}

function sourceForUrl(value: string): { source: UpstreamSource; host: string; path: string } {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Upstream requests require a credential-free HTTPS URL on the default port.");
  }

  const host = url.hostname.toLowerCase();
  const firecrawlEndpoint = process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev/v2/search";
  try {
    const endpoint = new URL(firecrawlEndpoint);
    if (url.origin === endpoint.origin && url.pathname === endpoint.pathname) {
      return { source: "firecrawl", host, path: url.pathname };
    }
  } catch {
    throw new Error("FIRECRAWL_API_URL must be a valid HTTPS URL.");
  }
  if (host === "api.mangadex.org" || host === "uploads.mangadex.org" || host.endsWith(".mangadex.network")) {
    return { source: "mangadex", host, path: url.pathname };
  }
  if (host === "api.otruyenapi.com" || host === "img.otruyenapi.com" || host.endsWith(".otruyencdn.com")) {
    return { source: "otruyen", host, path: url.pathname };
  }
  throw new Error(`Unsupported upstream host: ${host}`);
}

function limiterWindow(windowMs: number): Duration {
  return windowMs % 60_000 === 0 ? `${windowMs / 60_000} m` : `${windowMs / 1000} s`;
}

function getLimiter(name: string, limit: number, windowMs: number, redis: Redis) {
  const key = `${name}:${limit}:${windowMs}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, limiterWindow(windowMs)),
      prefix: `inkrail:ratelimit:${name}`,
      analytics: false,
      enableTelemetry: false,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

export async function assertRateLimit(name: string, identifier: string, limit: number, windowMs: number) {
  const redis = requireRedis();
  if (redis) {
    const result = await getLimiter(name, limit, windowMs, redis).limit(identifier);
    if (!result.success) {
      metrics.rateLimitRejections++;
      throw new UpstreamRateLimitError(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)));
    }
    return;
  }

  const key = `${name}:${identifier}`;
  const now = Date.now();
  const recent = (localRateWindows.get(key) ?? []).filter((timestamp) => timestamp > now - windowMs);
  if (recent.length >= limit) {
    localRateWindows.set(key, recent);
    metrics.rateLimitRejections++;
    throw new UpstreamRateLimitError(Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)));
  }
  recent.push(now);
  localRateWindows.set(key, recent);
}

function upstreamKeys(source: UpstreamSource) {
  return {
    blocked: `inkrail:upstream:${source}:blocked`,
    cooldown: `inkrail:upstream:${source}:cooldown`,
    failures: `inkrail:upstream:${source}:429-count`,
  };
}

export async function assertUpstreamAvailable(value: string) {
  const { source, host, path } = sourceForUrl(value);
  const redis = requireRedis();
  const keys = upstreamKeys(source);

  if (redis) {
    if (await redis.get(keys.blocked)) throw new UpstreamBlockedError();
    const cooldown = await redis.get(keys.cooldown);
    if (cooldown) {
      const ttl = await redis.ttl(keys.cooldown);
      throw new UpstreamCooldownError(Math.max(1, ttl));
    }
  } else {
    const now = Date.now();
    if (localCooldowns.get(`${source}:blocked`)) throw new UpstreamBlockedError();
    const until = localCooldowns.get(`${source}:cooldown`) ?? 0;
    if (until > now) throw new UpstreamCooldownError(Math.max(1, Math.ceil((until - now) / 1000)));
  }

  if (source === "mangadex" && host === "api.mangadex.org") {
    await assertRateLimit("mangadex-api", "shared-egress", policy.apiPerSecond(), 1_000);
    if (path.startsWith("/at-home/server/")) {
      await assertRateLimit("mangadex-at-home", "shared-egress", policy.atHomePerMinute(), 60_000);
    } else if (path === "/manga/random") {
      await assertRateLimit("mangadex-random", "shared-egress", policy.randomPerMinute(), 60_000);
    }
  } else if (source === "otruyen" && host === "api.otruyenapi.com") {
    await assertRateLimit("otruyen-api", "shared-egress", 4, 1_000);
  } else if (source === "firecrawl") {
    await assertRateLimit("firecrawl-api", "shared-egress", 4, 1_000);
  }

  return source;
}

export async function recordUpstreamResponse(source: UpstreamSource, status: number, headers: Headers): Promise<number | null> {
  const redis = requireRedis();
  const keys = upstreamKeys(source);
  metrics.upstreamRequests++;
  if (status === 403 && source === "mangadex") {
    metrics.responses403++;
    breakerOpen = true;
    if (redis) await redis.set(keys.blocked, "403");
    else localCooldowns.set(`${source}:blocked`, Date.now() + 365 * 24 * 60 * 60 * 1_000);
    return null;
  }

  if (status === 429) {
    metrics.responses429++;
    let failures = 1;
    if (redis) {
      failures = await redis.incr(keys.failures);
      if (failures === 1) await redis.expire(keys.failures, 3_600);
    } else {
      failures = (localFailures.get(source) ?? 0) + 1;
      localFailures.set(source, failures);
    }
    const delay = parseRetryAfter(headers) ?? Math.min(60_000, 1_000 * 2 ** Math.min(failures - 1, 6));
    const seconds = Math.max(1, Math.ceil(delay / 1_000));
    if (redis) await redis.set(keys.cooldown, "429", { ex: seconds });
    else localCooldowns.set(`${source}:cooldown`, Date.now() + delay);
    return seconds;
  }

  if (status < 400) {
    if (redis) await redis.del(keys.failures);
    else {
      localFailures.delete(source);
    }
  }
  return null;
}

export class UpstreamHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "UpstreamHttpError";
  }
}

type CacheOptions = {
  staleWhileRevalidateSeconds?: number;
  staleIfErrorSeconds?: number;
  negativeTtlSeconds?: number;
};

type CacheEnvelope<T> = {
  inkrailCache: true;
  value: T | null;
  expiresAt: number;
  staleUntil: number;
  negative?: boolean;
};

function isEnvelope<T>(value: unknown): value is CacheEnvelope<T> {
  return Boolean(value && typeof value === "object" && "inkrailCache" in value && (value as CacheEnvelope<T>).inkrailCache);
}

export async function cacheUpstreamResponse<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const digest = createHash("sha256").update(key).digest("hex");
  const cacheKey = `inkrail:upstream:v1:${digest}`;
  const active = inFlight.get(cacheKey);
  if (active) {
    metrics.dedupHits++;
    return active as Promise<T>;
  }

  const redis = requireRedis();
  const staleWindow = Math.max(0, options.staleWhileRevalidateSeconds ?? options.staleIfErrorSeconds ?? 0);
  const request = (async () => {
    let cachedEnvelope: CacheEnvelope<T> | null = null;
    let cachedRaw: T | null = null;
    const now = Date.now();

    if (redis) {
      const cached = await redis.get<CacheEnvelope<T> | T>(cacheKey);
      if (isEnvelope<T>(cached)) cachedEnvelope = cached;
      else if (cached !== null) {
        cachedRaw = cached;
      }
    } else {
      const cached = memoryCache.get(cacheKey);
      if (cached) {
        if (isEnvelope<T>(cached.value)) cachedEnvelope = cached.value;
        else if (cached.expiresAt > now) cachedRaw = cached.value as T;
      }
    }

    if (cachedRaw !== null) {
      metrics.cacheHits++;
      return cachedRaw;
    }

    if (cachedEnvelope) {
      if (cachedEnvelope.negative) {
        if (cachedEnvelope.expiresAt > now) {
          metrics.cacheHits++;
          throw new UpstreamHttpError(404, "Upstream resource was not found.");
        }
      } else if (cachedEnvelope.expiresAt > now) {
        metrics.cacheHits++;
        return cachedEnvelope.value as T;
      } else if (cachedEnvelope.staleUntil > now && options.staleWhileRevalidateSeconds) {
        metrics.cacheHits++;
        if (options.staleWhileRevalidateSeconds) {
          void (async () => {
            try {
              const value = await load();
              const envelope: CacheEnvelope<T> = {
                inkrailCache: true,
                value,
                expiresAt: Date.now() + ttlSeconds * 1000,
                staleUntil: Date.now() + (ttlSeconds + staleWindow) * 1000,
              };
              if (redis) await redis.set(cacheKey, envelope, { ex: Math.max(1, ttlSeconds + staleWindow) });
              else memoryCache.set(cacheKey, { value: envelope, expiresAt: envelope.staleUntil });
            } catch {
              // Keep the stale envelope until staleUntil.
            }
          })();
        }
        return cachedEnvelope.value as T;
      }
    }
    metrics.cacheMisses++;

    if (!redis) {
      try {
        const value = await load();
        const envelope: CacheEnvelope<T> = {
          inkrailCache: true,
          value,
          expiresAt: Date.now() + ttlSeconds * 1000,
          staleUntil: Date.now() + (ttlSeconds + staleWindow) * 1000,
        };
        memoryCache.set(cacheKey, { value: envelope, expiresAt: envelope.staleUntil });
        while (memoryCache.size > 500) memoryCache.delete(memoryCache.keys().next().value!);
        return value;
      } catch (error) {
        if (error instanceof UpstreamHttpError && error.status === 404 && options.negativeTtlSeconds) {
          const envelope: CacheEnvelope<T> = {
            inkrailCache: true,
            value: null,
            expiresAt: Date.now() + options.negativeTtlSeconds * 1000,
            staleUntil: 0,
            negative: true,
          };
          memoryCache.set(cacheKey, { value: envelope, expiresAt: envelope.expiresAt });
        }
        if (error && cachedEnvelope && cachedEnvelope.staleUntil > Date.now() && options.staleIfErrorSeconds) {
          return cachedEnvelope.value as T;
        }
        throw error;
      }
    }

    const lockKey = `${cacheKey}:lock`;
    const lockToken = randomUUID();
    const acquired = await redis.set(lockKey, lockToken, { nx: true, ex: 20 });
    if (acquired !== "OK") {
      for (let attempt = 0; attempt < 90; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const shared = await redis.get<CacheEnvelope<T> | T>(cacheKey);
        if (isEnvelope<T>(shared)) {
          if (shared.negative && shared.expiresAt > Date.now()) throw new UpstreamHttpError(404, "Upstream resource was not found.");
          if (shared.value !== null) return shared.value;
        } else if (shared !== null) return shared;
      }
      throw new Error("Timed out waiting for the shared upstream request.");
    }

    try {
      try {
        const value = await load();
        const envelope: CacheEnvelope<T> = {
          inkrailCache: true,
          value,
          expiresAt: Date.now() + ttlSeconds * 1000,
          staleUntil: Date.now() + (ttlSeconds + staleWindow) * 1000,
        };
        await redis.set(cacheKey, envelope, { ex: Math.max(1, ttlSeconds + staleWindow) });
        return value;
      } catch (error) {
        if (error instanceof UpstreamHttpError && error.status === 404 && options.negativeTtlSeconds) {
          const envelope: CacheEnvelope<T> = {
            inkrailCache: true,
            value: null,
            expiresAt: Date.now() + options.negativeTtlSeconds * 1000,
            staleUntil: 0,
            negative: true,
          };
          await redis.set(cacheKey, envelope, { ex: options.negativeTtlSeconds });
        }
        if (cachedEnvelope?.staleUntil && cachedEnvelope.staleUntil > Date.now() && options.staleIfErrorSeconds) {
          return cachedEnvelope.value as T;
        }
        throw error;
      }
    } finally {
      const currentToken = await redis.get<string>(lockKey);
      if (currentToken === lockToken) await redis.del(lockKey);
    }
  })();

  inFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (inFlight.get(cacheKey) === request) inFlight.delete(cacheKey);
  }
}

export function hashIdentifier(value: string) {
  return createHash("sha256").update(value.trim()).digest("hex").slice(0, 32);
}

export function trustedRequestIp(request: Request) {
  return trustedHeadersIp(request.headers);
}

export function trustedHeadersIp(headers: Headers) {
  if (process.env.TRUSTED_PROXY !== "1") return null;
  const candidates = [
    process.env.TRUSTED_PROXY_IP_HEADER,
    "cf-connecting-ip",
    "x-vercel-forwarded-for",
  ].filter((value): value is string => Boolean(value));
  for (const name of candidates) {
    const value = headers.get(name)?.trim();
    if (value) return value.split(",")[0].trim();
  }
  return null;
}

export async function assertMangaDexUserLimit(identity: string, kind: "api" | "search") {
  activeUserHashes.add(identity);
  if (kind === "search") {
    await assertRateLimit("mangadex-user-search", identity, policy.userSearchPerMinute(), 60_000);
  } else {
    await assertRateLimit("mangadex-user-api", identity, policy.userApiPerMinute(), 60_000);
  }
}

export function getUpstreamMetrics() {
  return {
    ...metrics,
    activeUsers: activeUserHashes.size,
    queueSize: queue.length,
    activeRequests: activeQueueRuns,
    averageQueueWaitMs: metrics.queueSamples ? Math.round(metrics.queueWaitMs / metrics.queueSamples) : 0,
    averageLatencyMs: metrics.latencySamples ? Math.round(metrics.latencyMs / metrics.latencySamples) : 0,
    breakerOpen,
  };
}

export function recordUpstreamLatency(durationMs: number) {
  metrics.latencyMs += Math.max(0, Math.round(durationMs));
  metrics.latencySamples++;
}

export function __resetUpstreamTestState() {
  redisClient = undefined;
  limiters.clear();
  memoryCache.clear();
  inFlight.clear();
  localRateWindows.clear();
  localCooldowns.clear();
  localFailures.clear();
  activeUserHashes.clear();
  breakerOpen = false;
  while (queue.length) {
    const entry = queue.shift();
    if (entry) clearTimeout(entry.timer);
  }
}
