"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Hand } from "lucide-react";

/**
 * Tap-to-toggle hint — overlay ở giữa màn hình, fade out sau 3.5s.
 * Dùng createPortal để bypass PageTransition containing block (transform).
 */
export function ReaderTapHint() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    const t = window.setTimeout(() => setVisible(false), 3500);
    return () => window.clearTimeout(t);
  }, []);

  if (!mounted) return null;
  if (!visible) return null;

  return createPortal(
    <div
      aria-hidden
      className="tap-hint pointer-events-none fixed inset-x-0 top-1/2 z-[80] flex -translate-y-1/2 justify-center"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-[11px] font-medium text-foreground shadow-md backdrop-blur-sm">
        <Hand size={11} /> Tap giữa để ẩn/hiện nav
      </span>
    </div>,
    document.body,
  );
}