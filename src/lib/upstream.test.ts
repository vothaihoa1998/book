import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisState = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  ratelimitSuccess: true,
  ratelimitCalls: [] as string[],
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    async get<T>(key: string) { return (redisState.store.get(key) as T | undefined) ?? null; }
    async set(key: string, value: unknown, options?: { nx?: boolean; ex?: number }) {
      if (options?.nx && redisState.store.has(key)) return null;
      redisState.store.set(key, value);
      return "OK";
    }
    async del(key: string) { redisState.store.delete(key); return 1; }
    async ttl(key: string) { return redisState.store.has(key) ? 30 : -1; }
    async incr(key: string) {
      const next = Number(redisState.store.get(key) ?? 0) + 1;
      redisState.store.set(key, next);
      return next;
    }
    async expire(key: string) { return redisState.store.has(key) ? 1 : 0; }
  },
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: Object.assign(class {
    constructor() {}
    async limit(identifier: string) {
      redisState.ratelimitCalls.push(identifier);
      return { success: redisState.ratelimitSuccess, reset: Date.now() + 1000 };
    }
  }, {
    slidingWindow: () => "sliding",
  }),
}));

import {
  __resetUpstreamTestState,
  assertMangaDexUserLimit,
  assertUpstreamAvailable,
  cacheUpstreamResponse,
  enqueueMangaDexRequest,
  recordUpstreamResponse,
  UpstreamBlockedError,
  UpstreamHttpError,
  UpstreamRateLimitError,
  hashIdentifier,
  trustedRequestIp,
} from "./upstream";

describe("upstream protection", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.TRUSTED_PROXY;
    delete process.env.TRUSTED_PROXY_IP_HEADER;
    redisState.store.clear();
    redisState.ratelimitCalls.length = 0;
    redisState.ratelimitSuccess = true;
    vi.stubEnv("NODE_ENV", "test");
    __resetUpstreamTestState();
  });

  it("fails closed in production when Redis is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(assertUpstreamAvailable("https://api.mangadex.org/manga")).rejects.toThrow(/Upstash Redis/);
  });

  it("applies MangaDex API and AtHome global limits plus random and user limits", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    __resetUpstreamTestState();

    await assertUpstreamAvailable("https://api.mangadex.org/manga");
    await assertUpstreamAvailable("https://api.mangadex.org/at-home/server/chapter");
    await assertUpstreamAvailable("https://api.mangadex.org/manga/random");
    await assertMangaDexUserLimit(hashIdentifier("user-1"), "api");
    await assertMangaDexUserLimit(hashIdentifier("user-2"), "search");

    expect(redisState.ratelimitCalls).toEqual(expect.arrayContaining([
      "shared-egress",
      hashIdentifier("user-1"),
      hashIdentifier("user-2"),
    ]));
  });

  it("returns rejection for exhausted Redis limits", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    redisState.ratelimitSuccess = false;
    __resetUpstreamTestState();
    await expect(assertMangaDexUserLimit("hashed-user", "api")).rejects.toBeInstanceOf(UpstreamRateLimitError);
  });

  it("records shared 429 cooldown and 403 breaker", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    __resetUpstreamTestState();

    await recordUpstreamResponse("mangadex", 429, new Headers({ "retry-after": "5" }));
    await expect(assertUpstreamAvailable("https://api.mangadex.org/manga")).rejects.toThrow();

    await recordUpstreamResponse("mangadex", 403, new Headers());
    await expect(assertUpstreamAvailable("https://api.mangadex.org/manga")).rejects.toBeInstanceOf(UpstreamBlockedError);
  });

  it("deduplicates concurrent cache loads and stores a 404 negative cache", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    __resetUpstreamTestState();
    let loads = 0;
    const load = async () => {
      loads++;
      throw new UpstreamHttpError(404, "not found");
    };

    const one = cacheUpstreamResponse("manga:missing", 300, load, { negativeTtlSeconds: 120 });
    const two = cacheUpstreamResponse("manga:missing", 300, load, { negativeTtlSeconds: 120 });
    await expect(Promise.all([one, two])).rejects.toBeInstanceOf(UpstreamHttpError);
    await expect(cacheUpstreamResponse("manga:missing", 300, load, { negativeTtlSeconds: 120 }))
      .rejects.toBeInstanceOf(UpstreamHttpError);
    expect(loads).toBe(1);
  });

  it("serves stale metadata for stale-if-error but never negative or private records", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    __resetUpstreamTestState();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    await expect(cacheUpstreamResponse("metadata:one", 1, async () => ({ title: "cached" }), {
      staleIfErrorSeconds: 300,
    })).resolves.toEqual({ title: "cached" });

    vi.setSystemTime(new Date("2026-01-01T00:00:03Z"));
    await expect(cacheUpstreamResponse("metadata:one", 1, async () => {
      throw new Error("upstream unavailable");
    }, { staleIfErrorSeconds: 300 })).resolves.toEqual({ title: "cached" });
    vi.useRealTimers();
  });

  it("bounds the queue, applies priority, and limits concurrency", async () => {
    process.env.MANGADEX_QUEUE_MAX = "3";
    process.env.MANGADEX_QUEUE_CONCURRENCY = "1";
    __resetUpstreamTestState();
    const order: string[] = [];
    const chapter = enqueueMangaDexRequest(0, "user-b", async () => { await Promise.resolve(); order.push("chapter"); return "chapter"; });
    const search = enqueueMangaDexRequest(2, "user-a", async () => { order.push("search"); return "search"; });
    const details = enqueueMangaDexRequest(1, "user-c", async () => { order.push("details"); return "details"; });
    await Promise.all([chapter, search, details]);
    expect(order).toEqual(["chapter", "details", "search"]);
  });

  it("sheds P4 prefetch before the configured budget", async () => {
    process.env.MANGADEX_QUEUE_PREFETCH_BUDGET = "1";
    process.env.MANGADEX_QUEUE_CONCURRENCY = "1";
    __resetUpstreamTestState();
    let release!: () => void;
    const blocking = new Promise<void>((resolve) => { release = resolve; });
    const running = enqueueMangaDexRequest(0, "reader", async () => { await blocking; return "reader"; });
    await Promise.resolve();
    expect(() => enqueueMangaDexRequest(4, "prefetch", async () => "ok")).toThrow(UpstreamRateLimitError);
    release();
    await running;
  });

  it("ignores attacker forwarding headers unless a trusted proxy is enabled", () => {
    const request = new Request("https://inkrail.test", { headers: { "x-forwarded-for": "203.0.113.10" } });
    expect(trustedRequestIp(request)).toBeNull();
    process.env.TRUSTED_PROXY = "1";
    process.env.TRUSTED_PROXY_IP_HEADER = "x-forwarded-for";
    expect(trustedRequestIp(request)).toBe("203.0.113.10");
  });

  it("hashes identifiers", () => {
    expect(hashIdentifier("user@example.com")).toMatch(/^[a-f0-9]{32}$/);
  });
});
