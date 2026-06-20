"use client";

import { Compass, Home, Library, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/discover", label: "Khám phá", icon: Compass },
  { href: "/library", label: "Thư viện", icon: Library },
  { href: "/profile", label: "Tôi", icon: UserRound },
];

export function MobileTabBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/read/")) return null;

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/85 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(43,29,18,0.06)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex h-12 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] bg-primary/12 text-primary"
                  : "flex h-12 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] text-muted-foreground transition active:scale-95 hover:text-foreground"
              }
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[11px] font-medium leading-none tracking-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
