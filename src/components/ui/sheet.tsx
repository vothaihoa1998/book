"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  /** Title for accessibility (rendered as <h2> by caller). */
  ariaLabel?: string;
  /** Called when drag-down dismisses the sheet. */
  children: React.ReactNode;
  /** Footer area (e.g. action buttons). Stays fixed at bottom of sheet. */
  footer?: React.ReactNode;
  /** Max height class. Default h-[60vh] — bỏ toggle snap, đơn giản hoá UI. */
  maxHeightClass?: string;
};

/**
 * Bottom sheet primitive — portal, click-outside dismiss, Esc close,
 * body scroll lock, drag handle, swipe-down to dismiss.
 *
 * Phase G2: dùng cho chapter filter, discover filter, mobile search.
 * Phase R-feedback: bỏ snap toggle 60/90% — mặc định 60vh.
 */
export function Sheet({ open, onClose, ariaLabel, children, footer, maxHeightClass = "max-h-[60vh]" }: SheetProps) {
  const dragYRef = useRef(0);
  const dragStartY = useRef(0);
  const dragActive = useRef(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll + Esc close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Drag-down to dismiss
  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragActive.current = true;
    dragStartY.current = e.clientY;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragActive.current) return;
    const dy = e.clientY - dragStartY.current;
    if (dy > 0) dragYRef.current = dy;
    else dragYRef.current = 0;
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dragYRef.current}px)`;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!dragActive.current) return;
    dragActive.current = false;
    const dy = e.clientY - dragStartY.current;
    if (sheetRef.current) sheetRef.current.style.transform = "";
    if (dy > 120) onClose();
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      {/* Click-outside scrim */}
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm transition-opacity"
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-3xl border-t border-border bg-background shadow-[0_-12px_40px_rgba(0,0,0,0.18)] transition-transform duration-200 ease-out",
          maxHeightClass,
        )}
      >
        {/* Drag handle (only area you can drag from) */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex shrink-0 cursor-grab touch-none items-center justify-center py-2.5 active:cursor-grabbing"
          aria-label="Kéo xuống để đóng"
        >
          <span className="block h-1 w-9 rounded-full bg-muted-foreground/40" />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 pt-1">{children}</div>

        {/* Footer (action buttons) */}
        {footer && (
          <div className="shrink-0 border-t border-border bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}