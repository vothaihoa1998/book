import { Flame, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { DISCOVER_GENRES } from "@/lib/sources/search-utils";
import { cn } from "@/lib/utils";

const statuses = [
  { value: "all", label: "Tất cả" },
  { value: "ongoing", label: "Đang ra" },
  { value: "completed", label: "Hoàn thành" },
];

const sorts = [
  { value: "hot", label: "Hot", icon: Flame },
  { value: "latest", label: "Mới cập nhật", icon: Sparkles },
  { value: "popular", label: "Phổ biến", icon: Sparkles },
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
  status = "all",
  sort = "hot",
  year = "all",
  genres = [],
}: {
  q?: string;
  status?: string;
  sort?: string;
  year?: string;
  genres?: string[];
}) {
  const selectedGenres = new Set(genres.map((genre) => genre.toLowerCase()));
  const activeFilterCount = genres.length + (status !== "all" ? 1 : 0) + (year !== "all" ? 1 : 0) + (sort !== "hot" ? 1 : 0);

  return (
    <form className="rounded-[8px] border border-border bg-surface/72 p-3 backdrop-blur md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative block flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm tên truyện hoặc tác giả"
            className="h-12 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none transition placeholder:text-muted focus:border-foreground/40"
          />
        </label>

        <div className="flex gap-2">
          <details className="group relative">
            <summary className="inline-flex h-12 cursor-pointer list-none items-center justify-center gap-2 rounded-full bg-chip px-4 text-sm font-semibold text-chip-text transition hover:text-foreground">
              <SlidersHorizontal size={16} /> Bộ lọc
              {activeFilterCount > 0 && <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-foreground">{activeFilterCount}</span>}
            </summary>
            <div className="fixed inset-x-3 bottom-3 z-30 max-h-[78vh] overflow-auto rounded-[18px] border border-border bg-background p-4 shadow-2xl md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-14 md:max-h-[min(70vh,640px)] md:w-[min(720px,calc(100vw-2rem))] md:rounded-[8px] md:p-5">
              <div className="space-y-5">
                <fieldset>
                  <legend className="mb-3 font-code text-[11px] uppercase text-muted">Thể loại</legend>
                  <div className="flex flex-wrap gap-2">
                    {DISCOVER_GENRES.map((genre) => (
                      <FilterChip
                        key={genre.value}
                        type="checkbox"
                        name="genres"
                        value={genre.value}
                        label={genre.label}
                        checked={selectedGenres.has(genre.value)}
                      />
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-3 font-code text-[11px] uppercase text-muted">Trạng thái</legend>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map((item) => <FilterChip key={item.value} type="radio" name="status" value={item.value} label={item.label} checked={status === item.value} />)}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-3 font-code text-[11px] uppercase text-muted">Năm cập nhật</legend>
                  <div className="flex flex-wrap gap-2">
                    {years().map((item) => <FilterChip key={item.value} type="radio" name="year" value={item.value} label={item.label} checked={year === item.value} />)}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-3 font-code text-[11px] uppercase text-muted">Sắp xếp</legend>
                  <div className="flex flex-wrap gap-2">
                    {sorts.map((item) => {
                      const Icon = item.icon;
                      return <FilterChip key={item.value} type="radio" name="sort" value={item.value} label={item.label} checked={sort === item.value} icon={<Icon size={14} />} />;
                    })}
                  </div>
                </fieldset>

                <div className="flex justify-end border-t border-border pt-4">
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold ink-on-dark">
                    <SlidersHorizontal size={16} /> Áp dụng
                  </button>
                </div>
              </div>
            </div>
          </details>

          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold ink-on-dark">
            <Search size={16} /> Tìm
          </button>
        </div>
      </div>
    </form>
  );
}

function FilterChip({ type, name, value, label, checked, icon }: { type: "checkbox" | "radio"; name: string; value: string; label: string; checked: boolean; icon?: React.ReactNode }) {
  return (
    <label className="cursor-pointer">
      <input type={type} name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full bg-chip px-4 text-sm font-medium text-chip-text transition hover:text-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-foreground/40 peer-checked:bg-foreground peer-checked:text-background",
        checked && "bg-foreground text-background",
      )}>
        {icon} {label}
      </span>
    </label>
  );
}
