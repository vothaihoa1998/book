"use client";

import { Button, FilterChip } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import type { ChapterListFilter } from "@/components/chapter-list";
import { langShortLabel } from "@/lib/format-time";

export type ChapterFilterSheetProps = {
  open: boolean;
  onClose: () => void;
  filter: ChapterListFilter;
  onChange: (next: ChapterListFilter) => void;
  languages: string[];
  /** Total chapters after current filter. */
  resultCount: number;
};

const SORTS: Array<{ value: ChapterListFilter["sort"]; label: string }> = [
  { value: "latest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "number", label: "Số chương" },
];

/**
 * Phase H1: filter sheet cho chapter list — sort, language multi-select,
 * hide-read toggle, show-volume toggle.
 */
export function ChapterFilterSheet({ open, onClose, filter, onChange, languages, resultCount }: ChapterFilterSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      ariaLabel="Bộ lọc chương"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                search: "",
                sort: "latest",
                langs: [],
                hideRead: false,
                showVolumes: true,
              })
            }
          >
            Đặt lại
          </Button>
          <Button onClick={onClose} className="flex-1">
            Áp dụng ({resultCount})
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pb-2">
        <h2 className="text-[15px] font-semibold text-foreground">Bộ lọc</h2>

        {/* Sort */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sắp xếp</p>
          <div className="flex flex-wrap gap-1.5">
            {SORTS.map((opt) => (
              <FilterChip
                key={opt.value}
                active={filter.sort === opt.value}
                onClick={() => onChange({ ...filter, sort: opt.value })}
                role="button"
                size="md"
              >
                {opt.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Languages */}
        {languages.length > 1 && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ngôn ngữ</p>
            <div className="flex flex-wrap gap-1.5">
              {languages.map((lang) => {
                const active = filter.langs.includes(lang);
                return (
                  <FilterChip
                    key={lang}
                    active={active}
                    onClick={() =>
                      onChange({
                        ...filter,
                        langs: active ? filter.langs.filter((l) => l !== lang) : [...filter.langs, lang],
                      })
                    }
                    role="button"
                    size="md"
                  >
                    {langShortLabel(lang)}
                  </FilterChip>
                );
              })}
            </div>
          </div>
        )}

        {/* Toggles */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
            <div>
              <p className="text-[13px] font-medium text-foreground">Ẩn chương đã đọc</p>
              <p className="text-[11px] text-muted-foreground">Chỉ hiện chương chưa đọc hoặc đang đọc dở</p>
            </div>
            <input
              type="checkbox"
              checked={filter.hideRead}
              onChange={(e) => onChange({ ...filter, hideRead: e.target.checked })}
              className="size-5 cursor-pointer accent-primary"
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
            <div>
              <p className="text-[13px] font-medium text-foreground">Gộp theo tập</p>
              <p className="text-[11px] text-muted-foreground">Nhóm các chương theo Vol/Tập khi có</p>
            </div>
            <input
              type="checkbox"
              checked={filter.showVolumes}
              onChange={(e) => onChange({ ...filter, showVolumes: e.target.checked })}
              className="size-5 cursor-pointer accent-primary"
            />
          </label>
        </div>
      </div>
    </Sheet>
  );
}