import { Flame, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { AppButton, FilterChip as UiFilterChip, TextField } from "@/components/ui/primitives";
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
    <form className="relative z-[70] rounded-[var(--radius-card)] border border-border bg-card/72 p-3 md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
          <TextField
            name="q"
            defaultValue={q}
            placeholder="Tìm tên truyện hoặc tác giả"
            inputClassName="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <details className="group relative">
            <summary className="inline-flex h-[var(--control-h-lg)] cursor-pointer list-none items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border bg-secondary px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
              <SlidersHorizontal size={16} /> Bộ lọc
              {activeFilterCount > 0 && <span className="rounded-[var(--radius-control)] bg-primary px-2 py-0.5 font-code text-[10px] leading-none text-primary-foreground">{activeFilterCount}</span>}
            </summary>
            <div className="filter-sheet fixed inset-x-3 bottom-3 z-[120] max-h-[78vh] overflow-auto rounded-[var(--radius-sheet)] border border-border bg-popover p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl md:bottom-auto md:left-auto md:right-6 md:top-24 md:max-h-[min(72vh,640px)] md:w-[min(720px,calc(100vw-3rem))] md:rounded-[var(--radius-sheet)] md:p-5 xl:right-[calc((100vw-80rem)/2+1.5rem)]">
              <div className="space-y-5">
                <fieldset>
                  <legend className="eyebrow mb-3">Thể loại</legend>
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
                  <legend className="eyebrow mb-3">Trạng thái</legend>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map((item) => <FilterChip key={item.value} type="radio" name="status" value={item.value} label={item.label} checked={status === item.value} />)}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="eyebrow mb-3">Năm cập nhật</legend>
                  <div className="flex flex-wrap gap-2">
                    {years().map((item) => <FilterChip key={item.value} type="radio" name="year" value={item.value} label={item.label} checked={year === item.value} />)}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="eyebrow mb-3">Sắp xếp</legend>
                  <div className="flex flex-wrap gap-2">
                    {sorts.map((item) => {
                      const Icon = item.icon;
                      return <FilterChip key={item.value} type="radio" name="sort" value={item.value} label={item.label} checked={sort === item.value} icon={<Icon size={14} />} />;
                    })}
                  </div>
                </fieldset>

                <div className="sticky bottom-0 -mx-4 -mb-4 flex justify-end border-t border-border bg-popover p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:-mx-5 md:-mb-5 md:p-5">
                  <AppButton>
                    <SlidersHorizontal size={16} /> Áp dụng
                  </AppButton>
                </div>
              </div>
            </div>
          </details>

          <AppButton size="lg">
            <Search size={16} /> Tìm
          </AppButton>
        </div>
      </div>
    </form>
  );
}

function FilterChip({ type, name, value, label, checked, icon }: { type: "checkbox" | "radio"; name: string; value: string; label: string; checked: boolean; icon?: React.ReactNode }) {
  return (
    <label className="cursor-pointer">
      <input type={type} name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <UiFilterChip active={checked} className={cn(
        "hover:text-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring peer-checked:bg-primary peer-checked:text-primary-foreground",
        checked && "bg-primary text-primary-foreground",
      )}>
        {icon} {label}
      </UiFilterChip>
    </label>
  );
}
