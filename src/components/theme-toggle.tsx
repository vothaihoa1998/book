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
 * - First render trả về "light" cứng (khớp với layout default + script inline).
 * - useEffect đọc lại DOM sau mount để đồng bộ với theme user thực sự chọn
 *   (nếu họ đã từng toggle trước đó) hoặc localStorage.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem("inkrail-theme");
      const fromDom = document.documentElement.dataset.theme;
      const next: Theme =
        stored === "light" || stored === "dark"
          ? stored
          : fromDom === "dark"
            ? "dark"
            : "light";
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
        const next: Theme = isDark ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
      }}
      variant="secondary"
      suppressHydrationWarning
      aria-label={mounted ? (isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối") : "Đổi giao diện"}
      title={mounted ? (isDark ? "Light mode" : "Dark mode") : "Theme"}
    >
      {mounted && isDark ? <Sun size={16} /> : <Moon size={16} />}
    </IconButton>
  );
}
