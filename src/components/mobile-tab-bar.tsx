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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/92 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                active
                  ? "flex h-12 flex-col items-center justify-center gap-1 rounded-[8px] bg-foreground ink-on-dark"
                  : "flex h-12 flex-col items-center justify-center gap-1 rounded-[8px] text-muted"
              }
            >
              <Icon size={17} strokeWidth={1.8} />
              <span className="text-[11px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
