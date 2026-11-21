"use client";

import { ArrowUpRight, BookOpen, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const linkClassName =
  "inline-flex min-h-9 items-center rounded-[var(--radius-control)] text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/read/")) return null;

  return (
    <footer className="mx-auto mt-12 w-full max-w-6xl px-4 pb-8 pt-8 sm:px-6 md:mt-16 md:pt-10">
      <div className="grid gap-8 border-t border-border pt-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)] md:gap-12 md:pt-10">
        <div className="max-w-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-[var(--radius-control)] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            aria-label="InkRail — Trang chủ"
          >
            <span className="grid size-9 place-items-center rounded-[var(--radius-control)] bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
              <BookOpen size={18} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="font-display text-2xl font-medium leading-none tracking-tight">InkRail</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
            Không gian đọc truyện được thiết kế để bạn tùy chỉnh theo cách riêng.
          </p>
        </div>

        <nav aria-label="Liên kết cuối trang" className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 sm:gap-x-8">
          <div className="flex flex-col items-start gap-1">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Khám phá</h2>
            <Link href="/preferences" className={linkClassName}>Tùy chọn nội dung</Link>
            <Link href="/about" className={linkClassName}>Nguồn dữ liệu</Link>
          </div>

          <div className="flex flex-col items-start gap-1">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Thông tin</h2>
            <Link href="/terms" className={linkClassName}>Điều khoản</Link>
            <Link href="/privacy" className={linkClassName}>Quyền riêng tư</Link>
            <Link href="/content-removal" className={linkClassName}>Yêu cầu gỡ nội dung</Link>
          </div>

          <div className="col-span-2 flex flex-col items-start gap-1 sm:col-span-1">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Kết nối</h2>
            <a href="mailto:contactinkrail@proton.me" className={linkClassName}>
              <Mail size={15} className="mr-2 shrink-0" aria-hidden="true" />
              <span className="break-all">contactinkrail@proton.me</span>
            </a>
            <a
              href="https://mangadex.org"
              target="_blank"
              rel="noreferrer"
              className={linkClassName}
            >
              MangaDex
              <ArrowUpRight size={14} className="ml-1.5 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </nav>
      </div>

      <div className="mt-8 flex flex-col gap-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 InkRail</p>
        <p>
          InkRail độc lập, không liên kết với{" "}
          <a
            href="https://mangadex.org"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
          >
            MangaDex
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
