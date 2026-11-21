"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen, Check, Columns2, Monitor, Rows3, Settings2, Sparkles,
} from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import type { ReaderFormatProfile, ReaderLayout, ReaderPrefs } from "@/lib/types";
import { cn } from "@/lib/utils";

const sections = [
  { id: "reader-layout", label: "Bố cục" },
  { id: "reader-images", label: "Ảnh" },
  { id: "reader-controls", label: "Điều khiển" },
  { id: "reader-display", label: "Hiển thị" },
  { id: "reader-data", label: "Dữ liệu" },
] as const;

const layoutChoices = [
  { value: "auto", label: "Tự động", description: "Theo thiết bị và định dạng", icon: Sparkles },
  { value: "single", label: "Một trang", description: "Tập trung từng trang", icon: BookOpen },
  { value: "double", label: "Hai trang", description: "Đọc theo spread", icon: Columns2 },
  { value: "strip", label: "Cuộn dọc", description: "Đọc liên tục", icon: Rows3 },
] as const;

const fitChoices = [
  { value: "smart", label: "Vừa màn hình", description: "Không vượt quá khung đọc" },
  { value: "width", label: "Vừa chiều rộng", description: "Lấp đầy chiều ngang" },
  { value: "height", label: "Vừa chiều cao", description: "Ưu tiên chiều cao trang" },
  { value: "original", label: "Ảnh gốc", description: "Không phóng ảnh vượt kích thước gốc" },
] as const;

const directionChoices = [
  { value: "vertical", label: "Tự động", description: "Theo chương truyện" },
  { value: "horizontal-rtl", label: "Phải sang trái", description: "Hướng đọc manga" },
  { value: "horizontal-ltr", label: "Trái sang phải", description: "Hướng đọc phổ biến" },
] as const;

const themes = [
  { value: "warm-light", label: "Sáng dịu", color: "#efe6d4" },
  { value: "paper", label: "Giấy", color: "#e9dec5" },
  { value: "sepia", label: "Sepia", color: "#c9b190" },
  { value: "graphite-dark", label: "Graphite", color: "#15121a" },
  { value: "pure-black", label: "OLED", color: "#000000" },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  prefs: ReaderPrefs;
  layout: Exclude<ReaderLayout, "auto">;
  format: ReaderFormatProfile;
  saved: boolean;
  onFormatChange: (format: ReaderFormatProfile) => void;
  onChange: (patch: Partial<ReaderPrefs>) => void;
  onReset: () => void;
};

