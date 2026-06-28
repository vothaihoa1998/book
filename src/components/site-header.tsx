"use client";

import { BookOpen, Library, Rss } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountStatus } from "@/components/account-status";
import { InstantSearch } from "@/components/instant-search";
import { MobileSearchButton } from "@/components/mobile-search-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { IconLinkButton } from "@/components/ui/primitives";
import type { SupabaseBrowserEnv } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Trang chủ" },
  { href: "/discover", label: "Khám phá" },
  { href: "/library", label: "Thư viện" },
  { href: "/about", label: "Pháp lý" },
];

export function SiteHeader({ className, supabaseEnv }: { className?: string; supabaseEnv: SupabaseBrowserEnv | null }) {
  const pathname = usePathname();
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
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <InstantSearch className="ml-auto hidden w-[min(30vw,360px)] min-w-[260px] md:block" />

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <MobileSearchButton className="md:hidden" />
          <IconLinkButton
            href="/rss.xml"
            className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
            aria-label="RSS feed"
          >
            <Rss size={16} />
          </IconLinkButton>
          <IconLinkButton
            href="/library"
            className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
            aria-label="Thư viện cá nhân"
          >
            <Library size={16} />
          </IconLinkButton>
          <ThemeToggle />
          <AccountStatus supabaseEnv={supabaseEnv} />
        </div>
      </div>
    </header>
  );
}
