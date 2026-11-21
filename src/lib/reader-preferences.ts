import { defaultReaderPrefs } from "./reader-presets";
import type { ReaderDeviceClass, ReaderFormatProfile, ReaderPrefs } from "./types";

export const readerPreferencesStorageKey = "inkrail-reader-settings:v1";

export type ReaderPreferenceStore = {
  version: 1;
  byDeviceClass: Partial<Record<ReaderDeviceClass, Partial<Record<ReaderFormatProfile, ReaderPrefs>>>>;
  formatOverrides: Array<{ mangaId: string; format: ReaderFormatProfile }>;
};

const formats: ReaderFormatProfile[] = ["manga", "webtoon"];
const devices: ReaderDeviceClass[] = ["mobile", "desktop"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function normalizeReaderPrefs(value: unknown, fallback: ReaderPrefs): ReaderPrefs {
  if (!isRecord(value)) return fallback;
  const isOneOf = <T extends string>(candidate: unknown, options: readonly T[]): candidate is T =>
    typeof candidate === "string" && options.includes(candidate as T);
  const boundedInt = (candidate: unknown, min: number, max: number, defaultValue: number) =>
    typeof candidate === "number" && Number.isFinite(candidate)
      ? Math.max(min, Math.min(max, Math.round(candidate)))
      : defaultValue;

  return {
    theme: isOneOf(value.theme, ["warm-light", "paper", "sepia", "graphite-dark", "pure-black"])
      ? value.theme : fallback.theme,
    direction: isOneOf(value.direction, ["vertical", "horizontal-ltr", "horizontal-rtl"])
      ? value.direction : fallback.direction,
    layout: isOneOf(value.layout, ["auto", "single", "double", "strip"])
      ? value.layout : fallback.layout,
    fit: isOneOf(value.fit, ["width", "height", "original", "smart"])
      ? value.fit : fallback.fit,
    brightness: boundedInt(value.brightness, 0, 35, Math.min(fallback.brightness, 35)),
    fontSize: boundedInt(value.fontSize, 14, 24, fallback.fontSize),
    gap: boundedInt(value.gap, 0, 32, fallback.gap),
    tapEdges: typeof value.tapEdges === "boolean" ? value.tapEdges : fallback.tapEdges,
    swipe: typeof value.swipe === "boolean" ? value.swipe : fallback.swipe,
    autoHide: typeof value.autoHide === "boolean" ? value.autoHide : fallback.autoHide,
    hideDelay: boundedInt(value.hideDelay, 2, 8, fallback.hideDelay),
    reduceMotion: typeof value.reduceMotion === "boolean" ? value.reduceMotion : fallback.reduceMotion,
    dataSaver: typeof value.dataSaver === "boolean" ? value.dataSaver : fallback.dataSaver,
    prefetch: isOneOf(value.prefetch, ["auto", "1", "3"])
      ? value.prefetch : fallback.prefetch,
  };
}

export function emptyReaderPreferenceStore(): ReaderPreferenceStore {
  return { version: 1, byDeviceClass: {}, formatOverrides: [] };
}

export function parseReaderPreferenceStore(raw: string | null): ReaderPreferenceStore {
  if (!raw) return emptyReaderPreferenceStore();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.byDeviceClass)) {
      return emptyReaderPreferenceStore();
    }

    const byDeviceClass: ReaderPreferenceStore["byDeviceClass"] = {};
    for (const device of devices) {
      const deviceProfiles = parsed.byDeviceClass[device];
      if (!isRecord(deviceProfiles)) continue;
      const profiles: Partial<Record<ReaderFormatProfile, ReaderPrefs>> = {};
      for (const format of formats) {
        const profile = deviceProfiles[format];
        if (isRecord(profile)) profiles[format] = normalizeReaderPrefs(profile, defaultReaderPrefs(true));
      }
      if (Object.keys(profiles).length) byDeviceClass[device] = profiles;
    }

    const formatOverrides = Array.isArray(parsed.formatOverrides)
      ? parsed.formatOverrides.flatMap((item) => {
        if (!isRecord(item) || typeof item.mangaId !== "string" ||
          !isOneOfFormat(item.format)) return [];
        return [{ mangaId: item.mangaId, format: item.format }];
      }).slice(-200)
      : [];

    return { version: 1, byDeviceClass, formatOverrides };
  } catch {
    return emptyReaderPreferenceStore();
  }
}

function isOneOfFormat(value: unknown): value is ReaderFormatProfile {
  return value === "manga" || value === "webtoon";
}

export function getReaderProfile(
  store: ReaderPreferenceStore,
  device: ReaderDeviceClass,
  format: ReaderFormatProfile,
  fallback: ReaderPrefs,
) {
  return normalizeReaderPrefs(store.byDeviceClass[device]?.[format], fallback);
}

export function setReaderProfile(
  store: ReaderPreferenceStore,
  device: ReaderDeviceClass,
  format: ReaderFormatProfile,
  prefs: ReaderPrefs,
): ReaderPreferenceStore {
  return {
    ...store,
    byDeviceClass: {
      ...store.byDeviceClass,
      [device]: { ...store.byDeviceClass[device], [format]: prefs },
    },
  };
}

export function getReaderFormatOverride(store: ReaderPreferenceStore, mangaId: string) {
  return store.formatOverrides.find((item) => item.mangaId === mangaId)?.format;
}

export function setReaderFormatOverride(
  store: ReaderPreferenceStore,
  mangaId: string,
  format: ReaderFormatProfile,
): ReaderPreferenceStore {
  const overrides = store.formatOverrides.filter((item) => item.mangaId !== mangaId);
  overrides.push({ mangaId, format });
  return { ...store, formatOverrides: overrides.slice(-200) };
}
