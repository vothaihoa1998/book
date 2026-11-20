"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/primitives";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("inkrail-theme", theme);
}

/**
 * ThemeToggle — bám sát giá trị SSR ban đầu để khỏi hydration mismatch.
 * - First render trả về "dark" cứng (khớp với layout default + script inline).
 * - useEffect đọc lại DOM sau mount để đồng bộ với theme user thực sự chọn
 *   (nếu họ đã từng toggle trước đó) hoặc localStorage.
 */
export function ThemeToggle({ selected = false, onSelect }: { selected?: boolean; onSelect?: () => void }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem("inkrail-theme");
      const fromDom = document.documentElement.dataset.theme;
      const next: Theme =
        stored === "light" || stored === "dark"
          ? stored
          : fromDom === "light"
            ? "light"
            : "dark";
      setTheme(next);
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const isDark = theme === "dark";

  return (
    <IconButton
      type="button"
      onClick={() => {
        onSelect?.();
        const next: Theme = isDark ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
      }}
      variant="ghost"
      data-header-action="theme"
      className={`rounded-full transition-colors duration-300 ease-in-out ${
        selected
          ? "relative z-10 bg-transparent text-primary-foreground hover:bg-transparent hover:text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
      suppressHydrationWarning
      aria-label={mounted ? (isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối") : "Đổi giao diện"}
      title={mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
    >
      {mounted && isDark ? <Sun size={16} /> : <Moon size={16} />}
    </IconButton>
  );
}
