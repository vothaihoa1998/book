"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/read/")) return null;

  return (
    <footer className="mx-auto mt-8 flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t border-border px-4 pb-8 pt-4 text-sm text-muted-foreground sm:px-6">
      <div className="flex flex-wrap items-center gap-5">
        <Link href="/" className="flex items-center gap-2 text-foreground" aria-label="InkRail — Trang chủ">
          <span className="grid size-8 place-items-center rounded-[var(--radius-control)] bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
            <BookOpen size={17} strokeWidth={2} />
          </span>
          <span className="font-display text-xl font-medium leading-none tracking-tight">InkRail</span>
        </Link>
        <Link href="/preferences" className="hover:text-primary">Tùy chọn nội dung</Link>
        <Link href="/about" className="hover:text-primary">Pháp lý</Link>
        <a href="mailto:contactinkrail@proton.me" className="hover:text-primary">contactinkrail@proton.me</a>
      </div>
      <p>© 2026 — all rights reserved</p>
    </footer>
  );
}
