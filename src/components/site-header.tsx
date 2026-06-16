import { BookOpen, Library, Rss, Search, UserRound } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Trang chủ" },
  { href: "/discover", label: "Khám phá" },
  { href: "/library", label: "Thư viện" },
  { href: "/about", label: "Pháp lý" },
];

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur-xl", className)}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="InkRail home">
          <span className="grid size-8 place-items-center rounded-[6px] bg-foreground ink-on-dark">
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

        <Link
          href="/discover"
          className="ml-auto hidden h-10 min-w-[280px] items-center justify-between rounded-[8px] border border-border bg-surface px-3 text-sm text-muted shadow-sm transition hover:border-foreground/20 md:flex"
        >
          <span className="flex items-center gap-2">
            <Search size={16} />
            Tìm truyện, tác giả, thể loại
          </span>
          <span className="font-code text-[11px] uppercase text-muted">/</span>
        </Link>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            href="/rss.xml"
            className="hidden size-10 place-items-center rounded-[8px] border border-border bg-surface text-muted transition hover:text-foreground sm:grid"
            aria-label="RSS"
          >
            <Rss size={16} />
          </Link>
          <Link
            href="/library"
            className="hidden size-10 place-items-center rounded-[8px] border border-border bg-surface text-muted transition hover:text-foreground sm:grid"
            aria-label="Library"
          >
            <Library size={16} />
          </Link>
          <Link
            href="/login"
            className="grid size-10 place-items-center rounded-[8px] bg-foreground ink-on-dark transition hover:opacity-90"
            aria-label="Account"
          >
            <UserRound size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
