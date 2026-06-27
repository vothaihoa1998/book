"use client";

import { Compass, Home, Library, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
};

const tabs: Tab[] = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/discover", label: "Truyện", icon: Compass },
  { href: "/library", label: "Thư viện", icon: Library },
  { href: "/discover#search", label: "Tìm kiếm", icon: Search },
  { href: "/profile", label: "Tôi", icon: UserRound },
];

const PILL_HEIGHT = 40;
const DEFAULT_INDICATOR = { x: 0, width: 124 };

function activeIndex(pathname: string, hash: string) {
  const hashIndex = tabs.findIndex((tab) => {
    const [path, tabHash] = tab.href.split("#");
    return Boolean(tabHash) && pathname === path && hash === `#${tabHash}`;
  });

  if (hashIndex >= 0) return hashIndex;

  return tabs.findIndex((tab) => {
    if (tab.href.includes("#")) return false;
    if (tab.href === "/") return pathname === "/";
    const path = tab.href.split("#")[0];
    return pathname === path || pathname.startsWith(`${path}/`);
  });
}

export function MobileTabBar() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [mounted, setMounted] = useState(false);
  const [indicator, setIndicator] = useState(DEFAULT_INDICATOR);
  const [hash, setHash] = useState("");

  const idx = Math.max(activeIndex(pathname, hash), 0);

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    function updateHash() {
      setHash(window.location.hash);
    }

    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  useLayoutEffect(() => {
    function updateIndicator() {
      const container = containerRef.current;
      const activeTab = tabRefs.current[idx];
      if (!container || !activeTab) return;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeTab.getBoundingClientRect();
      setIndicator({
        x: activeRect.left - containerRect.left,
        width: activeRect.width,
      });
    }

    updateIndicator();
    const animationFrame = window.requestAnimationFrame(updateIndicator);
    window.addEventListener("resize", updateIndicator);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [idx]);

  if (pathname.startsWith("/read/")) return null;

  const transition =
    "transform 520ms cubic-bezier(0.32, 0.72, 0, 1), width 520ms cubic-bezier(0.32, 0.72, 0, 1), opacity 220ms ease";

  return (
    <div
      aria-label="Điều hướng chính"
      className="pointer-events-none fixed inset-x-0 bottom-0  px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] md:hidden"
    >
      <nav className="pointer-events-auto mx-auto flex w-full max-w-120 items-center justify-center" aria-label="Điều hướng chính mobile">
        <div
          ref={containerRef}
          className="relative flex h-13.5 max-w-[calc(100vw-24px)] items-center justify-center gap-1 rounded-full border border-white/10 bg-[#11131b]/96 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.08)]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-1/2 rounded-full bg-primary shadow-[0_4px_14px_rgba(242,184,75,0.30),0_0_14px_rgba(242,184,75,0.16)]"
            style={{
              width: indicator.width,
              height: PILL_HEIGHT,
              transform: `translate3d(${indicator.x}px, -50%, 0) scale(${mounted ? 1.02 : 0.96})`,
              transition,
              opacity: mounted ? 1 : 0,
            }}
          />

          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = i === idx;
            return (
              <Link
                key={tab.href}
                ref={(element) => {
                  tabRefs.current[i] = element;
                }}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
                title={tab.label}
                className={cn(
                  "relative z-10 flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-full transition-[width,transform,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                  isActive
                    ? "w-28 scale-[1.035] gap-2 bg-primary px-4 text-primary-foreground shadow-[0_6px_14px_rgba(242,184,75,0.22)]"
                    : "w-11 text-slate-400 hover:scale-105 hover:text-slate-100 active:scale-95",
                )}
              >
                <Icon
                  size={isActive ? 17 : 22}
                  strokeWidth={isActive ? 2.6 : 1.85}
                  className="shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  style={{ transform: isActive ? "scale(1.08)" : "scale(1)" }}
                />
                <span
                  className={cn(
                    "whitespace-nowrap text-[12px] font-semibold leading-none transition-[max-width,opacity,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    isActive ? "max-w-20 opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-2",
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
