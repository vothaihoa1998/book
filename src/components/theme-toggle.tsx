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
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem("inkrail-theme");
      const next = stored === "light" ? "light" : "dark";
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
      className="text-muted hover:text-foreground"
      aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </IconButton>
  );
}
