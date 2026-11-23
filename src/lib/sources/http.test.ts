import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ events: [] as string[], cacheCalls: 0 }));
vi.mock("../upstream", () => ({
  assertUpstreamAvailable: vi.fn(async () => { state.events.push("limit"); return "mangadex"; }),
  assertMangaDexUserLimit: vi.fn(async () => {}),
  cacheUpstreamResponse: vi.fn(async (_key, _ttl, load) => { state.cacheCalls++; return load(); }),
  enqueueMangaDexRequest: vi.fn(async (_priority, _identity, load) => { state.events.push("queue"); return load(); }),
  recordUpstreamResponse: vi.fn(async (_source, status) => status === 429 ? 60 : null),
  recordUpstreamLatency: vi.fn(),
  parseRetryAfter: vi.fn(() => null),
  UpstreamHttpError: class extends Error { constructor(readonly status: number, message: string) { super(message); } },
  UpstreamRateLimitError: class extends Error { constructor(readonly retryAfterSeconds: number) { super("rate limit"); } },
  UpstreamCooldownError: class extends Error { constructor(readonly retryAfterSeconds: number) { super("cooldown"); } },
}));
import { fetchJson } from "./http";
import { assertUpstreamAvailable, UpstreamRateLimitError } from "../upstream";

beforeEach(() => { state.events.length = 0; state.cacheCalls = 0; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("upstream HTTP latency protection", () => {
  it("returns the shared cooldown immediately instead of retrying a 429", async () => {
    const fetch = vi.fn(async () => new Response("limited", { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    await expect(fetchJson("https://api.mangadex.org/manga")).rejects.toMatchObject({ retryAfterSeconds: 60 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("checks the rate limit after queue admission", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ data: [] })));
    await fetchJson("https://api.mangadex.org/manga");
    expect(state.events).toEqual(["queue", "limit"]);
  });

  it("waits for a short global limit instead of losing a valid chapter", async () => {
    vi.useFakeTimers();
    vi.mocked(assertUpstreamAvailable).mockRejectedValueOnce(new UpstreamRateLimitError(1));
    const fetch = vi.fn(async () => Response.json({ data: [] }));
    vi.stubGlobal("fetch", fetch);
    const request = fetchJson("https://api.mangadex.org/chapter/chapter-id");
    await vi.advanceTimersByTimeAsync(1000);
    await expect(request).resolves.toEqual({ data: [] });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps AtHome URLs out of persistent cache", async () => {
    const fetch = vi.fn(async () => Response.json({ baseUrl: "https://example.mangadex.network" }));
    vi.stubGlobal("fetch", fetch);
    await fetchJson("https://api.mangadex.org/at-home/server/chapter");
    expect(state.cacheCalls).toBe(0);
    expect(fetch.mock.calls[0]).toBeDefined();
  });
});
