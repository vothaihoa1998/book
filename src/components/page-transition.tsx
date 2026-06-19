"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Wraps page content in a fade-in transition on route change.
 * On mobile, also implements a passive pull-to-refresh hint that fires
 * the browser's native location.reload() once threshold is crossed.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Fade-in on route change
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.opacity = "0";
    node.style.transform = "translateY(4px)";
    const raf = requestAnimationFrame(() => {
      node.style.transition = "opacity 220ms ease-out, transform 220ms ease-out";
      node.style.opacity = "1";
      node.style.transform = "translateY(0)";
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  // Pull-to-refresh (mobile only, passive). Touch-start at top of page,
  // pull down past 80px → reload on release.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) return; // desktop off

    let startY = 0;
    let pulling = false;
    let distance = 0;

    function onStart(e: TouchEvent) {
      if (window.scrollY > 4) return;
      startY = e.touches[0]?.clientY ?? 0;
      pulling = true;
      distance = 0;
    }

    function onMove(e: TouchEvent) {
      if (!pulling) return;
      const y = e.touches[0]?.clientY ?? 0;
      distance = Math.max(0, y - startY);
      if (distance > 4) e.preventDefault();
    }

    function onEnd() {
      if (!pulling) return;
      pulling = false;
      if (distance > 90) {
        // Subtle haptic if available
        if ("vibrate" in navigator) navigator.vibrate?.(10);
        window.location.reload();
      }
      distance = 0;
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  return (
    <div ref={ref} className={cn("contents")}>
      {children}
    </div>
  );
}