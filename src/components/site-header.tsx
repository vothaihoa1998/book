"use client";

import { BookOpen, Library, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccountStatus } from "@/components/account-status";
import { InstantSearch } from "@/components/instant-search";
import { MobileSearchButton } from "@/components/mobile-search-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { IconLinkButton } from "@/components/ui/primitives";
import type { SupabaseBrowserEnv } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/discover", label: "Khám phá" },
  { href: "/library", label: "Thư viện" },
];

type HeaderAction = "search" | "preferences" | "library" | "theme" | "account";

function getInitialHeaderAction(pathname: string): HeaderAction | null {
  if (pathname.startsWith("/preferences")) return "preferences";
  if (pathname.startsWith("/library")) return "library";
  if (pathname.startsWith("/login") || pathname.startsWith("/profile")) return "account";
  return null;
}

export function SiteHeader({ className, supabaseEnv }: { className?: string; supabaseEnv: SupabaseBrowserEnv | null }) {
  const pathname = usePathname();
  const [selectedAction, setSelectedAction] = useState<HeaderAction | null>(() => getInitialHeaderAction(pathname));
  const actionGroupRef = useRef<HTMLDivElement>(null);
  const [activeIndicator, setActiveIndicator] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const updateIndicator = () => {
      const selectedButton = selectedAction
        ? actionGroupRef.current?.querySelector<HTMLElement>(`[data-header-action="${selectedAction}"]`)
        : null;

      if (!selectedButton || !selectedButton.offsetParent) {
        setActiveIndicator(null);
        return;
      }

      setActiveIndicator({
        x: selectedButton.offsetLeft,
        y: selectedButton.offsetTop,
        width: selectedButton.offsetWidth,
        height: selectedButton.offsetHeight,
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [selectedAction]);

  if (pathname.startsWith("/read/")) return null;

  return (
    <header className={cn("sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl", className)}>
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 md:h-16 md:gap-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="InkRail — Trang chủ">
          <span className="grid size-8 place-items-center rounded-[var(--radius-control)] bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <BookOpen size={17} strokeWidth={2} />
          </span>
          <span className="font-display text-xl font-medium leading-none tracking-tight">InkRail</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium md:flex" aria-label="Điều hướng chính">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 transition-colors",
                  active
                    ? "relative text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <InstantSearch className="ml-auto hidden w-[min(30vw,360px)] min-w-[260px] md:block" />

        <div ref={actionGroupRef} className="relative ml-auto flex items-center gap-1 rounded-full border-2 border-foreground p-1 md:ml-0">
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-0 top-0 z-0 rounded-full bg-primary transition-[transform,width,height,opacity] duration-500 ease-in-out",
              activeIndicator ? "opacity-100" : "opacity-0",
            )}
            style={activeIndicator ? {
              width: activeIndicator.width,
              height: activeIndicator.height,
              transform: `translate3d(${activeIndicator.x}px, ${activeIndicator.y}px, 0)`,
            } : undefined}
          />
          <MobileSearchButton
            className="md:hidden"
            selected={selectedAction === "search"}
            onSelect={() => setSelectedAction("search")}
          />
          <IconLinkButton
            href="/preferences"
            variant="ghost"
            onClick={() => setSelectedAction("preferences")}
            className={cn(
              "relative z-10 rounded-full transition-colors duration-300 ease-in-out",
              selectedAction === "preferences"
                ? "bg-transparent text-primary-foreground hover:bg-transparent hover:text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            data-header-action="preferences"
            aria-label="Tùy chọn nội dung"
          >
            <SlidersHorizontal size={16} />
          </IconLinkButton>
          <IconLinkButton
            href="/library"
            variant="ghost"
            onClick={() => setSelectedAction("library")}
            className={cn(
              "relative z-10 hidden rounded-full transition-colors duration-300 ease-in-out sm:inline-flex",
              selectedAction === "library"
                ? "bg-transparent text-primary-foreground hover:bg-transparent hover:text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            data-header-action="library"
            aria-label="Thư viện cá nhân"
          >
            <Library size={16} />
          </IconLinkButton>
          <ThemeToggle
            selected={selectedAction === "theme"}
            onSelect={() => setSelectedAction("theme")}
          />
          <AccountStatus
            supabaseEnv={supabaseEnv}
            selected={selectedAction === "account"}
            onSelect={() => setSelectedAction("account")}
          />
        </div>
      </div>
    </header>
  );
}
