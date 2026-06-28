# Discover Source Filter And Instant Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Discover source filtering so `source=mangadex` returns MangaDex-only results, then reuse the instant dropdown search UI for both the header search and the Discover page search input.

**Architecture:** Keep search execution on the server in `src/lib/sources` and `/api/search`. Add a small URL-building helper so the client search component can preserve active Discover filters while typing and while navigating. `InstantSearch` remains the single interactive dropdown implementation used by the header, mobile sheet, and Discover sticky search bar.

**Tech Stack:** Next.js 16.2.9 App Router, React 19 client components, Route Handlers with Web `Request`/`Response`, Vitest, existing Tailwind/lucide UI primitives.

---

## Context Notes

- Repo rule read before code: relevant Next docs checked in `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `15-route-handlers.md`, `04-linking-and-navigating.md`, and `01-app/02-guides/forms.md`.
- Current Discover bug: `src/app/discover/page.tsx` parses `state.source`, but passes `source: "all"` into `normalizeSearchParams`, so the source filter is ignored by server search.
- Current fallback bug: `src/lib/sources/index.ts` runs Firecrawl fallback when `normalized.source !== "otruyen"`, which means `source=mangadex` can still return `firecrawl` results if MangaDex returns empty.
- Header already uses `InstantSearch`, but Discover currently has a plain `<form>` search input with no typing dropdown.

## File Structure

- Modify `src/lib/sources/search-utils.ts`
  - Add one source policy helper: fallback search is only allowed for `source=all`.
- Modify `src/lib/sources/index.ts`
  - Use the source policy helper before running Firecrawl fallback.
- Modify `src/app/discover/page.tsx`
  - Pass the parsed source into `normalizeSearchParams`.
- Create `src/lib/search-links.ts`
  - Build stable `/api/search` and `/discover` URLs from query text and current filters.
- Modify `src/components/instant-search.tsx`
  - Accept `defaultQuery`, active filter params, configurable limit, and input/dropdown class names.
  - Use `search-links.ts` for fetch URL and Discover navigation.
- Modify `src/components/discover-results.tsx`
  - Replace the plain sticky search form with `InstantSearch`.
  - Pass current Discover filters so suggestions match selected source/status/year/genres.
- Modify `src/app/api/search/route.ts`
  - Include search meta in JSON for easier verification/debugging without changing the existing `results` contract.
- Modify `src/lib/types.test.ts`
  - Add unit coverage for fallback policy and URL builders.

---

### Task 1: Lock Source Fallback Policy

**Files:**
- Modify: `src/lib/sources/search-utils.ts`
- Modify: `src/lib/sources/index.ts`
- Test: `src/lib/types.test.ts`

- [ ] **Step 1: Write the failing fallback policy test**

Add `allowsSearchFallback` to the import in `src/lib/types.test.ts`:

```ts
import { allowsSearchFallback, applySearchFilters, dedupeManga, normalizeSearchParams, searchCacheKey, selectedSearchSources } from "./sources/search-utils";
```

Add this test inside `describe("search helpers", () => { ... })`:

```ts
  it("only allows external fallback when every source is selected", () => {
    expect(allowsSearchFallback("all")).toBe(true);
    expect(allowsSearchFallback("mangadex")).toBe(false);
    expect(allowsSearchFallback("otruyen")).toBe(false);
  });
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
npm test -- src/lib/types.test.ts
```

Expected: FAIL because `allowsSearchFallback` is not exported.

- [ ] **Step 3: Add the policy helper**

Append this helper near `selectedSearchSources` in `src/lib/sources/search-utils.ts`:

```ts
export function allowsSearchFallback(source: MangaSearchSource) {
  return source === "all";
}
```

- [ ] **Step 4: Use the helper in server search**

Update the import in `src/lib/sources/index.ts`:

```ts
import {
  allowsSearchFallback,
  applySearchFilters,
  dedupeManga,
  normalizeSearchParams,
  searchCacheKey,
  selectedSearchSources,
  sourceLimitations,
  uniqueSources,
} from "./search-utils";
```

Replace this fallback condition:

```ts
  if (!results.length && normalized.source !== "otruyen") {
```

with:

```ts
  if (!results.length && allowsSearchFallback(normalized.source)) {
```

- [ ] **Step 5: Run the unit test**

Run:

```bash
npm test -- src/lib/types.test.ts
```

Expected: PASS. This proves `source=mangadex` and `source=otruyen` cannot use Firecrawl fallback.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sources/search-utils.ts src/lib/sources/index.ts src/lib/types.test.ts
git commit -m "fix: restrict search fallback to all sources"
```

---

### Task 2: Make Discover Use The Selected Source

**Files:**
- Modify: `src/app/discover/page.tsx`
- Test: covered by manual API verification in Task 7, plus source normalization test already present in `src/lib/types.test.ts`

- [ ] **Step 1: Fix the source passed into search**

In `src/app/discover/page.tsx`, replace the hard-coded source in `DiscoverPage`:

```ts
  const searchState = normalizeSearchParams({
    q: state.q,
    source: "all",
    status: state.status as MangaSearchParams["status"],
    sort: state.sort as MangaSearchParams["sort"],
    year: state.year,
    page: state.page,
    genres: state.genres,
  });
```

with:

```ts
  const searchState = normalizeSearchParams({
    q: state.q,
    source: state.source as MangaSearchParams["source"],
    status: state.status as MangaSearchParams["status"],
    sort: state.sort as MangaSearchParams["sort"],
    year: state.year,
    page: state.page,
    genres: state.genres,
  });
```

- [ ] **Step 2: Run tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/discover/page.tsx
git commit -m "fix: honor discover source filter"
```

---

### Task 3: Add Search URL Builders

**Files:**
- Create: `src/lib/search-links.ts`
- Modify: `src/lib/types.test.ts`

- [ ] **Step 1: Write failing tests for generated URLs**

Add this import in `src/lib/types.test.ts`:

```ts
import { apiSearchHref, discoverSearchHref } from "./search-links";
```

Add a new test block near the search helper tests:

```ts
describe("search link helpers", () => {
  it("builds API search URLs with active discover filters", () => {
    expect(apiSearchHref(" doraemon ", {
      source: "mangadex",
      status: "completed",
      sort: "relevance",
      year: "2026",
      genres: ["action", "fantasy"],
    }, 5)).toBe("/api/search?q=doraemon&limit=5&source=mangadex&status=completed&sort=relevance&year=2026&genres=action&genres=fantasy");
  });

  it("builds discover search URLs and omits default filters", () => {
    expect(discoverSearchHref(" doraemon ", {
      source: "mangadex",
      status: "all",
      sort: "latest",
      year: "all",
      view: "list",
      genres: ["action"],
    })).toBe("/discover?q=doraemon&source=mangadex&view=list&genres=action");
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```bash
npm test -- src/lib/types.test.ts
```

Expected: FAIL because `src/lib/search-links.ts` does not exist.

- [ ] **Step 3: Create the URL helper**

Create `src/lib/search-links.ts`:

```ts
export type SearchFilterParams = {
  source?: string;
  status?: string;
  sort?: string;
  year?: string;
  view?: "grid" | "list";
  genres?: string[];
};

function appendFilterParams(params: URLSearchParams, filters: SearchFilterParams, includeView: boolean) {
  if (filters.source && filters.source !== "all") params.set("source", filters.source);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.sort && filters.sort !== "latest") params.set("sort", filters.sort);
  if (filters.year && filters.year !== "all") params.set("year", filters.year);
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
```

- [ ] **Step 4: Run URL helper tests**

Run:

```bash
npm test -- src/lib/types.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search-links.ts src/lib/types.test.ts
git commit -m "feat: add search URL helpers"
```

---

### Task 4: Extend InstantSearch For Filter-Aware Suggestions

**Files:**
- Modify: `src/components/instant-search.tsx`

- [ ] **Step 1: Update imports and props**

Add imports:

```ts
import { apiSearchHref, discoverSearchHref, type SearchFilterParams } from "@/lib/search-links";
```

Update `InstantSearchProps`:

```ts
type InstantSearchProps = {
  className?: string;
  placeholder?: string;
  onNavigate?: () => void;
  defaultQuery?: string;
  filters?: SearchFilterParams;
  limit?: number;
  inputClassName?: string;
  dropdownClassName?: string;
};
```

Update the component signature:

```ts
export function InstantSearch({
  className,
  placeholder = "Tìm truyện nhanh",
  onNavigate,
  defaultQuery = "",
  filters,
  limit = 5,
  inputClassName,
  dropdownClassName,
}: InstantSearchProps) {
```

- [ ] **Step 2: Initialize and sync the input query**

Replace:

```ts
  const [query, setQuery] = useState("");
```

with:

```ts
  const [query, setQuery] = useState(defaultQuery);
```

Add after the history-loading effect:

```ts
  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);
```

- [ ] **Step 3: Use filter-aware API href**

Replace:

```ts
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=5`, { signal: aborter.signal });
```

with:

```ts
        const res = await fetch(apiSearchHref(query.trim(), filters, limit), { signal: aborter.signal });
```

Update the effect dependency from:

```ts
  }, [query]);
```

to:

```ts
  }, [filters, limit, query]);
```

- [ ] **Step 4: Use filter-aware Discover navigation**

Replace:

```ts
    router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
```

with:

```ts
    router.push(discoverSearchHref(q, filters));
```

- [ ] **Step 5: Allow Discover-specific styling**

Update the input class:

```tsx
          className={cn(
            "h-9 w-full rounded-[var(--radius-control)] border border-border bg-card pl-9 pr-12 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:border-input focus-visible:bg-background focus-visible:outline-none",
            inputClassName,
          )}
```

Update the dropdown class:

```tsx
          className={cn(
            "absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-[var(--radius-card)] border border-border bg-popover p-1.5 shadow-[0_24px_60px_-20px_rgba(60,28,8,0.35)]",
            dropdownClassName,
          )}
```

- [ ] **Step 6: Run lint and tests**

Run:

```bash
npm test
npm run lint
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/instant-search.tsx
git commit -m "feat: make instant search filter aware"
```

---

### Task 5: Use InstantSearch On Discover

**Files:**
- Modify: `src/components/discover-results.tsx`

- [ ] **Step 1: Update imports**

Change:

```ts
import { useState } from "react";
```

to:

```ts
import { useMemo, useState } from "react";
```

Add:

```ts
import { InstantSearch } from "@/components/instant-search";
```

- [ ] **Step 2: Memoize current search filters**

Inside `DiscoverResults`, after `const [view, setView] = ...`, add:

```ts
  const searchFilters = useMemo(() => ({
    source: state.source,
    status: state.status,
    sort: state.sort,
    year: state.year,
    view,
    genres: state.genres,
  }), [state.genres, state.source, state.status, state.sort, state.year, view]);
```

- [ ] **Step 3: Replace the plain search form**

Replace the whole `<form action="/discover" method="get" className="relative flex-1">...</form>` block in the sticky filter bar with:

```tsx
        <InstantSearch
          className="flex-1"
          defaultQuery={state.q}
          filters={searchFilters}
          placeholder="Tìm truyện, tác giả, thể loại..."
          inputClassName="h-auto rounded-full py-1.5 pl-9 pr-9 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          dropdownClassName="z-[70] rounded-[var(--radius-sheet)]"
        />
```

- [ ] **Step 4: Run lint and tests**

Run:

```bash
npm test
npm run lint
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/discover-results.tsx
git commit -m "feat: add instant suggestions to discover search"
```

---

### Task 6: Expose Search Meta In API Response

**Files:**
- Modify: `src/app/api/search/route.ts`

- [ ] **Step 1: Include meta fields without breaking `results`**

Replace the response body in `src/app/api/search/route.ts`:

```ts
  return Response.json({
    results: limited,
    hasMore: payload.meta.hasMore,
    total: payload.results.length,
    query: params.q,
  });
```

with:

```ts
  return Response.json({
    results: limited,
    hasMore: payload.meta.hasMore,
    total: payload.results.length,
    query: payload.meta.query,
    source: payload.meta.source,
    sourceUsed: payload.meta.sourceUsed,
    fallbackUsed: payload.meta.fallbackUsed,
    errors: payload.meta.errors,
  });
```

- [ ] **Step 2: Run lint and tests**

Run:

```bash
npm test
npm run lint
```

Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/search/route.ts
git commit -m "chore: expose search source meta"
```

---

### Task 7: End-To-End Verification

**Files:**
- No source edits.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands PASS.

- [ ] **Step 2: Start the app locally**

Run:

```bash
npm run dev
```

Expected: Next dev server starts, usually at `http://localhost:3000`.

- [ ] **Step 3: Verify API source filter for MangaDex**

In another shell, run:

```bash
curl -s 'http://localhost:3000/api/search?q=doraemon&source=mangadex&limit=10' | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const p=JSON.parse(s);console.log({source:p.source, sourceUsed:p.sourceUsed, fallbackUsed:p.fallbackUsed, resultSources:[...new Set(p.results.map(r=>r.source))]})})'
```

Expected:

```txt
{
  source: 'mangadex',
  sourceUsed: [ 'mangadex' ],
  fallbackUsed: false,
  resultSources: [ 'mangadex' ]
}
```

If MangaDex returns zero results for the exact query, `resultSources` can be `[]`, but `fallbackUsed` must still be `false`.

- [ ] **Step 4: Verify Discover page source filter**

Open:

```txt
http://localhost:3000/discover?source=mangadex
```

Expected:

- Active chip shows `MangaDex`.
- Result cards/list entries navigate to ids starting with `mangadex:` when inspected in links.
- No `otruyen:` or `firecrawl:` manga appear.

- [ ] **Step 5: Verify Discover autocomplete preserves source**

Open:

```txt
http://localhost:3000/discover?source=mangadex
```

Type `doraemon` into the sticky Discover search input.

Expected:

- Dropdown opens while typing with cover, title, metadata, and source pill.
- Every suggestion source pill says `mangadex`.
- Selecting `Xem tất cả kết quả...` navigates to `/discover?q=doraemon&source=mangadex`.
- Selecting a result navigates to `/manga/mangadex%3A...`.

- [ ] **Step 6: Verify header search still works**

Open:

```txt
http://localhost:3000/
```

Type `doraemon` in the header search.

Expected:

- Dropdown opens while typing.
- Suggestions are mixed source when source filter is not active.
- Pressing Enter navigates to `/discover?q=doraemon`.

- [ ] **Step 7: Commit verification-only changes if any**

If no files changed during verification, skip this step. If snapshots or docs were intentionally updated:

```bash
git status --short
git add <changed-files>
git commit -m "test: verify discover instant search"
```

---

## Self-Review

- Spec coverage:
  - Discover filter correctness: Task 1 prevents source-specific fallback leakage; Task 2 makes Discover pass the selected source into the server search.
  - MangaDex-only example: Task 7 explicitly verifies `/api/search?...source=mangadex` and `/discover?source=mangadex`.
  - Header typing dropdown: Task 4 keeps and extends current `InstantSearch`.
  - Discover typing dropdown: Task 5 replaces the plain Discover search form with `InstantSearch`.
- Placeholder scan: no `TBD`, `TODO`, or unspecified "add tests later" steps remain.
- Type consistency:
  - `SearchFilterParams` is defined in Task 3 and imported by `InstantSearch` in Task 4.
  - `allowsSearchFallback` is defined in Task 1 and used by `searchMangaWithMeta`.
  - `apiSearchHref` and `discoverSearchHref` are defined in Task 3 and used by `InstantSearch` in Task 4.
