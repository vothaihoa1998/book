"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/primitives";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("inkrail-theme", theme);
}

export function ThemeToggle() {
  // Default to "light" to match layout.tsx's pre-paint default; this avoids a
  // dark flash on first visit when the user has never toggled. The inline
  // script in layout already painted the right data-theme before React mounts,
  // so on first render we deliberately don't reapply — we just sync state to
  // the attribute that's already on <html>.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem("inkrail-theme");
      const next = stored === "light" || stored === "dark" ? stored : "light";
      setTheme(next);
      document.documentElement.dataset.theme = next;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <IconButton
      type="button"
      onClick={() => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
      }}
      variant="secondary"
      className="text-muted-foreground hover:text-foreground"
      aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </IconButton>
  );
}
