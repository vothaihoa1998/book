"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { InstantSearch } from "@/components/instant-search";
import { cn } from "@/lib/utils";

/**
 * Mobile search button — opens a full-screen Sheet with InstantSearch inside.
 * Hidden on md+ where header search is always visible.
 */
export function MobileSearchButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tìm truyện"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-muted-foreground transition hover:bg-secondary hover:text-foreground",
          className,
        )}
      >
        <Search size={17} />
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Tìm truyện"
        defaultSnap="90vh"
      >
        <div className="flex flex-col gap-3 pb-2">
          <h2 className="text-[15px] font-semibold text-foreground">Tìm truyện</h2>
          <InstantSearch placeholder="Tìm tên truyện, tác giả..." onNavigate={() => setOpen(false)} />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Mẹo: bấm <kbd className="rounded border border-border bg-secondary px-1 font-code text-[10px]">/</kbd> bất kỳ đâu để mở tìm nhanh.
          </p>
        </div>
      </Sheet>
    </>
  );
}