import "server-only";

type JsonValue = Record<string, unknown> | unknown[];

export async function fetchJson<T extends JsonValue>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 8000, headers, ...rest } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "InkRail/1.0 editorial manga reader",
        ...headers,
      },
      next: { revalidate: 60 * 60, ...rest.next },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed ${response.status} for ${url}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function pickLocalized(value: Record<string, string> | undefined | null) {
  if (!value) return "";
  return value.vi || value.en || value["en-us"] || Object.values(value).find(Boolean) || "";
}

export function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}