export function ReaderSettings({
  open,
  onClose,
  prefs,
  layout,
  format,
  saved,
  onFormatChange,
  onChange,
  onReset,
}: Props) {
  const [advanced, setAdvanced] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirmReset) {
      resetButtonRef.current?.focus({ preventScroll: true });
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirmReset(false);
      }
      if (event.key !== "Tab") return;
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(
        "[data-reader-reset-dialog] button:not([disabled])",
      ));
      if (buttons.length !== 2) return;
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault();
        buttons[1].focus();
      } else if (!event.shiftKey && document.activeElement === buttons[1]) {
        event.preventDefault();
        buttons[0].focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.querySelector<HTMLButtonElement>("[data-reader-reset-dialog] button")?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmReset]);

  function navigateToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: prefs.reduceMotion ? "instant" : "smooth",
      block: "start",
    });
  }

  function reset() {
    setConfirmReset(false);
    onReset();
  }

  function close() {
    setAdvanced(false);
    setConfirmReset(false);
    onClose();
  }

  const header = (
    <div className="shrink-0 border-b border-border px-4 pb-3 pr-16">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-primary">TÙY CHỈNH</p>
          <h2 id="reader-settings-title" className="mt-1 text-xl font-semibold">Cách bạn đọc</h2>
          <p className="mt-1 text-xs text-muted-foreground">Thay đổi được áp dụng ngay · {saved ? "Đã lưu trên thiết bị" : "Chưa lưu được vào thiết bị"}</p>
        </div>
      </div>
      {advanced && (
        <nav aria-label="Nhóm cài đặt đọc" className="scrollbar-none mt-3 overflow-x-auto">
          <div className="flex min-w-max gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => navigateToSection(section.id)}
                className="rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring"
              >
                {section.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-3">
      {advanced ? (
        <button type="button" onClick={() => setAdvanced(false)} className="min-h-11 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
          Cài đặt nhanh
        </button>
      ) : (
        <button type="button" onClick={() => setAdvanced(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Settings2 size={16} /> Cài đặt nâng cao
        </button>
      )}
      <button type="button" onClick={close} className="ink-cta min-h-11 min-w-24 rounded-xl px-5 text-sm font-semibold">
        Xong
      </button>
    </div>
  );

  return (
    <>
      <Sheet
        open={open}
        onClose={close}
        ariaLabelledBy="reader-settings-title"
        header={header}
        footer={footer}
        overlay={confirmReset && (
          <ResetPreferencesDialog
            format={format}
            onCancel={() => setConfirmReset(false)}
            onConfirm={reset}
          />
        )}
        draggable={false}
        maxHeightClass="h-[90dvh] max-h-[90dvh]"
        panelClassName="top-[10dvh] bottom-0 rounded-t-[27px] md:inset-y-0 md:left-auto md:right-0 md:top-0 md:bottom-0 md:h-dvh md:max-h-dvh md:w-[min(580px,92vw)] md:rounded-none md:rounded-l-3xl md:border-l md:border-t-0"
      >
        {advanced ? (
          <div className="space-y-7 pb-4">
            <section id="reader-layout" className="scroll-mt-3 space-y-4">
              <SectionHeading title="Bố cục đọc" description="Chọn kiểu đọc hoặc để InkRail tự tối ưu." />
              <FormatProfile value={format} onChange={onFormatChange} />
              <ChoiceGrid
                label="Kiểu đọc"
                value={prefs.layout ?? "auto"}
                options={layoutChoices}
                columns={2}
                onChange={(value) => onChange({ layout: value })}
              />
            </section>

            <section id="reader-images" className="scroll-mt-3 space-y-4">
              <SectionHeading title="Ảnh & khoảng cách" description="Tùy chỉnh kích thước và nhịp đọc của trang." />
              <ChoiceGrid
                label="Kích thước ảnh"
                value={prefs.fit}
                options={fitChoices}
                columns={2}
                onChange={(value) => onChange({ fit: value })}
              />
              <RangeControl
                label="Khoảng cách trang"
                value={prefs.gap}
                min={0}
                max={32}
                formatValue={(value) => `${value}px`}
                disabled={layout === "single"}
                hint={layout === "single" ? "Không áp dụng cho chế độ một trang." : "Dùng cho cuộn dọc và hai trang."}
                onChange={(value) => onChange({ gap: value })}
              />
            </section>

            <section id="reader-controls" className="scroll-mt-3 space-y-4">
              <SectionHeading title="Điều khiển" description="Bật thao tác phù hợp với cách bạn cầm thiết bị." />
              <ChoiceGrid
                label="Hướng lật trang"
                value={prefs.direction}
                options={directionChoices}
                columns={1}
                disabled={layout === "strip"}
                hint={layout === "strip" ? "Chỉ áp dụng cho chế độ lật trang; giá trị vẫn được lưu." : undefined}
                onChange={(value) => onChange({ direction: value })}
              />
              <ToggleControl
                label="Chạm hai bên để lật trang"
                description="Chạm vùng lề trái hoặc phải của trang."
                checked={prefs.tapEdges}
                disabled={layout === "strip"}
                onChange={(tapEdges) => onChange({ tapEdges })}
              />
              <ToggleControl
                label="Vuốt để lật trang"
                description="Giữ nguyên thao tác cuộn và zoom của trình duyệt."
                checked={prefs.swipe}
                disabled={layout === "strip"}
                onChange={(swipe) => onChange({ swipe })}
              />
              <ToggleControl
                label="Tự ẩn thanh điều khiển"
                description="Ẩn sau một khoảng không thao tác."
                checked={prefs.autoHide}
                onChange={(autoHide) => onChange({ autoHide })}
              />
              <RangeControl
                label="Thời gian trước khi ẩn"
                value={prefs.hideDelay}
                min={2}
                max={8}
                formatValue={(value) => `${value} giây`}
                disabled={!prefs.autoHide}
                onChange={(hideDelay) => onChange({ hideDelay })}
              />
            </section>

            <section id="reader-display" className="scroll-mt-3 space-y-4">
              <SectionHeading title="Hiển thị & tập trung" description="Màu nền chỉ thay đổi vùng đọc, không đổi giao diện InkRail." />
              <ThemePicker value={prefs.theme} onChange={(theme) => onChange({ theme })} />
              <RangeControl
                label="Làm tối ảnh"
                value={prefs.brightness}
                min={0}
                max={35}
                formatValue={(value) => `${value}%`}
                hint="Chỉ giảm độ sáng của ảnh truyện."
                onChange={(brightness) => onChange({ brightness })}
              />
              <ToggleControl
                label="Giảm chuyển động"
                description="Tắt hiệu ứng lật trang và cuộn mượt."
                checked={prefs.reduceMotion}
                onChange={(reduceMotion) => onChange({ reduceMotion })}
              />
            </section>

            <section id="reader-data" className="scroll-mt-3 space-y-4">
              <SectionHeading title="Dữ liệu & cá nhân hóa" description="Các cài đặt hồ sơ được lưu cục bộ trên thiết bị này." />
              <ToggleControl
                label="Tiết kiệm dữ liệu"
                description="Giảm tải trước ảnh liền kề; ảnh đang đọc vẫn tải bình thường."
                checked={prefs.dataSaver}
                onChange={(dataSaver) => onChange({ dataSaver })}
              />
              <PrefetchPicker value={prefs.prefetch} onChange={(prefetch) => onChange({ prefetch })} />
              <div className="border-t border-border pt-4">
                <button
                  ref={resetButtonRef}
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground transition hover:border-destructive/50 hover:text-destructive focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                  Đặt lại hồ sơ {format === "manga" ? "Manga" : "Webtoon"}
                </button>
                <p className="mt-2 text-xs text-muted-foreground">Không xóa tiến độ đọc, bookmark hoặc chương đã tải.</p>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-6 pb-4">
            <section className="space-y-3">
              <SectionHeading title="Hồ sơ đọc" description="Manga và Webtoon lưu thiết lập riêng trên thiết bị này." />
              <FormatProfile value={format} onChange={onFormatChange} />
            </section>
            <section className="space-y-3">
              <SectionHeading title="Bố cục đọc" />
              <ChoiceGrid
                label="Kiểu đọc"
                value={prefs.layout ?? "auto"}
                options={layoutChoices}
                columns={2}
                compact
                onChange={(value) => onChange({ layout: value })}
              />
            </section>
            <section className="space-y-3">
              <SectionHeading title="Kích thước ảnh" />
              <ChoiceGrid
                label="Cách vừa ảnh"
                value={prefs.fit}
                options={fitChoices}
                columns={2}
                compact
                onChange={(value) => onChange({ fit: value })}
              />
            </section>
            <ThemePicker value={prefs.theme} onChange={(theme) => onChange({ theme })} />
          </div>
        )}
      </Sheet>

    </>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
    </div>
  );
}

function FormatProfile({ value, onChange }: { value: ReaderFormatProfile; onChange: (value: ReaderFormatProfile) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-muted-foreground">Hồ sơ định dạng</legend>
      <div className="grid grid-cols-2 gap-2">
        {(["manga", "webtoon"] as const).map((format) => (
          <button
            key={format}
            type="button"
            aria-pressed={value === format}
            onClick={() => onChange(format)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring",
              value === format ? "border-primary/60 bg-primary/10 text-foreground" : "border-border bg-card/60 text-muted-foreground hover:bg-secondary",
            )}
          >
            {format === "manga" ? <BookOpen size={16} /> : <Monitor size={16} />}
            {format === "manga" ? "Manga" : "Webtoon"}
            {value === format && <Check size={15} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ChoiceGrid<T extends string>({
  label,
  value,
  options,
  columns,
  compact = false,
  disabled = false,
  hint,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; description?: string; icon?: typeof Sparkles }[];
  columns: 1 | 2;
  compact?: boolean;
  disabled?: boolean;
  hint?: string;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className={cn("min-w-0 space-y-2", disabled && "opacity-55")}>
      <legend className="text-xs font-medium text-muted-foreground">{label}</legend>
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
      <div className={cn("grid gap-2", columns === 1 ? "grid-cols-1" : "grid-cols-2")}>
        {options.map((option) => {
          const Icon = option.icon;
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "min-w-0 rounded-xl border px-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed",
                compact ? "min-h-11 py-2" : "min-h-[58px] py-2.5",
                selected ? "border-primary/60 bg-primary/10 text-foreground" : "border-border bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                {Icon && <Icon size={15} className="shrink-0" aria-hidden="true" />}
                <span className="min-w-0 flex-1 text-xs font-semibold sm:text-sm">{option.label}</span>
                {selected && <Check size={15} className="shrink-0 text-primary" aria-hidden="true" />}
              </span>
              {!compact && option.description && <span className="mt-1 block pl-0.5 text-[11px] leading-4 text-muted-foreground">{option.description}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ThemePicker({ value, onChange }: { value: ReaderPrefs["theme"]; onChange: (value: ReaderPrefs["theme"]) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">Màu nền đọc</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {themes.map((theme) => {
          const selected = value === theme.value;
          return (
            <button
              key={theme.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(theme.value)}
              className={cn(
                "flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring",
                selected ? "border-primary/60 bg-primary/10 text-foreground" : "border-border bg-card/60 text-muted-foreground hover:bg-secondary",
              )}
            >
              <span className="size-4 shrink-0 rounded-full border border-foreground/15" style={{ backgroundColor: theme.color }} />
              <span className="min-w-0 flex-1 truncate">{theme.label}</span>
              {selected && <Check size={14} className="shrink-0 text-primary" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  formatValue,
  onChange,
  disabled = false,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className={cn("block rounded-xl border border-border bg-card/50 p-3", disabled && "opacity-55")}>
      <span className="flex items-center justify-between gap-2 text-xs font-semibold">
        {label}<output className="font-code text-muted-foreground">{formatValue(value)}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        aria-valuetext={formatValue(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 block w-full accent-primary disabled:cursor-not-allowed"
      />
      {hint && <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{hint}</span>}
    </label>
  );
}

function ToggleControl({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-border bg-card/50 px-3 py-2.5 text-left transition hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-55",
      )}
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{description}</span>
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-1 size-4 rounded-full bg-background shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
      </span>
    </button>
  );
}

function PrefetchPicker({ value, onChange }: { value: ReaderPrefs["prefetch"]; onChange: (value: ReaderPrefs["prefetch"]) => void }) {
  const options = [
    { value: "auto", label: "Tự động", description: "Theo thiết bị và mạng" },
    { value: "1", label: "1 trang", description: "Tiết kiệm bộ nhớ" },
    { value: "3", label: "3 trang", description: "Chuyển trang nhanh hơn" },
  ] as const;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">Tải trước trang</legend>
      <div className="grid grid-cols-1 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring",
              value === option.value ? "border-primary/60 bg-primary/10" : "border-border bg-card/60 hover:bg-secondary",
            )}
          >
            <span>
              <span className="block text-xs font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{option.description}</span>
            </span>
            {value === option.value && <Check size={16} className="text-primary" aria-hidden="true" />}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ResetPreferencesDialog({
  format,
  onCancel,
  onConfirm,
}: {
  format: ReaderFormatProfile;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const formatLabel = format === "manga" ? "Manga" : "Webtoon";

  useEffect(() => {
    cancelRef.current?.focus({ preventScroll: true });
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <div
        data-reader-reset-dialog
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reader-reset-title"
        aria-describedby="reader-reset-description"
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-2xl"
      >
        <h3 id="reader-reset-title" className="text-base font-semibold">Đặt lại hồ sơ {formatLabel}?</h3>
        <p id="reader-reset-description" className="mt-2 text-sm leading-6 text-muted-foreground">
          Chỉ cài đặt đọc của hồ sơ này được đưa về mặc định. Tiến độ, bookmark và ảnh đã tải vẫn được giữ nguyên.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-secondary">
            Hủy
          </button>
          <button type="button" onClick={onConfirm} className="min-h-11 rounded-xl bg-destructive px-4 text-sm font-semibold text-destructive-foreground">
            Đặt lại
          </button>
        </div>
      </div>
    </div>
  );
}
