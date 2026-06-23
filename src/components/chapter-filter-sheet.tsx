"use client";

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
      defaultSnap="60vh"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() =>
              onChange({
                search: "",
                sort: "latest",
                langs: [],
                hideRead: false,
                showVolumes: true,
              })
            }
            className="rounded-full px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Đặt lại
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Áp dụng ({resultCount})
          </button>
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
              <button
                key={opt.value}
                type="button"
                aria-pressed={filter.sort === opt.value}
                onClick={() => onChange({ ...filter, sort: opt.value })}
                className={
                  filter.sort === opt.value
                    ? "rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground"
                    : "rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-secondary"
                }
              >
                {opt.label}
              </button>
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
                  <button
                    key={lang}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onChange({
                        ...filter,
                        langs: active ? filter.langs.filter((l) => l !== lang) : [...filter.langs, lang],
                      })
                    }
                    className={
                      active
                        ? "rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground"
                        : "rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-secondary"
                    }
                  >
                    {langShortLabel(lang)}
                  </button>
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