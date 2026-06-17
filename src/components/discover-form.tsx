import { Check, Flame, Grid2X2, List, Search, SlidersHorizontal, Sparkles, Star } from "lucide-react";
import { DISCOVER_GENRES } from "@/lib/sources/search-utils";
import { cn } from "@/lib/utils";

const sources = [
  { value: "all", label: "Mọi nguồn" },
  { value: "mangadex", label: "MangaDex" },
  { value: "otruyen", label: "OTruyen" },
];

const statuses = [
  { value: "all", label: "Mọi trạng thái" },
  { value: "ongoing", label: "Đang ra" },
  { value: "completed", label: "Hoàn thành" },
  { value: "hiatus", label: "Tạm nghỉ" },
];

const sorts = [
  { value: "relevance", label: "Liên quan", icon: Sparkles },
  { value: "hot", label: "Hot", icon: Flame },
  { value: "latest", label: "Mới cập nhật", icon: Search },
  { value: "popular", label: "Phổ biến", icon: Star },
  { value: "rating", label: "Đánh giá", icon: Star },
];

function years() {
  const current = new Date().getFullYear();
  return [
    { value: "all", label: "Mọi năm" },
    ...Array.from({ length: 6 }, (_, index) => {
      const year = current - index;
      return { value: String(year), label: String(year) };
    }),
    { value: "older", label: `Trước ${current - 5}` },
  ];
}

export function DiscoverForm({
  q = "",
  source = "all",
  status = "all",
  sort = "hot",
  year = "all",
  genres = [],
  view = "grid",
}: {
  q?: string;
  source?: string;
  status?: string;
  sort?: string;
  year?: string;
  genres?: string[];
  view?: string;
}) {
  const selectedGenres = new Set(genres.map((genre) => genre.toLowerCase()));

  return (
    <form className="border-y border-border bg-surface/72 backdrop-blur md:grid md:grid-cols-[minmax(260px,1fr)_auto] md:items-start">
      <div className="space-y-4 p-4 md:p-5">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm tên truyện hoặc tác giả"
            className="h-12 w-full rounded-[8px] border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-foreground/40"
          />
        </label>

        <details className="group md:open" open>
          <summary className="flex h-11 cursor-pointer list-none items-center justify-between rounded-[8px] border border-border bg-background px-3 text-sm font-semibold md:hidden">
            <span className="inline-flex items-center gap-2"><SlidersHorizontal size={16} /> Bộ lọc</span>
            <span className="font-code text-[10px] uppercase text-muted">{genres.length} thể loại</span>
          </summary>
          <div className="mt-4 space-y-5 md:mt-0">
            <fieldset>
              <legend className="mb-3 font-code text-[11px] uppercase text-muted">Thể loại</legend>
              <div className="flex flex-wrap gap-2">
                {DISCOVER_GENRES.map((genre) => {
                  const active = selectedGenres.has(genre.value);
                  return (
                    <label key={genre.value} className="cursor-pointer">
                      <input type="checkbox" name="genres" value={genre.value} defaultChecked={active} className="peer sr-only" />
                      <span className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-border bg-background px-3 text-sm text-muted transition peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background hover:border-foreground/35">
                        {active && <Check size={14} />}
                        {genre.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-3">
              <Select label="Nguồn" name="source" value={source} options={sources} />
              <Select label="Trạng thái" name="status" value={status} options={statuses} />
              <Select label="Năm" name="year" value={year} options={years()} />
            </div>

            <fieldset>
              <legend className="mb-3 font-code text-[11px] uppercase text-muted">Độ phổ biến</legend>
              <div className="flex flex-wrap gap-2">
                {sorts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <label key={item.value} className="cursor-pointer">
                      <input type="radio" name="sort" value={item.value} defaultChecked={sort === item.value} className="peer sr-only" />
                      <span className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-border bg-background px-3 text-sm text-muted transition peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background hover:border-foreground/35">
                        <Icon size={14} /> {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </details>
      </div>

      <div className="flex items-center gap-2 border-t border-border p-4 md:w-[172px] md:flex-col md:border-l md:border-t-0 md:p-5">
        <div className="grid h-10 flex-1 grid-cols-2 rounded-[8px] border border-border bg-background p-1 md:w-full md:flex-none">
          <ViewRadio value="grid" active={view === "grid"} icon="grid" />
          <ViewRadio value="list" active={view === "list"} icon="list" />
        </div>
        <button className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark md:w-full md:flex-none">
          <SlidersHorizontal size={16} /> Lọc
        </button>
      </div>
    </form>
  );
}

function Select({ label, name, value, options }: { label: string; name: string; value: string; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block">
      <span className="mb-2 block font-code text-[11px] uppercase text-muted">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-11 w-full rounded-[8px] border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground/40"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ViewRadio({ value, active, icon }: { value: "grid" | "list"; active: boolean; icon: "grid" | "list" }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name="view" value={value} defaultChecked={active} className="peer sr-only" />
      <span className={cn("grid h-8 place-items-center rounded-[6px] text-muted transition peer-checked:bg-foreground peer-checked:text-background", active && "bg-foreground text-background")}>
        {icon === "grid" ? <Grid2X2 size={15} /> : <List size={15} />}
      </span>
    </label>
  );
}
