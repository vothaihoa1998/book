import { afterEach, describe, expect, it, vi } from "vitest";
import { createShortCache } from "./short-cache";

afterEach(() => vi.useRealTimers());
describe("short-lived blocklist cache", () => {
  it("coalesces chapter checks and picks up removals after five seconds", async () => {
    vi.useFakeTimers();
    const cache = createShortCache<string[]>(5000);
    const load = vi.fn(async () => [] as string[]);
    await Promise.all(Array.from({ length: 20 }, () => cache("chapter", load)));
    expect(load).toHaveBeenCalledTimes(1);
    load.mockResolvedValue(["blocked"]);
    expect(await cache("chapter", load)).toEqual([]);
    vi.advanceTimersByTime(5001);
    expect(await cache("chapter", load)).toEqual(["blocked"]);
  });

  it("does not cache a failed check", async () => {
    const cache = createShortCache<string[]>(5000);
    await expect(cache("chapter", async () => { throw new Error("database unavailable"); })).rejects.toThrow();
    expect(await cache("chapter", async () => ["blocked"])).toEqual(["blocked"]);
  });
});
