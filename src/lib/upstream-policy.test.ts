import { describe, expect, it } from "vitest";
import { isAllowedImageUrl, parseRetryAfter } from "./upstream-policy";

describe("image proxy host policy", () => {
  it("allows only HTTPS image hosts for each source", () => {
    expect(isAllowedImageUrl("https://uploads.mangadex.org/covers/id/cover.jpg", "mangadex")).toBe(true);
    expect(isAllowedImageUrl("https://cmd-h.mangadex.network/data/hash/page.jpg", "mangadex")).toBe(true);
    expect(isAllowedImageUrl("https://img.otruyenapi.com/uploads/chapter/1.jpg", "otruyen")).toBe(true);
    expect(isAllowedImageUrl("https://images.unsplash.com/photo.jpg", "sample")).toBe(true);
  });

  it("rejects lookalike hosts, redirects by port, credentials and non-HTTPS URLs", () => {
    expect(isAllowedImageUrl("https://uploads.mangadex.org.evil.example/a.jpg", "mangadex")).toBe(false);
    expect(isAllowedImageUrl("https://mangadex.org/a.jpg", "mangadex")).toBe(false);
    expect(isAllowedImageUrl("https://img.otruyenapi.com:8443/a.jpg", "otruyen")).toBe(false);
    expect(isAllowedImageUrl("https://user@images.unsplash.com/a.jpg", "sample")).toBe(false);
    expect(isAllowedImageUrl("http://images.unsplash.com/a.jpg", "sample")).toBe(false);
    expect(isAllowedImageUrl("https://images.unsplash.com/a.jpg", "firecrawl")).toBe(false);
  });
});

describe("upstream Retry-After parsing", () => {
  it("parses delta seconds and clamps retry durations", () => {
    expect(parseRetryAfter(new Headers({ "retry-after": "5" }), 0)).toBe(5_000);
    expect(parseRetryAfter(new Headers({ "retry-after": "7200" }), 0)).toBe(3_600_000);
  });

  it("parses HTTP dates and MangaDex rate-limit timestamps", () => {
    expect(parseRetryAfter(new Headers({ "retry-after": new Date(15_000).toUTCString() }), 10_000)).toBe(5_000);
    expect(parseRetryAfter(new Headers({ "x-ratelimit-retry-after": "15" }), 10_000)).toBe(5_000);
    expect(parseRetryAfter(new Headers(), 10_000)).toBeNull();
  });
});
