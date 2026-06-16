import { describe, expect, it } from "vitest";
import { imageProxyUrl, makeScopedId, parseScopedId, slugify } from "./types";

describe("source identity helpers", () => {
  it("round-trips scoped MangaDex ids", () => {
    const id = makeScopedId("mangadex", "abc-123");
    expect(id).toBe("mangadex:abc-123");
    expect(parseScopedId(encodeURIComponent(id))).toEqual({ source: "mangadex", sourceId: "abc-123" });
  });

  it("falls back to sample source for unscoped ids", () => {
    expect(parseScopedId("blue-period")).toEqual({ source: "sample", sourceId: "blue-period" });
  });

  it("normalizes Vietnamese-ish titles for stable slugs", () => {
    expect(slugify("Đọc truyện: Chương 01!")).toBe("doc-truyen-chuong-01");
  });

  it("builds proxy URLs with source metadata", () => {
    expect(imageProxyUrl("https://example.com/a b.jpg", "mangadex")).toBe(
      "/api/public/image?src=https%3A%2F%2Fexample.com%2Fa+b.jpg&source=mangadex",
    );
  });
});
