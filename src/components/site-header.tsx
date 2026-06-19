"use client";

import { BookOpen, Library, Rss, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountStatus } from "@/components/account-status";
import { HeaderSearch } from "@/components/header-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { IconLinkButton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Trang chủ" },
  { href: "/discover", label: "Khám phá" },
  { href: "/library", label: "Thư viện" },
  { href: "/about", label: "Pháp lý" },
];

export function SiteHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/read/")) return null;

  return (
    <header className={cn("sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur-xl", className)}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="InkRail home">
          <span className="grid size-8 place-items-center rounded-[var(--radius-card)] bg-foreground ink-on-dark">
            <BookOpen size={17} strokeWidth={1.8} />
          </span>
          <span className="font-display text-2xl font-semibold leading-none">InkRail</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-muted md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <HeaderSearch className="ml-auto hidden w-[min(30vw,360px)] min-w-[260px] md:block" />

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <IconLinkButton
            href="/discover"
            className="text-muted hover:text-foreground md:hidden"
            aria-label="Tìm truyện"
          >
            <Search size={16} />
          </IconLinkButton>
          <IconLinkButton
            href="/rss.xml"
            className="hidden text-muted hover:text-foreground sm:inline-flex"
            aria-label="RSS"
          >
            <Rss size={16} />
          </IconLinkButton>
          <IconLinkButton
            href="/library"
            className="hidden text-muted hover:text-foreground sm:inline-flex"
            aria-label="Library"
          >
            <Library size={16} />
          </IconLinkButton>
          <ThemeToggle />
          <AccountStatus />
        </div>
      </div>
    </header>
  );
}
