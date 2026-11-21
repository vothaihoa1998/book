import { describe, expect, it } from "vitest";
import { defaultReaderPrefs } from "./reader-presets";
import {
  emptyReaderPreferenceStore,
  getReaderFormatOverride,
  getReaderProfile,
  normalizeReaderPrefs,
  parseReaderPreferenceStore,
  setReaderFormatOverride,
  setReaderProfile,
} from "./reader-preferences";

describe("reader preference profiles", () => {
  it("round-trips device and format-specific preferences without cross-profile leakage", () => {
    const mobileManga = { ...defaultReaderPrefs(true), layout: "single" as const };
    const store = setReaderProfile(emptyReaderPreferenceStore(), "mobile", "manga", mobileManga);

    expect(getReaderProfile(store, "mobile", "manga", defaultReaderPrefs(false)).layout).toBe("single");
    expect(getReaderProfile(store, "desktop", "manga", defaultReaderPrefs(false)).layout).toBe("auto");
    expect(getReaderProfile(store, "mobile", "webtoon", defaultReaderPrefs(false)).theme).toBe("warm-light");
  });

  it("loads and updates a per-manga format override", () => {
    const store = setReaderFormatOverride(emptyReaderPreferenceStore(), "manga:one", "webtoon");
    const parsed = parseReaderPreferenceStore(JSON.stringify(store));

    expect(getReaderFormatOverride(parsed, "manga:one")).toBe("webtoon");
    expect(getReaderFormatOverride(parsed, "manga:other")).toBeUndefined();
  });

  it("migrates older values safely and clamps invalid ranges", () => {
    const normalized = normalizeReaderPrefs(
      { brightness: 60, gap: -10, hideDelay: 20, swipe: false, prefetch: "invalid" },
      defaultReaderPrefs(true),
    );

    expect(normalized.brightness).toBe(35);
    expect(normalized.gap).toBe(0);
    expect(normalized.hideDelay).toBe(8);
    expect(normalized.swipe).toBe(false);
    expect(normalized.prefetch).toBe("auto");
    expect(parseReaderPreferenceStore("{bad json").version).toBe(1);
  });
});
