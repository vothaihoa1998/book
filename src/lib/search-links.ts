export type SearchFilterParams = {
  source?: string;
  status?: string;
  sort?: string;
  year?: string;
  releaseYear?: string;
  language?: string;
  format?: string;
  page?: number;
  view?: "grid" | "list";
  genres?: string[];
};

function appendFilterParams(params: URLSearchParams, filters: SearchFilterParams, includeView: boolean) {
  if (filters.source && filters.source !== "all") params.set("source", filters.source);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.sort && (!includeView || filters.sort !== "latest")) params.set("sort", filters.sort);
  if (filters.year && filters.year !== "all") params.set("year", filters.year);
  if (filters.releaseYear && filters.releaseYear !== "all") params.set("releaseYear", filters.releaseYear);
  if (filters.language && filters.language !== "all") params.set("language", filters.language);
  if (filters.format && filters.format !== "all") params.set("format", filters.format);
  if (includeView && filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (includeView && filters.view && filters.view !== "grid") params.set("view", filters.view);
  filters.genres?.forEach((genre) => {
    if (genre) params.append("genres", genre);
  });
}

export function apiSearchHref(query: string, filters: SearchFilterParams = {}, limit = 5) {
  const params = new URLSearchParams();
  const q = query.trim();
  if (q) params.set("q", q);
  params.set("limit", String(Math.max(1, Math.min(10, limit))));
  appendFilterParams(params, filters, false);
  return `/api/search?${params.toString()}`;
}

export function discoverSearchHref(query: string, filters: SearchFilterParams = {}) {
  const params = new URLSearchParams();
  const q = query.trim();
  if (q) params.set("q", q);
  appendFilterParams(params, filters, true);
  const search = params.toString();
  return search ? `/discover?${search}` : "/discover";
}
